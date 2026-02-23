#!venv/bin/python3
from __future__ import annotations
import pathlib
import time
from collections import deque
import json
import geojson
import orjson
import redis
import point_in_geojson as pig
import linestring_to_polygon as ltp

dump_ignore_keys = [
    "mode",
    "time",
    "pos_error",
    "epc",
    "eps",
    "epd",
    "epx",
    "epy",
    "epv",
    "ept",
    "tag",
    "device",
    "class",
    "leapseconds",
    "ecefx",
    "ecefy",
    "ecefz",
    "ecefvx",
    "ecefvy",
    "ecefvz",
    "ecefpAcc",
    "ecefvAcc",
    "eph",
    "sep",
    "velN",
    "velE",
    "velD",
    "sensor",
    "hostname",
]


class Vigor22Control:
    def __init__(self, project_path: pathlib.Path):
        self.redis_connection = redis.Redis(decode_responses=True)
        self.project_path = project_path
        self.project_name = project_path.stem
        self.project = orjson.loads(self.project_path.read_bytes())
        self.settings = self.project["settings"]
        self.boundaries = pig.PointInGeoJSON(
            json.dumps(self.project["boundaries"])
        )
        self.plan = pig.PointInGeoJSON(json.dumps(self.project["plan"]))
        if "protocol" in self.project:
            protocol_json = json.dumps(self.project["protocol"])
        else:
            protocol_json = json.dumps(geojson.FeatureCollection([]))
        self.protocol = pig.PointInGeoJSON(protocol_json)
        self.min_speed = self.settings["min_speed"]
        self.throwing_range = self.settings["throwing_range"]
        self.default_rate = self.settings["default_rate"]
        self.left_in_bounds = False
        self.right_in_bounds = False
        self.center_in_bounds = False
        self.hb_state = None
        self.location = None
        self.heading = None
        self.speed = None
        self.accuracy = None
        self.utc = None
        self.written = True
        self.indicator = []
        self.left_rate = 0
        self.right_rate = 0
        self.inner_left_polygon = deque()
        self.inner_right_polygon = deque()
        self.outer_left_polygon = deque()
        self.outer_right_polygon = deque()
        self.publish_project()

    def publish_project(self):
        self.send_boundaries()
        self.send_plan()
        self.send_protocol()

    def close_left_shapes(self, outer_left_point=None, inner_left_point=None):
        if (
            len(self.inner_left_polygon) == 0
            and len(self.outer_left_polygon) == 0
        ):
            return
        protocol = self.protocol.to_dict()
        if len(self.inner_left_polygon) > 0:
            if not None in (inner_left_point, self.location):
                self.inner_left_polygon.appendleft(inner_left_point)
                self.inner_left_polygon.append(self.location)
            _geometry = geojson.Polygon([list(self.inner_left_polygon)])
            _properties = {
                "coverage": 0.7,
                "rate": self.left_rate,
                "timestamp": self.utc,
            }
            _feature = geojson.Feature(
                properties=_properties, geometry=_geometry
            )
            protocol["features"].append(_feature)
            self.send_protocol_feature(_feature)
            self.inner_left_polygon.clear()
        if len(self.outer_left_polygon) > 0:
            if not None in (outer_left_point, inner_left_point):
                self.outer_left_polygon.appendleft(outer_left_point)
                self.outer_left_polygon.append(inner_left_point)
            _geometry = geojson.Polygon([list(self.outer_left_polygon)])
            _properties = {
                "coverage": 0.3,
                "rate": self.left_rate,
                "timestamp": self.utc,
            }
            _feature = geojson.Feature(
                properties=_properties, geometry=_geometry
            )
            protocol["features"].append(_feature)
            self.send_protocol_feature(_feature)
            self.outer_left_polygon.clear()
        self.protocol = pig.PointInGeoJSON(json.dumps(protocol))
        self.written = False

    def close_right_shapes(
        self, outer_right_point=None, inner_right_point=None
    ):
        if (
            len(self.inner_right_polygon) == 0
            and len(self.outer_right_polygon) == 0
        ):
            return
        protocol = self.protocol.to_dict()
        if len(self.inner_right_polygon) > 0:
            if not None in (inner_right_point, self.location):
                self.inner_right_polygon.appendleft(inner_right_point)
                self.inner_right_polygon.append(self.location)
            _geometry = geojson.Polygon([list(self.inner_right_polygon)])
            _properties = {
                "coverage": 0.7,
                "rate": self.right_rate,
                "timestamp": self.utc,
            }
            _feature = geojson.Feature(
                properties=_properties, geometry=_geometry
            )
            protocol["features"].append(_feature)
            self.send_protocol_feature(_feature)
            self.inner_right_polygon.clear()
        if len(self.outer_right_polygon) > 0:
            if not None in (outer_right_point, inner_right_point):
                self.outer_right_polygon.appendleft(outer_right_point)
                self.outer_right_polygon.append(inner_right_point)
            _geometry = geojson.Polygon([list(self.outer_right_polygon)])
            _properties = {
                "coverage": 0.3,
                "rate": self.right_rate,
                "timestamp": self.utc,
            }
            _feature = geojson.Feature(
                properties=_properties, geometry=_geometry
            )
            protocol["features"].append(_feature)
            self.send_protocol_feature(_feature)
            self.outer_right_polygon.clear()
        self.protocol = pig.PointInGeoJSON(json.dumps(protocol))
        self.written = False

    def send_feedback(self) -> None:
        self.redis_connection.publish(
            "client_feedback",
            orjson.dumps(
                {
                    "project_name": self.project_name,
                    "right_rate": self.right_rate,
                    "left_rate": self.left_rate,
                    "longitude": self.location[0],
                    "latitude": self.location[1],
                    "speed": self.speed,
                    "heading": self.heading,
                    "utc": self.utc,
                }
            ),
        )

    def send_output(self) -> None:
        self.redis_connection.publish(
            "vigor22_output",
            orjson.dumps(
                {
                    "type": "location",
                    "right_rate": self.right_rate,
                    "left_rate": self.left_rate,
                    "longitude": self.location[0],
                    "latitude": self.location[1],
                    "speed": self.speed,
                    "min_speed": self.min_speed,
                    "heading": self.heading,
                    "accuracy": self.accuracy,
                    "utc": self.utc,
                    "indicator": self.indicator,
                    "inner_left_polygon": [list(self.inner_left_polygon)],
                    "inner_right_polygon": [list(self.inner_right_polygon)],
                    "outer_left_polygon": [list(self.outer_left_polygon)],
                    "outer_right_polygon": [list(self.outer_right_polygon)],
                }
            ),
        )

    def send_protocol_feature(self, feature) -> None:
        self.redis_connection.publish(
            "vigor22_output",
            orjson.dumps(
                {
                    "type": "protocol_feature",
                    "feature": feature,
                    "utc": self.utc,
                }
            ),
        )

    def send_boundaries(self) -> None:
        self.redis_connection.publish(
            "vigor22_output",
            orjson.dumps(
                {
                    "type": "boundaries",
                    "feature_collection": self.boundaries.to_dict(),
                    "utc": self.utc,
                }
            ),
        )

    def send_plan(self) -> None:
        self.redis_connection.publish(
            "vigor22_output",
            orjson.dumps(
                {
                    "type": "plan",
                    "feature_collection": self.plan.to_dict(),
                    "utc": self.utc,
                }
            ),
        )

    def send_protocol(self) -> None:
        self.redis_connection.publish(
            "vigor22_output",
            orjson.dumps(
                {
                    "type": "protocol",
                    "feature_collection": self.protocol.to_dict(),
                    "utc": self.utc,
                }
            ),
        )

    def process_points(self) -> None:
        front_point = pig.geodesic_destination(
            *self.location, self.heading, 5.0
        )
        first_left_quartile_point = pig.geodesic_destination(
            *self.location, self.heading - 90, self.throwing_range * 0.25
        )
        first_right_quartile_point = pig.geodesic_destination(
            *self.location, self.heading + 90, self.throwing_range * 0.25
        )
        third_left_quartile_point = pig.geodesic_destination(
            *self.location, self.heading - 90, self.throwing_range * 0.75
        )
        third_right_quartile_point = pig.geodesic_destination(
            *self.location, self.heading + 90, self.throwing_range * 0.75
        )
        inner_left_point = pig.geodesic_destination(
            *self.location, self.heading - 90, self.throwing_range * 0.5
        )
        inner_right_point = pig.geodesic_destination(
            *self.location, self.heading + 90, self.throwing_range * 0.5
        )
        outer_left_point = pig.geodesic_destination(
            *self.location, self.heading - 90, self.throwing_range
        )
        outer_right_point = pig.geodesic_destination(
            *self.location, self.heading + 90, self.throwing_range
        )
        self.indicator = [
            [self.location, front_point],
            [self.location, outer_left_point],
            [self.location, outer_right_point],
        ]
        self.left_in_bounds = (
            self.hb_state == "EDGE_L"
            or all(
                (
                    self.boundaries.point_included(*_point)
                    for _point in (
                        outer_left_point,
                        inner_left_point,
                        first_left_quartile_point,
                        third_left_quartile_point,
                    )
                )
            )
            and not self.hb_state == "EDGE_R"
        )
        self.right_in_bounds = (
            self.hb_state == "EDGE_R"
            or all(
                (
                    self.boundaries.point_included(*_point)
                    for _point in (
                        outer_right_point,
                        inner_right_point,
                        first_right_quartile_point,
                        third_right_quartile_point,
                    )
                )
            )
            and not self.hb_state == "EDGE_L"
        )
        self.center_in_bounds = self.boundaries.point_included(
            *self.location
        ) or self.hb_state in ("EDGE_L", "EDGE_R")

        new_left_rate = 0
        new_right_rate = 0
        if self.left_in_bounds:
            new_left_rate = self.default_rate
            for _row in self.plan.point_included_with_properties(
                *inner_left_point
            ):
                if "V22RATE" in _row:
                    new_left_rate = float(_row["V22RATE"])
        if self.right_in_bounds:
            new_right_rate = self.default_rate
            for _row in self.plan.point_included_with_properties(
                *inner_right_point
            ):
                if "V22RATE" in _row:
                    new_right_rate = float(_row["V22RATE"])
        left_coverage = 0
        right_coverage = 0
        for _row in self.protocol.point_included_with_properties(
            *first_left_quartile_point
        ):
            left_coverage += float(_row["coverage"])
        for _row in self.protocol.point_included_with_properties(
            *first_right_quartile_point
        ):
            right_coverage += float(_row["coverage"])
        if left_coverage > 0.3:
            new_left_rate = 0
        if right_coverage > 0.3:
            new_right_rate = 0
        if new_left_rate != self.left_rate:
            self.close_left_shapes(outer_left_point, inner_left_point)
            self.left_rate = new_left_rate
        if new_right_rate != self.right_rate:
            self.close_right_shapes(outer_right_point, inner_right_point)
            self.right_rate = new_right_rate
        self.send_feedback()
        if new_left_rate > 0:
            self.inner_left_polygon.appendleft(inner_left_point)
            self.inner_left_polygon.append(self.location)
            self.outer_left_polygon.appendleft(outer_left_point)
            self.outer_left_polygon.append(inner_left_point)
        if new_right_rate > 0:
            self.inner_right_polygon.appendleft(inner_right_point)
            self.inner_right_polygon.append(self.location)
            self.outer_right_polygon.appendleft(outer_right_point)
            self.outer_right_polygon.append(inner_right_point)

    def update(self, gps_data: dict):
        self.utc = gps_data["utc"]
        self.location = (gps_data["lon"], gps_data["lat"])
        self.heading = gps_data.get("track")
        self.speed = gps_data.get("speed")
        self.accuracy = gps_data["hdop"] * 15 if "hdop" in gps_data else None
        if None in (self.heading, self.speed):
            self.indicator = []
        elif (
            self.hb_state not in ("AUTO", "EDGE_L", "EDGE_R")
            or self.speed < self.min_speed
        ):
            self.indicator = []
            self.close_left_shapes()
            self.close_right_shapes()
            self.left_rate = 0
            self.right_rate = 0
            self.send_feedback()
        else:
            self.process_points()
        if self.center_in_bounds == False and not self.written:
            self.write_data()
            self.written = True

    def write_data(self):
        self.project["protocol"] = self.protocol.to_dict()
        self.project["boundaries"] = self.boundaries.to_dict()
        if self.project_path.is_file():
            self.project_path.write_bytes(orjson.dumps(self.project))


def load_project_file() -> Vigor22Control | None:
    redis_connection = redis.Redis(decode_responses=True)
    project_directory = pathlib.Path("../projects")
    project_file = redis_connection.get("project_file")
    if project_file is not None:
        project_path = project_directory / project_file
        if project_path.is_file() and project_path.stat().st_size > 0:
            return Vigor22Control(project_path)


if __name__ == "__main__":
    vc = load_project_file()
    redis_connection = redis.Redis(decode_responses=True)
    _pubsub = redis_connection.pubsub()
    _pubsub.subscribe("gps", "vigor22_control", "motor_status")
    last_dump = None
    last_edge_point = None
    track_log_interval = 5
    track_log_distance = 2
    edge_tolerance = 2

    for item in _pubsub.listen():
        if not item["type"] == "message":
            continue
        if item["channel"] == "gps":
            data = orjson.loads(item["data"])
            if vc is not None:
                vc.update(data)
                vc.send_output()
                # Log non-test data in 50m radius around the project only.
                if (
                    data.get("sensor") == "gps"
                    and vc.boundaries.closest_distance(*vc.location) < 50
                    and (
                        last_dump is None
                        or vc.utc > last_dump + track_log_interval
                    )
                ):
                    key = "tracking:vigor22:{}".format(
                        time.strftime("%Y%m%d", time.gmtime())
                    )
                    for ignored_key in dump_ignore_keys:
                        data.pop(ignored_key, None)
                    redis_connection.lpush(key, orjson.dumps(data))
                    last_dump = vc.utc
                if vc.hb_state in (
                    "EDGE_L",
                    "EDGE_R"
                    and (
                        last_edge_point is None
                        or pig.geodesic_distance(*last_edge_point, *vc.location)
                        > track_log_distance
                    ),
                ):
                    last_edge_point = vc.location
                    redis_connection.lpush(
                        "edge_tracking", orjson.dumps(vc.location)
                    )
        elif item["channel"] == "vigor22_control":
            data = orjson.loads(item["data"])
            if data.get("info") == "project_changed":
                if vc is not None:
                    vc.write_data()
                vc = load_project_file()
            elif data.get("info") == "project_requested" and vc is not None:
                vc.publish_project()
            elif data.get("type") == "ping":
                redis_connection.publish(
                    "vigor22_output",
                    orjson.dumps({"type": "pong", "utc": time.time()}),
                )
        elif item["channel"] == "motor_status" and vc is not None:
            data = orjson.loads(item["data"])
            if data["hb_state"] == "AUTO" and vc.hb_state.startswith("EDGE"):
                reversed_edge_data = redis_connection.lrange(
                    "edge_tracking", 0, -1
                )
                edge_data = ",\n".join(reversed_edge_data[::-1])
                edge_geojson = geojson.Feature(
                    geometry=geojson.LineString(json.loads(f"[{edge_data}]"))
                )
                edge_polygon = simplify_polygon(
                    ltp.linestring_to_polygon(edge_geojson), edge_tolerance
                )
                if vc.boundaries.point_included(*vc.location):
                    # boundaries exist and should be overwritten
                    vc.boundaries = pig.PointInGeoJSON(
                        json.dumps(geojson.FeatureCollection([edge_polygon]))
                    )
                else:
                    # boundaries should be created or extended
                    boundaries = vc.boundaries.to_dict()
                    boundaries["features"].append(edge_polygon)
                    vc.boundaries = pig.PointInGeoJSON(json.dumps(boundaries))
                vc.send_boundaries()
                redis_connection.rename(
                    "edge_tracking",
                    "edge:vigor22:{}".format(
                        time.strftime("%Y%m%d%H%M%S", time.gmtime())
                    ),
                )
            vc.hb_state = data["hb_state"]

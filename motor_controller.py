#!/usr/bin/env python3
import time
import orjson
import redis
import MotorAPI

last_heartbeat = 0
interval = 0.08

redis_connection = redis.Redis()
pubsub = redis_connection.pubsub()
pubsub.subscribe("client_feedback")


while True:
    _timestamp = time.time()
    if _timestamp - last_heartbeat > 1:
        last_heartbeat = _timestamp
        MotorAPI.send_heartbeat(10000)
    _state = MotorAPI.get_state()
    if _state == "Fehler":
        MotorAPI.reset_errors()
        MotorAPI.set_state(2)
        _state = MotorAPI.get_state()
    _status_message = {
        "utc": _timestamp,
        "state": _state,
        "read_position": MotorAPI.get_pos(),
    }
    _message = pubsub.get_message()
    if _message and _message["type"] == "message" and _state == "Automatik":
        data = orjson.loads(_message["data"])
        _new_left_rate = int(float(data["left_rate"]) * 100)
        _new_right_rate = int(float(data["right_rate"]) * 100)
        MotorAPI.set_ref(_new_left_rate, _new_right_rate)
        _status_message["set_position"] = [_new_left_rate, _new_right_rate]
    redis_connection.publish("motor_status", json.dumps(_status_message))
    dt = time.time() - _timestamp
    time.sleep(max(0, interval - dt))

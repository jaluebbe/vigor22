import os
import time
import argparse
import redis
import orjson

if "REDIS_HOST" in os.environ:
    redis_host = os.environ["REDIS_HOST"]
else:
    redis_host = "127.0.0.1"

required_keys = ("utc", "lat", "lon", "hdop", "speed", "track", "hostname")


def process_replay(
    file_name: str, sleep_factor: float, max_sleep: float
) -> None:
    with open(file_name) as f:
        data: list[dict] = orjson.loads(f.read())
    redis_connection = redis.Redis(host=redis_host, decode_responses=True)
    old_utc = None
    for _message in data:
        _utc = _message["utc"]
        if old_utc is not None:
            time.sleep(min(sleep_factor * (_utc - old_utc), max_sleep))
        old_utc = _utc
        _output = {
            _key: _value
            for _key, _value in _message.items()
            if _key in required_keys
        }
        _output["sensor"] = "replay"
        redis_connection.publish("gps", orjson.dumps(_output))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Replay tracking data into the Redis channel 'gps'."
    )
    parser.add_argument("--file", type=str, default="tracking.json")
    parser.add_argument("--max_sleep", type=float, default=5.0)
    parser.add_argument("--sleep_factor", type=float, default=1.0)
    parameters = parser.parse_args()
    process_replay(
        file_name=parameters.file,
        sleep_factor=parameters.sleep_factor,
        max_sleep=parameters.max_sleep,
    )

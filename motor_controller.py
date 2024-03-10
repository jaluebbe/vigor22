#!/usr/bin/env python3
import time
import json
import redis
import MotorAPI

last_heartbeat = 0
interval = 0.08

redis_connection = redis.Redis(decode_responses=True)
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

    _message = pubsub.get_message()
    if _message and _message["type"] == "message" and _state == "Automatik":
        data = json.loads(_message["data"])
        MotorAPI.set_ref(
            int(float(data["left_rate"]) * 100),
            int(float(data["right_rate"]) * 100),
        )

    dt = time.time() - _timestamp
    time.sleep(max(0, interval - dt))

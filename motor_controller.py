#!venv/bin/python3
import time
import orjson
import redis
import MotorAPI

last_heartbeat = 0
heartbeat_interval = 1.0
interval = 0.08

redis_connection = redis.Redis()
pubsub = redis_connection.pubsub()
pubsub.subscribe("client_feedback")


while True:
    _timestamp = time.time()
    if _timestamp - last_heartbeat > heartbeat_interval:
        last_heartbeat = _timestamp
        MotorAPI.send_heartbeat(1000)

    feedback = MotorAPI.process_can_bus()
    _status_message = {
        "utc": _timestamp,
        "hb_state": feedback["hb_state"],
        "motor_status": feedback["motor_status"],
        "motor_left_position": feedback["left_position"],
        "motor_right_position": feedback["right_position"],
    }
    _message = pubsub.get_message()
    if _message and _message["type"] == "message":
        try:
            data = orjson.loads(_message["data"])
            gps_ok = 5 < data["longitude"] < 17
            MotorAPI.set_info(data["speed"], gps_ok, data["project_name"])
            if feedback["hb_state"] == "AUTO":
                _new_left_rate = int(float(data["left_rate"]) * 100)
                _new_right_rate = int(float(data["right_rate"]) * 100)

                MotorAPI.set_motor_targets(_new_left_rate, _new_right_rate)
                _status_message["set_position"] = [
                    _new_left_rate,
                    _new_right_rate,
                ]
            else:
                _status_message["set_position"] = None

        except Exception as e:
            print(f"Error processing client_feedback: {e}")

    redis_connection.publish("motor_status", orjson.dumps(_status_message))
    dt = time.time() - _timestamp
    time.sleep(max(0, interval - dt))

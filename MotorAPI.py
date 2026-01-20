"""CAN-bus interface for motor control system (Daniel's handbox)"""
import can

reg_heart = 0x01
reg_motor_status = 0x05
reg_hb_status = 0x06
reg_pos_l = 0x11
reg_geo_l = 0x13
reg_pos_r = 0x21
reg_geo_r = 0x23
reg_fieldname = 0x60
reg_speed = 0x61
reg_gps = 0x62
reg_req = 0x98

CAN_INTERFACE = 'socketcan'
CAN_CHANNEL = 'can0'
CAN_BITRATE = 125000
CAN_TIMEOUT = 0.05

_hb_state = "INIT"
_motor_status = 0
_pos_l = 0
_pos_r = 0
_speed_str = "     0.0"
_gps_str = "unknown"
_fieldname = "unknown"

def send_heartbeat(value=1000):
    """Send heartbeat to motor controller."""
    with can.Bus(
        interface=CAN_INTERFACE, channel=CAN_CHANNEL, bitrate=CAN_BITRATE
    ) as bus:
        try:
            data = [value % 256, (value // 256) % 256]
            bus.send(
                can.Message(
                    arbitration_id=reg_heart,
                    data=data,
                    is_extended_id=False,
                )
            )
        except Exception as e:
            print(f"Error sending heartbeat: {e}")


def set_motor_targets(left, right):
    """Set target positions for left and right motor (0-10000)."""
    with can.Bus(
        interface=CAN_INTERFACE, channel=CAN_CHANNEL, bitrate=CAN_BITRATE
    ) as bus:
        try:
            left_int = int(left)
            right_int = int(right)
            bus.send(
                can.Message(
                    arbitration_id=reg_geo_l,
                    data=[left_int % 256, (left_int // 256) % 256],
                    is_extended_id=False,
                )
            )
            bus.send(
                can.Message(
                    arbitration_id=reg_geo_r,
                    data=[right_int % 256, (right_int // 256) % 256],
                    is_extended_id=False,
                )
            )
        except Exception as e:
            print(f"Error setting motor targets: {e}")

def set_info(speed, gps_ok, project_name):
    """Cache speed (m/s), GPS status, and project name for handbox requests."""
    global _speed_str, _gps_str, _fieldname
    _speed_str = f"{speed * 3.6:8.1f}"
    _gps_str = f"{'ok' if gps_ok else 'fault':<8}"
    _fieldname = f"{project_name:<8}"[:8]


def process_can_bus(max_messages=50):
    """Process CAN messages: read feedback and respond to handbox requests.
    
    Returns dict: hb_state, motor_status, left_position, right_position
    """
    global _hb_state, _motor_status, _pos_l, _pos_r
    
    with can.Bus(interface=CAN_INTERFACE, channel=CAN_CHANNEL, bitrate=CAN_BITRATE) as bus:
        for _ in range(max_messages):
            try:
                msg = bus.recv(timeout=CAN_TIMEOUT)
                if msg is None:
                    break
                if msg.arbitration_id == reg_req:
                    requested_reg = msg.data[0]

                    if requested_reg == reg_speed:
                        speed_data = list(_speed_str.encode("utf-8"))
                        bus.send(
                            can.Message(
                                arbitration_id=reg_speed,
                                data=speed_data,
                                is_extended_id=False,
                            )
                        )

                    elif requested_reg == reg_gps:
                        gps_data = list(_gps_str.encode("utf-8"))
                        bus.send(
                            can.Message(
                                arbitration_id=reg_gps,
                                data=gps_data,
                                is_extended_id=False,
                            )
                        )

                    elif requested_reg == reg_fieldname:
                        field_data = list(_fieldname[:8].encode("utf-8"))
                        bus.send(
                            can.Message(
                                arbitration_id=reg_fieldname,
                                data=field_data,
                                is_extended_id=False,
                            )
                        )
                elif msg.arbitration_id == reg_pos_l:
                    _pos_l = msg.data[0] + (msg.data[1] << 8)
                elif msg.arbitration_id == reg_pos_r:
                    _pos_r = msg.data[0] + (msg.data[1] << 8)
                elif msg.arbitration_id == reg_motor_status:
                    _motor_status = msg.data[0] + (msg.data[1] << 8)
                elif msg.arbitration_id == reg_hb_status:
                    _hb_state = ""
                    for part in msg.data:
                        if part != 0:
                            _hb_state += chr(part)
            except Exception as e:
                print(f"Error reading CAN message: {e}")
    return {
        "hb_state": _hb_state,
        "motor_status": _motor_status,
        "left_position": _pos_l,
        "right_position": _pos_r
    }

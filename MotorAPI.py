from smbus2 import SMBus

addr = 22

reg_heart = 0x01
reg_status = 0x05
reg_ref_l = 0x10
reg_pos_l = 0x11
reg_vend_l = 0x12
reg_ref_r = 0x20
reg_pos_r = 0x21
reg_vend_r = 0x22

bus = SMBus(1)


def set_state(state=4):
    if state < 0 or state > 4:
        print("State muss zwischen 0 und 4 sein")
        return
    else:
        status = read_i2c(addr, reg_status)
        status &= 0xFF0F
        status |= state << 4
        write_i2c(addr, reg_status, status)
        return


def get_status():
    return read_i2c(addr, reg_status)


def get_state(numbers=False):
    status = get_status()
    state = (status & 0x00F0) >> 4
    if state > 4:
        state = 4
    if numbers:
        return state
    else:
        if state == 1:
            return "Semiautomatik"
        elif state == 2:
            return "Automatik"
        elif state == 3:
            return "Manuell"
        else:
            return "Fehler"


def get_endstops():
    status = get_status()
    endstops = [
        bool(status & 0b1),
        bool(status & 0b10),
        bool(status & 0b100),
        bool(status & 0b1000),
    ]
    return endstops


def get_pos():
    pos_l = read_i2c(addr, reg_pos_l)
    pos_r = read_i2c(addr, reg_pos_r)
    return [pos_l, pos_r]


def set_vend(vend_l, vend_r):
    write_i2c(addr, reg_vend_l, vend_l)
    write_i2c(addr, reg_vend_r, vend_r)
    status = read_i2c(addr, reg_status)
    status |= 0x4000
    write_i2c(addr, reg_status, status)
    return


def get_vend():
    vend_l = read_i2c(addr, reg_vend_l)
    vend_r = read_i2c(addr, reg_vend_r)
    status = read_i2c(addr, reg_status)
    if status & 0x2000:
        print("manuelle kalibration erfolgt und quittiert")
        status &= 0xDFFF
        status |= 0x4000
        write_i2c(addr, reg_status, status)
    return [vend_l, vend_r]


def set_ref(ref_l, ref_r):
    write_i2c(addr, reg_ref_l, ref_l)
    write_i2c(addr, reg_ref_r, ref_r)
    return


def reset_errors():
    status = read_i2c(addr, reg_status)
    status &= 0xE0FF
    write_i2c(addr, reg_status, status)
    return


def send_heartbeat(value=1000):
    write_i2c(addr, reg_heart, value)
    return


def read_i2c(addr, reg_addr):
    try:
        return bus.read_word_data(addr, reg_addr)
    except IOError:
        print("Fehler beim Lesen")
        return 0


def write_i2c(addr, reg_addr, val):
    try:
        bus.write_word_data(addr, reg_addr, val)
    except IOError:
        print("Fehler beim Schreiben")

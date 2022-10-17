import math


def lat2tile(lat_deg: float, zoom: int) -> int:
    lat_rad = math.radians(lat_deg)
    n = 2**zoom
    return int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)


def lon2tile(lon_deg: float, zoom: int) -> int:
    n = 2**zoom
    return int((lon_deg + 180.0) / 360.0 * n)


def y_tile2row(y_tile: int, zoom: int) -> int:
    n = 2**zoom - 1
    return n - y_tile


def lat2row(lat_deg: float, zoom: int) -> int:
    y_tile = lat2tile(lat_deg, zoom)
    return y_tile2row(y_tile, zoom)

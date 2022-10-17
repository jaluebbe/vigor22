import sqlite3
import os
import time
from mbtiles import *

# Switzerland
bounds = [6.02, 45.78, 10.44, 47.83]

source_path = "/Volumes/Geodata/topplus_open"
destination_path = ""
destination_file = os.path.join(destination_path, "topplus_open.mbtile")
target_con = sqlite3.connect(destination_file)
with open("mbtiles.sql", encoding="utf-8") as f:
    target_con.executescript(f.read())

for zoom in range(0, 17):
    t_start = time.time()
    source_file = os.path.join(source_path, f"{zoom}.mbtile")
    if not os.path.isfile(source_file):
        print(f"Skipping zoom level {zoom}.")
        continue
    source_con = sqlite3.connect(f"file:{source_file}?mode=ro", uri=True)
    _col_start = lon2tile(bounds[0], zoom)
    _col_end = lon2tile(bounds[2], zoom)
    _row_start = lat2row(bounds[1], zoom)
    _row_end = lat2row(bounds[3], zoom)
    cur = source_con.cursor()
    source_iter = cur.execute(
        "SELECT * FROM tiles WHERE zoom_level = ? and tile_column >= ? and "
        "tile_column <= ? and tile_row >= ? and tile_row <= ?",
        (zoom, _col_start - 4, _col_end + 4, _row_start - 4, _row_end + 4),
    )
    with target_con:
        target_con.executemany(
            "INSERT INTO tiles(zoom_level, tile_column, tile_row, "
            "tile_data, last_modified) VALUES(?, ?, ?, ?, ?)",
            source_iter,
        )
    cur.close()
    source_con.close()
    t_stop = time.time()
    print(f"Processing {zoom}.mbtile took {t_stop-t_start:.3f}s.")
target_con.close()

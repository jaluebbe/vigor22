import tempfile
import os
from fastapi import FastAPI, Form, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, Response
import uvicorn
import geopandas
import json
import sqlite3
from mbtiles import y_tile2row

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse("/static/shapefile_conversion.html")


@app.post("/api/convert_shape_files/")
async def convert_shape_files(files: list[UploadFile], input_crs: str = Form()):
    shapefiles = [
        file.filename
        for file in files
        if os.path.splitext(file.filename)[1].lower()
        in (".shp", ".zip", ".json", ".geojson")
    ]
    if len(shapefiles) == 0:
        raise HTTPException(status_code=404, detail="No shape data provided.")
    with tempfile.TemporaryDirectory() as dir_name:
        for file in files:
            with open(os.path.join(dir_name, file.filename), "wb") as f:
                f.write(file.file.read())
        file_name = shapefiles[0]
        myshpfile = geopandas.read_file(os.path.join(dir_name, file_name))
        if myshpfile.crs is not None:
            original_crs = myshpfile.crs.srs
        else:
            original_crs = None
        myshpfile = myshpfile.set_crs(input_crs)
        return {
            "file_name": os.path.splitext(file_name)[0],
            "geojson": json.loads(myshpfile.to_crs("EPSG:4326").to_json()),
            "input_crs": input_crs,
            "original_crs": original_crs,
        }


@app.get("/api/mbtiles/topplus_open/{zoom_level}/{x}/{y}.png")
def get_mbtile_topplus_open(zoom_level: int, x: int, y: int):
    tile_column = x
    tile_row = y_tile2row(y, zoom_level)
    db_file_name = "topplus_open.mbtile"
    db_connection = sqlite3.connect(f"file:{db_file_name}?mode=ro", uri=True)
    cursor = db_connection.execute(
        "SELECT tile_data FROM tiles "
        "WHERE zoom_level = ? and tile_column = ? and tile_row = ?",
        (zoom_level, tile_column, tile_row),
    )
    result = cursor.fetchone()
    cursor.close()
    db_connection.close()
    if result is None:
        raise HTTPException(status_code=404, detail="Tile not found.")
    return Response(content=result[0], media_type="image/png")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

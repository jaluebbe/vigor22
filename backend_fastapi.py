#!/usr/bin/env python3
import tempfile
import os
import re
import zipfile
from fastapi import FastAPI, Form, UploadFile, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, Response, JSONResponse
import uvicorn
import geopandas
import json
import sqlite3
from mbtiles import y_tile2row

epsg_pattern = re.compile("^(?:EPSG|epsg):[0-9]{4,5}$")

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/fonts", StaticFiles(directory="fonts"), name="fonts")


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
    elif len(shapefiles) > 1:
        raise HTTPException(status_code=500, detail="Too many files.")
    with tempfile.TemporaryDirectory() as dir_name:
        for file in files:
            with open(os.path.join(dir_name, file.filename), "wb") as f:
                f.write(file.file.read())
        file_name = shapefiles[0]
        file_path = os.path.join(dir_name, file_name)
        if file_name.lower().endswith(".zip"):
            with zipfile.ZipFile(file_path) as z:
                shp_in_zip = [
                    _file.filename
                    for _file in z.filelist
                    if _file.filename.lower().endswith(".shp")
                    and not _file.filename.startswith("__MACOSX/")
                ]
            if len(shp_in_zip) > 1:
                raise HTTPException(status_code=500, detail="Too many files.")
            myshpfile = geopandas.read_file(f"{file_path}!{shp_in_zip[0]}")
        else:
            myshpfile = geopandas.read_file(file_path)
        if myshpfile.crs is not None:
            original_crs = myshpfile.crs.srs
            if epsg_pattern.match(original_crs) is None:
                myshpfile = myshpfile.set_crs(input_crs)
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


@app.get("/api/vector/metadata/{region}.json")
def get_vector_metadata(region: str, request: Request):
    db_file_name = f"{region}.mbtiles"
    if not os.path.isfile(db_file_name):
        raise HTTPException(
            status_code=404, detail=f"Region '{region}' not found."
        )
    db_connection = sqlite3.connect(f"file:{db_file_name}?mode=ro", uri=True)
    cursor = db_connection.execute("SELECT * FROM metadata")
    result = cursor.fetchall()
    cursor.close()
    db_connection.close()
    if result is None:
        raise HTTPException(status_code=404, detail="Metadata not found.")
    if request.url.port is None:
        # workaround for operation behind reverse proxy
        port_suffix = ""
        scheme = "https"
    else:
        port_suffix = f":{request.url.port}"
        scheme = request.url.scheme
    metadata = {
        "tilejson": "2.0.0",
        "scheme": "xyz",
        "tiles": [
            f"{scheme}://{request.url.hostname}{port_suffix}"
            f"/api/vector/tiles/{region}/{{z}}/{{x}}/{{y}}.pbf"
        ],
    }
    for key, value in result:
        if key == "json":
            metadata.update(json.loads(value))
        elif key in ("minzoom", "maxzoom"):
            metadata[key] = int(value)
        elif key == "center":
            continue
        elif key == "bounds":
            metadata[key] = [float(_value) for _value in value.split(",")]
        else:
            metadata[key] = value
    return metadata


@app.get("/api/vector/style/{style_name}.json")
def get_vector_style(style_name: str, request: Request):
    style_file_name = f"{style_name}_style.json"
    if not os.path.isfile(style_file_name):
        raise HTTPException(
            status_code=404, detail=f"Style '{style_name}' not known."
        )
    with open(style_file_name) as f:
        style = json.load(f)
    if request.url.port is None:
        # workaround for operation behind reverse proxy
        port_suffix = ""
        scheme = "https"
    else:
        port_suffix = f":{request.url.port}"
        scheme = request.url.scheme
    style["sources"]["openmaptiles"]["url"] = (
        f"{scheme}://{request.url.hostname}{port_suffix}"
        "/api/vector/metadata/osm_offline.json"
    )
    style["glyphs"] = (
        f"{scheme}://{request.url.hostname}{port_suffix}"
        "/fonts/{fontstack}/{range}.pbf"
    )
    if style.get("sprite") is not None:
        style["sprite"] = (
            f"{scheme}://{request.url.hostname}{port_suffix}"
            f"/static/{style_name}/sprite"
        )
    return style


@app.get("/api/vector/tiles/{region}/{zoom_level}/{x}/{y}.pbf")
def get_vector_tiles(region: str, zoom_level: int, x: int, y: int):
    tile_column = x
    tile_row = y_tile2row(y, zoom_level)
    db_file_name = f"{region}.mbtiles"
    if not os.path.isfile(db_file_name):
        raise HTTPException(
            status_code=404, detail=f"Region '{region}' not found."
        )
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
    return Response(
        content=result[0],
        media_type="application/octet-stream",
        headers={"Content-Encoding": "gzip"},
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

#!/usr/bin/env python3
import tempfile
import os
import re
import zipfile
from fastapi import FastAPI, Form, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import uvicorn
import geopandas
import json
import routers.offline_map as offline_map


epsg_pattern = re.compile("^(?:EPSG|epsg):[0-9]{4,5}$")

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/fonts", StaticFiles(directory="fonts"), name="fonts")

app.include_router(offline_map.router)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse("/static/boundaries.html")


def shape_file_conversion(
    files: list[UploadFile], input_crs: str = "EPSG:4326"
):
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
                print([_file.filename for _file in z.filelist])
                shp_in_zip = [
                    _file.filename
                    for _file in z.filelist
                    if _file.filename.lower().endswith(".shp")
                    and not _file.filename.startswith("__MACOSX/")
                    and not _file.filename.startswith("Rx/")
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


@app.post("/api/convert_shape_files/")
async def convert_shape_files(files: list[UploadFile], input_crs: str = Form()):
    return shape_file_conversion(files, input_crs)


@app.post("/api/convert_plan_shape_files/")
async def convert_plan_shape_files(files: list[UploadFile]):
    result = shape_file_conversion(files)
    all_properties = [
        _feature["properties"] for _feature in result["geojson"]["features"]
    ]
    known_rate_keys = set(all_properties[0].keys()).intersection(
        ["RATE", "Menge", "rate"]
    )
    # unit_keys: "Unit", "Einheit"
    print(known_rate_keys)
    print(set(all_properties[0].keys()))
    if len(known_rate_keys) == 1:
        rate_key = known_rate_keys.pop()
    else:
        raise HTTPException(
            status_code=404, detail=f"No unique rate key found."
        )
    rate_values = [
        _property[rate_key]
        for _property in all_properties
        if _property[rate_key] > 0
    ]
    result["min_rate"] = min(rate_values)
    max_rate = max(rate_values)
    result["max_rate"] = max_rate
    for _property in all_properties:
        _property["V22RATE"] = _property[rate_key] / max_rate
    return result


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

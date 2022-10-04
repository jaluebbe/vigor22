import tempfile
import os
from fastapi import FastAPI, Form, UploadFile
from fastapi.staticfiles import StaticFiles
import uvicorn
import geopandas
import json

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.post("/api/convert_shape_files/")
async def convert_shape_files(files: list[UploadFile], input_crs: str = Form()):
    shapefiles = [
        file.filename for file in files if file.filename.endswith(".shp")
    ]
    with tempfile.TemporaryDirectory() as dir_name:
        for file in files:
            with open(os.path.join(dir_name, file.filename), "wb") as f:
                f.write(file.file.read())
        file_name = shapefiles[0]
        myshpfile = geopandas.read_file(os.path.join(dir_name, file_name))
        if myshpfile.crs is None:
            myshpfile = myshpfile.set_crs(input_crs)
        input_crs = myshpfile.crs.srs
        return {
            "file_name": file_name[:-4],
            "geojson": json.loads(myshpfile.to_crs("EPSG:4326").to_json()),
            "input_crs": input_crs,
        }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

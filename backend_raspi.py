#!venv/bin/python3
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

import routers.offline_map as offline_map
import routers.datasets as datasets
import routers.vigor22

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
if Path("fonts").is_dir():
    app.mount("/fonts", StaticFiles(directory="fonts"), name="fonts")
log_directory = Path("../logs_json")
if not log_directory.is_dir():
    log_directory.mkdir()
app.mount("/archive", StaticFiles(directory=log_directory), name="archive")
project_directory = Path("../projects")
if not project_directory.is_dir():
    project_directory.mkdir()
app.mount(
    "/projects", StaticFiles(directory=project_directory), name="projects"
)

app.include_router(offline_map.router)
app.include_router(datasets.router)
app.include_router(routers.vigor22.router)


@app.get("/", include_in_schema=False)
async def root(request: Request):
    return RedirectResponse("/static/setup.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)

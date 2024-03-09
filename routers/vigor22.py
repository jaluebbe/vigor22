import os
import orjson
import pathlib
from redis import asyncio as aioredis
from fastapi import APIRouter, WebSocket, HTTPException, UploadFile
from routers import redis_connector

if "REDIS_HOST" in os.environ:
    redis_host = os.environ["REDIS_HOST"]
else:
    redis_host = "127.0.0.1"

router = APIRouter()
project_directory = pathlib.Path("../projects")


@router.websocket("/ws/vigor22")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await redis_connector(
        websocket,
        source_channel="vigor22_output",
        target_channel="vigor22_control",
    )


@router.get("/api/vigor22/available_projects")
async def get_available_projects():
    projects = [
        _file.name.rstrip(".json") for _file in project_directory.glob("*.json")
    ]
    return projects


@router.get("/api/vigor22/get_project")
async def get_project():
    redis_connection = aioredis.Redis(host=redis_host, decode_responses=True)
    current_project = await redis_connection.get("project_file")
    if current_project is None:
        raise HTTPException(status_code=404, detail="no active project.")
    return current_project.rstrip(".json")


@router.get("/api/vigor22/set_project")
async def set_project(project_name: str):
    file_path = project_directory / f"{project_name}.json"
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="project file not found.")
    redis_connection = aioredis.Redis(host=redis_host, decode_responses=True)
    await redis_connection.set("project_file", file_path.name)
    await redis_connection.publish(
        "vigor22_control", orjson.dumps({"info": "project_changed"})
    )
    return project_name


@router.get("/api/vigor22/delete_project")
async def delete_project(project_name: str):
    file_path = project_directory / f"{project_name}.json"
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="project file not found.")
    file_path.unlink()
    return project_name


@router.post("/api/vigor22/upload_projects")
async def upload_projects(files: list[UploadFile]):
    project_files = []
    for file in files:
        if not file.filename.lower().endswith(".json"):
            raise HTTPException(
                status_code=400, detail=f"{file.filename} is not a JSON file."
            )
        _data = orjson.loads(file.file.read())
        if not {"boundaries", "plan", "settings"}.issubset(_data.keys()):
            raise HTTPException(
                status_code=400,
                detail=f"{file.filename} is not a valid project file.",
            )
        target_path = project_directory / file.filename
        if target_path.is_file():
            raise HTTPException(
                status_code=409, detail=f"{file.filename} already exists."
            )
        target_path.write_bytes(orjson.dumps(_data))
        project_files.append(target_path.name.rstrip(".json"))
    return project_files

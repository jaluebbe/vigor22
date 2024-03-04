from fastapi import APIRouter, WebSocket
from routers import redis_connector

router = APIRouter()


@router.websocket("/ws/vigor22")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await redis_connector(
        websocket,
        source_channel="vigor22_output",
        target_channel="vigor22_control",
    )

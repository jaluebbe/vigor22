import os
import json
import asyncio
import logging
from redis import asyncio as aioredis
from fastapi import WebSocket


if "REDIS_HOST" in os.environ:
    redis_host = os.environ["REDIS_HOST"]
else:
    redis_host = "127.0.0.1"


async def get_channel_data(channel):
    redis_connection = aioredis.Redis(host=redis_host, decode_responses=True)
    pubsub = redis_connection.pubsub(ignore_subscribe_messages=True)
    await pubsub.subscribe(channel)
    while True:
        message = await pubsub.get_message()
        if message is not None:
            _channel = message["channel"]
            _data = json.loads(message["data"])
            _data["channel"] = _channel
            return _data
        await asyncio.sleep(0.01)


async def redis_connector(
    websocket: WebSocket, source_channel: str, target_channel: str
):
    async def consumer_handler(
        redis_connection: aioredis.client.Redis,
        websocket: WebSocket,
        target_channel: str,
    ):
        async for message in websocket.iter_text():
            await redis_connection.publish(target_channel, message)

    async def producer_handler(
        pubsub: aioredis.client.PubSub,
        websocket: WebSocket,
        source_channel: str,
    ):
        await pubsub.subscribe(source_channel)
        async for message in pubsub.listen():
            await websocket.send_text(message["data"])

    redis_connection = aioredis.Redis(host=redis_host, decode_responses=True)
    pubsub = redis_connection.pubsub(ignore_subscribe_messages=True)
    consumer_task = asyncio.create_task(
        consumer_handler(redis_connection, websocket, target_channel)
    )
    producer_task = asyncio.create_task(
        producer_handler(pubsub, websocket, source_channel)
    )
    done, pending = await asyncio.wait(
        [consumer_task, producer_task], return_when=asyncio.FIRST_COMPLETED
    )
    logging.debug(f"Done task: {done}")
    for task in pending:
        logging.debug(f"Cancelling task: {task}")
        task.cancel()
    await redis_connection.close()

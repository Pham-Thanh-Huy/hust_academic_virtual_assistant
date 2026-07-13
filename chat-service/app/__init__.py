"""
    *** 27/11/2025
    *** this package will init application with fast_api
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.apis import chat_router, embedding_router

from fastapi.middleware.cors import CORSMiddleware
import py_eureka_client.eureka_client as eureka_client

from app.config.load_env import Env

@asynccontextmanager
async def lifespan(app: FastAPI):
    await eureka_client.init_async(
        eureka_server=Env.Eureka.server,
        app_name=Env.Eureka.app_name,
        instance_port=Env.Eureka.instance_port,
        instance_host=Env.Eureka.instance_host
    )
    yield

def init_fast_api_app():
    app = FastAPI(lifespan=lifespan)

    app.include_router(chat_router, prefix="/api/v1")
    app.include_router(embedding_router, prefix="/api/v1")
    return app

app = init_fast_api_app()


import chromadb
from chromadb import Client
from chromadb.config import Settings
import os
from pathlib import Path

def init_chroma_db(collection_name, host: str, port: int):
    client = chromadb.HttpClient(host=host, port=port)

    collection = client.get_or_create_collection(name=collection_name)
    return collection, client

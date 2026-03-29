import chromadb

from app.config.load_env import Env


def init_chroma_db():
    client = chromadb.HttpClient(host=Env.Chroma.host, port=Env.Chroma.port)

    collection = client.get_or_create_collection(name=Env.Chroma.collection)
    return collection, client

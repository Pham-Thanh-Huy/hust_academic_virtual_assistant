import chromadb

from app.config.load_env import Env


def init_chroma_db():
    client = chromadb.HttpClient(
        host=Env.Chroma.host,
        port=Env.Chroma.port,
        tenant="default_tenant",
        database="default_database"
    )

    print("CHROMA HEARTBEAT:", client.heartbeat())

    collection = client.get_collection(
        name=Env.Chroma.collection
    )

    print("CHROMA COLLECTION:", collection.name)

    return collection, client
import os

from dotenv import load_dotenv

load_dotenv()

class Env:
    class Chroma:
        collection=os.getenv("CHROMA_COLLECTION")
        host=os.getenv("CHROMA_HOST")
        port=int(os.getenv("CHROMA_PORT", 8000))

    class Mysql:
        host=os.getenv("MYSQL_HOST")
        port=os.getenv("MYSQL_PORT")
        user=os.getenv("MYSQL_USER")
        password=os.getenv("MYSQL_PASSWORD")
        database=os.getenv("MYSQL_DATABASE")
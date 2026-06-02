import logging

import numpy as np

from app.config.chroma_config import init_chroma_db
from app.utils.constants import Constant
from app.utils.open_ai_util import embedding_open_ai


def query_vector_database_course(input: str) -> dict[str]:
    try:
        collection, client = init_chroma_db()
        data = embedding_open_ai(input)

        embeddings = np.array([data[0].embedding], dtype=float)
        # print("Query dim =", len(data[0].embedding))

        data = collection.query(
            query_embeddings=embeddings,
            n_results=5

        )
        return data.get("documents")

    except Exception as e:
        logging.error(f"[ERROR-QUERY-VECTOR-DB-COURSE] {e}")
        return None
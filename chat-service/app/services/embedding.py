from app.config.chroma_config import init_chroma_db
from app.config.mysql_config import init_mysql_db
from app.utils.constants import Constant
from app.utils.open_ai_util import init_open_ai, embedding_open_ai

client = init_open_ai()

"""
    28/11/2025
    GET course in db, check exist, embedding and save vector db!
"""
def process_course():
    result = get_course()

    texts = combine_text(result)
    metadatas = get_metadata(result)

    # ---- Embedding ----
    data = embedding_course_batch(texts)
    embeddings = [dt.embedding for dt in data]

    course_collection, client = init_chroma_db(Constant.EMBEDDING.COURSE_EMBEDDING, "localhost", 8123)

    # ---- batch embedding (chromadb cannot save ? 5464 token ) ----
    max_batch_size = 5000

    ids_list = [str(r.get("id")) for r in result]

    total = len(result)
    for start_idx in range(0, total, max_batch_size):
        end_idx = min(start_idx + max_batch_size, total)

        ids_chunk = ids_list[start_idx:end_idx]
        texts_chunk = texts[start_idx:end_idx]
        embeddings_chunk = embeddings[start_idx:end_idx]
        metadatas_chunk = metadatas[start_idx:end_idx]

        course_collection.add(
            ids=ids_chunk,
            documents=texts_chunk,
            embeddings=embeddings_chunk,
            metadatas=metadatas_chunk,
        )

    return {
        "data": None,
        "status": {
            "message": "Success!",
            "code": 200
        }
    }

def get_course():
    mydb = init_mysql_db("localhost", 3307, "root", "root", "hust_assistant_data")
    cursor = mydb.cursor(dictionary=True)

    cursor.execute("SELECT * FROM course")
    result = cursor.fetchall()
    return result

"""
    Input: course (a dictionary has get in mysql db)
    Output: combine_text
"""
def combine_text(courses):
    combine_texts = [(f"Name: {course['name']} - English_name: {course['english_name']} - Course_code: {course['code']} "
                      f"- Duration: {course['duration']} - Institute_manage: {course['institute_manage']} - Credits: {course['credits']} "
                      f"- Credit_fee: {course['credit_fee']} - List_course_condtion: {course['list_course_condtion']} - Weight: {course['weight']}")
                     for course in courses]
    return combine_texts

"""
    Input: text will embedding (text can be an array or list)
    Ouput: list data has metadata (object, index, embedding[])
"""
def embedding_course_batch(all_texts, chunk_size=100):
    """
        Generate multiple embedded text segments, automatically segmenting to avoid too many tokens
    """
    all_embeddings = []

    for i in range(0, len(all_texts), chunk_size):
        chunk = all_texts[i:i + chunk_size]
        embeddings = embedding_open_ai(chunk)
        all_embeddings.extend(embeddings)
    return all_embeddings

"""
    Input: course (a dictionary has get in mysql db)
    Output: list metadata
"""
def get_metadata(courses):
    metadatas = [{
        "name": course.get("name"),
        "english_name": course.get("english_name"),
        "code": course.get("code"),
        "duration": course.get("duration"),
        "institute_manage": course.get("institute_manage"),
        "credits": course.get("credits"),
        "credit_fee": course.get("credit_fee"),
        "list_course_condition": course.get("list_course_condtion"),
        "weight": course.get("weight")
    } for course in courses]
    return metadatas
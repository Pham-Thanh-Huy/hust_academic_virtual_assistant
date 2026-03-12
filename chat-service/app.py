from app.services.query_embedding import query_vector_database_course

if __name__ == '__main__':
    query_vector_database_course("Lập trình mạng")
    import uvicorn
    uvicorn.run('app:app', host='0.0.0.0', port=1923, reload=True)
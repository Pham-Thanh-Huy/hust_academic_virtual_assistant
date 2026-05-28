import httpx
from openai import OpenAI
from openai import AsyncOpenAI


def init_open_ai():
    client = httpx.Client(
        verify=False
    )

    client = OpenAI(http_client=client)
    return client


def init_async_open_ai():
    http_client = httpx.AsyncClient(
        verify=False
    )
    client = AsyncOpenAI(http_client=http_client)
    return client

"""
    Input: str (text will embedding)
    Ouput: list embedding (eg: [12123, 123, 3235, etc..])
"""
def embedding_open_ai(input: str):
    client = init_open_ai()
    res = client.embeddings.create(
        model="text-embedding-3-large",
        input=input
    )
    return res.data

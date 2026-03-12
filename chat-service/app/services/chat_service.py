from app.utils.open_ai_util import init_open_ai

client = init_open_ai()

def chat(input: str) -> dict:
    res = client.responses.create(
        model = "gpt-5-nano",
        input = input
    )

    return {
        "data": res.output_text,
        "status": {
            "message": "Sucess!",
            "code": 200
        }
    }
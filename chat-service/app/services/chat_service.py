from app.utils.open_ai_util import init_open_ai

client = init_open_ai()

def chat(input: str, model: str) -> dict:


    res = client.responses.create(
        model = model,
        input = input
    )


    return {
        "data": res.output_text,
        "status": {
            "message": "Sucess!",
            "code": 200
        }
    }
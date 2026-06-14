FROM python:3.11-slim-trixie

WORKDIR app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prompt ./prompt
COPY app.py .
COPY app ./app

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "1923"]
FROM docker.arvancloud.ir/python:3-alpine

EXPOSE 8000/tcp

WORKDIR /app
COPY . .
CMD ["python3", "-m", "http.server"]

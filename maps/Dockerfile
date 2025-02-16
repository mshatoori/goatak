FROM ghcr.io/mshatoori/goatak-maps:latest

EXPOSE 8000/tcp

WORKDIR /app
COPY . .
CMD ["python3", "-m", "http.server"]

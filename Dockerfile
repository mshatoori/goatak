FROM golang:alpine AS builder

ARG branch
ARG commit
ARG https_proxy

WORKDIR /build
COPY ./go.mod .
COPY ./go.sum .
# RUN go mod download
COPY . .
ARG GOPROXY=https://goproxy.io
RUN --mount=type=cache,target=/go/pkg/mod go build -o dist/ -ldflags '-w -s -X main.gitRevision=$commit -X main.gitBranch=$branch' ./cmd/...

FROM alpine

EXPOSE 8080/tcp
EXPOSE 8088/tcp
EXPOSE 8446/tcp
EXPOSE 8999/tcp
EXPOSE 8999/udp
EXPOSE 6969/udp

WORKDIR /app
COPY --from=builder /build/dist/webclient /app/webclient
COPY ./data /app/data
COPY ./goatak_client.yml /app/

CMD ["./webclient", "-debug"]

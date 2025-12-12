# GoATAK Project Knowledge

## Overview

GoATAK is a Go-based implementation of an ATAK (Android Team Awareness Kit) server and client. It provides a TAK server/CoT (Cursor on Target) router and a web-based client for situational awareness.

## Architecture

### Backend

- **Entry Point**: `cmd/webclient/main.go`
  - Despite the name `webclient`, this binary appears to function as the primary server and client application.
  - It handles HTTP serving, TCP connections (CoT), database interactions, and API endpoints.
- **Key Directories**:
  - `cmd/webclient`: Main application logic (HTTP server, TCP handler, DB).
  - `pkg`: Public libraries.
    - `cot`: V1 (XML) and V2 (Protobuf) CoT protocol handling.
    - `cotproto`: Protobuf definitions.
    - `model`: Data models.
  - `internal`: Internal logic.
    - `dnsproxy`, `geo`, `tracking`.
- **Configuration**:
  - `goatak_client.yml`: Main configuration file (copied to Docker image).
  - `goatak_server.yml`: Server-specific config?

### Frontend

- **Location**: `front/`
- **Tech Stack**: Vite, React (likely, based on structure), Leaflet, Milsymbol.
- **Build**:
  - **Development**: Uses `Dockerfile.dev` (run by `setup/docker-compose.yaml`), serving via Vite on port 5173.
  - **Production**: Uses `front/Dockerfile`.
    - Multi-stage build: Node 20 (build) -> Nginx (alpine).
    - Serves static assets from `dist` folder on port 80.
- **Note**: The backend (`webclient` binary) does _not_ appear to bundle the frontend. They are deployed as separate services in the Docker environment.

### Infrastructure

- **Docker**:
  - **Main Entry Point**: `setup/docker-compose.yaml`
    - Defines services: `webclient`, `map` (tile server), `frontend` (Vite dev server), and `gpsd`.
    - Uses `ghcr.io/mshatoori/goatak-client:latest` and `ghcr.io/mshatoori/goatak-maps:latest`.
    - Mounts `./config/` and `./config.sqlite3`.
  - `Dockerfile`: Builds the Go application `webclient`.
  - `docker-compose.yaml` (root): Seems to be a simplified or legacy compose file.
- **Build System**: `Makefile`
  - `make build`: Builds Go binaries.
  - `make install-mcp`: Sets up Model Context Protocol language server.

## Key Workflows

### Development

- **Lint**: `make lint`
- **Test**: `make test`
- **Build**: `make build`
- **MCP Setup**: See `MCP_SETUP.md`.

### Run

- **Full Environment**:
  ```bash
  cd setup
  docker compose up
  ```
- **Local (Binary)**: `./dist/webclient`

## Dependencies

- **Go**: `go 1.24.3` (from `go.mod`)
- **Key Libraries**:
  - `gin`? (Need to verify web framework, `go.mod` doesn't show `gin`. It shows `golang.org/x/net`. Maybe stdlib or `gorilla`? `gorilla/websocket` is indirect.)
  - `gorm` (Database)
  - `viper` (Configuration)
  - `protobuf` (Data serialization)

## Notes

- The project structure uses a "monolithic" binary approach where `webclient` seems to do everything.
- `package main` also appeared in `ais/receive.go`.
  - This is a standalone utility that connects to `wss://stream.aisstream.io` and forwards AIS data as NMEA sentences to `localhost:1234` via UDP.
  - It uses `github.com/BertoldVdb/go-ais`.

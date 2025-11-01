# GoATAK Front-End

This directory contains the front-end application for GoATAK, a web-based interface for TAK (Tactical Assault Kit) operations.

## Prerequisites

Before running the front-end, ensure you have the following installed:

- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later

## Environment Setup

The front-end is designed to run in a containerized environment using Docker. It communicates with a separate back-end service that must be running on port 8080.

### Network Configuration

The front-end uses a Docker network named `goatak-network` to communicate with the back-end service. Ensure the back-end is accessible on this network.

## Building and Running with Docker

### Using Docker Compose (Recommended)

1. **Navigate to the front-end directory:**
   ```bash
   cd front
   ```

2. **Build and start the services:**
   ```bash
   docker-compose up --build
   ```

   This command will:
   - Build the front-end Docker image using the provided Dockerfile
   - Start the front-end service on port 80
   - Ensure the back-end service is running (placeholder configuration included)

3. **Access the application:**
   Open your web browser and navigate to `http://localhost`

### Manual Docker Commands

If you prefer to run Docker commands manually:

1. **Build the image:**
   ```bash
   docker build -t goatak-frontend .
   ```

2. **Run the container:**
   ```bash
   docker run -d -p 80:80 --name goatak-frontend goatak-frontend
   ```

## Configuration Notes

- **Back-end Dependency**: The front-end requires a back-end service running on port 8080. The back-end handles API requests, WebSocket connections, and data processing.
- **Port Mapping**: The front-end is served on port 80 inside the container and mapped to port 80 on the host.
- **Static Files**: Static assets (CSS, JS, images) are served with caching headers for optimal performance.
- **Proxy Configuration**: Nginx is configured to proxy API calls and WebSocket connections to the back-end service.
- **Environment Variables**: Currently, no environment variables are required for the front-end. Back-end configuration should be handled separately.

## Development

For development purposes, you can mount the local files into the container:

```bash
docker run -d -p 80:80 -v $(pwd)/static:/usr/share/nginx/html/static -v $(pwd)/templates:/usr/share/nginx/html/templates --name goatak-frontend-dev goatak-frontend
```

## Troubleshooting

- Ensure Docker and Docker Compose are properly installed and running.
- Verify that port 80 is not in use by other services.
- Check that the back-end service is accessible on port 8080.
- Review Docker logs for any build or runtime errors: `docker-compose logs`

## Architecture

The front-end consists of:
- **Nginx**: Web server and reverse proxy
- **Static Files**: HTML, CSS, JavaScript, and assets
- **Templates**: Server-side rendered HTML templates
- **Components**: Vue.js-based UI components for map interactions, data display, and user controls
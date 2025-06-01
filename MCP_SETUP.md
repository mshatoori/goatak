# MCP Language Server Setup for GoATAK

This document describes how to set up the MCP Language Server for the GoATAK project.

## Prerequisites

1. **Go**: Make sure Go is installed on your system
   ```bash
   go version
   ```

2. **gopls**: Install the Go language server
   ```bash
   go install golang.org/x/tools/gopls@latest
   ```

## Installation

Install the MCP Language Server:

```bash
go install github.com/isaacphi/mcp-language-server@latest
```

## Configuration

The MCP Language Server has been configured for two different clients:

### 1. Standard MCP Client (VS Code)

Configuration in `.vscode/settings.json`:
- **Workspace**: `/home/mohammadreza/GolandProjects/goatak`
- **Language Server**: `gopls`
- **Environment Variables**: Configured for the current user's Go environment

### 2. RooCode Configuration

Configuration in `.roo/mcp.json`:
- **Workspace**: `/home/mohammadreza/GolandProjects/goatak`
- **Language Server**: `gopls`
- **Environment Variables**: Configured for the current user's Go environment

Both configurations use identical settings to ensure consistent behavior across different MCP clients.

## Environment Variables

The configuration includes these environment variables (adjust paths as needed for your system):

- `PATH`: Includes Go binary and Go tools paths
- `GOPATH`: Go workspace path
- `GOCACHE`: Go build cache directory
- `GOMODCACHE`: Go module cache directory

## Verification

To verify the setup:

1. Check that `mcp-language-server` is installed:
   ```bash
   which mcp-language-server
   ```

2. Check that `gopls` is installed:
   ```bash
   which gopls
   ```

3. Restart VS Code to load the new MCP configuration

## Customization

If your Go installation or paths are different, update the environment variables in `.vscode/settings.json`:

- Update `PATH` to include your Go binary locations
- Update `GOPATH`, `GOCACHE`, and `GOMODCACHE` to match your system

You can find your current Go environment with:
```bash
go env
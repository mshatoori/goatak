default: all

.PHONY: all
all: dep test build

GIT_REVISION=$(shell git describe --tags --always --dirty)
GIT_BRANCH=$(shell git rev-parse --symbolic-full-name --abbrev-ref HEAD)

LDFLAGS=-ldflags "-s -X main.gitRevision=$(GIT_REVISION) -X main.gitBranch=$(GIT_BRANCH)"

.PHONY: install_linter
install_linter:
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.56.2

.PHONY: clean
clean:
	[ -d dist ] || mkdir dist
	rm -rf dist/* || true

.PHONY: dep
dep:
	go mod tidy

.PHONE: update
update:
	rm go.sum; go get -u ./...

.PHONY: protoc
protoc:
	protoc -I=./protobuf --go_out=./pkg/cotproto --go_opt=module=github.com/kdudkov/goatak/cotproto --experimental_allow_proto3_optional ./protobuf/*.proto

.PHONY: checkdep
checkdep:
	go list -u -f '{{if (and (not (or .Main .Indirect)) .Update)}}{{.Path}}: {{.Version}} -> {{.Update.Version}}{{end}}' -m all 2> /dev/null

.PHONY: test
test:
	go test -v ./...

.PHONY: build
build: clean dep
	go build $(LDFLAGS) -o dist/ ./cmd/...

.PHONY: lint
lint:
	golangci-lint run ./...

.PHONY: lint-new
lint-new:
	golangci-lint run ./... --new-from-rev $(shell git describe --tags --abbrev=0)

.PHONY: fmt
fmt:
	goimports -w .
	gofmt -w .

.PHONY: gox
gox: clean dep
	GOARM=6 gox --osarch="linux/amd64 linux/arm windows/amd64 darwin/arm64" -output "dist/{{.OS}}_{{.Arch}}/{{.Dir}}" $(LDFLAGS) ./cmd/...

.PHONY: install-mcp
install-mcp:
	@echo "Installing MCP Language Server..."
	go install github.com/isaacphi/mcp-language-server@latest
	@echo "Installing gopls..."
	go install golang.org/x/tools/gopls@latest
	@echo "MCP Language Server setup complete!"

.PHONY: check-mcp
check-mcp:
	@echo "Checking MCP Language Server installation..."
	@which mcp-language-server || echo "mcp-language-server not found in PATH"
	@which gopls || echo "gopls not found in PATH"
	@echo "Go environment:"
	@go env GOPATH GOCACHE GOMODCACHE

.PHONY: mcp-help
mcp-help:
	@echo "MCP Language Server targets:"
	@echo "  install-mcp  - Install MCP Language Server and gopls"
	@echo "  check-mcp    - Check MCP installation and environment"
	@echo "  mcp-help     - Show this help message"
	@echo ""
	@echo "See MCP_SETUP.md for detailed setup instructions"
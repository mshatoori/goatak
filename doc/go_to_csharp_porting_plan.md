# Comprehensive Plan to Port GoATak from Go to C#

## Introduction for AI Orchestration

This plan is designed for AI orchestration. Use Orchestrator mode to break phases into subtasks via new_task, delegating to Architect (planning), Code (implementation), Debug (testing). Track progress with update_todo_list. Use execute_command for dotnet CLI operations, read_file/apply_diff/write_to_file for code changes, and attempt_completion per phase/subtask to confirm progress. Each subtask is atomic with clear dependencies and success criteria.

## 1. Analysis of Current Go Architecture

The GoATak project is a TAK (Tactical Assault Kit) application built in Go, focusing on real-time messaging, client management, and web-based visualization for tactical scenarios. Core functionalities include:

- **Backend Services**:
  - Client Handling: Manages enrollment (`internal/client/enroll.go`), mesh networking (`internal/client/mesh_handler.go`), UDP flows (`internal/client/udp_flow.go`), and RabbitMQ integration (`internal/client/rabbit_flow.go`).
  - Messaging: Processes Cursor-on-Target (CoT) messages via Protobuf (`cmd/webclient/messaging.go`, `internal/model/messages.go`), including binary payloads, contacts, events, tracks, and status updates.
  - Tracking: Handles location and movement tracking (`internal/tracking/service.go`, `internal/model/tracking.go`).
  - Resending: Manages message resending with filtering and routing (`internal/resend/*`).
  - WebSocket Handling: Real-time updates (`internal/wshandler/ws.go`).
  - Package/Blob Management: Deals with binary data and packages (`internal/pm/*`).
  - Repositories: Data access for feeds, items, and users (`internal/repository/*`).
  - HTTP/TCP Handlers: Serves APIs and connections (`cmd/webclient/http_*.go`, `tcp_handler.go`).
  - Database Interactions: Likely PostgreSQL or similar via Go's database/sql (`cmd/webclient/database.go`).

- **Data Models**: Defined in `internal/model/*` (e.g., `data.go`, `messages.go`, `mission.go`, `user.go`), using structs for CoT elements like events, locations, and missions.

- **Protobuf Serialization**: TAK protocol compatibility via `.proto` files (`protobuf/*.proto`), generating Go code for serialization/deserialization of messages (e.g., `takmessage.proto`, `track.proto`, `cotevent.proto`).

- **Web Server**: HTTP server in `cmd/webclient/http_server.go` serving APIs for sensors, tracking, resending; integrates with frontend.

- **Frontend Serving**: Static files in `staticfiles/static/` (Vue.js components for maps, points, alarms, casevac; Leaflet for maps; Bootstrap CSS). Served via `staticfiles/renderer.go` and `static.go`.

- **Other**: Docker for deployment (`Dockerfile`, `docker-compose.yaml`); cert management; GPS simulation in Python; docs for CoT schemas and Mil-STD-2525 symbols.

The architecture is modular with internal packages, emphasizing concurrency (goroutines/channels) for handling multiple clients and messages.

## 2. Proposed C# Project Structure

Target .NET 8+ for cross-platform support (Windows/Linux/macOS), aligning with Go's portability. Use a multi-project solution for separation of concerns, mirroring Go's internal/cmd structure.

- **Solution**: `GoATak.sln`
  - **GoATak.Models** (Class Library): Data models (e.g., `CoTMessage`, `Track`, `Mission`) as POCOs/records. Include Protobuf-generated classes.
  - **GoATak.Protobufs** (Class Library): Protobuf definitions and generated code using Google.Protobuf.
  - **GoATak.Core** (Class Library): Core services (client handler, tracking, resending, repositories). Interfaces for dependency injection.
  - **GoATak.API** (ASP.NET Core Web API): HTTP/TCP endpoints, WebSocket (SignalR) handlers, static file serving for frontend.
  - **GoATak.Data** (Class Library): Entity Framework Core for DB interactions (migrations for feeds/items/users).
  - **GoATak.Messaging** (Class Library): RabbitMQ integration, UDP handling, CoT processing.
  - **GoATak.Tests** (xUnit/NUnit): Unit/integration tests.
  - **GoATak.Frontend** (Optional Razor Pages or just static hosting): If enhancing Vue.js integration, but primarily serve static files.

- **Suggested NuGet Packages**:
  - `Google.Protobuf` & `Grpc.Tools`: For Protobuf serialization (TAK protocol compatibility).
  - `Microsoft.AspNetCore.App` (meta-package): For web API, hosting, SignalR (WebSockets).
  - `Microsoft.EntityFrameworkCore.SqlServer` (or PostgreSQL): DB ORM.
  - `RabbitMQ.Client`: Messaging queues.
  - `Microsoft.Extensions.DependencyInjection`: DI container.
  - `Microsoft.Extensions.Hosting`: Background services for tracking/resending.
  - `Serilog` or `Microsoft.Extensions.Logging`: Logging (replace Go's log).
  - `Mapster` or `AutoMapper`: For DTO mapping.
  - `FluentValidation`: Input validation.
  - `Docker.DotNet`: For Docker integration/testing.
  - Frontend: No changes needed; serve via `app.UseStaticFiles()` in ASP.NET.

Directory layout:
```
GoATak/
├── src/
│   ├── GoATak.Models/
│   ├── GoATak.Protobufs/
│   ├── GoATak.Core/
│   ├── GoATak.Data/
│   ├── GoATak.Messaging/
│   └── GoATak.API/
├── tests/
│   └── GoATak.Tests/
├── staticfiles/ (copy from Go project)
├── GoATak.sln
├── GoATak.API.csproj (entry point)
└── docker-compose.yml (updated for .NET)
```

## 3. Step-by-Step Porting Plan

The plan is divided into phases, each with granular subtasks, estimated effort (low/medium/high), dependencies, and deliverables. Total timeline: 9-13 weeks for a small team, assuming familiarity with both languages. This timeline is for guided execution by AI agents, with progress tracked per subtask.

**Phase 1: Setup C# Project Skeleton (1 week, Low Effort)**

Dependencies: None.

1.1 Create new .NET 8 solution and projects.  
Delegate to Code mode: Use execute_command 'dotnet new sln -n GoATak' followed by 'dotnet new classlib -n GoATak.Models', 'dotnet new classlib -n GoATak.Protobufs', etc., for all projects; add to solution with 'dotnet sln add'.  
Tools: execute_command.  
Success criteria: Solution file and project files created; 'dotnet build' succeeds without errors.  
Complete with attempt_completion: 'Phase 1 subtask 1.1 done'.

1.2 Configure global.json for .NET 8 SDK.  
Delegate to Code mode: Use write_to_file for global.json with SDK version 8.0.  
Tools: write_to_file.  
Success criteria: global.json present and points to .NET 8.  
Complete with attempt_completion: 'Phase 1 subtask 1.2 done'.

1.3 Set up DI, logging, and configuration (appsettings.json mirroring Go's config).  
Delegate to Architect mode for design, then Code mode: Use write_to_file for Program.cs with DI setup, appsettings.json.  
Tools: write_to_file, execute_command 'dotnet add package Microsoft.Extensions.DependencyInjection'.  
Success criteria: Basic DI container configured; logging outputs to console.  
Complete with attempt_completion: 'Phase 1 subtask 1.3 done'.

1.4 Copy static frontend files to `GoATak.API/wwwroot/`.  
Delegate to Code mode: Use execute_command 'xcopy staticfiles/static GoATak.API/wwwroot /E /I' (or equivalent for Windows).  
Tools: execute_command.  
Success criteria: Static files present in wwwroot; accessible via basic hosting.  
Complete with attempt_completion: 'Phase 1 subtask 1.4 done'.

1.5 Add initial NuGet packages and .gitignore for .NET.  
Delegate to Code mode: Use execute_command 'dotnet add package Google.Protobuf' etc. for all packages; write_to_file for .gitignore.  
Tools: execute_command, write_to_file.  
Success criteria: Packages restored ('dotnet restore' succeeds); .gitignore includes .NET ignores.  
Complete with attempt_completion: 'Phase 1 subtask 1.5 done'.

Challenges: None major. Mitigation: Use Visual Studio/VS Code templates.  
Deliverables: Functional solution build (`dotnet build`), basic API hosting static files.

**Phase 2: Port Protobufs and Models (1 week, Medium Effort)**

Dependencies: Phase 1 complete.

2.1 Copy `.proto` files to `GoATak.Protobufs/` and generate C# code.  
Delegate to Code mode: Use execute_command 'copy protobuf/*.proto GoATak.Protobufs/' then 'dotnet add package Grpc.Tools'; configure .csproj for generation.  
Tools: execute_command, apply_diff for .csproj.  
Success criteria: Generated C# classes from Protobuf.  
Complete with attempt_completion: 'Phase 2 subtask 2.1 done'.

2.2 Port Go models to C# classes/records.  
Delegate to Code mode: Use read_file on Go models, then write_to_file or apply_diff for C# equivalents (e.g., messages.go → CoTMessage).  
Tools: read_file, write_to_file.  
Success criteria: C# models match Go structs semantically.  
Complete with attempt_completion: 'Phase 2 subtask 2.2 done'.

2.3 Implement serialization/deserialization using `Google.Protobuf`.  
Delegate to Code mode: Add methods to models for ParseFrom/ToByteArray.  
Tools: apply_diff.  
Success criteria: Sample messages serialize/deserialize correctly.  
Complete with attempt_completion: 'Phase 2 subtask 2.3 done'.

2.4 Validate TAK protocol compatibility by unit-testing sample CoT messages.  
Delegate to Debug mode: Create xUnit tests for cotevent, track; use execute_command 'dotnet add package xunit'.  
Tools: write_to_file for test file, execute_command 'dotnet test'.  
Success criteria: Tests pass for serialization.  
Complete with attempt_completion: 'Phase 2 subtask 2.4 done'.

Challenges: Protobuf nuances (e.g., oneof fields for details/groups). Mitigation: Use official TAK Protobuf docs; test against Go-generated binaries.  
Deliverables: Generated Protobuf classes; model classes with JSON/Protobuf converters; passing unit tests for serialization.

**Phase 3: Implement Core Services (2-3 weeks, High Effort)**

Dependencies: Phase 2 complete.

3.1 Port repositories: Use EF Core for `ItemsRepo`, `UserRepo`, `FeedsRepo`.  
Delegate to Architect mode for DbContext design, then Code mode: Add EF package, write_to_file for DbContext and entities.  
Tools: execute_command 'dotnet add package Microsoft.EntityFrameworkCore', write_to_file.  
Success criteria: DbContext compiles; basic queries defined.  
Complete with attempt_completion: 'Phase 3 subtask 3.1 done'.

3.2 Implement client handling: `ClientHandler` class with async methods for enroll/mesh.  
Delegate to Code mode: Port from Go files using TcpClient/UdpClient.  
Tools: write_to_file.  
Success criteria: Handler methods compile and handle basic connections.  
Complete with attempt_completion: 'Phase 3 subtask 3.2 done'.

3.3 Port tracking service: Background service (`IHostedService`) for location updates.  
Delegate to Code mode: Use ConcurrentDictionary for state (mirroring Go channels).  
Tools: apply_diff for Program.cs to register service.  
Success criteria: Service starts and processes sample updates.  
Complete with attempt_completion: 'Phase 3 subtask 3.3 done'.

3.4 Port resending: `ResendService` with filter engine and router.  
Delegate to Code mode: Use Channel<T> for queues.  
Tools: write_to_file.  
Success criteria: Messages route and filter correctly in tests.  
Complete with attempt_completion: 'Phase 3 subtask 3.4 done'.

3.5 Port package/blob manager: File I/O with async streams for binaries.  
Delegate to Code mode: Implement async file operations.  
Tools: write_to_file.  
Success criteria: Binary data handled without errors.  
Complete with attempt_completion: 'Phase 3 subtask 3.5 done'.

Challenges: Concurrency (Go goroutines → C# Tasks/async/await; channels → System.Threading.Channels). Mitigation: Use async/await patterns; add locks where needed for shared state. Focus on language differences in threading models.  
Deliverables: Core services with interfaces; integration tests for message processing (e.g., CoT event handling).

**Phase 4: Port Web API and Handlers (2 weeks, Medium Effort)**

Dependencies: Phase 3 complete.

4.1 Set up ASP.NET Core minimal API or controllers for endpoints.  
Delegate to Code mode: Add controllers for /api/sensors, /api/tracking, /api/resend.  
Tools: write_to_file for Controllers folder.  
Success criteria: Endpoints compile and return basic responses.  
Complete with attempt_completion: 'Phase 4 subtask 4.1 done'.

4.2 Port HTTP handlers: Map Go routes to endpoints.  
Delegate to Code mode: Port logic from http_sensors.go etc. to async actions.  
Tools: apply_diff.  
Success criteria: Endpoints handle requests as in Go.  
Complete with attempt_completion: 'Phase 4 subtask 4.2 done'.

4.3 Implement TCP handler: Use Kestrel or TcpListener in background service.  
Delegate to Code mode: Add TCP service.  
Tools: write_to_file.  
Success criteria: TCP connections accepted.  
Complete with attempt_completion: 'Phase 4 subtask 4.3 done'.

4.4 Port WebSocket: Use SignalR hubs for real-time CoT updates.  
Delegate to Code mode: Add TrackingHub; configure in Program.cs.  
Tools: execute_command 'dotnet add package Microsoft.AspNetCore.SignalR'.  
Success criteria: Hub broadcasts messages.  
Complete with attempt_completion: 'Phase 4 subtask 4.4 done'.

4.5 Port existing authentication and TLS implementation (Medium Effort)
Delegate to Code mode: Configure TLS authentication (certs from Go's cert/ dir; use `X509Certificate2`).
Tools: execute_command to copy certs, apply_diff for config.
Success criteria: Secure endpoints require certs matching Go implementation.
Complete with attempt_completion: 'Phase 4 subtask 4.5 done'.

Challenges: Async patterns (Go sync → C# async/await); state management in web contexts. Mitigation: Use ILogger for tracing; middleware for request validation. Tool usage: Leverage execute_command for package adds.  
Deliverables: Running API with endpoints; SignalR for WS; basic auth integration.

**Phase 5: Integrate Frontend (1 week, Low Effort)**

Dependencies: Phase 4 complete.

5.1 Configure static file middleware (`app.UseStaticFiles()`) to serve Vue.js/Leaflet assets.  
Delegate to Code mode: Update Program.cs.  
Tools: apply_diff.  
Success criteria: Static files served at root.  
Complete with attempt_completion: 'Phase 5 subtask 5.1 done'.

5.2 Port renderer logic: If dynamic, use Razor or embedded resources; otherwise, direct serving.  
Delegate to Code mode: Check renderer.go; implement equivalent if needed.  
Tools: read_file on renderer.go, write_to_file if changes required.  
Success criteria: Frontend loads without errors.  
Complete with attempt_completion: 'Phase 5 subtask 5.2 done'.

5.3 Ensure JS components interact with new API endpoints (update fetch URLs if needed).  
Delegate to Debug mode: Test interactions; apply_diff for JS if CORS/proxy needed.  
Tools: apply_diff, execute_command for dev server.  
Success criteria: Components fetch data from C# API.  
Complete with attempt_completion: 'Phase 5 subtask 5.3 done'.

5.4 Preserve map overlays (Leaflet), sensor modals, and Mil-STD-2525 icons.  
Delegate to Code mode: Verify static assets.  
Tools: None major; use search_files if verifying JS.  
Success criteria: Maps render with overlays.  
Complete with attempt_completion: 'Phase 5 subtask 5.4 done'.

Challenges: JS interop if any Go-specific embedding. Mitigation: Keep frontend unchanged; proxy requests if CORS issues arise.  
Deliverables: Full web client loading with backend integration; verify map rendering and CoT updates.

**Phase 6: Handle Dependencies (DB, Messaging Queues) (1 week, Medium Effort)**

Dependencies: Phase 5 complete.

6.1 Configure EF Core DbContext for PostgreSQL/SQLite (migrate schemas from Go).  
Delegate to Code mode: Define migrations.  
Tools: execute_command 'dotnet ef migrations add Initial'.  
Success criteria: DB schema matches Go.  
Complete with attempt_completion: 'Phase 6 subtask 6.1 done'.

6.2 Integrate RabbitMQ: Use `RabbitMQ.Client` for producer/consumer.  
Delegate to Code mode: Add flows for events.  
Tools: execute_command 'dotnet add package RabbitMQ.Client', write_to_file.  
Success criteria: Messages publish/consume.  
Complete with attempt_completion: 'Phase 6 subtask 6.2 done'.

6.3 Port DNS proxy and geo/navigation utils to C# equivalents.  
Delegate to Code mode: Use DnsClient NuGet for proxy; port geo logic.  
Tools: execute_command 'dotnet add package DnsClient', write_to_file.  
Success criteria: Utils function as in Go.  
Complete with attempt_completion: 'Phase 6 subtask 6.3 done'.

6.4 Handle certs: Embed or load from config for TLS.  
Delegate to Code mode: Update config loading.  
Tools: apply_diff.  
Success criteria: Certs load correctly.  
Complete with attempt_completion: 'Phase 6 subtask 6.4 done'.

Challenges: Connection pooling (Go sql.DB → EF connection strings). Mitigation: Use IDbContextFactory for scoped DB access; retry policies with Polly. Tool usage: execute_command for EF tools.  
Deliverables: Connected DB/migrations; RabbitMQ queues; end-to-end message flow tests.

**Phase 7: Testing and Validation (2-3 weeks, High Effort)**

Dependencies: Phase 6 complete.

7.1 Unit tests: xUnit for models/services (e.g., Protobuf parsing, resend filtering).  
Delegate to Code mode: Write tests for key methods.  
Tools: write_to_file for test project.  
Success criteria: Tests pass for isolated units.  
Complete with attempt_completion: 'Phase 7 subtask 7.1 done'.

7.2 Integration tests: TestContainers for DB/RabbitMQ; mock clients for TCP/UDP.  
Delegate to Debug mode: Set up TestContainers.  
Tools: execute_command 'dotnet add package Testcontainers', write_to_file.  
Success criteria: Integration scenarios pass.  
Complete with attempt_completion: 'Phase 7 subtask 7.2 done'.

7.3 E2E tests: Use Playwright for web client (verify CoT processing, map overlays, sensor modals).  
Delegate to Debug mode: Install Playwright, write tests.  
Tools: execute_command 'dotnet add package Microsoft.Playwright'.  
Success criteria: E2E flows work.  
Complete with attempt_completion: 'Phase 7 subtask 7.3 done'.

7.4 Validate TAK compatibility: Send/receive sample CoT messages against TAK server.
Delegate to Debug mode: Run validation tests.
Tools: execute_command for test runs.
Success criteria: Messages compatible with TAK.
Complete with attempt_completion: 'Phase 7 subtask 7.4 done'.

7.5 Cross-platform validation (Medium Effort)
Delegate to Debug mode: Test on Windows/Linux/macOS to match Go's portability.
Tools: execute_command for platform-specific builds, write_to_file for CI configuration.
Success criteria: Application runs on all platforms where Go version works.
Complete with attempt_completion: 'Phase 7 subtask 7.5 done'.

7.6 API compatibility documentation (Low Effort)
Delegate to Architect mode for documentation strategy, then Code mode: Document API endpoints to ensure compatibility.
Tools: write_to_file for API documentation matching Go endpoints.
Success criteria: API documentation covers all ported endpoints with same behavior.
Complete with attempt_completion: 'Phase 7 subtask 7.6 done'.

Challenges: Flakiness in async tests; platform-specific behaviors. Mitigation: Use WebApplicationFactory for API tests; fixed timeouts; test on target platforms early. Focus on tool usage for test setup.
Deliverables: >80% code coverage; passing test suite; validation against Go version (side-by-side runs); cross-platform compatibility confirmed.

**Phase 8: Deployment (Docker) (1 week, Low Effort)**

Dependencies: Phase 7 complete.

8.1 Update Dockerfile: Multi-stage build for .NET.  
Delegate to Code mode: Write Dockerfile.  
Tools: write_to_file.  
Success criteria: Dockerfile builds image.  
Complete with attempt_completion: 'Phase 8 subtask 8.1 done'.

8.2 docker-compose.yml: Services for API, DB (PostgreSQL), RabbitMQ; volumes for static files/certs.  
Delegate to Code mode: Update compose file.  
Tools: apply_diff.  
Success criteria: Compose file validates.  
Complete with attempt_completion: 'Phase 8 subtask 8.2 done'.

8.3 Port Python GPS sim if needed (keep separate or rewrite in C#).  
Delegate to Architect mode for decision, then Code if rewrite.  
Tools: write_to_file if new C# sim.  
Success criteria: Sim integrates or runs separately.  
Complete with attempt_completion: 'Phase 8 subtask 8.3 done'.

8.4 CI/CD: Add GitHub Actions for .NET build/test/publish.  
Delegate to Code mode: Write .github/workflows.  
Tools: write_to_file.  
Success criteria: Workflow YAML syntax correct.  
Complete with attempt_completion: 'Phase 8 subtask 8.4 done'.

Challenges: Containerization differences (Go static binary → .NET runtime). Mitigation: Use `dotnet publish --self-contained` for single binary. Tool usage: execute_command 'docker build'.  
Deliverables: Docker images; compose up for full stack; deployment docs.

## Potential Overall Challenges and Mitigations

- **Concurrency Model**: Go's lightweight goroutines vs. C#'s Tasks. Mitigation: Favor async/await; use Parallel.ForEachAsync for batches; focus on adapting to C# threading models via tools like apply_diff for async conversions.
- **Error Handling**: Go's explicit errors vs. C# exceptions. Mitigation: Use Result<T> patterns or custom exceptions; propagate with try-catch.
- **Ecosystem Gaps**: No direct Go equivalent for some libs. Mitigation: Leverage .NET's mature ecosystem (e.g., SignalR > raw WS); use execute_command for NuGet installs.
- **Team Familiarity**: If team knows Go better. Mitigation: Provide migration guides; incremental porting (run Go/C# in parallel initially). For AI: Delegate unclear parts via new_task to appropriate modes.

This plan preserves all key functionalities (CoT processing, real-time tracking, web maps, sensors) while leveraging C#'s strengths in web/ORM. It ensures modularity for future extensions.

Upon completion of all phases, use Orchestrator mode to orchestrate final integration and deployment.
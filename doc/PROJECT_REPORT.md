# GoATAK Project Report

**Date:** February 2026  
**Report Version:** 1.0  
**Project Repository:** github.com/kdudkov/goatak  
**Go Version:** 1.24.3

---

## 1. Executive Summary

GoATAK is a free, open-source implementation of ATAK (Android Tactical Assault Kit)/CivTAK server and client written in Go. Developed over the past 9 months with over 200 commits, this project provides a fast, lightweight, and feature-rich alternative to commercial TAK servers. The system supports both server-side CoT (Cursor on Target) routing and a sophisticated web-based client interface, making it ideal for tactical operations, emergency response coordination, and situation awareness centers.

The project has seen significant development from May 2025 through February 2026, with major features including CASEVAC (Casualty Evacuation) management, a comprehensive tracking system, resend service for message routing, overlay manager with hierarchical tree structure, AIS (Automatic Identification System) integration for maritime tracking, and a complete authentication service with JWT-based security.

---

## 2. Project Overview

### 2.1 What is GoATAK?

GoATAK is a comprehensive TAK (Tactical Assault Kit) ecosystem implementation that provides:

- **TAK Server**: A high-performance CoT message router supporting both XML (v1) and Protobuf (v2) protocols
- **Web Client**: A sophisticated browser-based interface for real-time situational awareness
- **Certificate Management**: Full support for client certificate enrollment (v1 and v2)
- **Mission Package Management**: Data synchronization and mission support
- **User Management**: Multi-user support with visibility scopes and role-based access

### 2.2 Purpose and Goals

The primary goals of GoATAK are:

1. **Accessibility**: Provide a free, open-source alternative to expensive commercial TAK solutions
2. **Performance**: Leverage Go's efficiency for high-throughput message routing
3. **Compatibility**: Full interoperability with ATAK, iTAK, and other TAK ecosystem applications
4. **Extensibility**: Modular architecture allowing easy addition of new features
5. **Usability**: Intuitive web interface suitable for command center operations

### 2.3 Key Stakeholders

- **Primary Author**: Mohammadreza MontazeriShatoori (monta2009@gmail.com)
- **Contributors**: Community contributors via GitHub
- **User Base**: Tactical operations teams, emergency responders, search and rescue organizations

---

## 3. Architecture & Technical Stack

### 3.1 Backend Architecture

The GoATAK backend is built on a modular, service-oriented architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    GoATAK Backend                          │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   Web/API   │  CoT Router │   Tracking  │   Auth Service   │
│   (Gin)     │  (TCP/UDP)  │   Service   │   (JWT/Postgre)  │
├─────────────┼─────────────┼─────────────┼──────────────────┤
│  Resend     │   Sensors   │   RabbitMQ  │   DNS Proxy      │
│  Service    │  (GPS/AIS)  │   Bridge    │   Service        │
├─────────────┴─────────────┴─────────────┴──────────────────┤
│              Data Layer (SQLite/GORM)                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

#### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Language | Go | 1.24.3 | Core implementation |
| Web Framework | Gin (via aofei/air) | v0.22.0 | HTTP API and web services |
| Database | SQLite | v1.29.8 | Local data persistence |
| ORM | GORM | v1.25.9 | Database abstraction |
| Auth DB | PostgreSQL | - | Authentication service |
| Message Queue | RabbitMQ | amqp091-go v1.10.0 | Inter-service communication |
| Protocol Buffers | google.golang.org/protobuf | v1.33.0 | CoT v2 protocol |
| WebSockets | gorilla/websocket | v1.5.1 | Real-time client updates |
| Configuration | Viper | v1.18.2 | Configuration management |
| Cryptography | golang.org/x/crypto | v0.22.0 | SSL/TLS, certificates |

#### Frontend Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Vue.js 3 | Reactive UI components |
| Build Tool | Vite | Fast development and production builds |
| Map Engine | MapLibre GL | Modern vector tile rendering |
| Legacy Maps | Leaflet | Raster tile support |
| Symbols | Milsymbol | Military symbol rendering |
| HTTP Client | Axios | API communication |
| Styling | Bootstrap 5 RTL | Right-to-left UI support |
| Icons | Bootstrap Icons | UI iconography |

### 3.3 Communication Protocols

1. **CoT Protocol Support**:
   - Version 1: XML-based messages
   - Version 2: Protobuf-based messages
   - TCP and UDP transport

2. **Certificate Enrollment**:
   - Version 1: Legacy enrollment protocol
   - Version 2: Modern enrollment with enhanced security

3. **DataSync/Missions**:
   - Mission package management
   - Synchronization between connected clients

4. **WebSocket API**:
   - Real-time unit updates
   - Authenticated connections with JWT

---

## 4. Core Components & Features

### 4.1 Server Components

#### 4.1.1 CoT Router
The central message routing system that:
- Receives CoT messages via TCP/UDP
- Parses both XML and Protobuf formats
- Routes messages to appropriate destinations
- Maintains client connection state

#### 4.1.2 Web Client (`cmd/webclient`)
A full-featured web application providing:
- Real-time map display with unit tracking
- Interactive tool palette (RedX, Digital Pointer)
- Unit management and editing
- CoT message logging
- Mission package handling

#### 4.1.3 Resend Service (`internal/resend`)
Advanced message routing system:
- Filter-based message forwarding
- Support for predicates (type, location, callsign, UID prefix)
- Multiple destination types (broadcast, specific contacts, UDP flows)
- Configuration management via YAML

#### 4.1.4 Tracking Service (`internal/tracking`)
Comprehensive unit tracking:
- Historical trail storage and retrieval
- Configurable retention policies
- Trail visualization on map
- Performance-optimized database queries

#### 4.1.5 Authentication Service (`auth-service/`)
JWT-based security system:
- Login/refresh token flow (15min access, 30day refresh)
- PostgreSQL user storage
- bcrypt password hashing
- Role-based access control foundation
- Comprehensive test coverage

#### 4.1.6 Sensor Management
Multi-sensor data integration:
- GPSD sensor for GPS receivers
- AIS sensor for maritime tracking
- RabbitMQ flows for external integrations
- UDP flows for custom data sources

### 4.2 Client Features

#### 4.2.1 Map Interface
- Vector tile support via MapLibre GL
- Local PMTiles for offline operation
- Multiple layer support with visibility control
- RTL (Right-to-Left) interface for Persian/Farsi users

#### 4.2.2 Unit Management
- Real-time unit tracking on map
- Unit details panel with comprehensive information
- Unit editing capabilities
- Search and filter functionality

#### 4.2.3 Emergency Services (CASEVAC)
Complete casualty evacuation workflow:
- Create emergency requests
- Assign priority and status
- Track evacuation progress
- Integration with standard ATAK CASEVAC protocol

#### 4.2.4 Drawing Tools
- Point markers with custom labels
- Route drawing and editing
- Polygon creation for area marking
- Visibility controls per drawing

#### 4.2.5 Overlay Manager
Hierarchical tree-based overlay control:
- Category-based organization (units, points, drawings, routes, alarms)
- Subcategory filtering (friendly/hostile/neutral/unknown affiliations)
- Individual item visibility toggles
- Search functionality across all items

#### 4.2.6 Tools
- **RedX Tool**: Measure distance and bearing between points
- **Digital Pointer**: Share point positions with all contacts
- **Navigation Panel**: Display navigation information to selected targets

---

## 5. Directory Structure & Code Organization

```
goatak/
├── cmd/                          # Application entry points
│   └── webclient/               # Main web client application
│       ├── api.go               # HTTP API handlers
│       ├── config.go            # Configuration structures
│       ├── database.go          # Database operations
│       ├── http_*.go            # HTTP endpoint handlers
│       ├── main.go              # Application entry
│       ├── messaging.go         # CoT message processing
│       └── processors.go        # Message processors
│
├── internal/                     # Internal packages
│   ├── authclient/              # Authentication client
│   ├── client/                  # CoT client handlers
│   ├── dnsproxy/                # DNS proxy service
│   ├── geo/                     # Geospatial utilities
│   ├── model/                   # Data models
│   ├── pm/                      # Package management
│   ├── repository/              # Data repositories
│   ├── resend/                  # Resend service
│   ├── tracking/                # Tracking service
│   └── wshandler/               # WebSocket handlers
│
├── auth-service/                 # JWT authentication service
│   └── TEST_SUITE.md            # Authentication test documentation
│
├── front/                        # Vue.js frontend
│   ├── src/                     # Source components
│   ├── public/                  # Static assets
│   ├── index.html               # Entry HTML
│   └── vite.config.js           # Vite configuration
│
├── ais/                          # AIS integration module
├── cert/                         # Certificate generation scripts
├── data/                         # Data files and configurations
├── doc/                          # Documentation
├── maps/                         # Vector tile server
├── protobuf/                     # Protocol buffer definitions
├── setup/                        # Docker setup configurations
│
├── go.mod                        # Go module definition
├── go.sum                        # Go dependencies checksum
├── docker-compose.yaml           # Docker orchestration
└── README.md                     # Project documentation
```

---

## 6. Recent Development History (May 2025 - February 2026)

### 6.1 Phase 1: Foundation and CASEVAC (May 2025)

**May 2025** marked the beginning of intensive development:

- **eb94feb** - Initial CASEVAC implementation
- Modular sidebar architecture introduced
- Frontend refactoring for better component organization
- Empty database initialization
- Sensor editing functionality added

Key architectural decisions:
- Migration from modal-based UI to sidebar-based navigation
- Separation of concerns between map and UI components
- Introduction of modular component architecture

### 6.2 Phase 2: Navigation and Tracking (June 2025)

**June 2025** focused on navigation capabilities and tracking system:

- **0f399a3** - Navigation system implementation
- Complete tracking system with trail visualization
- Options API standardization for all endpoints
- Version tagging system introduced (V-tags)
- Drawing labels enhancement

Technical achievements:
- Tracking service with SQLite persistence
- Configurable trail retention
- WebSocket optimization for real-time updates

### 6.3 Phase 3: Resend Service Development (August-September 2025)

**August-September 2025** saw the development of the sophisticated resend service:

- **4046fe1** - Resend service documentation
- **cc84365** - Backend implementation
- **c44c075** - Complete service implementation
- Predicate-based filtering system
- Location boundary predicates
- UID prefix filtering

Architecture highlights:
- Filter engine with multiple predicate types
- Configuration management via ConfigManager
- Support for broadcast and targeted message routing

### 6.4 Phase 4: Configuration and Overlay Management (October-November 2025)

**October-November 2025** brought major UI/UX improvements:

- **dd43b62** - Jalali date conversion for Persian users
- **2380c22** - Hierarchical overlay manager implementation
- **082bf4c** - File-based configuration persistence (YAML)
- **d626548** - Search functionality for overlay items

Breaking changes:
- Configuration storage moved from database to YAML files
- Default config path changed to `config/goatak_client.yml`
- Overlay visibility state moved to item objects

### 6.5 Phase 5: AIS Integration and Frontend Modernization (November-December 2025)

**November-December 2025** focused on maritime tracking and frontend architecture:

- **ef288fc** - AIS stream receiver with NMEA encoding
- **613c7ba** - Dedicated AIS sensor implementation
- **759faa3** - Vue Single File Components migration
- **3c42b23** - JWT authentication service

New capabilities:
- Real-time vessel tracking via AIS
- NMEA message parsing (types 1-3, 5, 18, 19, 24)
- Modern Vue 3 architecture with Composition API
- Multi-stage Docker builds for production

### 6.6 Phase 6: MapLibre Migration and Authentication (December 2025 - January 2026)

**December 2025 - January 2026** marked the major map engine migration:

- **c57b947** - Migration from Leaflet to MapLibre GL
- **d5b53ef** - Vector tile support with PMTiles
- **01d2688** - Local Iran PMTiles data integration
- **cb21717** - Context menu for markers
- **b670c46** - Production Docker Compose setup

Security enhancements:
- All API endpoints protected with JWT middleware
- Token refresh mechanism
- PostgreSQL user storage

### 6.7 Phase 7: Code Quality and Feature Completion (January-February 2026)

**January-February 2026** focused on polish and feature completion:

- **c655b59** - Resend functionality fixes for broadcast
- **73cb21a** - Subnet message routing improvements
- **133f027** - Position share feature implementation
- **9701706** - Base component extraction for item details
- **88c1908** - Tileserver service addition

Refactoring highlights:
- 50% code reduction through component reuse
- BaseItemDetails component for all item types
- useItemEditing composable for shared logic

---

## 7. Key Features Implemented

### 7.1 CASEVAC (Casualty Evacuation)

A complete emergency medical services workflow:

- Create emergency evacuation requests
- Set priority levels (urgent, priority, routine)
- Assign evacuation mechanisms (ground, air, water)
- Track request status from creation to completion
- Integration with standard ATAK CASEVAC protocol

### 7.2 Tracking System

Comprehensive unit movement tracking:

- Historical trail storage in SQLite
- Configurable retention periods
- Visual trail display on map
- Performance optimization through database indexing
- Trail management API

### 7.3 Resend Service

Advanced message routing with filtering:

**Predicate Types:**
- `item_type`: Filter by CoT event type
- `location`: Geographic boundary filtering
- `callsign`: Unit callsign matching
- `uid_prefix`: UID prefix filtering

**Destination Types:**
- Broadcast to all contacts
- Specific contact targeting
- UDP flow forwarding
- RabbitMQ queue routing

### 7.4 Overlay Manager

Hierarchical tree-based control:

```
Overlays
├── Units
│   ├── Friendly (green)
│   ├── Hostile (red)
│   ├── Neutral (blue)
│   └── Unknown (yellow)
├── Points
├── Drawings
├── Routes
├── Alarms
│   ├── Emergency (high priority)
│   └── General (low priority)
└── Reports
```

Features:
- Expand/collapse categories
- Individual item visibility toggles
- Cascading checkbox logic
- Search with filtered results
- RTL-optimized interface

### 7.5 AIS Integration

Maritime Automatic Identification System support:

- Connects to aisstream.io WebSocket API
- NMEA VDM sentence generation
- UDP forwarding to local sensors
- Support for multiple AIS message types:
  - Position Reports (Class A and B)
  - Ship Static Data
  - Standard Class B Position Reports
  - Static Data Reports

### 7.6 Authentication Service

Enterprise-grade security:

- JWT token-based authentication
- Access tokens (15-minute expiry)
- Refresh tokens (30-day expiry)
- bcrypt password hashing
- PostgreSQL user storage
- Role-based access control foundation
- Automatic token refresh in frontend

### 7.7 MapLibre Migration

Modern vector tile mapping:

- Migration from Leaflet to MapLibre GL
- Vector tile support via PMTiles
- Local tile serving capability
- RTL text plugin for Persian
- Custom marker components
- Smooth fly-to animations

---

## 8. Configuration & Deployment

### 8.1 Configuration Files

**Main Configuration** (`config/goatak_client.yml`):
```yaml
app:
  uid: "webclient-001"
  callsign: "Command Center"
  
server:
  address: "takserver.ru"
  port: 8089
  
database:
  path: "data/goatak.db"
  
tracking:
  enabled: true
  retention: "72h"
  
sensors:
  - name: "GPSD"
    type: "gpsd"
    address: "localhost:2947"
  - name: "AIS"
    type: "ais"
    port: 1234
```

### 8.2 Docker Deployment

**Production Deployment** (`docker-compose.prod.yaml`):

Services included:
- `webclient`: Main application
- `frontend`: Vue.js UI
- `auth-service`: Authentication backend
- `postgres`: User database
- `map`: Vector tile server
- `gpsd`: GPS daemon (optional)

**Quick Start:**
```bash
# Clone repository
git clone https://github.com/kdudkov/goatak
cd goatak/setup

# Start production stack
docker-compose -f docker-compose.prod.yaml up -d

# Access application
open http://localhost
```

### 8.3 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PATH` | SQLite database path | `data/goatak.db` |
| `CONFIG_PATH` | YAML config path | `config/goatak_client.yml` |
| `LOG_LEVEL` | Logging level | `info` |
| `RABBITMQ_URL` | RabbitMQ connection | - |
| `JWT_SECRET` | JWT signing key | - |

---

## 9. Development Workflow

### 9.1 Build System

**Makefile targets:**
```bash
make build          # Build webclient binary
make test           # Run all tests
make install-mcp    # Install MCP language server
make docker-build   # Build Docker images
```

### 9.2 Frontend Development

**Development server:**
```bash
cd front
yarn install
yarn dev
```

**Production build:**
```bash
cd front
yarn build
```

### 9.3 Testing Strategy

Comprehensive test coverage across all components:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **HTTP Tests**: API endpoint validation
- **Database Tests**: Repository layer testing
- **Security Tests**: Authentication vulnerability testing

Test files:
- `webclient/database_test.go`
- `webclient/http_resend_test.go`
- `webclient/http_sensors_test.go`
- `webclient/http_server_test.go`
- `webclient/http_tracking_test.go`
- `webclient/messaging_test.go`

### 9.4 Version Management

Version tagging system:
- Current version: V29 (as of January 2026)
- GitHub Actions for CI/CD
- Docker image versioning

---

## 10. Future Plans & Roadmap

### 10.1 Short-term (Next 3 Months)

1. **Enhanced Mission Support**:
   - Full DataSync protocol implementation
   - Mission package sharing improvements
   - Mission hierarchy support

2. **Mobile Optimization**:
   - Responsive design improvements
   - Touch gesture support
   - Mobile-specific UI components

3. **Performance Optimization**:
   - WebSocket connection pooling
   - Database query optimization
   - Frontend bundle size reduction

### 10.2 Medium-term (6 Months)

1. **Advanced Analytics**:
   - Unit movement analytics
   - Heat map generation
   - Pattern recognition

2. **Plugin System**:
   - Third-party plugin API
   - Custom processor support
   - Extension marketplace

3. **Video Integration**:
   - RTSP stream support
   - Video feed management
   - Synchronized playback

### 10.3 Long-term (12+ Months)

1. **Federation**:
   - Multi-server federation
   - Cross-server message routing
   - Distributed architecture

2. **AI/ML Integration**:
   - Predictive movement analysis
   - Anomaly detection
   - Automated route optimization

3. **Mobile Applications**:
   - Native iOS client
   - Native Android client
   - Offline capability

---

## 11. Conclusion

GoATAK has evolved from a simple CoT router into a comprehensive TAK ecosystem over the past 9 months. With over 200 commits, the project now provides:

- A production-ready TAK server with full protocol support
- A sophisticated web client with modern mapping capabilities
- Enterprise-grade authentication and security
- Advanced message routing with the resend service
- Comprehensive unit tracking and history
- Maritime AIS integration
- Professional CASEVAC workflow support

The modular architecture, comprehensive test coverage, and modern technology stack position GoATAK as a viable alternative to commercial TAK solutions. The active development and community engagement ensure continued improvement and feature expansion.

### Key Achievements

1. **200+ commits** over 9 months of active development
2. **Major architectural migration** from Leaflet to MapLibre GL
3. **Complete authentication system** with JWT and PostgreSQL
4. **Advanced routing capabilities** with the resend service
5. **Maritime tracking** via AIS integration
6. **Persian/RTL support** for regional users
7. **Production-ready Docker** deployment configurations

### Recommendations

1. **For New Users**: Start with the Docker Compose setup for quick deployment
2. **For Developers**: Review the modular architecture in `internal/` and `cmd/webclient/`
3. **For Operators**: Utilize the comprehensive overlay manager for situational awareness
4. **For Contributors**: Focus on test coverage when adding new features

---

## Appendix A: Git Commit Statistics

**Total Commits Analyzed:** 200+  
**Date Range:** May 11, 2025 - February 1, 2026  
**Primary Author:** Mohammadreza MontazeriShatoori  
**Active Development Period:** 9 months

### Commit Categories

- **Features:** ~45% (New functionality)
- **Refactoring:** ~25% (Code improvement)
- **Bug Fixes:** ~15% (Issue resolution)
- **Documentation:** ~10% (Docs and comments)
- **Build/CI:** ~5% (Configuration and tooling)

---

## Appendix B: Dependencies Summary

### Production Dependencies

**Go Backend:**
- Web: aofei/air, gorilla/websocket
- Database: gorm.io/gorm, modernc.org/sqlite
- Messaging: rabbitmq/amqp091-go
- Crypto: golang.org/x/crypto, google.golang.org/protobuf
- Config: spf13/viper, gopkg.in/yaml.v3
- Utilities: google/uuid, prometheus/client_golang

**Frontend:**
- Framework: Vue.js 3
- Build: Vite
- Maps: MapLibre GL, vue-maplibre-gl
- HTTP: Axios
- Styling: Bootstrap 5 (RTL)
- Icons: Bootstrap Icons

---

*Report generated on February 2, 2026*  
*For updates, visit: https://github.com/kdudkov/goatak*

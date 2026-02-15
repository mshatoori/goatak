# GOATAK Architecture

## System Overview

```mermaid
graph TB
    subgraph External["External Clients"]
        Clients[GoATAK Clients]
        Browser[Browser]
    end

    subgraph Network["mmhs Network"]
        subgraph webclient["webclient Service (Go)"]
            CoT[CoT Processor]

            subgraph Flows["CoTFlow Implementations"]
                UDP[UDPFlow<br/>:6969]
                TCP[TCP Handler<br/>:6969]
                Rabbit[RabbitFlow]
                Mesh[Mesh Handler]
            end

            subgraph Services["Internal Services"]
                Tracking[Tracking<br/>Service]
                Resend[Resend<br/>Service]
                DNS[DNS Proxy]
                Auth[Auth Client]
            end

            subgraph Data["Data Layer"]
                Items[Items<br/>Repository]
                SQLite[(SQLite DB)]
            end

            subgraph Sensors["Sensors"]
                GPS[GPS Sensor]
                Radar[Radar Sensor]
                AIS[AIS Sensor]
            end

            HTTP[HTTP Server<br/>:8080]
            WS[WebSocket<br/>:1100]
        end

        Frontend[Frontend<br/>:5173]
        Map[Map Service<br/>:8000]
        Auth[Auth Service<br/>:8081]
        Postgres[(PostgreSQL<br/>:5432)]
        GPSD[GPSD<br/>:2947]
    end

    Clients -->|CoT XML| UDP
    Clients -->|CoT XML| TCP
    Clients -->|CoT XML| Rabbit
    Browser -->|HTTP| HTTP
    Browser -->|WSS| WS
    Browser -->|HTTP| Frontend

    UDP --> CoT
    TCP --> CoT
    Rabbit --> CoT

    CoT --> Tracking
    CoT --> Resend
    CoT --> Items
    CoT --> Sensors

    Sensors --> CoT

    Tracking --> SQLite
    Items --> SQLite

    Resend --> UDP
    Resend --> Rabbit
    Resend --> Mesh

    HTTP --> CoT
    WS --> CoT
    HTTP --> Tracking

    Frontend --> HTTP

    webclient -->|Tiles| Map
    webclient -->|Auth| Auth
    webclient -->|NMEA| GPSD

    Auth --> Postgres
```

## CoTFlow Interface

The `CoTFlow` interface handles CoT message transmission/reception:

```mermaid
classDiagram
    class CoTFlow {
        <<interface>>
        +Start()
        +SendCot(msg) error
        +GetType() string
        +Stop()
    }

    class UDPFlow {
        -UDP connection
        -Direction: INCOMING|OUTGOING|BOTH
    }

    class RabbitFlow {
        -AMQP connection
        -SendExchange
        -RecvQueue
    }

    class MeshHandler {
        -Peer-to-peer mesh
    }

    CoTFlow <|-- UDPFlow
    CoTFlow <|-- RabbitFlow
    CoTFlow <|-- MeshHandler
```

## Sensors

The system supports various sensors that generate CoT events:

```mermaid
classDiagram
    class BaseSensor {
        <<interface>>
        +Initialize() bool
        +Start(cb)
        +GetType() string
        +GetUID() string
        +Stop()
    }

    class GpsdSensor {
        -Addr: string
        -Port: int
    }

    class RadarSensor {
        -Network feeds
        -Target tracking
    }

    class AISSensor {
        -Marine AIS data
        -Vessel tracking
    }

    BaseSensor <|-- GpsdSensor
    BaseSensor <|-- RadarSensor
    BaseSensor <|-- AISSensor
```

## Services

| Service          | Image           | Ports            | Purpose         |
| ---------------- | --------------- | ---------------- | --------------- |
| **webclient**    | goatak-client   | 8080, 6969, 1100 | Main CoT server |
| **frontend**     | goatak-frontend | 5173             | Web UI          |
| **map**          | goatak-maps     | 8000             | Map tiles       |
| **auth-service** | goatak-auth     | 8081             | Authentication  |
| **postgres**     | postgres:15     | 5432             | Auth database   |
| **gpsd**         | docker-gpsd     | 2947, 5577       | GPS daemon      |

## Data Flow

```mermaid
sequenceDiagram
    participant C as GoATAK Clients
    participant F as CoTFlow
    participant P as CoT Processor
    participant S as Sensors
    participant W as WebSocket
    participant B as Browser

    C->>F: CoT Message
    F->>P: Parse CoT
    P->>P: Process Event

    S->>P: Sensor Data (GPS/Radar/AIS)
    P->>P: Create CoT Events

    P-->>F: Broadcast to Flows
    P-->>W: Real-time Update
    W-->>B: Client Update
```

## Tech Stack

- **Backend**: Go
- **Frontend**: Vue.js 3 + Leaflet
- **Database**: PostgreSQL, SQLite
- **Protocol**: CoT (Cursor on Target)
- **Sensors**: GPSD, Radar, AIS

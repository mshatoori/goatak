# Resending Feature Documentation

## 1. Overview

The **Resending Feature** is a fully functional implementation that manages message resending configurations within the GoATAK tactical system. This feature allows users to define complex filtering rules and destination mappings for automatically resending specific CoT (Cursor on Target) messages based on customizable criteria.

### Purpose

The Resending feature serves as a message routing and filtering system that enables:
- **Selective Message Forwarding**: Route specific message types to designated network destinations
- **Dynamic Filtering**: Apply complex filter logic using multiple predicates with AND/OR combinations
- **Configuration Management**: Create, edit, and manage multiple resending configurations through a REST API
- **Network Flexibility**: Support for unicast (individual nodes) and broadcast (subnet) destinations
- **Real-time Processing**: Automatic message processing based on configured rules

### Architecture

The implementation consists of:
- **Backend API**: RESTful endpoints for CRUD operations on resend configurations
- **Database Persistence**: SQLite-based storage with proper schema and relationships
- **Frontend Components**: Vue.js components for configuration management
- **Real-time Integration**: Seamless integration with the existing GoATAK message processing pipeline

## 2. Backend API

### Endpoints

#### GET `/api/resend/configs`
Retrieves all resend configurations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "uid": "config-uuid",
      "name": "Configuration Name",
      "enabled": true,
      "destination": {
        "type": "node",
        "ip": "192.168.1.100",
        "urn": 12345,
        "subnet_mask": null
      },
      "filters": [...],
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/resend/configs`
Creates a new resend configuration.

**Request Body:**
```json
{
  "name": "New Configuration",
  "enabled": true,
  "destination": {
    "type": "node",
    "ip": "192.168.1.100",
    "urn": 12345
  },
  "filters": []
}
```

#### GET `/api/resend/configs/:uid`
Retrieves a specific resend configuration by UID.

#### PUT `/api/resend/configs/:uid`
Updates an existing resend configuration.

#### DELETE `/api/resend/configs/:uid`
Deletes a resend configuration.

### Data Structures

#### ResendConfig
```json
{
  "uid": "string (UUID)",
  "name": "string (required)",
  "enabled": "boolean",
  "destination": "NetworkAddressDTO",
  "filters": "FilterDTO[]",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### NetworkAddressDTO
```json
{
  "type": "node|subnet",
  "ip": "string (required)",
  "urn": "int32 (optional)",
  "subnet_mask": "string (optional, for subnet type)"
}
```

#### FilterDTO
```json
{
  "id": "string",
  "name": "string",
  "predicates": "PredicateDTO[]"
}
```

#### PredicateDTO
```json
{
  "id": "string",
  "type": "item_type|side|unit_type|location_boundary",
  "value": "string"
}
```

## 3. Database Schema

### Tables

#### `resend_configs`
Main configuration table storing resend settings.

| Column | Type | Description |
|--------|------|-------------|
| uid | TEXT PRIMARY KEY | Unique identifier |
| name | TEXT NOT NULL | Configuration name |
| enabled | BOOLEAN | Whether config is active |
| source_type | TEXT | Source address type |
| source_ip | TEXT | Source IP address |
| source_urn | INTEGER | Source URN |
| source_subnet_mask | TEXT | Source subnet mask |
| destination_type | TEXT NOT NULL | Destination type (node/subnet) |
| destination_ip | TEXT NOT NULL | Destination IP |
| destination_urn | INTEGER | Destination URN |
| destination_subnet_mask | TEXT | Destination subnet mask |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### `resend_filters`
Filter definitions associated with configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Filter identifier |
| config_uid | TEXT | Parent config UID (FK) |
| FOREIGN KEY | (config_uid) REFERENCES resend_configs(uid) ON DELETE CASCADE |

#### `resend_predicates`
Individual predicates within filters.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | Predicate identifier |
| filter_id | TEXT | Parent filter ID (FK) |
| type | TEXT NOT NULL | Predicate type |
| value | TEXT NOT NULL | Predicate value |
| FOREIGN KEY | (filter_id) REFERENCES resend_filters(id) ON DELETE CASCADE |

## 4. Frontend Components

### ResendingPanel.vue

**Purpose**: Main container component for managing resending configurations.

#### Key Features
- **CRUD Operations**: Create, read, update, delete configurations
- **Real-time Sync**: Automatic synchronization with backend API
- **Error Handling**: Comprehensive error display and user feedback
- **Loading States**: Visual feedback during API operations
- **Form Validation**: Client-side validation with server-side confirmation

#### Methods
- `loadResendConfigs()`: Fetches all configurations from API
- `saveConfigToBackend()`: Persists configuration changes
- `deleteConfigFromBackend()`: Removes configuration from backend
- `addConfig()`: Initializes new configuration form
- `editConfig()`: Loads existing configuration for editing

### FilterComponent.vue

**Purpose**: Manages individual filters within configurations.

#### Features
- **Dynamic Predicates**: Add/remove predicates within filters
- **Inline Editing**: Edit filter names without modal dialogs
- **Type Validation**: Ensures predicate types match available options
- **Real-time Updates**: Immediate synchronization with parent component

### PredicateComponent.vue

**Purpose**: Handles individual predicate editing and display.

#### Features
- **Type Selection**: Dropdown for predicate types
- **Value Options**: Dynamic value options based on predicate type
- **Inline Editing**: Edit predicates without leaving the filter view
- **Validation**: Ensures required fields are completed

## 5. Filter Logic

### Filter Evaluation
- **Filter Level**: Filters within a configuration are combined with OR logic
- **Predicate Level**: Predicates within a filter are combined with AND logic
- **Evaluation Order**: All predicates in a filter must match for the filter to pass

### Predicate Types

#### Item Type (`item_type`)
Filters messages based on tactical item classification:
- `unit`: Military units and personnel (CoT type starts with "a-")
- `drawing`: Map drawings and annotations (CoT type starts with "u-d" or "b-m-d")
- `contact`: Contact reports with endpoint information
- `alert`: Alert messages (CoT type starts with "b-a-")

#### Side (`side`)
Filters messages based on military affiliation:
- `friendly`: Allied forces (CoT type starts with "a-f-")
- `hostile`: Enemy forces (CoT type starts with "a-h-")
- `neutral`: Neutral entities (other "a-" types)
- `unknown`: Unidentified entities (CoT type starts with "a-u-")

#### Unit Type (`unit_type`)
Filters messages based on operational domain using MIL-STD-2525 battle dimensions:
- `air`: Airborne units (battle dimension "a" or "A")
- `ground`: Ground-based units (battle dimension "g" or "G")
- `sea`: Naval units (battle dimension "s", "S", "n", or "N")
- `space`: Space-based assets (battle dimension "p" or "P")

#### Location Boundary (`location_boundary`)
Filters messages based on geographic boundaries:
- Uses polygon IDs from the map system
- Matches against message coordinates (latitude/longitude)
- Supports complex geographic filtering

## 6. Network Destinations

### Destination Types

#### Node Destination (`node`)
Sends messages to a specific network node:
```json
{
  "type": "node",
  "ip": "192.168.1.100",
  "urn": 12345
}
```

#### Subnet Destination (`subnet`)
Broadcasts messages to an entire subnet:
```json
{
  "type": "subnet",
  "ip": "192.168.1.0",
  "subnet_mask": "255.255.255.0"
}
```

## 7. Integration Details

### HTTP Server Integration
Routes are registered in `cmd/webclient/http_server.go`:

```go
srv.OPTIONS("/api/resend/configs", optionsHandler())
srv.GET("/api/resend/configs", getResendConfigsHandler(app))
srv.POST("/api/resend/configs", createResendConfigHandler(app))
srv.OPTIONS("/api/resend/configs/:uid", optionsHandler())
srv.GET("/api/resend/configs/:uid", getResendConfigHandler(app))
srv.PUT("/api/resend/configs/:uid", updateResendConfigHandler(app))
srv.DELETE("/api/resend/configs/:uid", deleteResendConfigHandler(app))
```

### Database Integration
Tables are created automatically in `cmd/webclient/database.go`:

```go
func createResendTables(db *sql.DB) error {
    // Creates resend_configs, resend_filters, resend_predicates tables
}
```

### Component Loading
Components are loaded in `staticfiles/static/js/components/index.js`:

```javascript
document.write('<script src="/static/js/components/PredicateComponent.js"></script>');
document.write('<script src="/static/js/components/FilterComponent.js"></script>');
document.write('<script src="/static/js/components/ResendingPanel.js"></script>');
```

## 8. Usage Examples

### Creating a Configuration
```javascript
const config = {
  name: "Air Unit Forwarding",
  enabled: true,
  destination: {
    type: "node",
    ip: "192.168.1.200",
    urn: 54321
  },
  filters: [{
    id: "filter-1",
    name: "Air Units Only",
    predicates: [
      { id: "pred-1", type: "item_type", value: "unit" },
      { id: "pred-2", type: "unit_type", value: "air" },
      { id: "pred-3", type: "side", value: "friendly" }
    ]
  }]
};
```

### API Usage
```javascript
// Create configuration
fetch('/api/resend/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
});

// Get all configurations
fetch('/api/resend/configs')
  .then(response => response.json())
  .then(data => console.log(data.data));
```

## 9. Error Handling

### API Error Responses
```json
{
  "success": false,
  "error": "Configuration name is required"
}
```

### Frontend Error States
- **Loading States**: Spinner during API operations
- **Error Messages**: User-friendly error display
- **Validation Errors**: Form validation with visual feedback
- **Network Errors**: Automatic retry logic for transient failures

## 10. Future Enhancements

### Advanced Features
- **Message Transformation**: Modify messages before resending
- **Rate Limiting**: Control resending frequency
- **Load Balancing**: Distribute across multiple destinations
- **Audit Logging**: Track all resending activities

### Performance Optimizations
- **Filter Caching**: Cache compiled filter rules
- **Batch Processing**: Handle high-volume message processing
- **Monitoring**: Track resending statistics and performance

### User Experience
- **Bulk Operations**: Multi-select and bulk actions
- **Template System**: Predefined configuration templates
- **Import/Export**: Configuration backup and sharing

---

*This documentation covers the complete Resending feature implementation with full backend API integration and frontend components. The feature provides a robust foundation for tactical message routing and filtering within the GoATAK system.*
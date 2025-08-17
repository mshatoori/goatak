# Resending Feature Documentation

## 1. Overview

The **Resending Feature** is a prototype front-end implementation designed to manage message resending configurations within the GoATAK tactical system. This feature allows users to define complex filtering rules and destination mappings for automatically resending specific messages based on customizable criteria.

### Purpose

The Resending feature serves as a message routing and filtering system that enables:
- **Selective Message Forwarding**: Route specific message types to designated outgoing flows
- **Dynamic Filtering**: Apply complex filter logic using multiple predicates
- **Configuration Management**: Create, edit, and manage multiple resending configurations
- **Protocol Flexibility**: Support for various outgoing flow types (TCP, UDP, RabbitMQ)

### Current Status

This is a **non-functional prototype** implemented purely in the front-end using Vue.js components with mock data. The feature demonstrates the complete user interface and workflow without backend integration.

## 2. Architecture

### Component Hierarchy

```
ResendingPanel (Main Container)
├── FilterComponent (Per Filter)
│   └── PredicateComponent (Per Predicate)
└── Mock Data Management
```

### Integration Points

- **Sidebar Integration**: Added as a new tab in the main sidebar (`sidebar.js`)
- **Component Loading**: Managed through `index.js` for proper dependency ordering
- **Styling**: Utilizes Bootstrap 5 classes and Persian RTL support
- **State Management**: Uses Vue.js reactive data and event communication

### File Organization

```
staticfiles/static/js/components/
├── ResendingPanel.js       # Main panel component
├── FilterComponent.js      # Filter management
├── PredicateComponent.js   # Individual predicate logic
├── sidebar.js             # Sidebar integration
└── index.js              # Component loading order
```

## 3. Components Documentation

### ResendingPanel.js

**Purpose**: Main container component for managing resending configurations.

#### Props
- `config`: System configuration object
- `map`: Leaflet map instance

#### Data Properties
```javascript
{
  sharedState: store.state,           // Global state reference
  editing: false,                     // Edit mode flag
  editingData: null,                  // Current editing configuration
  editingIndex: -1,                   // Index of editing configuration
  resendingConfigs: [...],           // Array of configurations
  outgoingFlows: [...],              // Available destination flows
  newFilter: {...},                   // New filter form data
  showNewConfigForm: false,           // New config form visibility
  nextConfigId: 3,                    // ID counter for new configs
  nextFilterId: 4                     // ID counter for new filters
}
```

#### Key Methods
- [`addConfig()`](staticfiles/static/js/components/ResendingPanel.js:43): Initialize new configuration creation
- [`editConfig(index)`](staticfiles/static/js/components/ResendingPanel.js:55): Start editing existing configuration
- [`saveConfig()`](staticfiles/static/js/components/ResendingPanel.js:61): Save configuration changes
- [`deleteConfig(index)`](staticfiles/static/js/components/ResendingPanel.js:79): Remove configuration with confirmation
- [`addFilter()`](staticfiles/static/js/components/ResendingPanel.js:84): Add new filter to current configuration
- [`deleteFilter(filterIndex)`](staticfiles/static/js/components/ResendingPanel.js:96): Remove filter from configuration

### FilterComponent.js

**Purpose**: Manages individual filters within a resending configuration.

#### Props
- `filter`: Filter object containing name and predicates
- `polygons`: Available polygon boundaries for location predicates

#### Data Properties
```javascript
{
  editing: false,                     // Filter name edit mode
  editingName: "",                    // Temporary name during editing
  newPredicate: {...},               // New predicate form data
  predicateTypes: [...]              // Available predicate types
}
```

#### Events Emitted
- `update-filter`: Emitted when filter data changes
- `delete-filter`: Emitted when filter should be removed

#### Key Methods
- [`startEditing()`](staticfiles/static/js/components/FilterComponent.js:20): Begin filter name editing
- [`saveFilterName()`](staticfiles/static/js/components/FilterComponent.js:28): Save filter name changes
- [`addPredicate()`](staticfiles/static/js/components/FilterComponent.js:41): Add new predicate to filter
- [`updatePredicate(updatedPredicate)`](staticfiles/static/js/components/FilterComponent.js:56): Update existing predicate
- [`deletePredicate(predicateId)`](staticfiles/static/js/components/FilterComponent.js:68): Remove predicate from filter

### PredicateComponent.js

**Purpose**: Handles individual predicate editing and display within filters.

#### Props
- `predicate`: Predicate object with type and value
- `polygons`: Available polygon boundaries

#### Data Properties
```javascript
{
  editing: false,                     // Predicate edit mode
  editingData: {...},                // Temporary editing data
  itemTypes: [...],                  // Available item types
  sides: [...],                      // Available sides (friendly, hostile, etc.)
  unitTypes: [...],                  // Available unit types (air, ground, etc.)
  predicateTypes: [...]              // All predicate type definitions
}
```

#### Computed Properties
- [`predicateTypeLabel`](staticfiles/static/js/components/PredicateComponent.js:37): Human-readable type label
- [`predicateValueLabel`](staticfiles/static/js/components/PredicateComponent.js:41): Human-readable value label
- [`availableValues`](staticfiles/static/js/components/PredicateComponent.js:59): Dynamic value options based on type

#### Events Emitted
- `update-predicate`: Emitted when predicate changes
- `delete-predicate`: Emitted when predicate should be removed

## 4. Feature Specifications

### Resending Configuration Structure

```javascript
{
  id: Number,                         // Unique identifier
  name: String,                       // User-defined configuration name
  destination: String,                // Selected outgoing flow name
  filters: [                          // Array of filter objects
    {
      id: Number,                     // Unique filter identifier
      name: String,                   // User-defined filter name
      predicates: [                   // Array of predicate objects
        {
          id: Number,                 // Unique predicate identifier
          type: String,               // Predicate type
          value: String               // Predicate value
        }
      ]
    }
  ]
}
```

### Filter Logic

- **Multiple Filters**: Each configuration can contain multiple filters
- **Filter Combination**: Filters are evaluated with OR logic (any filter match triggers resending)
- **Predicate Combination**: Within each filter, predicates are combined with AND logic (all must match)

### Predicate Types

#### Item Type (`item_type`)
Filters messages based on the type of tactical item:
- `unit`: Military units and personnel
- `drawing`: Map drawings and annotations
- `contact`: Contact reports
- `alert`: Alert and emergency messages

#### Side (`side`)
Filters messages based on military affiliation:
- `friendly`: Allied forces
- `hostile`: Enemy forces
- `neutral`: Neutral entities
- `unknown`: Unidentified entities

#### Unit Type (`unit_type`)
Filters messages based on operational domain:
- `air`: Airborne units and aircraft
- `ground`: Ground-based units and vehicles
- `sea`: Naval and maritime units
- `space`: Space-based assets

#### Location Boundary (`location_boundary`)
Filters messages based on geographic boundaries:
- Uses polygon IDs from the map system
- Matches against message coordinates
- Supports complex geographic filtering

### Outgoing Flow Types

The system supports multiple destination protocols:
- **TCP**: Traditional TCP socket connections
- **UDP**: UDP datagram connections  
- **RabbitMQ**: Message queue integration

## 5. UI/UX Details

### Persian Language Implementation

The entire interface is implemented in Persian (Farsi) with RTL (Right-to-Left) support:
- All labels, buttons, and messages are in Persian
- Proper RTL layout using Bootstrap RTL classes
- Persian typography using Vazirmatn font family
- Cultural appropriate confirmation dialogs

### Bootstrap Styling

The feature extensively uses Bootstrap 5 components:
- **Cards**: For configuration and filter containers
- **Forms**: For input fields and selectors
- **Buttons**: With appropriate sizing and color schemes
- **Badges**: For type indicators and status display
- **Icons**: Bootstrap Icons for visual clarity

### Responsive Design

- **Flexible Layout**: Adapts to different screen sizes
- **Grid System**: Uses Bootstrap grid for form layouts
- **Mobile Friendly**: Touch-appropriate button sizes
- **Collapsible Elements**: Sidebar integration with collapse support

### User Interaction Patterns

#### Configuration Management
1. **View Mode**: List of existing configurations with basic info
2. **Add Mode**: Form for creating new configurations
3. **Edit Mode**: Inline editing of existing configurations
4. **Delete Confirmation**: Safe deletion with user confirmation

#### Filter Management
1. **Inline Addition**: Quick filter addition with name input
2. **Predicate Management**: Add/remove predicates within filters
3. **Type-based Validation**: Dynamic value options based on predicate type

#### Navigation Flow
1. Sidebar tab activation
2. Configuration list view
3. Add/Edit configuration form
4. Filter and predicate management
5. Save/Cancel operations

## 6. Integration Details

### Sidebar Integration

Added to [`sidebar.js`](staticfiles/static/js/components/sidebar.js:267) as a new tab:

```javascript
// Tab content area
<div class="tab-pane fade" id="v-pills-resending">
  <resending-panel :config="config" :map="map"></resending-panel>
</div>

// Tab button
<button class="nav-link" id="v-pills-resending-tab" 
        v-on:click="switchTab('resending')">
  بازارسال
</button>
```

### Component Loading Order

Managed in [`index.js`](staticfiles/static/js/components/index.js:30) with proper dependency resolution:

```javascript
// Load dependencies first
document.write('<script src="/static/js/components/PredicateComponent.js"></script>');
document.write('<script src="/static/js/components/FilterComponent.js"></script>');
document.write('<script src="/static/js/components/ResendingPanel.js"></script>');
```

### Event Communication

The components use Vue.js event system for communication:
- **Parent → Child**: Props for data passing
- **Child → Parent**: Custom events for state changes
- **Sibling Communication**: Through parent component mediation

## 7. Mock Data Reference

### Sample Configuration

```javascript
{
  id: 1,
  name: "پیکربندی ۱",
  destination: "جریان خروجی ۱",
  filters: [
    {
      id: 1,
      name: "فیلتر واحدها",
      predicates: [
        {
          id: 1,
          type: "item_type",
          value: "unit"
        },
        {
          id: 2,
          type: "side",
          value: "friendly"
        }
      ]
    }
  ]
}
```

### Available Outgoing Flows

```javascript
[
  { id: 1, name: "جریان خروجی ۱", type: "TCP" },
  { id: 2, name: "جریان خروجی ۲", type: "UDP" },
  { id: 3, name: "جریان خروجی ۳", type: "RabbitMQ" }
]
```

### Predicate Value Options

#### Item Types
```javascript
[
  { value: 'unit', label: 'واحد' },
  { value: 'drawing', label: 'نقشه' },
  { value: 'contact', label: 'مخاطب' },
  { value: 'alert', label: 'هشدار' }
]
```

#### Sides
```javascript
[
  { value: 'friendly', label: 'دوست' },
  { value: 'hostile', label: 'دشمن' },
  { value: 'neutral', label: 'خنثی' },
  { value: 'unknown', label: 'نامشخص' }
]
```

#### Unit Types
```javascript
[
  { value: 'air', label: 'هوایی' },
  { value: 'ground', label: 'زمینی' },
  { value: 'sea', label: 'دریایی' },
  { value: 'space', label: 'فضایی' }
]
```

## 8. Future Development

### Backend Integration Requirements

To make this feature functional, the following backend components would be needed:

#### Message Processing Engine
- **Real-time Message Monitoring**: Monitor incoming CoT messages
- **Filter Evaluation**: Implement the AND/OR logic for filter evaluation
- **Message Routing**: Route matching messages to configured destinations

#### Configuration Persistence
- **Database Schema**: Store configurations, filters, and predicates
- **CRUD API**: RESTful endpoints for configuration management
- **Validation Logic**: Server-side validation of filter rules

#### Flow Management
- **Connection Management**: Maintain outgoing flow connections
- **Protocol Handlers**: TCP, UDP, and RabbitMQ connection handlers
- **Error Handling**: Connection failure and retry logic

#### Performance Optimization
- **Filter Caching**: Cache compiled filter rules for performance
- **Message Queuing**: Handle high-volume message processing
- **Monitoring**: Track resending statistics and performance metrics

### Potential Enhancements

#### Advanced Filtering
- **Temporal Filters**: Time-based message filtering
- **Content Filters**: Message content pattern matching
- **Source Filters**: Filter by message origin
- **Priority Filters**: Filter by message priority levels

#### User Experience Improvements
- **Drag & Drop**: Reorder filters and predicates
- **Template System**: Predefined configuration templates
- **Bulk Operations**: Multi-select and bulk actions
- **Import/Export**: Configuration backup and sharing

#### System Integration
- **Audit Logging**: Track all resending activities
- **Real-time Dashboard**: Live monitoring of resending activities
- **Alert System**: Notifications for configuration issues
- **Performance Metrics**: Statistics and analytics

#### Advanced Features
- **Conditional Logic**: Complex boolean expressions
- **Message Transformation**: Modify messages before resending
- **Rate Limiting**: Control resending frequency
- **Load Balancing**: Distribute across multiple destinations

### Implementation Roadmap

1. **Phase 1**: Backend API development and basic message processing
2. **Phase 2**: Configuration persistence and flow management
3. **Phase 3**: Advanced filtering and performance optimization
4. **Phase 4**: Enhanced UI features and system integration
5. **Phase 5**: Analytics, monitoring, and advanced capabilities

---

*This documentation covers the complete Resending feature implementation as of the current prototype version. The feature provides a solid foundation for tactical message routing and filtering capabilities within the GoATAK system.*
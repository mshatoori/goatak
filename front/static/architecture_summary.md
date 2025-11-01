# Tactical Assault Kit (TAK) Application Architecture Summary

## Component Structure and Interactions

The TAK application is built using Vue.js as the front-end framework. The main components of the application include:

1. **Main Application Component** (`main.js`):
   - Initializes the Vue instance
   - Manages connections and data fetching
   - Provides global methods for date formatting

2. **Store** (`store.js`):
   - Centralized state management using a simple JavaScript object
   - Manages items, sensors, flows, and types
   - Provides methods for creating, fetching, updating, and deleting items
   - Handles WebSocket communication for real-time updates

3. **Map Component** (`map.js`):
   - Initializes and manages the Leaflet map
   - Handles map interactions and drawing functionality
   - Manages map layers and overlays
   - Processes WebSocket messages and updates map markers

4. **Components** (`components/` directory):
   - Reusable Vue components for different types of items (UnitDetails, PointDetails, etc.)
   - Each component handles its own data and interactions
   - Components communicate with the store for data management

## Data Flow

1. **Initialization**:
   - The main application component initializes the Vue instance and fetches initial data
   - The map component initializes the Leaflet map and sets up layers

2. **Data Fetching**:
   - The store fetches initial data from the server using REST API calls
   - WebSocket connection is established for real-time updates

3. **Data Updates**:
   - WebSocket messages are processed and used to update the store
   - The store emits events to notify components of changes
   - Components react to store changes and update their UI accordingly

4. **User Interactions**:
   - User interactions with components trigger methods that update the store
   - The store sends updates to the server via REST API or WebSocket
   - The server sends updates back to all connected clients

## Key Technologies and Libraries

- **Vue.js**: Front-end framework for building the user interface
- **Leaflet**: JavaScript library for interactive maps
- **Leaflet.Draw**: Plugin for Leaflet that adds drawing functionality
- **Bootstrap**: CSS framework for styling
- **Milsymbol.js**: Library for generating military symbols

## UI Framework

- **Vue.js**: The application uses Vue.js as its UI framework
- **Bootstrap**: Used for styling and responsive design
- **Leaflet**: Used for map visualization and interactions

## State Management Approach

- **Centralized Store**: The application uses a centralized store for managing state
- **Reactive Data**: The store uses reactive data properties to notify components of changes
- **WebSocket Communication**: Real-time updates are handled via WebSocket communication

## API Communication Patterns

- **REST API**: Used for initial data fetching and updates
- **WebSocket**: Used for real-time updates and communication
- **Fetch API**: Used for making HTTP requests

## Relevant Design Patterns

- **Component-Based Architecture**: The application is built using reusable components
- **Centralized State Management**: State is managed in a centralized store
- **Observer Pattern**: Components react to changes in the store
- **Singleton Pattern**: The store is a singleton that provides a single source of truth

@/staticfiles/static/architecture_summary.md 
Look at the last few git commits to see how I fixed the `UnitDetails.js`, try to fix the other item details components to work correctly.
Currently saving Caseevac differs from how Unit & Point are getting saved.
In other words, the creation/editing flow for these types differs and Casevac is handled as a special case. I prefer it to follow a more general flow closer to how units and point are handled. Read the components, `staticfiles/header.html` and `map.js` carefully and devise a plan to refactor the code, so that the casevac would be handled as close as possible to how the other items are being handled.
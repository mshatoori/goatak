# GoATAK Vue 3 Frontend

Modern Vue 3 frontend rewrite for the GoATAK tactical awareness system, built with TypeScript, Vuetify 3, and comprehensive RTL support for Persian interface.

## 🚀 Features

- **Vue 3 Composition API** with TypeScript support
- **Vuetify 3** Material Design component framework
- **RTL Support** for Persian interface with Vazirmatn font
- **Leaflet.js** integration for mapping functionality
- **MilSymbol.js** for military symbology
- **Pinia** for state management
- **Vue Router** for client-side routing
- **Vite** for fast development and building
- **ESLint & Prettier** for code quality

## 📁 Project Structure

```
frontend/
├── public/
│   ├── fonts/           # Persian fonts (Vazirmatn)
│   └── icons/           # Military and tactical icons
├── src/
│   ├── assets/
│   │   └── styles/      # SCSS stylesheets
│   ├── components/      # Vue components
│   ├── composables/     # Vue composables
│   ├── plugins/         # Vue plugins (Vuetify config)
│   ├── router/          # Vue Router configuration
│   ├── stores/          # Pinia stores
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── views/           # Page components
│   ├── App.vue          # Main application component
│   └── main.ts          # Application entry point
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── README.md           # This file
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with ES2020+ support

### Installation

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or next available port).

## 📜 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm run format` - Format code with Prettier

## 🗺️ Views and Routes

| Route       | Persian Name | Component    | Description                     |
| ----------- | ------------ | ------------ | ------------------------------- |
| `/`         | نقشه         | MapView      | Main tactical map with Leaflet  |
| `/units`    | واحدها       | UnitsView    | Unit management and tracking    |
| `/casevac`  | تخلیه پزشکی  | CasevacView  | Medical evacuation coordination |
| `/drawings` | نقاشی‌ها     | DrawingsView | Map drawings and annotations    |
| `/points`   | نقاط         | PointsView   | Points of interest management   |
| `/settings` | تنظیمات      | SettingsView | Application settings            |

## 🎨 UI Framework

### Vuetify 3 Configuration

- **Theme Support**: Light and dark themes
- **RTL Layout**: Full right-to-left support for Persian
- **Material Design Icons**: Comprehensive icon set
- **Custom Colors**: Military-appropriate color scheme

### Persian Font Integration

The application uses **Vazirmatn** font family with multiple weights:

- Thin (100)
- ExtraLight (200)
- Light (300)
- Regular (400)
- Medium (500)
- SemiBold (600)
- Bold (700)
- ExtraBold (800)
- Black (900)

## 🗃️ State Management

### Pinia Store Structure

```typescript
interface AppState {
  theme: 'light' | 'dark'
  direction: 'ltr' | 'rtl'
  language: 'en' | 'fa'
  sidebarOpen: boolean
}
```

## 🗺️ Map Integration

### Leaflet.js Setup

- **Base Maps**: OpenStreetMap and tactical overlays
- **Drawing Tools**: Leaflet.draw for annotations
- **Military Symbols**: MilSymbol.js integration
- **Coordinate Systems**: Support for MGRS and geographic coordinates

### Map Features

- Unit tracking and visualization
- Drawing tools (polygons, lines, markers)
- Military symbology rendering
- Coordinate display and conversion
- Layer management

## 🔧 TypeScript Configuration

The project includes comprehensive TypeScript support:

- **Strict Mode**: Enabled for better type safety
- **Module Resolution**: Node.js style with path mapping
- **Vue SFC Support**: Single File Component type checking
- **Library Declarations**: Custom types for Leaflet, MilSymbol, etc.

## 🎯 Development Guidelines

### Code Style

- Use **Composition API** for all new components
- Follow **TypeScript strict mode** conventions
- Implement **RTL-aware** styling with logical properties
- Use **Vuetify components** for consistent UI

### Component Structure

```vue
<template>
  <!-- RTL-aware template -->
</template>

<script setup lang="ts">
// Composition API with TypeScript
</script>

<style scoped lang="scss">
// SCSS with logical properties for RTL
</style>
```

## 🌐 Internationalization

### RTL Support

- **Logical CSS Properties**: `margin-inline-start` instead of `margin-left`
- **Vuetify RTL**: Automatic component direction switching
- **Font Loading**: Persian font preloading for performance

### Language Support

- **Primary**: Persian (fa) with RTL layout
- **Secondary**: English (en) with LTR layout
- **Font Fallbacks**: System fonts for unsupported characters

## 🚀 Production Build

### Build Optimization

- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Automatic route-based splitting
- **Asset Optimization**: Image and font optimization
- **TypeScript Compilation**: Full type checking during build

### Build Command

```bash
npm run build
```

Output will be in the `dist/` directory, ready for deployment.

## 🔗 Integration with GoATAK Backend

### API Communication

- **Axios**: HTTP client for REST API calls
- **WebSocket**: Real-time communication for live updates
- **Authentication**: Token-based authentication support

### Data Flow

1. **Frontend** ↔ **GoATAK Server** (HTTP/WebSocket)
2. **State Management** via Pinia stores
3. **Real-time Updates** for tactical data

## 📋 Next Steps

### Phase 2 Implementation

1. **Component Development**: Implement specific tactical components
2. **API Integration**: Connect to GoATAK backend services
3. **Real-time Features**: WebSocket integration for live updates
4. **Testing**: Unit and integration tests
5. **Performance**: Optimization and monitoring

### Future Enhancements

- Progressive Web App (PWA) support
- Offline functionality
- Advanced mapping features
- Mobile responsiveness improvements

## 🐛 Troubleshooting

### Common Issues

1. **SCSS Compilation Error**: Ensure `sass-embedded` is installed
2. **TypeScript Errors**: Check `tsconfig.json` configuration
3. **Font Loading**: Verify font files in `public/fonts/`
4. **RTL Layout**: Use logical CSS properties

### Development Server Issues

If the development server fails to start:

1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall dependencies: `npm install`
3. Check port availability: Default is 3000, will auto-increment

## 📄 License

This project is part of the GoATAK tactical awareness system.

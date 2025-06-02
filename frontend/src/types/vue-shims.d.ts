declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'leaflet' {
  import * as L from 'leaflet'
  export = L
  export as namespace L
}

declare module 'leaflet-draw' {
  import * as L from 'leaflet'
  
  namespace L {
    namespace Draw {
      const Event: {
        CREATED: string
        EDITED: string
        DELETED: string
        DRAWSTART: string
        DRAWSTOP: string
        DRAWVERTEX: string
        EDITSTART: string
        EDITMOVE: string
        EDITRESIZE: string
        EDITSTOP: string
        DELETESTART: string
        DELETESTOP: string
        TOOLBAROPENED: string
        TOOLBARCLOSED: string
        MARKERCONTEXT: string
      }
    }
    
    namespace Control {
      class Draw extends L.Control {
        constructor(options?: any)
      }
    }
  }
}

declare module 'milsymbol' {
  interface MilSymbolOptions {
    size?: number
    fill?: boolean
    fillOpacity?: number
    stroke?: boolean
    strokeWidth?: number
    outlineColor?: string
    outlineWidth?: number
    infoColor?: string
    infoSize?: number
    infoBackground?: string
    infoBackgroundFrame?: boolean
  }

  class MilSymbol {
    constructor(sidc: string, options?: MilSymbolOptions)
    asCanvas(): HTMLCanvasElement
    asSVG(): string
    getSize(): { width: number; height: number }
    setOptions(options: MilSymbolOptions): MilSymbol
  }

  export = MilSymbol
}

// Extend ImportMeta for Vite
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
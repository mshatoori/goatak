declare module 'milsymbol' {
  export interface SymbolOptions {
    size?: number;
    [key: string]: any;
  }

  export class Symbol {
    constructor(sidc: string, options?: SymbolOptions);
    toDataURL(): string;
  }
}
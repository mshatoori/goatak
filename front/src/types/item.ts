export interface UserPos {
  lat: number;
  lng: number;
}

export interface Item {
  uid: string;
  type: string;
  callsign: string;
  lat: number;
  lng: number;
  text?: string;
  how?: string;
  detail?: any;
  local?: boolean;
  send?: boolean;
  sendMode?: string;
  selectedSubnet?: string;
  selectedIP?: string;
  selectedUrn?: number;
}

export interface SIDC {
  id: string;
  name: string;
  children?: SIDC[];
}
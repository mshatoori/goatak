import type { SIDC } from '../types/item'

export const getSidcFromType = (type: string): string => {
  // Migrate from legacy, placeholder
  return `sfgpeu--${type}` // Example for friendly ground unit
}

export const getTypeFromSidc = (sidc: string): string => {
  // Placeholder
  return sidc.split('--')[1] || 'unknown'
}

export const getIconForType = (type: string): string => {
  const icons: Record<string, string> = {
    unit: 'u',
    point: 'b',
    drawing: 'f',
    // Add more from legacy icons
  }
  return icons[type] || 'self'
}
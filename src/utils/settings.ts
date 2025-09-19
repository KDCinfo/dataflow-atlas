/**
 * Settings management utility for Data Flow Atlas.
 * Handles localStorage and sessionStorage for various application settings.
 */

export interface DataLayer {
  name: string;
  value: string;
  type: 'endpoint' | 'throughpoint';
}

export interface SettingsConfig {
  locations: string[];
  dataLayers: DataLayer[];
  categories: string[];
  dataTypes: string[];
  // Legacy support - will be migrated to dataLayers
  layers?: string[];
}

const SETTINGS_KEY = 'dfa__settings';
const TEMP_SETTINGS_KEY = 'dfa__temp_settings';

/**
 * Default data layers with endpoint/throughpoint classification.
 */
const DEFAULT_DATA_LAYERS: DataLayer[] = [
  // Endpoints - final destinations for data
  { name: 'Model', value: 'model', type: 'endpoint' },
  { name: 'Pinia Store', value: 'store', type: 'endpoint' },
  { name: 'Local Storage', value: 'localStorage', type: 'endpoint' },
  { name: 'Session Storage', value: 'sessionStorage', type: 'endpoint' },
  { name: 'Database Table', value: 'database', type: 'endpoint' },
  
  // Throughpoints - intermediate processing layers
  { name: 'Repository', value: 'repository', type: 'throughpoint' },
  { name: 'ViewController', value: 'viewController', type: 'throughpoint' },
  { name: 'Backend API', value: 'api', type: 'throughpoint' },
];

/**
 * Get current settings from localStorage.
 */
export function getSettings(): SettingsConfig {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SettingsConfig;
      
      // Handle migration from old layers structure
      let dataLayers = parsed.dataLayers || [];
      if (dataLayers.length === 0 && parsed.layers && parsed.layers.length > 0) {
        // Migrate old layers to new structure with best-guess classifications
        dataLayers = parsed.layers.map(layerName => {
          const defaultLayer = DEFAULT_DATA_LAYERS.find(dl => dl.value === layerName || dl.name === layerName);
          return defaultLayer || { name: layerName, value: layerName.toLowerCase(), type: 'endpoint' as const };
        });
      }
      
      // Ensure we have default layers if none exist
      if (dataLayers.length === 0) {
        dataLayers = [...DEFAULT_DATA_LAYERS];
      }
      
      return {
        locations: parsed.locations || [],
        dataLayers,
        categories: parsed.categories || [],
        dataTypes: parsed.dataTypes || [],
      };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }

  // Return default settings.
  return {
    locations: [],
    dataLayers: [...DEFAULT_DATA_LAYERS],
    categories: [],
    dataTypes: [],
  };
}

/**
 * Save settings to localStorage.
 */
export function saveSettings(settings: SettingsConfig): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Get unique locations from existing cards and settings.
 */
export function getUniqueLocations(): string[] {
  const settings = getSettings();
  const existingLocations = new Set(settings.locations);

  // Add locations from existing cards.
  try {
    const cards = JSON.parse(localStorage.getItem('dfdcCards') || '[]');
    cards.forEach((card: any) => {
      if (card.location && card.location.trim()) {
        existingLocations.add(card.location.trim());
      }
    });
  } catch (error) {
    console.warn('Failed to load cards for location extraction:', error);
  }

  return Array.from(existingLocations).sort();
}

/**
 * Add a new location to settings.
 */
export function addLocation(location: string): void {
  const trimmed = location.trim();
  if (!trimmed) return;

  const settings = getSettings();
  if (!settings.locations.includes(trimmed)) {
    settings.locations.push(trimmed);
    settings.locations.sort();
    saveSettings(settings);
  }
}

/**
 * Remove a location from settings.
 */
export function removeLocation(location: string): void {
  const settings = getSettings();
  settings.locations = settings.locations.filter(loc => loc !== location);
  saveSettings(settings);
}

/**
 * Get temporary settings from sessionStorage (for dialog state).
 */
export function getTempSettings(): Partial<SettingsConfig> {
  try {
    const stored = sessionStorage.getItem(TEMP_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load temp settings:', error);
    return {};
  }
}

/**
 * Save temporary settings to sessionStorage.
 */
export function saveTempSettings(settings: Partial<SettingsConfig>): void {
  try {
    sessionStorage.setItem(TEMP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save temp settings:', error);
  }
}

/**
 * Clear temporary settings.
 */
export function clearTempSettings(): void {
  try {
    sessionStorage.removeItem(TEMP_SETTINGS_KEY);
  } catch (error) {
    console.warn('Failed to clear temp settings:', error);
  }
}

/**
 * Get data layers grouped by type.
 */
export function getDataLayersByType(): { endpoints: DataLayer[]; throughpoints: DataLayer[] } {
  const settings = getSettings();
  const endpoints = settings.dataLayers.filter(layer => layer.type === 'endpoint');
  const throughpoints = settings.dataLayers.filter(layer => layer.type === 'throughpoint');
  
  return { endpoints, throughpoints };
}

/**
 * Add or update a data layer.
 */
export function saveDataLayer(layer: DataLayer, originalValue?: string): void {
  const settings = getSettings();
  
  // If originalValue is provided, we're updating an existing layer
  if (originalValue) {
    const index = settings.dataLayers.findIndex(l => l.value === originalValue);
    if (index !== -1) {
      settings.dataLayers[index] = layer;
    }
  } else {
    // Adding a new layer
    settings.dataLayers.push(layer);
  }
  
  saveSettings(settings);
}

/**
 * Delete a data layer.
 */
export function deleteDataLayer(layerValue: string): void {
  const settings = getSettings();
  settings.dataLayers = settings.dataLayers.filter(layer => layer.value !== layerValue);
  saveSettings(settings);
}

/**
 * Check if a data layer value already exists.
 */
export function dataLayerExists(value: string, excludeValue?: string): boolean {
  const settings = getSettings();
  return settings.dataLayers.some(layer => 
    layer.value === value && layer.value !== excludeValue
  );
}
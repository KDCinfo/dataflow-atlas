/**
 * Settings management utility for Data Flow Atlas.
 * Handles localStorage and sessionStorage for various application settings.
 */

import { STORAGE_KEY } from './storage.js';

export enum DataLayerType {
  Endpoint = 'endpoint',
  Throughpoint = 'throughpoint'
}

export interface DataLayer {
  name: string;
  id: string; // Internal unique identifier
  type: DataLayerType;
}

export interface FormVisibilitySettings {
  showScope: boolean;
  showCategory: boolean;
  showPersistsIn: boolean;
}

export interface SettingsConfig {
  locations: string[];
  dataLayers: DataLayer[];
  categories: string[];
  dataTypes: string[];
  formVisibility: FormVisibilitySettings;
}

const SETTINGS_KEY = 'dfa__settings';
const TEMP_SETTINGS_KEY = 'dfa__temp_settings';

/**
 * Default form visibility settings - all optional fields hidden by default.
 */
const DEFAULT_FORM_VISIBILITY: FormVisibilitySettings = {
  showScope: false,
  showCategory: false,
  showPersistsIn: false,
};

/**
 * Generate a unique ID for data layers based on name.
 */
export function generateLayerId(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Default data layers with endpoint/throughpoint classification.
 */
const DEFAULT_DATA_LAYERS: DataLayer[] = [
  // Endpoints - final destinations for data
  { name: 'Model', id: 'model', type: DataLayerType.Endpoint },
  { name: 'Pinia Store', id: 'pinia-store', type: DataLayerType.Endpoint },
  { name: 'Local Storage', id: 'local-storage', type: DataLayerType.Endpoint },
  { name: 'Session Storage', id: 'session-storage', type: DataLayerType.Endpoint },
  { name: 'Database Table', id: 'database-table', type: DataLayerType.Endpoint },

  // Throughpoints - intermediate processing layers
  { name: 'Repository', id: 'repository', type: DataLayerType.Throughpoint },
  { name: 'ViewController', id: 'view-controller', type: DataLayerType.Throughpoint },
  { name: 'Backend API', id: 'backend-api', type: DataLayerType.Throughpoint },
];/**
 * Get current settings from localStorage.
 */
export function getSettings(): SettingsConfig {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SettingsConfig;

      // Ensure we have default layers if none exist
      const dataLayers = parsed.dataLayers?.length > 0 ? parsed.dataLayers : [...DEFAULT_DATA_LAYERS];

      return {
        locations: parsed.locations || [],
        dataLayers,
        categories: parsed.categories || [],
        dataTypes: parsed.dataTypes || [],
        formVisibility: parsed.formVisibility || { ...DEFAULT_FORM_VISIBILITY },
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
    formVisibility: { ...DEFAULT_FORM_VISIBILITY },
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
    const cards = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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
  const endpoints = settings.dataLayers.filter(layer => layer.type === DataLayerType.Endpoint);
  const throughpoints = settings.dataLayers.filter(layer => layer.type === DataLayerType.Throughpoint);

  return { endpoints, throughpoints };
}

/**
 * Add or update a data layer.
 */
export function saveDataLayer(layer: DataLayer, originalId?: string): void {
  const settings = getSettings();

  // If originalId is provided, we're updating an existing layer
  if (originalId) {
    const index = settings.dataLayers.findIndex(l => l.id === originalId);
    if (index !== -1) {
      settings.dataLayers[index] = layer;
    }
  } else {
    // Adding a new layer - generate ID if not provided
    if (!layer.id) {
      layer.id = generateLayerId(layer.name);
    }
    settings.dataLayers.push(layer);
  }

  saveSettings(settings);
}

/**
 * Delete a data layer.
 */
export function deleteDataLayer(layerId: string): void {
  const settings = getSettings();
  settings.dataLayers = settings.dataLayers.filter(layer => layer.id !== layerId);
  saveSettings(settings);
}

/**
 * Check if a data layer ID already exists.
 */
/**
 * Check if a data layer ID already exists.
 */
export function dataLayerExists(id: string, excludeId?: string): boolean {
  const settings = getSettings();
  return settings.dataLayers.some(layer =>
    layer.id === id && layer.id !== excludeId
  );
}

/**
 * Update form visibility settings.
 */
export function updateFormVisibility(visibility: Partial<FormVisibilitySettings>): void {
  const settings = getSettings();
  const updatedSettings: SettingsConfig = {
    ...settings,
    formVisibility: {
      ...settings.formVisibility,
      ...visibility,
    },
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
}

/**
 * Get current form visibility settings.
 */
export function getFormVisibility(): FormVisibilitySettings {
  return getSettings().formVisibility;
}

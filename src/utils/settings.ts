/**
 * Settings management utility for Data Flow Atlas.
 * Handles localStorage and sessionStorage for various application settings.
 */

import { STORAGE_KEY, loadCards, saveCards } from './storage.js';

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
  scopes: string[];
  categories: string[];
  scopeLabels: Record<string, string>; // Custom labels for scope keys
  categoryLabels: Record<string, string>; // Custom labels for category keys
  locationLabels: Record<string, string>; // Custom labels for location keys
  dataTypes: string[];
  formVisibility: FormVisibilitySettings;
}

const SETTINGS_KEY = 'dfa__settings';
const TEMP_SETTINGS_KEY = 'dfa__temp_settings';

// Default scope and category definitions with display labels
const DEFAULT_SCOPES_MAP: Record<string, string> = {
  'app': 'App-level (device/browser)',
  'user': 'User-level (account)',
  'session': 'Session-level (temporary)'
};

const DEFAULT_CATEGORIES_MAP: Record<string, string> = {
  'user-preference': 'User Preference',
  'account-setting': 'Account Setting',
  'runtime-state': 'Runtime State',
  'feature-data': 'Feature Data',
  'app-preference': 'App Preference'
};

// Helper functions to get arrays from the maps
const getDefaultScopes = (): string[] => Object.keys(DEFAULT_SCOPES_MAP);
const getDefaultCategories = (): string[] => Object.keys(DEFAULT_CATEGORIES_MAP);

/**
 * Get display label for a scope value.
 */
export function getScopeLabel(scope: string): string {
  const settings = getSettings();
  // Check custom labels first, then defaults, then auto-generate
  return settings.scopeLabels[scope] ||
         DEFAULT_SCOPES_MAP[scope] ||
         scope.charAt(0).toUpperCase() + scope.slice(1);
}

/**
 * Get display label for a category value.
 */
export function getCategoryLabel(category: string): string {
  const settings = getSettings();
  // Check custom labels first, then defaults, then auto-generate
  return settings.categoryLabels[category] ||
         DEFAULT_CATEGORIES_MAP[category] ||
         category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Default location definitions with display labels
const DEFAULT_LOCATIONS_MAP: Record<string, string> = {
  'app-state': 'Application State',
  'user-store': 'User Store',
  'session-storage': 'Session Storage',
  'local-storage': 'Local Storage',
  'api-endpoint': 'API Endpoint',
  'database': 'Database',
};

/**
 * Get default location keys.
 */
export function getDefaultLocations(): string[] {
  return Object.keys(DEFAULT_LOCATIONS_MAP);
}

/**
 * Get display label for a location value.
 */
export function getLocationLabel(location: string): string {
  const settings = getSettings();
  // Check custom labels first, then defaults, then auto-generate
  return settings.locationLabels[location] ||
         DEFAULT_LOCATIONS_MAP[location] ||
         location.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

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
        locations: (parsed.locations && parsed.locations.length > 0) ? parsed.locations : getDefaultLocations(),
        dataLayers,
        scopes: (parsed.scopes && parsed.scopes.length > 0) ? parsed.scopes : getDefaultScopes(),
        categories: (parsed.categories && parsed.categories.length > 0) ? parsed.categories : getDefaultCategories(),
        scopeLabels: parsed.scopeLabels || {},
        categoryLabels: parsed.categoryLabels || {},
        locationLabels: parsed.locationLabels || {},
        dataTypes: parsed.dataTypes || [],
        formVisibility: parsed.formVisibility || { ...DEFAULT_FORM_VISIBILITY },
      };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }

  // Return default settings.
  return {
    locations: getDefaultLocations(),
    dataLayers: [...DEFAULT_DATA_LAYERS],
    scopes: getDefaultScopes(),
    categories: getDefaultCategories(),
    scopeLabels: {},
    categoryLabels: {},
    locationLabels: {},
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
    cards.cards?.forEach((card: any) => {
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
 * Add a new location with custom label to settings.
 */
export function addLocationWithLabel(location: string, label: string): void {
  const trimmedLocation = location.trim();
  const trimmedLabel = label.trim();
  if (!trimmedLocation) return;

  const settings = getSettings();
  if (!settings.locations.includes(trimmedLocation)) {
    settings.locations.push(trimmedLocation);
    settings.locations.sort();

    // Add custom label if provided and different from auto-generated
    if (trimmedLabel && trimmedLabel !== trimmedLocation.charAt(0).toUpperCase() + trimmedLocation.slice(1)) {
      settings.locationLabels[trimmedLocation] = trimmedLabel;
    }

    saveSettings(settings);
  }
}

/**
 * Helper function to remove a field value from all cards that use it.
 * This makes affected cards appear in the Orphans filter.
 */
function removeFieldFromCards(fieldName: 'location' | 'scope' | 'category', valueToRemove: string): void {
  const cards = loadCards();
  let hasChanges = false;

  const updatedCards = cards.map(card => {
    if (card[fieldName] === valueToRemove) {
      hasChanges = true;
      return {
        ...card,
        [fieldName]: undefined // Remove the field value, making it orphaned
      };
    }
    return card;
  });

  if (hasChanges) {
    saveCards(updatedCards);

    // Refresh the UI to show the changes
    const dfdAtlas = (window as any).dfdAtlas;
    if (dfdAtlas && typeof dfdAtlas.refreshDisplay === 'function') {
      dfdAtlas.refreshDisplay();
    }
  }
}

/**
 * Remove a location from settings and clean up any cards using this location.
 */
export function removeLocation(location: string): void {
  const settings = getSettings();
  settings.locations = settings.locations.filter(loc => loc !== location);
  // Also remove custom label if it exists
  delete settings.locationLabels[location];
  saveSettings(settings);

  // Remove this location from any cards that use it
  removeFieldFromCards('location', location);
}

/**
 * Get all available scopes from settings.
 */
export function getScopes(): string[] {
  const settings = getSettings();
  return [...settings.scopes].sort();
}

/**
 * Add a new scope to settings.
 */
export function addScope(scope: string): void {
  const trimmed = scope.trim();
  if (!trimmed) return;

  const settings = getSettings();
  if (!settings.scopes.includes(trimmed)) {
    settings.scopes.push(trimmed);
    settings.scopes.sort();
    saveSettings(settings);
  }
}

/**
 * Add a new scope with custom label to settings.
 */
export function addScopeWithLabel(scope: string, label: string): void {
  const trimmedScope = scope.trim();
  const trimmedLabel = label.trim();
  if (!trimmedScope) return;

  const settings = getSettings();
  if (!settings.scopes.includes(trimmedScope)) {
    settings.scopes.push(trimmedScope);
    settings.scopes.sort();

    // Add custom label if provided and different from auto-generated
    if (trimmedLabel && trimmedLabel !== trimmedScope.charAt(0).toUpperCase() + trimmedScope.slice(1)) {
      settings.scopeLabels[trimmedScope] = trimmedLabel;
    }

    saveSettings(settings);
  }
}

/**
 * Remove a scope from settings and clean up any cards using this scope.
 */
export function removeScope(scope: string): void {
  const settings = getSettings();
  const index = settings.scopes.indexOf(scope);
  if (index !== -1) {
    settings.scopes.splice(index, 1);
    // Also remove custom label if it exists
    delete settings.scopeLabels[scope];
    saveSettings(settings);

    // Remove this scope from any cards that use it
    removeFieldFromCards('scope', scope);
  }
}

/**
 * Get all available categories from settings.
 */
export function getCategories(): string[] {
  const settings = getSettings();
  return [...settings.categories].sort();
}

/**
 * Add a new category to settings.
 */
export function addCategory(category: string): void {
  const trimmed = category.trim();
  if (!trimmed) return;

  const settings = getSettings();
  if (!settings.categories.includes(trimmed)) {
    settings.categories.push(trimmed);
    settings.categories.sort();
    saveSettings(settings);
  }
}

/**
 * Add a new category with custom label to settings.
 */
export function addCategoryWithLabel(category: string, label: string): void {
  const trimmedCategory = category.trim();
  const trimmedLabel = label.trim();
  if (!trimmedCategory) return;

  const settings = getSettings();
  if (!settings.categories.includes(trimmedCategory)) {
    settings.categories.push(trimmedCategory);
    settings.categories.sort();

    // Add custom label if provided and different from auto-generated
    if (trimmedLabel && trimmedLabel !== trimmedCategory.charAt(0).toUpperCase() + trimmedCategory.slice(1)) {
      settings.categoryLabels[trimmedCategory] = trimmedLabel;
    }

    saveSettings(settings);
  }
}

/**
 * Remove a category from settings and clean up any cards using this category.
 */
export function removeCategory(category: string): void {
  const settings = getSettings();
  settings.categories = settings.categories.filter(c => c !== category);
  // Also remove custom label if it exists
  delete settings.categoryLabels[category];
  saveSettings(settings);

  // Remove this category from any cards that use it
  removeFieldFromCards('category', category);
}

/**
 * Edit an existing scope with new key and label.
 */
export function editScope(oldKey: string, newKey: string, newLabel: string): boolean {
  const trimmedOldKey = oldKey.trim();
  const trimmedNewKey = newKey.trim();
  const trimmedNewLabel = newLabel.trim();

  if (!trimmedOldKey || !trimmedNewKey) return false;

  const settings = getSettings();
  const oldIndex = settings.scopes.indexOf(trimmedOldKey);

  if (oldIndex === -1) return false;

  // Check if new key already exists (and is different from old key)
  if (trimmedNewKey !== trimmedOldKey && settings.scopes.includes(trimmedNewKey)) {
    return false;
  }

  // Update the scope key
  settings.scopes[oldIndex] = trimmedNewKey;
  settings.scopes.sort();

  // Remove old label if it exists
  delete settings.scopeLabels[trimmedOldKey];

  // Add new label if provided and different from auto-generated
  if (trimmedNewLabel && trimmedNewLabel !== trimmedNewKey.charAt(0).toUpperCase() + trimmedNewKey.slice(1)) {
    settings.scopeLabels[trimmedNewKey] = trimmedNewLabel;
  }

  saveSettings(settings);
  return true;
}

/**
 * Edit an existing category with new key and label.
 */
export function editCategory(oldKey: string, newKey: string, newLabel: string): boolean {
  const trimmedOldKey = oldKey.trim();
  const trimmedNewKey = newKey.trim();
  const trimmedNewLabel = newLabel.trim();

  if (!trimmedOldKey || !trimmedNewKey) return false;

  const settings = getSettings();
  const oldIndex = settings.categories.indexOf(trimmedOldKey);

  if (oldIndex === -1) return false;

  // Check if new key already exists (and is different from old key)
  if (trimmedNewKey !== trimmedOldKey && settings.categories.includes(trimmedNewKey)) {
    return false;
  }

  // Update the category key
  settings.categories[oldIndex] = trimmedNewKey;
  settings.categories.sort();

  // Remove old label if it exists
  delete settings.categoryLabels[trimmedOldKey];

  // Add new label if provided and different from auto-generated
  if (trimmedNewLabel && trimmedNewLabel !== trimmedNewKey.charAt(0).toUpperCase() + trimmedNewKey.slice(1)) {
    settings.categoryLabels[trimmedNewKey] = trimmedNewLabel;
  }

  saveSettings(settings);
  return true;
}

/**
 * Edit an existing location label (key stays the same for efficiency).
 */
export function editLocation(locationKey: string, newLabel: string): boolean {
  const trimmedKey = locationKey.trim();
  const trimmedLabel = newLabel.trim();

  if (!trimmedKey) return false;

  const settings = getSettings();

  if (!settings.locations.includes(trimmedKey)) return false;

  // Update the label (key remains unchanged for efficiency)
  if (trimmedLabel && trimmedLabel !== trimmedKey.charAt(0).toUpperCase() + trimmedKey.slice(1)) {
    settings.locationLabels[trimmedKey] = trimmedLabel;
  } else {
    // Remove custom label if it matches the auto-generated one
    delete settings.locationLabels[trimmedKey];
  }

  saveSettings(settings);
  return true;
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

/**
 * Clean Settings Management for Data Flow Atlas.
 * Atlas-specific settings with global app preferences.
 */

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

// Global app-level settings (stored in dfa__settings)
export interface GlobalSettings {
  formVisibility: FormVisibilitySettings;
  activeAtlas: string;
}

// Atlas-specific settings (stored in dfa_[atlasName]_settings)
export interface AtlasSettings {
  dataLayers: DataLayer[];
  dataTypes: string[];
  locations: string[]; // Layer names (files/classes) - simple identifiers
  scopes: string[];
  scopeLabels: Record<string, string>; // Custom labels for scope keys
  categories: string[];
  categoryLabels: Record<string, string>; // Custom labels for category keys
}

// Storage keys
const GLOBAL_SETTINGS_KEY = 'dfa__settings';

// Default values
const DEFAULT_ATLAS_NAME = 'default';

// Default scope and category definitions with display labels
const DEFAULT_SCOPES_MAP: Record<string, string> = {
  'app': 'App-level (device/browser)',
  'user': 'User-level (account)',
  'session': 'Session-level (temporary)'
};

const DEFAULT_CATEGORIES_MAP: Record<string, string> = {
  'user_preference': 'User Preference',
  'account_setting': 'Account Setting',
  'runtime_state': 'Runtime State',
  'feature_data': 'Feature Data',
  'app_preference': 'App Preference'
};

// Helper functions to get arrays from the maps.
const getDefaultScopes = (): string[] => Object.keys(DEFAULT_SCOPES_MAP);
const getDefaultCategories = (): string[] => Object.keys(DEFAULT_CATEGORIES_MAP);

// Default locations (layer names)
const getDefaultLocations = (): string[] => [
  'useAppStore', // Class name
  'appStore.ts', // File name
  'useServiceApi.ts',
  'Component.vue',
  'network_service_api.dart',
  'NetworkServiceApi',
  'app_bar_container.dart',
  'AppBarContainer',
];

// Use 'getDefaultLocations' as a base, and append a string to the first two strings:
export const exampleLocations = (): string[] => getDefaultLocations().map((loc, idx) => {
  if (idx === 0) return loc + ' (class name)';
  if (idx === 1) return loc + ' (file name)';
  return loc;
});

/**
 * Default form visibility settings - all optional fields hidden by default.
 */
const DEFAULT_FORM_VISIBILITY: FormVisibilitySettings = {
  showScope: false,
  showCategory: false,
  showPersistsIn: false,
};

// Default data sources.
const DEFAULT_DATA_LAYERS: DataLayer[] = [
  // Endpoints - where data ultimately starts or ends up; 'Has data'
  // Persistent data that is used to populate more transient data stores.
  { name: 'Database', id: 'database', type: DataLayerType.Endpoint },
  { name: 'localStorage', id: 'localstorage', type: DataLayerType.Endpoint },
  { name: 'File System', id: 'filesystem', type: DataLayerType.Endpoint },

  // Throughpoints/Consumers - intermediate processing layers; 'Gets data'
  // Has data set from another source, or passes data through it.
  // If the layer is empty when the app loads, it is a throughpoint (which could be categorized).
  { name: 'Pinia Store', id: 'pinia-store', type: DataLayerType.Throughpoint },
  { name: 'sessionStorage', id: 'sessionstorage', type: DataLayerType.Throughpoint },
  { name: 'Repository', id: 'repository', type: DataLayerType.Throughpoint },
  { name: 'ViewController', id: 'view-controller', type: DataLayerType.Throughpoint },
  { name: 'Backend API', id: 'backend-api', type: DataLayerType.Throughpoint },
];

/**
 * Get atlas-specific settings storage key.
 */
function getAtlasSettingsKey(atlasName: string): string {
  return `dfa_${atlasName}_settings`;
}

/**
 * Get global app-level settings.
 */
export function getGlobalSettings(): GlobalSettings {
  try {
    const stored = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as GlobalSettings;
      return {
        formVisibility: parsed.formVisibility || { ...DEFAULT_FORM_VISIBILITY },
        activeAtlas: parsed.activeAtlas || DEFAULT_ATLAS_NAME,
      };
    }
  } catch (error) {
    console.warn('Failed to load global settings:', error);
  }

  return {
    formVisibility: { ...DEFAULT_FORM_VISIBILITY },
    activeAtlas: DEFAULT_ATLAS_NAME,
  };
}

/**
 * Save global app-level settings.
 */
export function saveGlobalSettings(settings: GlobalSettings): void {
  try {
    localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save global settings:', error);
  }
}

/**
 * Get atlas-specific settings.
 */
export function getAtlasSettings(atlasName: string): AtlasSettings {
  try {
    const key = getAtlasSettingsKey(atlasName);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as AtlasSettings;
      return {
        dataLayers: parsed.dataLayers?.length > 0 ? parsed.dataLayers : [...DEFAULT_DATA_LAYERS],
        dataTypes: parsed.dataTypes || [],
        locations: parsed.locations?.length > 0 ? parsed.locations : [], // || getDefaultLocations(),
        scopes: parsed.scopes?.length > 0 ? parsed.scopes : getDefaultScopes(),
        scopeLabels: parsed.scopeLabels || {},
        categories: parsed.categories?.length > 0 ? parsed.categories : getDefaultCategories(),
        categoryLabels: parsed.categoryLabels || {},
      };
    }
  } catch (error) {
    console.warn(`Failed to load atlas settings for ${atlasName}:`, error);
  }

  // Return default atlas settings
  return {
    dataLayers: [...DEFAULT_DATA_LAYERS],
    dataTypes: [],
    locations: [], // getDefaultLocations(),
    scopes: getDefaultScopes(),
    scopeLabels: {},
    categories: getDefaultCategories(),
    categoryLabels: {},
  };
}

/**
 * Save atlas-specific settings.
 */
export function saveAtlasSettings(atlasName: string, settings: AtlasSettings): void {
  try {
    const key = getAtlasSettingsKey(atlasName);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error(`Failed to save atlas settings for ${atlasName}:`, error);
  }
}

/**
 * Get current atlas settings for the active atlas.
 */
export function getCurrentAtlasSettings(): AtlasSettings {
  const activeAtlas = getActiveAtlas();
  return getAtlasSettings(activeAtlas);
}

/**
 * Save current atlas settings for the active atlas.
 */
export function saveCurrentAtlasSettings(settings: AtlasSettings): void {
  const activeAtlas = getActiveAtlas();
  saveAtlasSettings(activeAtlas, settings);
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC SETTINGS
// =============================================================================

/**
 * Get display label for a scope value.
 */
export function getScopeLabel(scope: string): string {
  const settings = getCurrentAtlasSettings();
  // Check custom labels first, then defaults, then auto-generate
  return settings.scopeLabels[scope] ||
         DEFAULT_SCOPES_MAP[scope] ||
         scope.charAt(0).toUpperCase() + scope.slice(1);
}

/**
 * Get display label for a category value.
 */
export function getCategoryLabel(category: string): string {
  const settings = getCurrentAtlasSettings();
  // Check custom labels first, then defaults, then auto-generate
  return settings.categoryLabels[category] ||
         DEFAULT_CATEGORIES_MAP[category] ||
         category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Get unique locations from existing cards and settings.
 */
export function getUniqueLocations(): string[] {
  const settings = getCurrentAtlasSettings();
  const existingLocations = new Set(settings.locations);

  // Add locations from existing cards in the current atlas
  try {
    const activeAtlas = getActiveAtlas();
    const atlasKey = `dfa_${activeAtlas}`;
    const atlasData = localStorage.getItem(atlasKey);
    if (atlasData) {
      const parsed = JSON.parse(atlasData);
      const cards = parsed.cards || parsed; // Handle both new and legacy formats
      if (Array.isArray(cards)) {
        cards.forEach((card: any) => {
          // Handle both old and new property names for backward compatibility
          const sourceName = card.sourceName || card.location;
          if (sourceName && sourceName.trim()) {
            existingLocations.add(sourceName.trim());
          }
        });
      }
    }
  } catch (error) {
    console.warn('Failed to load card locations:', error);
  }

  return Array.from(existingLocations).sort();
}

/**
 * Add a new location (layer name).
 */
export function addLocation(location: string): void {
  const trimmed = location.trim();
  if (!trimmed) return;

  const settings = getCurrentAtlasSettings();
  if (!settings.locations.includes(trimmed)) {
    settings.locations.push(trimmed);
    settings.locations.sort();
    saveCurrentAtlasSettings(settings);
  }
}

/**
 * Remove a location.
 */
export function removeLocation(location: string): void {
  const settings = getCurrentAtlasSettings();
  settings.locations = settings.locations.filter(loc => loc !== location);
  saveCurrentAtlasSettings(settings);
}

/**
 * Edit a location name.
 */
export function editLocation(oldLocation: string, newLocation: string): void {
  const trimmed = newLocation.trim();
  if (!trimmed || trimmed === oldLocation) return;

  const settings = getCurrentAtlasSettings();
  const index = settings.locations.indexOf(oldLocation);
  if (index !== -1) {
    settings.locations[index] = trimmed;
    settings.locations.sort();
    saveCurrentAtlasSettings(settings);
  }
}

// =============================================================================
// SCOPE MANAGEMENT
// =============================================================================

/**
 * Get all available scopes.
 */
export function getScopes(): string[] {
  return getCurrentAtlasSettings().scopes;
}

/**
 * Add a new scope with optional custom label.
 */
export function addScopeWithLabel(scope: string, label: string): void {
  const trimmedScope = scope.trim();
  const trimmedLabel = label.trim();
  if (!trimmedScope) return;

  const settings = getCurrentAtlasSettings();
  if (!settings.scopes.includes(trimmedScope)) {
    settings.scopes.push(trimmedScope);
    settings.scopes.sort();

    // Add custom label if provided and different from auto-generated
    if (trimmedLabel && trimmedLabel !== trimmedScope.charAt(0).toUpperCase() + trimmedScope.slice(1)) {
      settings.scopeLabels[trimmedScope] = trimmedLabel;
    }

    saveCurrentAtlasSettings(settings);
  }
}

/**
 * Remove a scope.
 */
export function removeScope(scope: string): void {
  const settings = getCurrentAtlasSettings();
  settings.scopes = settings.scopes.filter(s => s !== scope);
  // Remove custom label if it exists
  if (settings.scopeLabels[scope]) {
    delete settings.scopeLabels[scope];
  }
  saveCurrentAtlasSettings(settings);
}

/**
 * Edit a scope.
 */
export function editScope(oldScope: string, newScope: string, newLabel: string): void {
  const trimmedScope = newScope.trim();
  const trimmedLabel = newLabel.trim();
  if (!trimmedScope || trimmedScope === oldScope) return;

  const settings = getCurrentAtlasSettings();
  const index = settings.scopes.indexOf(oldScope);
  if (index !== -1) {
    settings.scopes[index] = trimmedScope;
    settings.scopes.sort();

    // Handle label changes
    if (settings.scopeLabels[oldScope]) {
      delete settings.scopeLabels[oldScope];
    }
    if (trimmedLabel && trimmedLabel !== trimmedScope.charAt(0).toUpperCase() + trimmedScope.slice(1)) {
      settings.scopeLabels[trimmedScope] = trimmedLabel;
    }

    saveCurrentAtlasSettings(settings);
  }
}

// =============================================================================
// CATEGORY MANAGEMENT
// =============================================================================

/**
 * Get all available categories.
 */
export function getCategories(): string[] {
  return getCurrentAtlasSettings().categories;
}

/**
 * Add a new category with optional custom label.
 */
export function addCategoryWithLabel(category: string, label: string): void {
  const trimmedCategory = category.trim();
  const trimmedLabel = label.trim();
  if (!trimmedCategory) return;

  const settings = getCurrentAtlasSettings();
  if (!settings.categories.includes(trimmedCategory)) {
    settings.categories.push(trimmedCategory);
    settings.categories.sort();

    // Add custom label if provided and different from auto-generated
    const autoLabel = trimmedCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (trimmedLabel && trimmedLabel !== autoLabel) {
      settings.categoryLabels[trimmedCategory] = trimmedLabel;
    }

    saveCurrentAtlasSettings(settings);
  }
}

/**
 * Remove a category.
 */
export function removeCategory(category: string): void {
  const settings = getCurrentAtlasSettings();
  settings.categories = settings.categories.filter(c => c !== category);
  // Remove custom label if it exists
  if (settings.categoryLabels[category]) {
    delete settings.categoryLabels[category];
  }
  saveCurrentAtlasSettings(settings);
}

/**
 * Edit a category.
 */
export function editCategory(oldCategory: string, newCategory: string, newLabel: string): void {
  const trimmedCategory = newCategory.trim();
  const trimmedLabel = newLabel.trim();
  if (!trimmedCategory || trimmedCategory === oldCategory) return;

  const settings = getCurrentAtlasSettings();
  const index = settings.categories.indexOf(oldCategory);
  if (index !== -1) {
    settings.categories[index] = trimmedCategory;
    settings.categories.sort();

    // Handle label changes
    if (settings.categoryLabels[oldCategory]) {
      delete settings.categoryLabels[oldCategory];
    }
    const autoLabel = trimmedCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (trimmedLabel && trimmedLabel !== autoLabel) {
      settings.categoryLabels[trimmedCategory] = trimmedLabel;
    }

    saveCurrentAtlasSettings(settings);
  }
}

// =============================================================================
// DATA SOURCE (LAYER/LOCATION) MANAGEMENT
// =============================================================================

/**
 * Get data sources by type.
 */
export function getDataLayersByType(): { endpoints: DataLayer[]; throughpoints: DataLayer[] } {
  const settings = getCurrentAtlasSettings();
  const endpoints = settings.dataLayers.filter(layer => layer.type === DataLayerType.Endpoint);
  const throughpoints = settings.dataLayers.filter(layer => layer.type === DataLayerType.Throughpoint);
  return { endpoints, throughpoints };
}

/**
 * Add or update a data source.
 */
export function saveDataLayer(layer: DataLayer, originalId?: string): void {
  const settings = getCurrentAtlasSettings();

  if (originalId && originalId !== layer.id) {
    // Update existing layer (ID changed)
    const index = settings.dataLayers.findIndex(l => l.id === originalId);
    if (index !== -1) {
      settings.dataLayers[index] = layer;
    }
  } else {
    // Add new or update existing with same ID
    const existingIndex = settings.dataLayers.findIndex(l => l.id === layer.id);
    if (existingIndex !== -1) {
      settings.dataLayers[existingIndex] = layer;
    } else {
      settings.dataLayers.push(layer);
    }
  }

  saveCurrentAtlasSettings(settings);
}

/**
 * Delete a data source.
 */
export function deleteDataLayer(layerId: string): void {
  const settings = getCurrentAtlasSettings();
  settings.dataLayers = settings.dataLayers.filter(layer => layer.id !== layerId);
  saveCurrentAtlasSettings(settings);
}

/**
 * Check if a data source ID already exists.
 */
export function dataLayerExists(id: string, excludeId?: string): boolean {
  const settings = getCurrentAtlasSettings();
  return settings.dataLayers.some(layer =>
    layer.id === id && layer.id !== excludeId
  );
}

/**
 * Generate a unique layer ID based on name.
 */
export function generateLayerId(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// =============================================================================
// FORM VISIBILITY MANAGEMENT
// =============================================================================

/**
 * Update form visibility settings (global app-level).
 */
export function updateFormVisibility(visibility: Partial<FormVisibilitySettings>): void {
  const globalSettings = getGlobalSettings();
  const updatedGlobalSettings: GlobalSettings = {
    formVisibility: {
      ...globalSettings.formVisibility,
      ...visibility,
    },
    activeAtlas: globalSettings.activeAtlas,
  };
  saveGlobalSettings(updatedGlobalSettings);
}

/**
 * Get current form visibility settings (global app-level).
 */
export function getFormVisibility(): FormVisibilitySettings {
  return getGlobalSettings().formVisibility;
}

// =============================================================================
// ACTIVE ATLAS MANAGEMENT
// =============================================================================

/**
 * Get the currently active atlas name from global settings.
 */
export function getActiveAtlas(): string {
  return getGlobalSettings().activeAtlas;
}

/**
 * Set the active atlas name in global settings.
 */
export function setActiveAtlas(atlasName: string): void {
  const globalSettings = getGlobalSettings();
  const updatedGlobalSettings: GlobalSettings = {
    formVisibility: globalSettings.formVisibility,
    activeAtlas: atlasName,
  };
  saveGlobalSettings(updatedGlobalSettings);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize settings system.
 * Ensures default atlas has settings.
 */
export function initializeSettings(): void {
  // Ensure default atlas has settings
  const activeAtlas = getActiveAtlas();
  const atlasSettings = getAtlasSettings(activeAtlas);

  // Save back to ensure it exists in storage
  saveAtlasSettings(activeAtlas, atlasSettings);

  // Ensure global settings exist
  const globalSettings = getGlobalSettings();
  saveGlobalSettings(globalSettings);
}

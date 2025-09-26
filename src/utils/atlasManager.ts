/**
 * Atlas Management utility for Data Flow Atlas.
 * Handles multiple atlas instances with localStorage persistence.
 */

import AppConstants from './appConstants.js';

export const ATLAS_PREFIX = AppConstants.atlasPrefix;
export const DEFAULT_ATLAS_NAME = AppConstants.defaultAtlasName;
export const ATLAS_LIST_KEY = 'dataflow_atlas_list';

// Regex pattern for valid atlas names (matches AppConstants.keyNamePattern from reference app)
export const ATLAS_NAME_PATTERN = AppConstants.keyNamePattern;

/**
 * Interface for atlas management settings.
 */
export interface AtlasInfo {
  name: string;           // Display name (without prefix)
  storageKey: string;     // Full storage key (with prefix)
  created: string;        // ISO date string
  lastModified: string;   // ISO date string
  cardCount: number;      // Number of cards in this atlas
}

/**
 * Get the current active atlas name from settings.
 */
export function getActiveAtlas(): string {
  return localStorage.getItem('active_atlas') || DEFAULT_ATLAS_NAME;
}

/**
 * Set the active atlas name.
 */
export function setActiveAtlas(atlasName: string): void {
  localStorage.setItem('active_atlas', atlasName);
}

/**
 * Get the full storage key for an atlas name.
 */
export function getAtlasStorageKey(atlasName: string): string {
  return `${ATLAS_PREFIX}${atlasName}`;
}

/**
 * Get the display name from a storage key.
 */
export function getAtlasDisplayName(storageKey: string): string {
  return storageKey.startsWith(ATLAS_PREFIX) ? storageKey.slice(ATLAS_PREFIX.length) : storageKey;
}

/**
 * Validate an atlas name using the same pattern as the reference app.
 */
export function validateAtlasName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: AppConstants.atlasNameErrTextNameEmpty };
  }

  const trimmedName = name.trim();

  if (!ATLAS_NAME_PATTERN.test(trimmedName)) {
    return {
      valid: false,
      error: AppConstants.atlasNameErrTextInvalid
    };
  }

  if (atlasExists(trimmedName)) {
    return { valid: false, error: AppConstants.atlasNameErrTextNameExists };
  }

  return { valid: true };
}

/**
 * Check if an atlas exists.
 */
export function atlasExists(atlasName: string): boolean {
  const storageKey = getAtlasStorageKey(atlasName);
  return localStorage.getItem(storageKey) !== null;
}

/**
 * Initialize default atlas if it doesn't exist.
 */
export function initializeDefaultAtlas(): void {
  const defaultStorageKey = getAtlasStorageKey(DEFAULT_ATLAS_NAME);
  if (!localStorage.getItem(defaultStorageKey)) {
    const now = new Date().toISOString();
    localStorage.setItem(defaultStorageKey, JSON.stringify([], null, 2));
    setAtlasMetadata(DEFAULT_ATLAS_NAME, 'created', now);
    setAtlasMetadata(DEFAULT_ATLAS_NAME, 'lastModified', now);
    console.log('[Atlas] Default atlas initialized');
  }

  // Ensure active atlas is set if none exists
  if (!localStorage.getItem('active_atlas')) {
    setActiveAtlas(DEFAULT_ATLAS_NAME);
    console.log('[Atlas] Active atlas set to default');
  }
}

/**
 * Get all available atlas names.
 */
export function getAllAtlases(): string[] {
  // Ensure default atlas exists
  initializeDefaultAtlas();

  const atlasNames: string[] = [];

  // Scan localStorage for keys that start with our prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(ATLAS_PREFIX) && !key.startsWith('dfa__')) {
      // Only include keys that start with 'dfa_' but not 'dfa__' (settings keys)
      const displayName = getAtlasDisplayName(key);
      // Also exclude any metadata keys (they have additional suffixes)
      if (!displayName.includes('_created') && !displayName.includes('_lastModified')) {
        atlasNames.push(displayName);
      }
    }
  }

  // Always ensure default exists in the list
  if (!atlasNames.includes(DEFAULT_ATLAS_NAME)) {
    atlasNames.push(DEFAULT_ATLAS_NAME);
  }

  return sortAtlasNames(atlasNames);
}

/**
 * Sort atlas names alphabetically, but keep 'default' first.
 */
export function sortAtlasNames(names: string[]): string[] {
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  const defaultIndex = sorted.indexOf(DEFAULT_ATLAS_NAME);

  if (defaultIndex > 0) {
    sorted.splice(defaultIndex, 1);
    sorted.unshift(DEFAULT_ATLAS_NAME);
  }

  return sorted;
}

/**
 * Get detailed information about all atlases.
 */
export function getAtlasInfoList(): AtlasInfo[] {
  const atlasNames = getAllAtlases();

  return atlasNames.map(name => {
    const storageKey = getAtlasStorageKey(name);
    const data = localStorage.getItem(storageKey);
    let cardCount = 0;

    if (data) {
      try {
        const cards = JSON.parse(data);
        cardCount = Array.isArray(cards) ? cards.length : 0;
      } catch (error) {
        console.warn(`Failed to parse atlas data for ${name}:`, error);
      }
    }

    return {
      name,
      storageKey,
      created: getAtlasMetadata(name, 'created') || new Date().toISOString(),
      lastModified: getAtlasMetadata(name, 'lastModified') || new Date().toISOString(),
      cardCount
    };
  });
}

/**
 * Create a new atlas.
 */
export function createAtlas(name: string): boolean {
  const validation = validateAtlasName(name);
  if (!validation.valid) {
    return false;
  }

  const storageKey = getAtlasStorageKey(name);
  const now = new Date().toISOString();

  // Initialize with empty array
  localStorage.setItem(storageKey, JSON.stringify([], null, 2));

  // Set metadata
  setAtlasMetadata(name, 'created', now);
  setAtlasMetadata(name, 'lastModified', now);

  return true;
}

/**
 * Rename an atlas.
 */
export function renameAtlas(oldName: string, newName: string): boolean {
  if (oldName === DEFAULT_ATLAS_NAME) {
    return false; // Cannot rename default
  }

  if (oldName === getActiveAtlas()) {
    return false; // Cannot rename active atlas
  }

  const validation = validateAtlasName(newName);
  if (!validation.valid) {
    return false;
  }

  const oldStorageKey = getAtlasStorageKey(oldName);
  const newStorageKey = getAtlasStorageKey(newName);

  // Copy data to new key
  const data = localStorage.getItem(oldStorageKey);
  if (!data) {
    return false;
  }

  localStorage.setItem(newStorageKey, data);

  // Copy metadata
  const created = getAtlasMetadata(oldName, 'created');
  const lastModified = new Date().toISOString();

  setAtlasMetadata(newName, 'created', created || lastModified);
  setAtlasMetadata(newName, 'lastModified', lastModified);

  // Remove old data and metadata
  localStorage.removeItem(oldStorageKey);
  removeAtlasMetadata(oldName);

  return true;
}

/**
 * Delete an atlas.
 */
export function deleteAtlas(name: string): boolean {
  if (name === DEFAULT_ATLAS_NAME) {
    return false; // Cannot delete default
  }

  if (name === getActiveAtlas()) {
    return false; // Cannot delete active atlas
  }

  const storageKey = getAtlasStorageKey(name);
  localStorage.removeItem(storageKey);
  removeAtlasMetadata(name);

  return true;
}

/**
 * Get atlas metadata.
 */
function getAtlasMetadata(atlasName: string, key: string): string | null {
  return localStorage.getItem(`${getAtlasStorageKey(atlasName)}_${key}`);
}

/**
 * Set atlas metadata.
 */
export function setAtlasMetadata(atlasName: string, key: string, value: string): void {
  localStorage.setItem(`${getAtlasStorageKey(atlasName)}_${key}`, value);
}

/**
 * Remove all metadata for an atlas.
 */
function removeAtlasMetadata(atlasName: string): void {
  const prefix = `${getAtlasStorageKey(atlasName)}_`;
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Update the last modified timestamp for an atlas.
 */
export function touchAtlas(atlasName: string): void {
  setAtlasMetadata(atlasName, 'lastModified', new Date().toISOString());
}
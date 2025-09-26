/**
 * Improved Atlas Manager with consolidated storage and auto-backup.
 * Replaces the current atlasManager.ts with optimized storage structure.
 */

import { DFACard } from '../types/dfa';
import { AtlasStorageData, AtlasMetadata, AtlasInfo } from '../types/atlasStorage';
import AppConstants from './appConstants.js';

const ATLAS_PREFIX = AppConstants.atlasPrefix;
const DEFAULT_ATLAS_NAME = AppConstants.defaultAtlasName;

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
 * Create default atlas metadata.
 */
function createDefaultMetadata(): AtlasMetadata {
  const now = new Date().toISOString();
  return {
    created: now,
    lastModified: now,
    cardCount: 0,
    hasBackup: false
  };
}

/**
 * Get atlas data from storage (consolidated format).
 */
function getAtlasData(atlasName: string): AtlasStorageData | null {
  try {
    const storageKey = getAtlasStorageKey(atlasName);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Handle legacy format migration
    if (Array.isArray(parsed)) {
      console.log(`[Atlas] Migrating legacy format for: ${atlasName}`);
      return migrateLegacyFormat(atlasName, parsed);
    }

    // Ensure proper structure
    if (!parsed.cards || !parsed.metadata) {
      console.warn(`[Atlas] Invalid data structure for: ${atlasName}`);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(`[Atlas] Failed to parse data for ${atlasName}:`, error);
    return null;
  }
}

/**
 * Migrate legacy storage format to new consolidated format.
 */
function migrateLegacyFormat(atlasName: string, cards: DFACard[]): AtlasStorageData {
  const storageKey = getAtlasStorageKey(atlasName);

  // Try to get legacy metadata
  const created = localStorage.getItem(`${storageKey}_created`);
  const lastModified = localStorage.getItem(`${storageKey}_lastModified`);

  const metadata: AtlasMetadata = {
    created: created || new Date().toISOString(),
    lastModified: lastModified || new Date().toISOString(),
    cardCount: cards.length,
    hasBackup: false
  };

  const newData: AtlasStorageData = {
    cards,
    metadata
  };

  // Save in new format
  setAtlasData(atlasName, newData);

  // Clean up legacy metadata entries
  localStorage.removeItem(`${storageKey}_created`);
  localStorage.removeItem(`${storageKey}_lastModified`);

  console.log(`[Atlas] Migrated ${atlasName} from legacy format`);
  return newData;
}

/**
 * Save atlas data to storage (consolidated format).
 */
function setAtlasData(atlasName: string, data: AtlasStorageData): void {
  try {
    const storageKey = getAtlasStorageKey(atlasName);
    // Update metadata
    data.metadata.lastModified = new Date().toISOString();
    data.metadata.cardCount = data.cards.length;

    localStorage.setItem(storageKey, JSON.stringify(data, null, 2));
    console.log(`[Atlas] Saved ${atlasName} with ${data.cards.length} cards`);
  } catch (error) {
    console.error(`[Atlas] Failed to save ${atlasName}:`, error);
    throw error;
  }
}

/**
 * Initialize default atlas if it doesn't exist.
 */
export function initializeDefaultAtlas(): void {
  const defaultData = getAtlasData(DEFAULT_ATLAS_NAME);
  if (!defaultData) {
    const newData: AtlasStorageData = {
      cards: [],
      metadata: createDefaultMetadata()
    };
    setAtlasData(DEFAULT_ATLAS_NAME, newData);
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
    // if (key && key.startsWith(ATLAS_PREFIX) && !key.includes('_backup')) {
    if (key &&
      key.startsWith(ATLAS_PREFIX) &&
      !key.startsWith('dfa__') &&
      !key.includes('_backup')
    ) {
      // Extract atlas name from key (remove prefix)
      const atlasName = key.substring(ATLAS_PREFIX.length);
      // Skip legacy metadata keys
      if (!atlasName.includes('_created') && !atlasName.includes('_lastModified')) {
        atlasNames.push(atlasName);
      }
    }
  }

  return atlasNames.sort();
}

/**
 * Get atlas information list for display.
 */
export function getAtlasInfoList(): AtlasInfo[] {
  const atlasNames = getAllAtlases();
  const activeAtlas = getActiveAtlas();

  return atlasNames.map(name => {
    const data = getAtlasData(name);
    const defaultMetadata = createDefaultMetadata();

    return {
      name,
      cardCount: data?.metadata.cardCount || 0,
      created: data?.metadata.created || defaultMetadata.created,
      lastModified: data?.metadata.lastModified || defaultMetadata.lastModified,
      hasBackup: data?.metadata.hasBackup || false,
      isActive: name === activeAtlas
    };
  });
}

/**
 * Create a new atlas.
 */
export function createAtlas(atlasName: string): boolean {
  try {
    // Check if atlas already exists
    if (getAtlasData(atlasName)) {
      console.warn(`[Atlas] Atlas ${atlasName} already exists`);
      return false;
    }

    const newData: AtlasStorageData = {
      cards: [],
      metadata: createDefaultMetadata()
    };

    setAtlasData(atlasName, newData);
    console.log(`[Atlas] Created atlas: ${atlasName}`);
    return true;
  } catch (error) {
    console.error(`[Atlas] Failed to create atlas ${atlasName}:`, error);
    return false;
  }
}

/**
 * Rename an atlas.
 */
export function renameAtlas(oldName: string, newName: string): boolean {
  try {
    const oldData = getAtlasData(oldName);
    if (!oldData) {
      console.warn(`[Atlas] Source atlas ${oldName} not found`);
      return false;
    }

    // Check if new name already exists
    if (getAtlasData(newName)) {
      console.warn(`[Atlas] Target atlas ${newName} already exists`);
      return false;
    }

    // Copy to new name
    setAtlasData(newName, oldData);

    // Update active atlas if it was the renamed one
    if (getActiveAtlas() === oldName) {
      setActiveAtlas(newName);
    }

    // Remove old atlas
    deleteAtlas(oldName);

    console.log(`[Atlas] Renamed ${oldName} to ${newName}`);
    return true;
  } catch (error) {
    console.error(`[Atlas] Failed to rename atlas ${oldName} to ${newName}:`, error);
    return false;
  }
}

/**
 * Delete an atlas.
 */
export function deleteAtlas(atlasName: string): boolean {
  try {
    const storageKey = getAtlasStorageKey(atlasName);
    localStorage.removeItem(storageKey);

    // Clean up any legacy metadata that might exist
    localStorage.removeItem(`${storageKey}_created`);
    localStorage.removeItem(`${storageKey}_lastModified`);
    localStorage.removeItem(`${storageKey}_backup`);

    console.log(`[Atlas] Deleted atlas: ${atlasName}`);
    return true;
  } catch (error) {
    console.error(`[Atlas] Failed to delete atlas ${atlasName}:`, error);
    return false;
  }
}

/**
 * Load cards from the active atlas.
 */
export function loadCards(): DFACard[] {
  const activeAtlas = getActiveAtlas();
  const data = getAtlasData(activeAtlas);
  return data?.cards || [];
}

/**
 * Save cards to the active atlas with auto-backup.
 */
export function saveCards(cards: DFACard[], createBackup: boolean = true): void {
  const activeAtlas = getActiveAtlas();
  let data = getAtlasData(activeAtlas);

  if (!data) {
    // Create new atlas data if it doesn't exist
    data = {
      cards: [],
      metadata: createDefaultMetadata()
    };
  }

  // Create auto-backup before modifying (if cards exist and createBackup is true)
  if (createBackup && data.cards.length > 0 && cards.length > 0) {
    data.backup = [...data.cards]; // Store current cards as backup
    data.metadata.hasBackup = true;
    console.log(`[Atlas] Created auto-backup for ${activeAtlas} (${data.backup.length} cards)`);
  }

  // Update cards
  data.cards = cards;

  // Save updated data
  setAtlasData(activeAtlas, data);
}

/**
 * Restore from auto-backup for the active atlas.
 */
export function restoreFromBackup(): boolean {
  try {
    const activeAtlas = getActiveAtlas();
    const data = getAtlasData(activeAtlas);

    if (!data || !data.backup || data.backup.length === 0) {
      console.warn(`[Atlas] No backup found for ${activeAtlas}`);
      return false;
    }

    // Restore backup as current cards
    data.cards = [...data.backup];
    delete data.backup;
    data.metadata.hasBackup = false;

    setAtlasData(activeAtlas, data);
    console.log(`[Atlas] Restored ${activeAtlas} from backup (${data.cards.length} cards)`);
    return true;
  } catch (error) {
    console.error(`[Atlas] Failed to restore backup:`, error);
    return false;
  }
}

/**
 * Check if active atlas has a backup available.
 */
export function hasActiveBackup(): boolean {
  const activeAtlas = getActiveAtlas();
  const data = getAtlasData(activeAtlas);
  return data?.metadata.hasBackup || false;
}

/**
 * Validate atlas name using the same pattern as the reference app.
 */
export function validateAtlasName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: AppConstants.atlasNameErrTextNameEmpty };
  }

  const trimmedName = name.trim();

  // Check if name already exists
  if (getAtlasData(trimmedName)) {
    return { valid: false, error: AppConstants.atlasNameErrTextNameExists };
  }

  // Check against regex pattern
  if (!AppConstants.keyNamePattern.test(trimmedName)) {
    return { valid: false, error: AppConstants.atlasNameErrTextInvalid };
  }

  return { valid: true };
}

/**
 * Update the last modified timestamp for an atlas.
 */
export function updateAtlasTimestamp(atlasName: string): void {
  const data = getAtlasData(atlasName);
  if (data) {
    setAtlasData(atlasName, data); // This will update lastModified automatically
  }
}

/**
 * Set atlas metadata.
 */
export function setAtlasMetadata(atlasName: string, key: string, value: string): void {
  localStorage.setItem(`${getAtlasStorageKey(atlasName)}_${key}`, value);
}

/**
 * Update the last modified timestamp for an atlas.
 */
export function touchAtlas(atlasName: string): void {
  setAtlasMetadata(atlasName, 'lastModified', new Date().toISOString());
}

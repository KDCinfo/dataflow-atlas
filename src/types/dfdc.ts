/**
 * Common data types for DFDC cards.
 */
export const DATA_TYPES = [
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'Date',
  'null',
  'undefined',
  'string[]',
  'number[]',
  'boolean[]',
  'object[]',
  'string | null',
  'number | null',
  'boolean | null',
  'JSON',
  'FormData',
  'File',
  'Blob',
  'URL',
  'RegExp',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Function',
  'any',
] as const;

export type DataType = typeof DATA_TYPES[number];

/**
 * Core DFDC card interface for data flow documentation.
 */
export interface DFDCCard {
  field: string;
  layer: string; // Data layer name - kept as string for compatibility with existing form handling
  location: string;
  type: string;
  scope?: DataScope; // Made optional to match current form layout
  category?: ContentCategory;
  persists_in?: string[];
  getter_name?: string;
  getter_code?: string;
  setter_name?: string;
  setter_code?: string;
  linkedTo?: string; // Connected card ID (string matches the id field type)
  notes?: string;
}

/**
 * Available data layers in the application architecture.
 */
export type DataLayer =
  | 'store'
  | 'localStorage'
  | 'sessionStorage'
  | 'api'
  | 'database';

/**
 * Data ownership scope categories.
 */
export type DataScope =
  | 'app'
  | 'user'
  | 'session';

/**
 * Content type categories for data classification.
 */
export type ContentCategory =
  | 'user-preference'
  | 'account-setting'
  | 'runtime-state'
  | 'feature-data'
  | 'app-preference';

/**
 * Import operation modes for data merging.
 */
export type ImportMode = 'replace' | 'merge';

/**
 * Filter configuration for atlas view.
 */
export interface AtlasFilter {
  layer?: DataLayer;
  scope?: DataScope;
  category?: ContentCategory;
  searchTerm?: string;
}

/**
 * Type guards for runtime validation.
 * Note: isDataLayer now needs to be called with current settings context
 * since layers are dynamically configurable rather than hardcoded.
 */
export function isDataLayer(value: string, validLayers?: string[]): value is DataLayer {
  // If no valid layers provided, use legacy hardcoded values for backward compatibility.
  const layers = validLayers || ['store', 'localStorage', 'sessionStorage', 'api', 'database'];
  return layers.includes(value);
}

export function isDataScope(value: string): value is DataScope {
  return ['app', 'user', 'session'].includes(value);
}

export function isContentCategory(value: string): value is ContentCategory {
  return ['user-preference', 'account-setting', 'runtime-state', 'feature-data', 'app-preference'].includes(value);
}
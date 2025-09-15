import type { DFDCCard, ImportMode } from '../types/dfdc.js';
/**
 * Load all DFDC cards from localStorage.
 */
export declare function loadCards(): DFDCCard[];
/**
 * Save DFDC cards to localStorage.
 */
export declare function saveCards(cards: DFDCCard[]): void;
/**
 * Import cards from JSON data with merge or replace mode.
 */
export declare function importCards(jsonData: string, mode: ImportMode): DFDCCard[];
/**
 * Export cards as JSON string for download.
 */
export declare function exportCards(): string;
//# sourceMappingURL=storage.d.ts.map
import type { DFACard, ImportMode } from '../types/dfa.js';
import {
  getActiveAtlas,
  getAtlasStorageKey,
  loadCards as atlasLoadCards,
  saveCards as atlasSaveCards
} from './atlasManagerOptimized.js';

/**
 * Storage key for DFA cards in localStorage (legacy).
 */
export const STORAGE_KEY = 'dfa_default';

/**
 * Get the current storage key based on active atlas.
 */
export function getCurrentStorageKey(): string {
  return getAtlasStorageKey(getActiveAtlas());
}

/**
 * Load DFA cards from localStorage using the current active atlas.
 * Now uses the optimized atlas manager with automatic format migration.
 */
export function loadCards(): DFACard[] {
  return atlasLoadCards();
}

/**
 * Save DFA cards to localStorage using the current active atlas.
 * Now uses the optimized atlas manager with automatic backup creation.
 */
export function saveCards(cards: DFACard[]): void {
  // Use the optimized atlas manager which handles:
  // - Consolidated storage format
  // - Automatic backup creation on edit
  // - Metadata updates
  atlasSaveCards(cards, true); // true = create backup on edit
}

/**
 * Import cards from JSON data with merge or replace mode.
 */
export function importCards(jsonData: string, mode: ImportMode): DFACard[] {
  try {
    const importedCards: DFACard[] = JSON.parse(jsonData);

    if (!Array.isArray(importedCards)) {
      throw new Error('Invalid JSON format: expected array of cards');
    }

    let finalCards: DFACard[];

    if (mode === 'replace') {
      finalCards = importedCards;
    } else {
      // Merge mode: combine existing with imported, imported takes precedence for duplicates.
      const existingCards = loadCards();

      // Start with existing cards
      finalCards = [...existingCards];

      // Process imported cards
      importedCards.forEach(importedCard => {
        const existingIndex = finalCards.findIndex(card => card.field === importedCard.field);

        if (existingIndex >= 0) {
          // Update existing card with imported data
          finalCards[existingIndex] = importedCard;
        } else {
          // Add new card
          finalCards.push(importedCard);
        }
      });
    }

    saveCards(finalCards);
    return finalCards;
  } catch (error) {
    console.error('Failed to import cards:', error);
    throw error;
  }
}

/**
 * Export cards as JSON string for download.
 */
export function exportCards(): string {
  const cards = loadCards();
  return JSON.stringify(cards, null, 2);
}

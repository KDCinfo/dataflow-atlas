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

      // Track ID mappings for updating linkedTo references and which cards were imported
      const idMappings = new Map<string, string>();
      const importedCardIds = new Set<string>();

      // Process imported cards
      importedCards.forEach(importedCard => {
        // In merge mode, only add cards that don't already exist by field name
        // This prevents duplicates while preserving existing (possibly modified) cards
        const existingIndex = finalCards.findIndex(card => card.field === importedCard.field);

        if (existingIndex < 0) {
          // Field name doesn't exist - add as new card
          const newId = `dfa-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          const newCard = {
            ...importedCard,
            id: newId
          };
          finalCards.push(newCard);
          idMappings.set(importedCard.id, newId);
          importedCardIds.add(newId);
        } else {
          // Field name exists - skip this imported card to avoid duplicates
          // Map the old ID to the existing card's ID for linkedTo reference updates
          const existingCard = finalCards[existingIndex];
          idMappings.set(importedCard.id, existingCard.id);
        }
      });

      // Update linkedTo references ONLY for imported cards, not existing ones
      finalCards.forEach(card => {
        // Only update linkedTo references for cards that were just imported
        if (importedCardIds.has(card.id) && card.linkedTo && idMappings.has(card.linkedTo)) {
          card.linkedTo = idMappings.get(card.linkedTo)!;
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

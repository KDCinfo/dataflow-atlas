import type { DFACard, ImportMode } from '../types/dfa.js';
import { getActiveAtlas, getAtlasStorageKey, touchAtlas } from './atlasManager.js';

/**
 * Storage key for DFA cards in localStorage.
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
 */
export function loadCards(): DFACard[] {
  try {
    const storageKey = getCurrentStorageKey();
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load cards from localStorage:', error);
    return [];
  }
}

/**
 * Save DFA cards to localStorage using the current active atlas.
 */
export function saveCards(cards: DFACard[]): void {
  try {
    const storageKey = getCurrentStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(cards, null, 2));

    // Update the last modified timestamp
    const activeAtlas = getActiveAtlas();
    touchAtlas(activeAtlas);
  } catch (error) {
    console.error('Failed to save cards to localStorage:', error);
  }
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
      const existingFields = new Set(existingCards.map(card => card.field));

      finalCards = [
        ...existingCards,
        ...importedCards.filter(card => !existingFields.has(card.field)),
      ];
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

/**
 * Storage key for DFDC cards in localStorage.
 */
const STORAGE_KEY = 'dataflow-atlas-cards';
/**
 * Load all DFDC cards from localStorage.
 */
export function loadCards() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored)
            return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        console.error('Failed to load cards from localStorage:', error);
        return [];
    }
}
/**
 * Save DFDC cards to localStorage.
 */
export function saveCards(cards) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards, null, 2));
    }
    catch (error) {
        console.error('Failed to save cards to localStorage:', error);
    }
}
/**
 * Import cards from JSON data with merge or replace mode.
 */
export function importCards(jsonData, mode) {
    try {
        const importedCards = JSON.parse(jsonData);
        if (!Array.isArray(importedCards)) {
            throw new Error('Invalid JSON format: expected array of cards');
        }
        let finalCards;
        if (mode === 'replace') {
            finalCards = importedCards;
        }
        else {
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
    }
    catch (error) {
        console.error('Failed to import cards:', error);
        throw error;
    }
}
/**
 * Export cards as JSON string for download.
 */
export function exportCards() {
    const cards = loadCards();
    return JSON.stringify(cards, null, 2);
}
//# sourceMappingURL=storage.js.map
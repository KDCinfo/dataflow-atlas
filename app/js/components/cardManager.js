import { isDataLayer, isDataScope, isContentCategory } from '../types/dfdc.js';
import { loadCards, saveCards } from '../utils/storage.js';
import { showNotification } from './ui.js';
/**
 * Create a DFDC card from form data with proper type validation.
 */
export function createDFDCCardFromForm(formData) {
    const persistsIn = (formData.get('persists_in') || '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    const field = (formData.get('field') || '').trim();
    const layer = formData.get('layer');
    const scope = formData.get('scope');
    const category = formData.get('category');
    // Validate types at runtime.
    if (!isDataLayer(layer)) {
        throw new Error(`Invalid layer: ${layer}`);
    }
    if (!isDataScope(scope)) {
        throw new Error(`Invalid scope: ${scope}`);
    }
    const validCategory = category && isContentCategory(category)
        ? category
        : undefined;
    return {
        field,
        layer,
        location: (formData.get('location') || '').trim() || undefined,
        type: (formData.get('type') || '').trim() || undefined,
        scope,
        purpose: (formData.get('purpose') || '').trim() || undefined,
        category: validCategory,
        persists_in: persistsIn.length > 0 ? persistsIn : undefined,
        notes: (formData.get('notes') || '').trim() || undefined,
    };
}
/**
 * Validate a DFDC card before adding to the atlas.
 */
export function validateDFDCCard(card, existingCards = []) {
    const errors = [];
    if (!card.field) {
        errors.push('Field name is required');
    }
    if (!card.layer) {
        errors.push('Layer is required');
    }
    if (!card.scope) {
        errors.push('Scope is required');
    }
    // Check for duplicate field names.
    if (existingCards.some(existing => existing.field === card.field)) {
        errors.push('A DFDC card with this field name already exists');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * Add a new DFDC card to the collection.
 */
export function addDFDCCard(card) {
    const existingCards = loadCards();
    const validation = validateDFDCCard(card, existingCards);
    if (!validation.isValid) {
        showNotification(`Validation errors: ${validation.errors.join(', ')}`, 'error');
        return false;
    }
    const newCards = [...existingCards, card];
    saveCards(newCards);
    showNotification('DFDC card added successfully!', 'success');
    return true;
}
/**
 * Update an existing DFDC card.
 */
export function updateDFDCCard(originalField, updatedCard) {
    const existingCards = loadCards();
    const cardIndex = existingCards.findIndex(card => card.field === originalField);
    if (cardIndex === -1) {
        showNotification('Card not found for update', 'error');
        return false;
    }
    // For validation, exclude the current card being updated.
    const otherCards = existingCards.filter(card => card.field !== originalField);
    const validation = validateDFDCCard(updatedCard, otherCards);
    if (!validation.isValid) {
        showNotification(`Validation errors: ${validation.errors.join(', ')}`, 'error');
        return false;
    }
    existingCards[cardIndex] = updatedCard;
    saveCards(existingCards);
    showNotification('DFDC card updated successfully!', 'success');
    return true;
}
/**
 * Delete a DFDC card from the collection.
 */
export function deleteDFDCCard(field) {
    if (!confirm('Are you sure you want to delete this DFDC card? This action cannot be undone.')) {
        return false;
    }
    const existingCards = loadCards();
    const filteredCards = existingCards.filter(card => card.field !== field);
    if (filteredCards.length === existingCards.length) {
        showNotification('Card not found for deletion', 'error');
        return false;
    }
    saveCards(filteredCards);
    showNotification('DFDC card deleted successfully!', 'success');
    return true;
}
/**
 * Get filtered cards based on filter criteria.
 */
export function getFilteredCards(filters) {
    const allCards = loadCards();
    return allCards.filter(card => {
        if (filters.layer && card.layer !== filters.layer)
            return false;
        if (filters.scope && card.scope !== filters.scope)
            return false;
        if (filters.category && card.category !== filters.category)
            return false;
        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            const searchableText = [
                card.field,
                card.location,
                card.purpose,
                card.notes,
                ...(card.persists_in || []),
            ].join(' ').toLowerCase();
            if (!searchableText.includes(searchTerm))
                return false;
        }
        return true;
    });
}
/**
 * Clear all DFDC cards after confirmation.
 */
export function clearAllCards() {
    const confirmation = prompt('Type "DELETE ALL" to confirm clearing all DFDC cards:');
    if (confirmation !== 'DELETE ALL') {
        return false;
    }
    saveCards([]);
    showNotification('All data cleared successfully!', 'success');
    return true;
}
//# sourceMappingURL=cardManager.js.map
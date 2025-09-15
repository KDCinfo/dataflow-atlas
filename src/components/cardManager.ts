import type { DFDCCard, AtlasFilter } from '../types/dfdc.js';
import { loadCards, saveCards } from '../utils/storage.js';
import { showNotification, generateId } from './ui.js';

/**
 * Card management operations for DFDC cards.
 */

/**
 * Validation result interface.
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Create a DFDC card from form data.
 */
export function createDFDCCardFromForm(formData: FormData): DFDCCard {
  const persistsIn = (formData.get('persists_in') as string || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return {
    field: (formData.get('field') as string || '').trim(),
    layer: formData.get('layer') as any, // Will be validated.
    location: (formData.get('location') as string || '').trim(),
    type: (formData.get('type') as string || '').trim(),
    scope: formData.get('scope') as any, // Will be validated.
    purpose: (formData.get('purpose') as string || '').trim(),
    category: (formData.get('category') as string || '') as any,
    persists_in: persistsIn.length > 0 ? persistsIn : undefined,
    notes: (formData.get('notes') as string || '').trim() || undefined,
  };
}

/**
 * Validate a DFDC card before adding to the atlas.
 */
export function validateDFDCCard(card: DFDCCard, existingCards: DFDCCard[] = []): ValidationResult {
  const errors: string[] = [];

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
export function addDFDCCard(card: DFDCCard): boolean {
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
export function updateDFDCCard(originalField: string, updatedCard: DFDCCard): boolean {
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
export function deleteDFDCCard(field: string): boolean {
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
export function getFilteredCards(filters: AtlasFilter): DFDCCard[] {
  const allCards = loadCards();

  return allCards.filter(card => {
    if (filters.layer && card.layer !== filters.layer) return false;
    if (filters.scope && card.scope !== filters.scope) return false;
    if (filters.category && card.category !== filters.category) return false;
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = [
        card.field,
        card.location,
        card.purpose,
        card.notes,
        ...(card.persists_in || []),
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) return false;
    }
    return true;
  });
}

/**
 * Clear all DFDC cards after confirmation.
 */
export function clearAllCards(): boolean {
  const confirmation = prompt('Type "DELETE ALL" to confirm clearing all DFDC cards:');
  if (confirmation !== 'DELETE ALL') {
    return false;
  }

  saveCards([]);
  showNotification('All data cleared successfully!', 'success');
  return true;
}
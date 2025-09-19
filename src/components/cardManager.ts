import type { DFACard, AtlasFilter, ContentCategory, DataScope } from '../types/dfa.js';
import { isDataLayer, isDataScope, isContentCategory } from '../types/dfa.js';
import { loadCards, saveCards } from '../utils/storage.js';
import { addLocation, getSettings } from '../utils/settings.js';
import { showNotification, updateLocationOptions, updateConnectionOptions } from './ui.js';

/**
 * Card management operations for DFA cards.
 */

/**
 * Generate a unique ID for a DFA card.
 */
function generateCardId(): string {
  return `dfa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validation result interface.
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Create a DFA card from form data with proper type validation.
 */
export function createDFACardFromForm(formData: FormData, existingCard?: DFACard): DFACard {
  const persistsIn = (formData.get('persists_in') as string || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const field = (formData.get('field') as string || '').trim();
  const layer = formData.get('layer') as string;
  const scope = formData.get('scope') as string;
  const category = formData.get('category') as string;

  // Get valid layer names from current settings.
  const settings = getSettings();
  const validLayerNames = settings.dataLayers.map(layer => layer.name);

  // Validate types at runtime.
  if (!isDataLayer(layer, validLayerNames)) {
    throw new Error(`Invalid layer: ${layer}`);
  }
  if (scope && !isDataScope(scope)) {
    throw new Error(`Invalid scope: ${scope}`);
  }

  const validScope: DataScope | undefined = scope && isDataScope(scope) ? scope : undefined;

  const validCategory: ContentCategory | undefined = category && isContentCategory(category)
    ? category
    : undefined;

  const location = (formData.get('location') as string || '').trim();
  const type = (formData.get('type') as string || '').trim();
  const getterName = (formData.get('getter_name') as string || '').trim();
  const getterCode = (formData.get('getter_code') as string || '').trim();
  const setterName = (formData.get('setter_name') as string || '').trim();
  const setterCode = (formData.get('setter_code') as string || '').trim();
  const notes = (formData.get('notes') as string || '').trim();
  const linkedTo = (formData.get('linkedTo') as string || '').trim();

  const card: DFACard = {
    id: existingCard?.id || generateCardId(), // Preserve existing ID or generate new one
    field,
    layer,
    location,
    type,
  };

  // Only add optional properties if they have values.
  if (location) card.location = location;
  if (type) card.type = type;
  if (validScope) card.scope = validScope;
  if (validCategory) card.category = validCategory;
  if (getterName) card.getter_name = getterName;
  if (getterCode) card.getter_code = getterCode;
  if (setterName) card.setter_name = setterName;
  if (setterCode) card.setter_code = setterCode;
  if (persistsIn.length > 0) card.persists_in = persistsIn;
  if (linkedTo) card.linkedTo = linkedTo;
  if (notes) card.notes = notes;

  return card;
}

/**
 * Validate a DFA card before adding to the atlas.
 */
export function validateDFACard(card: DFACard, existingCards: DFACard[] = []): ValidationResult {
  const errors: string[] = [];

  if (!card.field) {
    errors.push('Field name is required');
  }

  if (!card.layer) {
    errors.push('Layer is required');
  }

  if (!card.location) {
    errors.push('Location is required');
  }

  if (!card.type) {
    errors.push('A Data Type is required');
  }

  // Check for duplicate field names.
  if (existingCards.some(existing => existing.field === card.field)) {
    errors.push('A DFA card with this field name already exists');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Add a new DFA card to the collection.
 */
export function addDFACard(card: DFACard): boolean {
  const existingCards = loadCards();
  const validation = validateDFACard(card, existingCards);

  if (!validation.isValid) {
    showNotification(`Validation errors: ${validation.errors.join(', ')}`, 'error');
    return false;
  }

  const newCards = [...existingCards, card];
  saveCards(newCards);

  // Save location to settings if provided.
  if (card.location) {
    addLocation(card.location);
    updateLocationOptions();
  }

  // Update connection options for all forms since we have a new card available.
  updateConnectionOptions();

  showNotification('DFA card added successfully!', 'success');
  return true;
}

/**
 * Update an existing DFA card.
 */
export function updateDFACard(originalField: string, updatedCard: DFACard): boolean {
  const existingCards = loadCards();
  const cardIndex = existingCards.findIndex(card => card.field === originalField);

  if (cardIndex === -1) {
    showNotification('Card not found for update', 'error');
    return false;
  }

  // For validation, exclude the current card being updated.
  const otherCards = existingCards.filter(card => card.field !== originalField);
  const validation = validateDFACard(updatedCard, otherCards);

  if (!validation.isValid) {
    showNotification(`Validation errors: ${validation.errors.join(', ')}`, 'error');
    return false;
  }

  existingCards[cardIndex] = updatedCard;
  saveCards(existingCards);

  // Save location to settings if provided.
  if (updatedCard.location) {
    addLocation(updatedCard.location);
    updateLocationOptions();
  }

  // Update connection options for all forms since card details may have changed.
  updateConnectionOptions();

  showNotification('DFA card updated successfully!', 'success');
  return true;
}

/**
 * Delete a DFA card from the collection.
 */
export function deleteDFACard(field: string): boolean {
  if (!confirm('Are you sure you want to delete this DFA card? This action cannot be undone.')) {
    return false;
  }

  const existingCards = loadCards();
  const filteredCards = existingCards.filter(card => card.field !== field);

  if (filteredCards.length === existingCards.length) {
    showNotification('Card not found for deletion', 'error');
    return false;
  }

  saveCards(filteredCards);

  // Update connection options since a card was removed.
  updateConnectionOptions();

  showNotification('DFA card deleted successfully!', 'success');
  return true;
}

/**
 * Get filtered cards based on filter criteria.
 */
export function getFilteredCards(filters: AtlasFilter): DFACard[] {
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
        card.getter_name,
        card.setter_name,
        card.notes,
        ...(card.persists_in || []),
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) return false;
    }
    return true;
  });
}

/**
 * Clear all DFA cards after confirmation.
 */
export function clearAllCards(): boolean {
  const confirmation = prompt('Type "DELETE ALL" to confirm clearing all DFA cards:');
  if (confirmation !== 'DELETE ALL') {
    return false;
  }

  saveCards([]);

  // Update connection options since all cards were cleared.
  updateConnectionOptions();

  showNotification('All data cleared successfully!', 'success');
  return true;
}

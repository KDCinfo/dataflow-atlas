import type { DFDCCard, AtlasFilter } from '../types/dfdc.js';
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
 * Create a DFDC card from form data with proper type validation.
 */
export declare function createDFDCCardFromForm(formData: FormData): DFDCCard;
/**
 * Validate a DFDC card before adding to the atlas.
 */
export declare function validateDFDCCard(card: DFDCCard, existingCards?: DFDCCard[]): ValidationResult;
/**
 * Add a new DFDC card to the collection.
 */
export declare function addDFDCCard(card: DFDCCard): boolean;
/**
 * Update an existing DFDC card.
 */
export declare function updateDFDCCard(originalField: string, updatedCard: DFDCCard): boolean;
/**
 * Delete a DFDC card from the collection.
 */
export declare function deleteDFDCCard(field: string): boolean;
/**
 * Get filtered cards based on filter criteria.
 */
export declare function getFilteredCards(filters: AtlasFilter): DFDCCard[];
/**
 * Clear all DFDC cards after confirmation.
 */
export declare function clearAllCards(): boolean;
export {};
//# sourceMappingURL=cardManager.d.ts.map
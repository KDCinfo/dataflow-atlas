import type { DFDCCard } from '../types/dfdc.js';
/**
 * UI utility functions and components for the Data Flow Atlas.
 */
/**
 * Notification types for user feedback.
 */
export type NotificationType = 'success' | 'error' | 'info';
/**
 * Safely get DOM element with type assertion.
 */
export declare function getElement<T extends HTMLElement>(id: string): T | null;
/**
 * Safely get DOM element or throw error if not found.
 */
export declare function requireElement<T extends HTMLElement>(id: string): T;
/**
 * Show a notification message to the user.
 */
export declare function showNotification(message: string, type?: NotificationType): void;
/**
 * Escape HTML to prevent XSS attacks.
 */
export declare function escapeHtml(text: string): string;
/**
 * Generate a unique ID for DFDC cards.
 */
export declare function generateId(): string;
/**
 * Format scope value for display.
 */
export declare function formatScope(scope: string): string;
/**
 * Format category value for display.
 */
export declare function formatCategory(category: string): string;
/**
 * Render a single DFDC card as HTML.
 */
export declare function renderDFDCCard(card: DFDCCard): string;
/**
 * Render empty state when no cards are available.
 */
export declare function renderEmptyState(): string;
/**
 * Create edit form HTML for a DFDC card.
 */
export declare function createEditForm(card: DFDCCard): string;
/**
 * Clear form validation styles.
 */
export declare function clearFormValidation(): void;
/**
 * Update data statistics display.
 */
export declare function updateDataStats(cardCount: number): void;
/**
 * Download data as JSON file.
 */
export declare function downloadJson(data: any, filename: string): void;
//# sourceMappingURL=ui.d.ts.map
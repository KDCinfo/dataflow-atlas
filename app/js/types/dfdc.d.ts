/**
 * Core DFDC card interface for data flow documentation.
 */
export interface DFDCCard {
    field: string;
    layer: DataLayer;
    location?: string;
    type?: string;
    scope: DataScope;
    category?: ContentCategory;
    persists_in?: string[];
    getter_name?: string;
    getter_code?: string;
    setter_name?: string;
    setter_code?: string;
    notes?: string;
}
/**
 * Available data layers in the application architecture.
 */
export type DataLayer = 'store' | 'localStorage' | 'sessionStorage' | 'api' | 'database';
/**
 * Data ownership scope categories.
 */
export type DataScope = 'app' | 'user' | 'session';
/**
 * Content type categories for data classification.
 */
export type ContentCategory = 'user-preference' | 'account-setting' | 'runtime-state' | 'feature-data' | 'app-preference';
/**
 * Import operation modes for data merging.
 */
export type ImportMode = 'replace' | 'merge';
/**
 * Filter configuration for atlas view.
 */
export interface AtlasFilter {
    layer?: DataLayer;
    scope?: DataScope;
    category?: ContentCategory;
    searchTerm?: string;
}
/**
 * Type guards for runtime validation.
 */
export declare function isDataLayer(value: string): value is DataLayer;
export declare function isDataScope(value: string): value is DataScope;
export declare function isContentCategory(value: string): value is ContentCategory;
//# sourceMappingURL=dfdc.d.ts.map
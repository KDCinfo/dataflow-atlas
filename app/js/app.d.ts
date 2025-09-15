/**
 * Main Data Flow Atlas application class.
 */
export declare class DFDAtlas {
    private currentEditField;
    constructor();
    /**
     * Initialize all event listeners for the application.
     */
    private initializeEventListeners;
    /**
     * Handle navigation between sections.
     */
    private handleNavigation;
    /**
     * Handle form submission for creating new DFDC cards.
     */
    private handleFormSubmit;
    /**
     * Open edit modal for a DFDC card.
     */
    private editDFDCCard;
    /**
     * Populate the edit form with card data.
     */
    private populateEditForm;
    /**
     * Handle edit form submission.
     */
    private handleEditSubmit;
    /**
     * Close the edit modal.
     */
    private closeModal;
    /**
     * Render the atlas view with all DFDC cards.
     */
    private renderAtlas;
    /**
     * Get current filter values from the UI with type safety.
     */
    private getCurrentFilters;
    /**
     * Apply filters to the atlas view.
     */
    private applyFilters;
    /**
     * Clear all filters.
     */
    private clearFilters;
    /**
     * Export data to JSON file.
     */
    private exportData;
    /**
     * Trigger file input for import.
     */
    private triggerImport;
    /**
     * Handle file import with enhanced error handling.
     */
    private handleImport;
    /**
     * Clear all data after confirmation.
     */
    private clearAllData;
    /**
     * Update data statistics display.
     */
    private updateStats;
}
//# sourceMappingURL=app.d.ts.map
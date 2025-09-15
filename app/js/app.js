import { loadCards, importCards } from './utils/storage.js';
import { showNotification, renderDFDCCard, renderEmptyState, createEditForm, clearFormValidation, updateDataStats, downloadJson, } from './components/ui.js';
import { createDFDCCardFromForm, addDFDCCard, updateDFDCCard, deleteDFDCCard, getFilteredCards, clearAllCards, } from './components/cardManager.js';
/**
 * Main Data Flow Atlas application class.
 */
export class DFDAtlas {
    constructor() {
        this.currentEditField = null;
        this.initializeEventListeners();
        this.renderAtlas();
        this.updateStats();
    }
    /**
     * Initialize all event listeners for the application.
     */
    initializeEventListeners() {
        // Navigation.
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavigation(e));
        });
        // Form submission.
        const dfdcForm = document.getElementById('dfdc-form');
        if (dfdcForm) {
            dfdcForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
            dfdcForm.addEventListener('reset', () => {
                setTimeout(() => clearFormValidation(), 0);
            });
        }
        // Filters.
        const filterLayer = document.getElementById('filter-layer');
        const filterScope = document.getElementById('filter-scope');
        const filterCategory = document.getElementById('filter-category');
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (filterLayer)
            filterLayer.addEventListener('change', () => this.applyFilters());
        if (filterScope)
            filterScope.addEventListener('change', () => this.applyFilters());
        if (filterCategory)
            filterCategory.addEventListener('change', () => this.applyFilters());
        if (clearFiltersBtn)
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        // Import/Export.
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        const clearAllBtn = document.getElementById('clear-all-btn');
        if (exportBtn)
            exportBtn.addEventListener('click', () => this.exportData());
        if (importBtn)
            importBtn.addEventListener('click', () => this.triggerImport());
        if (importFile)
            importFile.addEventListener('change', (e) => this.handleImport(e));
        if (clearAllBtn)
            clearAllBtn.addEventListener('click', () => this.clearAllData());
        // Modal.
        const editModal = document.getElementById('edit-modal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                const target = e.target;
                if (target.id === 'edit-modal' || target.classList.contains('modal-close')) {
                    this.closeModal();
                }
            });
        }
        // Edit form submission.
        const editForm = document.getElementById('edit-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditSubmit();
            });
        }
    }
    /**
     * Handle navigation between sections.
     */
    handleNavigation(e) {
        const target = e.target;
        const targetSection = target.id.replace('nav-', '') + '-section';
        // Update nav buttons.
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');
        // Update sections.
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        const sectionElement = document.getElementById(targetSection);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
    }
    /**
     * Handle form submission for creating new DFDC cards.
     */
    handleFormSubmit() {
        const form = document.getElementById('dfdc-form');
        if (!form) {
            showNotification('Form not found', 'error');
            return;
        }
        try {
            const formData = new FormData(form);
            const dfdcCard = createDFDCCardFromForm(formData);
            if (addDFDCCard(dfdcCard)) {
                form.reset();
                clearFormValidation();
                this.renderAtlas();
                this.updateStats();
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            showNotification(`Error creating card: ${message}`, 'error');
        }
    }
    /**
     * Open edit modal for a DFDC card.
     */
    editDFDCCard(field) {
        const cards = loadCards();
        const card = cards.find(c => c.field === field);
        if (!card)
            return;
        this.currentEditField = field;
        this.populateEditForm(card);
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }
    /**
     * Populate the edit form with card data.
     */
    populateEditForm(card) {
        const editForm = document.getElementById('edit-form');
        if (!editForm)
            return;
        editForm.innerHTML = createEditForm(card);
    }
    /**
     * Handle edit form submission.
     */
    handleEditSubmit() {
        if (!this.currentEditField) {
            showNotification('No card selected for editing', 'error');
            return;
        }
        const form = document.getElementById('edit-form');
        if (!form) {
            showNotification('Edit form not found', 'error');
            return;
        }
        try {
            const formData = new FormData(form);
            const updatedCard = createDFDCCardFromForm(formData);
            if (updateDFDCCard(this.currentEditField, updatedCard)) {
                this.closeModal();
                this.renderAtlas();
                this.updateStats();
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            showNotification(`Error updating card: ${message}`, 'error');
        }
    }
    /**
     * Close the edit modal.
     */
    closeModal() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.currentEditField = null;
    }
    /**
     * Render the atlas view with all DFDC cards.
     */
    renderAtlas() {
        const atlasGrid = document.getElementById('atlas-grid');
        if (!atlasGrid)
            return;
        const filters = this.getCurrentFilters();
        const filteredCards = getFilteredCards(filters);
        if (filteredCards.length === 0) {
            atlasGrid.innerHTML = renderEmptyState();
            return;
        }
        atlasGrid.innerHTML = filteredCards
            .map((card) => renderDFDCCard(card))
            .join('');
        // Add event listeners to card actions.
        atlasGrid.querySelectorAll('.card-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const action = target.dataset.action;
                const cardField = target.dataset.cardId;
                if (action === 'edit' && cardField) {
                    this.editDFDCCard(cardField);
                }
                else if (action === 'delete' && cardField) {
                    if (deleteDFDCCard(cardField)) {
                        this.renderAtlas();
                        this.updateStats();
                    }
                }
            });
        });
    }
    /**
     * Get current filter values from the UI with type safety.
     */
    getCurrentFilters() {
        const layerFilter = document.getElementById('filter-layer');
        const scopeFilter = document.getElementById('filter-scope');
        const categoryFilter = document.getElementById('filter-category');
        const filters = {};
        if (layerFilter?.value) {
            filters.layer = layerFilter.value; // Validated by form options.
        }
        if (scopeFilter?.value) {
            filters.scope = scopeFilter.value; // Validated by form options.
        }
        if (categoryFilter?.value) {
            filters.category = categoryFilter.value; // Validated by form options.
        }
        return filters;
    }
    /**
     * Apply filters to the atlas view.
     */
    applyFilters() {
        this.renderAtlas();
    }
    /**
     * Clear all filters.
     */
    clearFilters() {
        const layerFilter = document.getElementById('filter-layer');
        const scopeFilter = document.getElementById('filter-scope');
        const categoryFilter = document.getElementById('filter-category');
        if (layerFilter)
            layerFilter.value = '';
        if (scopeFilter)
            scopeFilter.value = '';
        if (categoryFilter)
            categoryFilter.value = '';
        this.renderAtlas();
    }
    /**
     * Export data to JSON file.
     */
    exportData() {
        const cards = loadCards();
        const dataToExport = {
            version: '1.0',
            exported: new Date().toISOString(),
            cards,
        };
        const filename = `dfd-atlas-${new Date().toISOString().split('T')[0]}.json`;
        downloadJson(dataToExport, filename);
        showNotification('Data exported successfully!', 'success');
    }
    /**
     * Trigger file input for import.
     */
    triggerImport() {
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.click();
        }
    }
    /**
     * Handle file import with enhanced error handling.
     */
    handleImport(event) {
        const target = event.target;
        const file = target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result;
                if (!content) {
                    showNotification('Error reading file content', 'error');
                    return;
                }
                const importModeElement = document.querySelector('input[name="import-mode"]:checked');
                const mode = importModeElement?.value;
                if (mode !== 'replace' && mode !== 'merge') {
                    showNotification('Invalid import mode selected', 'error');
                    return;
                }
                importCards(content, mode);
                this.renderAtlas();
                this.updateStats();
                showNotification(`Data imported successfully! (${mode} mode)`, 'success');
                // Reset file input.
                target.value = '';
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Invalid JSON format';
                showNotification(`Error importing file: ${message}`, 'error');
            }
        };
        reader.onerror = () => {
            showNotification('Error reading file', 'error');
        };
        reader.readAsText(file);
    }
    /**
     * Clear all data after confirmation.
     */
    clearAllData() {
        if (clearAllCards()) {
            this.renderAtlas();
            this.updateStats();
        }
    }
    /**
     * Update data statistics display.
     */
    updateStats() {
        const cards = loadCards();
        updateDataStats(cards.length);
    }
}
// Initialize the application when DOM is loaded.
document.addEventListener('DOMContentLoaded', () => {
    window.dfdAtlas = new DFDAtlas();
});
//# sourceMappingURL=app.js.map
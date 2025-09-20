import type { DFACard, AtlasFilter } from './types/dfa.js';
import { loadCards, importCards } from './utils/storage.js';
import {
  showNotification,
  renderDFACard,
  renderEmptyState,
  createDFAForm,
  clearFormValidation,
  resetCreateForm,
  updateDataStats,
  downloadJson,
  initializeDataTypeDropdown,
  initializeCodeSectionToggle,
  initializeEditCodeSectionToggle,
  initializeConnectionFieldToggle,
  initializeLocationDropdown,
  initializeFormVisibilityCheckboxes,
  updateFormSectionVisibility,
} from './components/ui.js';
import {
  createDFACardFromForm,
  addDFACard,
  updateDFACard,
  deleteDFACard,
  getFilteredCards,
  clearAllCards,
} from './components/cardManager.js';
import { initializeSettingsPanel } from './components/settingsPanel.js';

/**
 * Main Data Flow Atlas application class.
 */
export class DFDAtlas {
  private currentEditField: string | null = null;
  private currentEditCard: DFACard | null = null;
  private previousActiveTab: string = 'nav-add'; // Default to add tab

  constructor() {
    this.initializeEventListeners();
    this.initializeUI();
    this.renderAtlas();
    this.updateStats();
  }

  /**
   * Initialize UI components.
   */
  private initializeUI(): void {
    this.populateCreateForm();
    initializeDataTypeDropdown();
    initializeCodeSectionToggle();
    initializeConnectionFieldToggle('create');
    initializeFormVisibilityCheckboxes();
    initializeSettingsPanel();
    initializeLocationDropdown();
    this.initializePreviousActiveTab();
  }

  /**
   * Initialize the previous active tab based on current state.
   */
  private initializePreviousActiveTab(): void {
    const currentActive = document.querySelector('.nav-btn.active:not(#nav-settings)');
    if (currentActive) {
      this.previousActiveTab = currentActive.id;
    }
  }

  /**
   * Initialize all event listeners for the application.
   */
  private initializeEventListeners(): void {
    // Navigation.
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleNavigation(e as MouseEvent));
    });

    // Form submission.
    const dfaForm = document.getElementById('dfa-form') as HTMLFormElement;
    if (dfaForm) {
      dfaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });

      dfaForm.addEventListener('reset', () => {
        setTimeout(() => clearFormValidation(), 0);
      });
    }

    // Reset form button.
    const resetFormBtn = document.getElementById('reset-form') as HTMLButtonElement;
    if (resetFormBtn) {
      resetFormBtn.addEventListener('click', () => {
        resetCreateForm();
      });
    }

    // Filters.
    const filterLayer = document.getElementById('filter-layer') as HTMLSelectElement;
    const filterScope = document.getElementById('filter-scope') as HTMLSelectElement;
    const filterCategory = document.getElementById('filter-category') as HTMLSelectElement;
    const clearFiltersBtn = document.getElementById('clear-filters') as HTMLButtonElement;

    if (filterLayer) filterLayer.addEventListener('change', () => this.applyFilters());
    if (filterScope) filterScope.addEventListener('change', () => this.applyFilters());
    if (filterCategory) filterCategory.addEventListener('change', () => this.applyFilters());
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearFilters());

    // Import/Export.
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    const importFile = document.getElementById('import-file') as HTMLInputElement;
    const clearAllBtn = document.getElementById('clear-all-btn') as HTMLButtonElement;

    if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
    if (importBtn) importBtn.addEventListener('click', () => this.triggerImport());
    if (importFile) importFile.addEventListener('change', (e) => this.handleImport(e));
    if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearAllData());

    // Modal.
    const editModal = document.getElementById('edit-modal') as HTMLElement;
    if (editModal) {
      editModal.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (
          target.id === 'edit-modal' ||
          target.classList.contains('modal-close') ||
          target.classList.contains('modal-cancel')
        ) {
          this.closeModal();
        }
      });
    }

    // Edit form submission.
    const editForm = document.getElementById('edit-form') as HTMLFormElement;
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
  private handleNavigation(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Handle settings button separately - don't change active tab
    if (target.id === 'nav-settings') {
      return; // Settings modal opening is handled by settingsPanel.ts
    }

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
   * Store the currently active tab before opening Settings.
   */
  public storeCurrentActiveTab(): void {
    const currentActive = document.querySelector('.nav-btn.active:not(#nav-settings)');
    if (currentActive) {
      this.previousActiveTab = currentActive.id;
    }
  }

  /**
   * Restore the previously active tab.
   */
  public restorePreviousActiveTab(): void {
    const targetButton = document.getElementById(this.previousActiveTab);
    if (targetButton) {
      // Simulate a click on the previous tab to restore state
      targetButton.click();
    }
  }

  /**
   * Handle form submission for creating new DFA cards.
   */
  private handleFormSubmit(): void {
    const form = document.getElementById('dfa-form') as HTMLFormElement;
    if (!form) {
      showNotification('Form not found', 'error');
      return;
    }

    try {
      const formData = new FormData(form);
      const dfaCard = createDFACardFromForm(formData);

      if (addDFACard(dfaCard)) {
        resetCreateForm();
        this.renderAtlas();
        this.updateStats();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification(`Error creating card: ${message}`, 'error');
    }
  }

  /**
   * Open edit modal for a DFA card.
   */
  private editDFACard(field: string): void {
    const cards = loadCards();
    const card = cards.find(c => c.field === field);
    if (!card) return;

    this.currentEditField = field;
    this.currentEditCard = card;
    this.populateEditForm(card);

    const modal = document.getElementById('edit-modal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  /**
   * Populate the create form with dynamic content.
   */
  private populateCreateForm(): void {
    const createForm = document.getElementById('dfa-form');
    if (!createForm) return;

    createForm.innerHTML = createDFAForm('create');

    // Apply initial visibility settings immediately after form creation
    setTimeout(() => {
      updateFormSectionVisibility();
    }, 0);
  }

  /**
   * Populate the edit form with card data.
   */
  private populateEditForm(card: DFACard): void {
    const editForm = document.getElementById('edit-form');
    if (!editForm) return;

    editForm.innerHTML = createDFAForm('edit', card);

    // Initialize code section toggle for the edit form.
    initializeEditCodeSectionToggle();

    // Initialize connection field visibility for throughpoints.
    initializeConnectionFieldToggle('edit');

    // Reinitialize visibility checkboxes for the edit form.
    initializeFormVisibilityCheckboxes();

    // Apply visibility settings immediately after edit form creation
    setTimeout(() => {
      updateFormSectionVisibility();
    }, 0);
  }

  /**
   * Handle edit form submission.
   */
  private handleEditSubmit(): void {
    if (!this.currentEditField) {
      showNotification('No card selected for editing', 'error');
      return;
    }

    const form = document.getElementById('edit-form') as HTMLFormElement;
    if (!form) {
      showNotification('Edit form not found', 'error');
      return;
    }

    try {
      const formData = new FormData(form);
      const updatedCard = createDFACardFromForm(formData, this.currentEditCard || undefined);

      if (updateDFACard(this.currentEditField, updatedCard)) {
        this.closeModal();
        this.renderAtlas();
        this.updateStats();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification(`Error updating card: ${message}`, 'error');
    }
  }

  /**
   * Close the edit modal.
   */
  private closeModal(): void {
    const modal = document.getElementById('edit-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    this.currentEditField = null;
    this.currentEditCard = null;
  }

  /**
   * Render the atlas view with all DFA cards.
   */
  private renderAtlas(): void {
    const atlasGrid = document.getElementById('atlas-grid');
    if (!atlasGrid) return;

    const filters = this.getCurrentFilters();
    const filteredCards = getFilteredCards(filters);

    if (filteredCards.length === 0) {
      atlasGrid.innerHTML = renderEmptyState();
      return;
    }

    atlasGrid.innerHTML = filteredCards
      .map((card: DFACard) => renderDFACard(card))
      .join('');

    // Add event listeners to card actions.
    atlasGrid.querySelectorAll('.card-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const cardField = target.dataset.cardId;

        if (action === 'edit' && cardField) {
          this.editDFACard(cardField);
        } else if (action === 'delete' && cardField) {
          if (deleteDFACard(cardField)) {
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
  private getCurrentFilters(): AtlasFilter {
    const layerFilter = document.getElementById('filter-layer') as HTMLSelectElement | null;
    const scopeFilter = document.getElementById('filter-scope') as HTMLSelectElement | null;
    const categoryFilter = document.getElementById('filter-category') as HTMLSelectElement | null;

    const filters: AtlasFilter = {};

    if (layerFilter?.value) {
      filters.layer = layerFilter.value as any; // Validated by form options.
    }
    if (scopeFilter?.value) {
      filters.scope = scopeFilter.value as any; // Validated by form options.
    }
    if (categoryFilter?.value) {
      filters.category = categoryFilter.value as any; // Validated by form options.
    }

    return filters;
  }

  /**
   * Apply filters to the atlas view.
   */
  private applyFilters(): void {
    this.renderAtlas();
  }

  /**
   * Clear all filters.
   */
  private clearFilters(): void {
    const layerFilter = document.getElementById('filter-layer') as HTMLSelectElement;
    const scopeFilter = document.getElementById('filter-scope') as HTMLSelectElement;
    const categoryFilter = document.getElementById('filter-category') as HTMLSelectElement;

    if (layerFilter) layerFilter.value = '';
    if (scopeFilter) scopeFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';

    this.renderAtlas();
  }

  /**
   * Export data to JSON file.
   */
  private exportData(): void {
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
  private triggerImport(): void {
    const importFile = document.getElementById('import-file') as HTMLInputElement;
    if (importFile) {
      importFile.click();
    }
  }

  /**
   * Handle file import with enhanced error handling.
   */
  private handleImport(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          showNotification('Error reading file content', 'error');
          return;
        }

        const importModeElement = document.querySelector('input[name="import-mode"]:checked') as HTMLInputElement;
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
      } catch (error) {
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
  private clearAllData(): void {
    if (clearAllCards()) {
      this.renderAtlas();
      this.updateStats();
    }
  }

  /**
   * Update data statistics display.
   */
  private updateStats(): void {
    const cards = loadCards();
    updateDataStats(cards.length);
  }
}

// Initialize the application when DOM is loaded.
document.addEventListener('DOMContentLoaded', () => {
  (window as any).dfdAtlas = new DFDAtlas();
});

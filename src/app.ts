import type { DFACard, AtlasFilter, CardSize } from './types/dfa.js';
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
  updateLayerFilterOptions,
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
  private relationshipsFilterCardId: string | null = null; // Track active relationships filter

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
    updateLayerFilterOptions(); // Initialize layer filter options
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
    const filterOrphans = document.getElementById('filter-orphans') as HTMLSelectElement;
    const filterSearch = document.getElementById('filter-search') as HTMLInputElement;
    const viewSizeSelect = document.getElementById('view-size') as HTMLSelectElement;
    const clearFiltersBtn = document.getElementById('clear-filters') as HTMLButtonElement;

    if (filterLayer) filterLayer.addEventListener('change', () => this.applyFilters());
    if (filterScope) filterScope.addEventListener('change', () => this.applyFilters());
    if (filterCategory) filterCategory.addEventListener('change', () => this.applyFilters());
    if (filterOrphans) filterOrphans.addEventListener('change', () => this.applyFilters());
    if (filterSearch) filterSearch.addEventListener('input', () => this.applyFilters());
    if (viewSizeSelect) viewSizeSelect.addEventListener('change', () => this.renderAtlas());
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearFilters());

    // Relationships filter
    const clearRelationshipsBtn = document.getElementById('clear-relationships') as HTMLButtonElement;
    if (clearRelationshipsBtn) clearRelationshipsBtn.addEventListener('click', () => this.clearFilters());

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

    // Window resize handler to redraw connection lines
    window.addEventListener('resize', () => {
      if (this.relationshipsFilterCardId) {
        setTimeout(() => this.drawConnectionLines(), 100);
      }
    });
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

    // Update relationships status display
    this.updateRelationshipsStatus();

    // Get current view size
    const viewSizeSelect = document.getElementById('view-size') as HTMLSelectElement;
    const currentSize = (viewSizeSelect?.value as CardSize) || 'standard';

    // Update grid classes for responsive layout
    atlasGrid.className = 'atlas-grid';
    if (currentSize !== 'standard') {
      atlasGrid.classList.add(`size-${currentSize}`);
    }

    if (filteredCards.length === 0) {
      atlasGrid.innerHTML = renderEmptyState();
      this.clearConnectionLines();
      return;
    }

    atlasGrid.innerHTML = filteredCards
      .map((card: DFACard) => renderDFACard(card, currentSize))
      .join('');

    // Draw connection lines if relationships filter is active
    if (this.relationshipsFilterCardId) {
      setTimeout(() => this.drawConnectionLines(), 100); // Small delay to let DOM settle
    } else {
      this.clearConnectionLines();
    }
    atlasGrid.querySelectorAll('.card-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const cardField = target.dataset.cardId;

        if (action === 'relationships' && cardField) {
          this.setRelationshipsFilter(cardField);
        } else if (action === 'edit' && cardField) {
          this.editDFACard(cardField);
        } else if (action === 'delete' && cardField) {
          if (deleteDFACard(cardField)) {
            this.renderAtlas();
            this.updateStats();
          }
        }
      });
    });

    // Add event listeners to mini card expand buttons.
    atlasGrid.querySelectorAll('.card-expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const cardId = target.dataset.cardId;

        if (cardId) {
          this.toggleMiniCardDetails(cardId);
        }
      });
    });
  }

  /**
   * Toggle mini card details visibility.
   */
  private toggleMiniCardDetails(cardId: string): void {
    const detailsElement = document.querySelector(`[data-card-details="${cardId}"]`) as HTMLElement;
    const expandButton = document.querySelector(`[data-card-id="${cardId}"][data-action="expand"]`) as HTMLElement;
    const cardElement = expandButton?.closest('.dfa-card') as HTMLElement;

    if (detailsElement && expandButton && cardElement) {
      const isExpanded = detailsElement.style.display !== 'none';

      if (isExpanded) {
        // Collapse
        detailsElement.style.display = 'none';
        expandButton.textContent = '⊕';
        expandButton.title = 'Show Details';
        expandButton.classList.remove('expanded');
        cardElement.classList.remove('expanded');
      } else {
        // Expand
        detailsElement.style.display = 'block';
        expandButton.textContent = '⊖';
        expandButton.title = 'Hide Details';
        expandButton.classList.add('expanded');
        cardElement.classList.add('expanded');
      }
    }
  }

  /**
   * Draw connection lines between related cards when relationships filter is active.
   */
  private drawConnectionLines(): void {
    if (!this.relationshipsFilterCardId) return;

    const atlasGrid = document.getElementById('atlas-grid');
    const connectionsSvg = document.getElementById('atlas-connections') as unknown as SVGSVGElement;

    if (!atlasGrid || !connectionsSvg) return;

    // Clear existing lines
    this.clearConnectionLines();

    // Update SVG size to match container
    const containerRect = atlasGrid.getBoundingClientRect();
    connectionsSvg.setAttribute('width', containerRect.width.toString());
    connectionsSvg.setAttribute('height', containerRect.height.toString());

    // Find all cards currently displayed and all cards data
    const cardElements = atlasGrid.querySelectorAll('.dfa-card');
    const allCards = loadCards();

    // Find the source card
    const sourceCard = allCards.find(c => c.id === this.relationshipsFilterCardId);
    if (!sourceCard) return;

    // Find source card element
    const sourceCardElement = Array.from(cardElements).find(el =>
      el.querySelector(`[data-card-id="${sourceCard.id}"]`)
    ) as HTMLElement;

    if (!sourceCardElement) return;

    // Create a simple breadth-first search to find connected cards
    const connectedIds = this.getConnectedCardIds(this.relationshipsFilterCardId, allCards);

    // Draw lines to each connected card
    connectedIds.forEach((connectedId: string) => {
      const targetCardElement = Array.from(cardElements).find(el =>
        el.querySelector(`[data-card-id="${connectedId}"]`)
      ) as HTMLElement;

      if (targetCardElement) {
        this.drawLineBetweenCards(connectionsSvg, sourceCardElement, targetCardElement, atlasGrid);
      }
    });
  }

  /**
   * Find all cards connected to the specified card (breadth-first search).
   */
  private getConnectedCardIds(rootCardId: string, allCards: DFACard[]): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [rootCardId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      const currentCard = allCards.find(c => c.id === currentId);
      if (!currentCard) continue;

      // Add linked card if it exists and hasn't been visited
      if (currentCard.linkedTo && !visited.has(currentCard.linkedTo)) {
        queue.push(currentCard.linkedTo);
      }

      // Add cards that link to this card
      allCards.forEach(card => {
        if (card.linkedTo === currentId && !visited.has(card.id)) {
          queue.push(card.id);
        }
      });
    }

    return visited;
  }

  /**
   * Draw a single line between two card elements.
   */
  private drawLineBetweenCards(svg: SVGElement, sourceEl: HTMLElement, targetEl: HTMLElement, container: HTMLElement): void {
    const containerRect = container.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Calculate relative positions within the container
    const sourceX = sourceRect.left - containerRect.left + sourceRect.width / 2;
    const sourceY = sourceRect.top - containerRect.top + sourceRect.height / 2;
    const targetX = targetRect.left - containerRect.left + targetRect.width / 2;
    const targetY = targetRect.top - containerRect.top + targetRect.height / 2;

    // Create SVG path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Create a curved path for better visual appeal
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const offsetY = Math.abs(targetX - sourceX) * 0.2; // Curve based on horizontal distance

    const pathData = `M ${sourceX},${sourceY} Q ${midX},${midY - offsetY} ${targetX},${targetY}`;

    path.setAttribute('d', pathData);
    path.setAttribute('class', 'connection-line');

    svg.appendChild(path);
  }

  /**
   * Clear all connection lines.
   */
  private clearConnectionLines(): void {
    const connectionsSvg = document.getElementById('atlas-connections');
    if (connectionsSvg) {
      connectionsSvg.innerHTML = '';
    }
  }

  /**
   * Get current filter values from the UI with type safety.
   */
  private getCurrentFilters(): AtlasFilter {
    const layerFilter = document.getElementById('filter-layer') as HTMLSelectElement | null;
    const scopeFilter = document.getElementById('filter-scope') as HTMLSelectElement | null;
    const categoryFilter = document.getElementById('filter-category') as HTMLSelectElement | null;
    const orphansFilter = document.getElementById('filter-orphans') as HTMLSelectElement | null;
    const searchFilter = document.getElementById('filter-search') as HTMLInputElement | null;

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
    if (orphansFilter?.value) {
      filters.orphans = orphansFilter.value as 'all' | 'endpoints' | 'throughpoints';
    }
    if (searchFilter?.value.trim()) {
      filters.searchTerm = searchFilter.value.trim();
    }
    if (this.relationshipsFilterCardId) {
      filters.relationships = this.relationshipsFilterCardId;
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
    const orphansFilter = document.getElementById('filter-orphans') as HTMLSelectElement;
    const searchFilter = document.getElementById('filter-search') as HTMLInputElement;

    if (layerFilter) layerFilter.value = '';
    if (scopeFilter) scopeFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (orphansFilter) orphansFilter.value = '';
    if (searchFilter) searchFilter.value = '';

    // Clear relationships filter
    this.relationshipsFilterCardId = null;
    this.updateRelationshipsStatus();

    this.renderAtlas();
  }

  /**
   * Set relationships filter to show connected network for a specific card.
   */
  private setRelationshipsFilter(cardId: string): void {
    // Clear other filters first
    const layerFilter = document.getElementById('filter-layer') as HTMLSelectElement;
    const scopeFilter = document.getElementById('filter-scope') as HTMLSelectElement;
    const categoryFilter = document.getElementById('filter-category') as HTMLSelectElement;
    const orphansFilter = document.getElementById('filter-orphans') as HTMLSelectElement;
    const searchFilter = document.getElementById('filter-search') as HTMLInputElement;

    if (layerFilter) layerFilter.value = '';
    if (scopeFilter) scopeFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (orphansFilter) orphansFilter.value = '';
    if (searchFilter) searchFilter.value = '';

    // Store the relationships filter state
    this.relationshipsFilterCardId = cardId;

    // Show the relationships status
    this.updateRelationshipsStatus();

    this.renderAtlas();
  }

  /**
   * Update the relationships status display.
   */
  private updateRelationshipsStatus(): void {
    const statusElement = document.getElementById('relationships-status');
    const cardNameElement = document.getElementById('relationships-card-name');

    if (!statusElement || !cardNameElement) return;

    if (this.relationshipsFilterCardId) {
      // Find the card name to display
      const cards = loadCards();
      const card = cards.find(c => c.id === this.relationshipsFilterCardId);
      const cardName = card ? card.field : 'Unknown Card';

      cardNameElement.textContent = cardName;
      statusElement.classList.remove('hidden');
    } else {
      statusElement.classList.add('hidden');
    }
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

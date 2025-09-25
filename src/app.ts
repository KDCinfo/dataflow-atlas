import type { DFACard, AtlasFilter, CardSize } from './types/dfa.js';
import { loadCards, importCards } from './utils/storage.js';
import { getDataLayersByType, type DataLayer } from './utils/settings.js';
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
import { TreeView } from './components/treeView.js';
import { createDFACardFromForm, addDFACard, updateDFACard, deleteDFACard } from './components/cardManager.js';
import { initializeSettingsPanel } from './components/settingsPanel.js';
import { AtlasSelector } from './components/atlasSelector.js';

/**
 * Main Data Flow Atlas application class.
 */
export class DFDAtlas {
  private currentEditCard: DFACard | null = null;
  private relationshipsFilterCardId: string | null = null; // Track active relationships filter
  private isTreeViewActive: boolean = false; // Track tree view state
  private treeView: TreeView = new TreeView(); // Tree view system
  private atlasSelector: AtlasSelector; // Atlas selection component

  constructor() {
    this.initializeEventListeners();
    this.initializeUI();
    this.atlasSelector = new AtlasSelector(); // Initialize atlas selector
    this.renderAtlas();
    this.updateStats();
  }

  /**
   * Initialize UI components.
   */
  private initializeUI(): void {
    // Populate the create form
    const dfaForm = document.getElementById('dfa-form');
    if (dfaForm) {
      dfaForm.innerHTML = createDFAForm('create');
    }

    initializeDataTypeDropdown();
    initializeLocationDropdown();
    initializeCodeSectionToggle();
    initializeEditCodeSectionToggle();
    initializeConnectionFieldToggle();
    initializeFormVisibilityCheckboxes();
    initializeSettingsPanel();
    updateFormSectionVisibility();
    updateLayerFilterOptions();
  }

  /**
   * Initialize event listeners for various UI elements.
   */
  private initializeEventListeners(): void {
    // Form submissions.
    const addCardForm = document.getElementById('dfa-form') as HTMLFormElement;
    const editCardForm = document.getElementById('edit-form') as HTMLFormElement;

    if (addCardForm) {
      addCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(e, 'add');
      });
    }

    if (editCardForm) {
      editCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(e, 'edit');
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
    if (viewSizeSelect) viewSizeSelect.addEventListener('change', () => {
      const newSize = viewSizeSelect.value as CardSize;

      // If changing away from mini size and we have a relationships filter active,
      // clear the relationships filter since link icons are only available on mini cards
      if (newSize !== 'mini' && this.relationshipsFilterCardId) {
        this.clearFilters();
      } else {
        this.renderAtlas();
      }
    });
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearFilters());

    // Relationships filter
    const clearRelationshipsBtn = document.getElementById('clear-relationships') as HTMLButtonElement;
    if (clearRelationshipsBtn) clearRelationshipsBtn.addEventListener('click', () => this.clearRelationshipsFilter());

    const treeViewToggleBtn = document.getElementById('toggle-tree-view') as HTMLButtonElement;
    if (treeViewToggleBtn) treeViewToggleBtn.addEventListener('click', () => this.toggleTreeView());

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

    // Close modal on backdrop click.
    if (editModal) {
      editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
          this.hideModal();
        }
      });
    }

    // Handle modal close buttons using event delegation
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Handle X button (modal-close class) and Cancel button (modal-cancel class)
      if (target.classList.contains('modal-close') || target.classList.contains('modal-cancel')) {
        this.hideModal();
      }
    });

    // Navigation.
    const navLinks = document.querySelectorAll('.nav-btn');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = (e.target as HTMLElement).getAttribute('id');

        // Skip settings button - it has its own handler in settingsPanel.ts
        if (targetTab === 'nav-settings') {
          return;
        }

        if (targetTab) {
          this.switchTab(targetTab);
        }
      });
    });

    // Dynamic event delegation for card actions.
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains('card-action-btn') || target.classList.contains('card-expand-btn')) {
        e.preventDefault();
        const action = target.getAttribute('data-action');
        const cardId = target.getAttribute('data-card-id');

        if (action && cardId) {
          this.handleCardAction(action, cardId);
        }
      }
    });
  }

  /**
   * Handle form submissions for adding/editing cards.
   */
  private handleFormSubmit(event: Event, mode: 'add' | 'edit'): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      if (mode === 'add') {
        const newCard = createDFACardFromForm(formData);
        addDFACard(newCard);
        showNotification('Card added successfully', 'success');
        resetCreateForm();
      } else if (mode === 'edit' && this.currentEditCard) {
        const updatedCard = createDFACardFromForm(formData, this.currentEditCard);
        updateDFACard(this.currentEditCard.field, updatedCard);
        showNotification('Card updated successfully', 'success');
        this.hideModal();
      }

      this.renderAtlas();
      this.updateStats();
    } catch (error) {
      console.error('Error handling form submission:', error);
      showNotification('Error saving card', 'error');
    }
  }  /**
   * Handle card actions (edit, delete, relationships).
   */
  private handleCardAction(action: string, cardId: string): void {
    const cards = loadCards();
    const card = cards.find(c => c.id === cardId);

    if (!card) {
      showNotification('Card not found', 'error');
      return;
    }

    switch (action) {
      case 'edit':
        this.editCard(card);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this card?')) {
          deleteDFACard(card.field);
          showNotification('Card deleted successfully', 'success');
          this.renderAtlas();
          this.updateStats();
        }
        break;
      case 'relationships':
        this.setRelationshipsFilter(cardId);
        break;
      case 'expand':
        this.toggleCardDetails(cardId);
        break;
      default:
        console.warn('Unknown card action:', action);
    }
  }

  /**
   * Toggle the expanded details of a mini card.
   */
  private toggleCardDetails(cardId: string): void {
    const detailsElement = document.querySelector(`[data-card-details="${cardId}"]`) as HTMLElement;
    if (detailsElement) {
      const isHidden = detailsElement.style.display === 'none';
      detailsElement.style.display = isHidden ? 'block' : 'none';

      // Update the expand button symbol
      const expandBtn = document.querySelector(`[data-action="expand"][data-card-id="${cardId}"]`) as HTMLElement;
      if (expandBtn) {
        expandBtn.textContent = isHidden ? '⊖' : '⊕';
        expandBtn.title = isHidden ? 'Hide Details' : 'Show Details';
      }
    }
  }

  /**
   * Edit a card - populate form and show modal.
   */
  private editCard(card: DFACard): void {
    this.currentEditCard = card;

    // Populate edit form with form HTML and card data
    const editForm = document.getElementById('edit-form') as HTMLFormElement;
    if (editForm) {
      // First populate the form structure with the card data
      editForm.innerHTML = createDFAForm('edit', card);

      // Initialize form interactions for edit mode
      initializeConnectionFieldToggle('edit');
      initializeEditCodeSectionToggle();
      initializeFormVisibilityCheckboxes(); // Set up visibility checkboxes for edit form
    }

    this.showModal();
  }

  /**
   * Show edit modal.
   */
  private showModal(): void {
    const modal = document.getElementById('edit-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Hide edit modal.
   */
  private hideModal(): void {
    const modal = document.getElementById('edit-modal') as HTMLElement;
    if (modal) {
      modal.style.display = 'none';
    }

    this.currentEditCard = null;
    clearFormValidation();
  }

  /**
   * Switch between tabs.
   */
  private switchTab(targetTab: string): void {
    // Extract the section name from the nav ID (e.g., 'nav-add' -> 'add')
    const sectionName = targetTab.replace('nav-', '');

    // Update navigation buttons.
    const navLinks = document.querySelectorAll('.nav-btn');
    navLinks.forEach(link => {
      if (link.id === targetTab) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Show/hide sections.
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
      if (section.id === `${sectionName}-section`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
  }

  /**
   * Restore the previously active tab (called when settings modal closes).
   * Since settings is now a pure modal, this just refreshes the current view.
   */
  public restorePreviousActiveTab(): void {
    // Simply refresh the current view since settings didn't change the active tab
    this.renderAtlas();
    this.updateStats();
  }  /**
   * Apply current filter values to render filtered cards.
   */
  private applyFilters(): void {
    this.renderAtlas();
  }

  /**
   * Get current filter values.
   */
  private getCurrentFilters(): AtlasFilter {
    const layerFilter = document.getElementById('filter-layer') as HTMLSelectElement;
    const scopeFilter = document.getElementById('filter-scope') as HTMLSelectElement;
    const categoryFilter = document.getElementById('filter-category') as HTMLSelectElement;
    const orphansFilter = document.getElementById('filter-orphans') as HTMLSelectElement;
    const searchFilter = document.getElementById('filter-search') as HTMLInputElement;

    return {
      layer: layerFilter?.value as any || undefined,
      scope: scopeFilter?.value as any || undefined,
      category: categoryFilter?.value as any || undefined,
      orphans: orphansFilter?.value as any || undefined,
      searchTerm: searchFilter?.value || '',
    };
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

    // Clear tree view
    this.treeView.clearTree();

    // Clear any tree-specific styling that might affect card heights
    const atlasGrid = document.getElementById('atlas-grid');
    if (atlasGrid) {
      atlasGrid.style.removeProperty('height');
      atlasGrid.style.removeProperty('min-height');
      atlasGrid.style.removeProperty('minHeight');
      atlasGrid.style.removeProperty('overflow');
      atlasGrid.style.removeProperty('width');
      atlasGrid.style.removeProperty('position');
      atlasGrid.style.removeProperty('display');
    }

    this.renderAtlas();
  }

  /**
   * Clear only the relationships filter while keeping other filters active.
   */
  private clearRelationshipsFilter(): void {
    this.relationshipsFilterCardId = null;
    this.isTreeViewActive = false;
    this.updateRelationshipsStatus();
    this.updateTreeViewButton();

    // Clear tree view
    this.treeView.clearTree();

    // Clear any tree-specific styling that might affect card heights
    const atlasGrid = document.getElementById('atlas-grid');
    if (atlasGrid) {
      atlasGrid.style.removeProperty('height');
      atlasGrid.style.removeProperty('min-height');
      atlasGrid.style.removeProperty('minHeight');
      atlasGrid.style.removeProperty('overflow');
      atlasGrid.style.removeProperty('width');
      atlasGrid.style.removeProperty('position');
      atlasGrid.style.removeProperty('display');
    }

    // Ensure we return to mini view since link icons are only available on mini cards
    const viewSizeSelect = document.getElementById('view-size') as HTMLSelectElement;
    if (viewSizeSelect) {
      viewSizeSelect.value = 'mini';
    }

    this.renderAtlas();
  }

  /**
   * Toggle between tree view and grid view.
   */
  private toggleTreeView(): void {
    if (this.isTreeViewActive && this.relationshipsFilterCardId) {
      // Switch back to grid view
      this.isTreeViewActive = false;
      this.treeView.clearTree();

      // Clear any tree-specific styling that might affect card heights
      const atlasGrid = document.getElementById('atlas-grid');
      if (atlasGrid) {
        atlasGrid.style.removeProperty('height');
        atlasGrid.style.removeProperty('min-height');
        atlasGrid.style.removeProperty('minHeight');
        atlasGrid.style.removeProperty('overflow');
        atlasGrid.style.removeProperty('width');
        atlasGrid.style.removeProperty('position');
        atlasGrid.style.removeProperty('display');
      }

      this.renderAtlas();
      this.updateTreeViewButton();
    } else if (this.relationshipsFilterCardId) {
      // Switch to tree view
      this.isTreeViewActive = true;
      setTimeout(() => {
        this.treeView.renderTree(this.relationshipsFilterCardId!);
      }, 150);
      this.updateTreeViewButton();
    }
  }

  /**
   * Calculate grid positions for relationship cards in a transposed hierarchical layout.
   * Root at top, children spread horizontally below, with deep vertical flows.
   */
  private calculateGridPositions(rootCardId: string, cards: DFACard[]): Map<string, {row: number, col: number}> {
    const positions = new Map<string, {row: number, col: number}>();

    // First, build the complete tree structure
    const buildTree = (nodeId: string, visited = new Set<string>()): any => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const children = cards
        .filter(card => card.linkedTo === nodeId && !visited.has(card.id))
        .map(card => buildTree(card.id, visited))
        .filter(Boolean);

      return {
        id: nodeId,
        children: children
      };
    };

    const tree = buildTree(rootCardId);
    if (!tree) return positions;

    // Calculate the width needed for each subtree (total columns it will occupy)
    const calculateSubtreeWidth = (node: any): number => {
      if (!node.children || node.children.length === 0) return 1;

      return node.children.reduce((total: number, child: any) => {
        return total + calculateSubtreeWidth(child);
      }, 0);
    };

    // Position nodes in transposed layout: root at top, children spread horizontally
    const positionNodes = (node: any, row: number, startCol: number): number => {
      positions.set(node.id, { row: row, col: startCol });

      if (!node.children || node.children.length === 0) return startCol + 1;

      let currentCol = startCol;
      const nextRow = row + 1;

    // Place all children horizontally in the next row
    for (const child of node.children) {
      const subtreeWidth = calculateSubtreeWidth(child);

      // For single-node subtrees, don't allocate extra space
      const childCol = subtreeWidth === 1 ? currentCol : currentCol + Math.floor(subtreeWidth / 2);
      const nextCol = positionNodes(child, nextRow, childCol);

      // Move to next position, ensuring minimal spacing for single nodes
      currentCol = subtreeWidth === 1 ? currentCol + 1 : nextCol;
    }

      return currentCol;
    };

    // Start positioning from root at (0, 0), centered based on total tree width
    const totalWidth = calculateSubtreeWidth(tree);
    const rootCol = Math.floor(totalWidth / 2);
    positionNodes(tree, 0, rootCol);

    return positions;
  }  /**
   * Render cards in a CSS Grid layout based on calculated positions.
   */
  private renderGridLayout(cards: DFACard[], rootCardId: string, currentSize: CardSize): void {
    const atlasGrid = document.getElementById('atlas-grid');
    if (!atlasGrid) return;

    const positions = this.calculateGridPositions(rootCardId, cards);

    // Find the maximum row and column to set grid dimensions, and get used columns
    let maxRow = 0;
    let maxCol = 0;
    const usedCols = new Set<number>();
    positions.forEach(({row, col}) => {
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
      usedCols.add(col);
    });

    // Create column template only for used columns
    const sortedCols = Array.from(usedCols).sort((a, b) => a - b);
    const colTemplate = sortedCols.map(() => 'minmax(200px, max-content)').join(' ');

    // Create CSS Grid
    atlasGrid.className = 'atlas-grid grid-layout';
    if (currentSize !== 'standard') {
      atlasGrid.classList.add(`size-${currentSize}`);
    }

    // Set CSS Grid properties
    atlasGrid.style.display = 'grid';
    atlasGrid.style.gridTemplateRows = `repeat(${maxRow + 1}, minmax(auto, max-content))`;
    atlasGrid.style.gridTemplateColumns = colTemplate;
    atlasGrid.style.gap = 'var(--spacing-lg)';
    atlasGrid.style.alignItems = 'start';

    // Create grid content with positioned cards only (no empty cells)
    let gridContent = '';

    // Create a column mapping for grid positioning
    const colMapping = new Map<number, number>();
    sortedCols.forEach((originalCol, index) => {
      colMapping.set(originalCol, index + 1); // CSS Grid is 1-indexed
    });

    cards.forEach(card => {
      const pos = positions.get(card.id);
      if (pos) {
        const gridCol = colMapping.get(pos.col) || 1;
        const cardHtml = renderDFACard(card, currentSize);

        let arrowHtml = '';

        // Add simple downward arrow for any card that has children
        const hasChildren = cards.some(c => c.linkedTo === card.id);
        if (hasChildren) {
          arrowHtml += '<div class="flow-arrow outgoing" style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 16px; color: #00bcd4; font-weight: bold;">↓</div>';
        }

        // Add incoming connection arrow for non-root cards
        if (card.id !== rootCardId && card.linkedTo) {
          const parent = cards.find(c => c.id === card.linkedTo);
          const parentPos = parent ? positions.get(parent.id) : null;

          if (parentPos) {
            const isDirectlyBelow = parentPos.col === pos.col;
            const isToTheRight = parentPos.col < pos.col;

            // Only show incoming arrows for diagonal connections (not direct vertical)
            if (!isDirectlyBelow && isToTheRight) {
              // Parent to the left - use corner arrow (right-then-down)
              arrowHtml += '<div class="flow-arrow incoming" style="position: absolute; top: -20px; left: -5%; font-size: 14px; color: #00bcd4;">&#8600;</div>';
              // Other potential arrows: &#8628; &#8625; (the 2nd would require a transform: rotate(-90) / counter-clockwise)
              // https://www.w3schools.com/charsets/ref_utf_arrows.asp
            }
          }
        }

        gridContent += `<div style="grid-row: ${pos.row + 1}; grid-column: ${gridCol}; position: relative;">${cardHtml}${arrowHtml}</div>`;
      }
    });

    atlasGrid.innerHTML = gridContent;

    // Update SVG size to match the actual grid width
    const connectionsSvg = document.getElementById('atlas-connections') as unknown as SVGSVGElement;
    if (connectionsSvg) {
      // Calculate the actual grid width needed
      const cardWidth = 200; // Approximate card width
      const gridGap = 24; // CSS variable --spacing-lg converted to pixels
      const actualGridWidth = (sortedCols.length * cardWidth) + ((sortedCols.length - 1) * gridGap) + 40; // 40px for margins

      connectionsSvg.style.width = `${actualGridWidth}px`;
      connectionsSvg.style.height = '100%';
      connectionsSvg.style.minWidth = `${actualGridWidth}px`;
      connectionsSvg.setAttribute('width', actualGridWidth.toString());
      connectionsSvg.setAttribute('height', '2000'); // Large height for connections
      // Remove any viewBox to keep 1:1 pixel coordinate system
      connectionsSvg.removeAttribute('viewBox');
    }
  }

  /**
   * Update tree view button text based on current state.
   */
  private updateTreeViewButton(): void {
    const treeViewBtn = document.getElementById('toggle-tree-view') as HTMLButtonElement;
    if (treeViewBtn) {
      if (this.relationshipsFilterCardId) {
        treeViewBtn.textContent = this.isTreeViewActive ? 'Grid View' : 'Tree View';
        treeViewBtn.disabled = false;
      } else {
        treeViewBtn.textContent = 'Tree View';
        treeViewBtn.disabled = true; // Disable when no relationship is active
      }
    }
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

    // First render the atlas with the filtered cards
    this.renderAtlas();

    // Then switch to tree view after the cards are rendered
    // Use setTimeout to ensure DOM layout is complete
    this.isTreeViewActive = true;
    setTimeout(() => {
      this.treeView.renderTree(cardId);
    }, 150); // Anything under 100 shows the connectors in an umbrella layout.

    this.updateTreeViewButton();
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

      statusElement.classList.remove('hidden');
      cardNameElement.textContent = cardName;
    } else {
      statusElement.classList.add('hidden');
    }
  }

  /**
   * Get connected cards for relationships view.
   */
  private getConnectedCardIds(rootCardId: string): string[] {
    const allCards = loadCards();
    const visited = new Set<string>();
    const connected = new Set<string>();
    const queue = [rootCardId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      connected.add(currentId);

      const currentCard = allCards.find(c => c.id === currentId);
      if (!currentCard) continue;

      // Find cards that this card links to
      if (currentCard.linkedTo) {
        queue.push(currentCard.linkedTo);
      }

      // Find cards that link to this card
      allCards.forEach(card => {
        if (card.linkedTo === currentId && !visited.has(card.id)) {
          queue.push(card.id);
        }
      });
    }

    return Array.from(connected);
  }

  /**
   * Filter cards based on current filter criteria.
   */
  private filterCards(cards: DFACard[]): DFACard[] {
    // If we have a relationships filter, get connected cards
    if (this.relationshipsFilterCardId) {
      const connectedIds = this.getConnectedCardIds(this.relationshipsFilterCardId);
      return cards.filter(card => connectedIds.includes(card.id));
    }

    // Otherwise, use the regular filter system
    const filters = this.getCurrentFilters();
    return cards.filter((card: DFACard) => {
      // Basic filters
      if (filters.layer && card.layer !== filters.layer) return false;
      if (filters.scope && card.scope !== filters.scope) return false;
      if (filters.category && card.category !== filters.category) return false;

      // Orphans filter
      if (filters.orphans === 'endpoints') {
        // For endpoints: show only cards that are NOT being linked to by any other card
        const { endpoints } = getDataLayersByType();
        const isEndpointLayer = endpoints.some((layer: DataLayer) => layer.name === card.layer);
        if (!isEndpointLayer) return false; // Only show endpoint layer cards

        // Check if any other card links to this card
        const isLinkedTo = cards.some(otherCard =>
          otherCard.id !== card.id &&
          otherCard.linkedTo &&
          otherCard.linkedTo.includes(card.id)
        );
        if (isLinkedTo) return false; // Hide cards that are being linked to
      }

      if (filters.orphans === 'throughpoints') {
        // For throughpoints: show only cards that have empty linkedTo property
        const { throughpoints } = getDataLayersByType();
        const isThroughpointLayer = throughpoints.some((layer: DataLayer) => layer.name === card.layer);
        if (!isThroughpointLayer) return false; // Only show throughpoint layer cards

        // Show only cards with empty linkedTo
        if (card.linkedTo && card.linkedTo.length > 0) return false;
      }

      // Search filter
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const searchableText = [
          card.field,
          card.location,
          card.notes,
          card.type
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) return false;
      }

      return true;
    });
  }

  /**
   * Clear connection lines from the SVG.
   */
  private clearConnectionLines(): void {
    const connectionsSvg = document.getElementById('atlas-connections') as unknown as SVGSVGElement;
    if (connectionsSvg) {
      connectionsSvg.innerHTML = '';
    }
  }

  /**
   * Public method to refresh the display after data changes.
   * Can be called from external components like settings.
   */
  public refreshDisplay(): void {
    this.renderAtlas();
    this.updateStats();
  }

  /**
   * Render the data flow atlas.
   */
  private renderAtlas(): void {
    const cards = loadCards();
    const filteredCards = this.filterCards(cards);

    const atlasGrid = document.getElementById('atlas-grid');
    if (!atlasGrid) return;

    // Update relationships status display
    this.updateRelationshipsStatus();

    // Get current view size
    const viewSizeSelect = document.getElementById('view-size') as HTMLSelectElement;
    const currentSize = (viewSizeSelect?.value as CardSize) || 'standard';

    if (filteredCards.length === 0) {
      atlasGrid.innerHTML = renderEmptyState();
      this.clearConnectionLines();
      return;
    }

    // Use grid layout for relationships view when not in tree mode
    if (this.relationshipsFilterCardId && !this.isTreeViewActive) {
      this.renderGridLayout(filteredCards, this.relationshipsFilterCardId, currentSize);
    } else {
      // Standard flex layout for normal view
      atlasGrid.className = 'atlas-grid';
      if (currentSize !== 'standard') {
        atlasGrid.classList.add(`size-${currentSize}`);
      }

      // Clear any grid-specific styling
      atlasGrid.style.removeProperty('display');
      atlasGrid.style.removeProperty('grid-template-rows');
      atlasGrid.style.removeProperty('grid-template-columns');
      atlasGrid.style.removeProperty('gap');
      atlasGrid.style.removeProperty('align-items');

      atlasGrid.innerHTML = filteredCards
        .map((card: DFACard) => renderDFACard(card, currentSize))
        .join('');
    }

    // Clear any existing connection lines when not in relationships view
    if (!this.relationshipsFilterCardId) {
      this.clearConnectionLines();
    }
  }

  /**
   * Export data as JSON.
   */
  private exportData(): void {
    try {
      const cards = loadCards();
      const exportData = {
        version: '1.0',
        exported: new Date().toISOString(),
        cards: cards
      };
      downloadJson(exportData, `dfd-atlas-${new Date().toISOString().split('T')[0]}.json`);
      showNotification('Data exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Export failed', 'error');
    }
  }

  /**
   * Trigger file import.
   */
  private triggerImport(): void {
    const fileInput = document.getElementById('import-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Handle file import.
   */
  private handleImport(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const parsedData = JSON.parse(jsonData);

        let cards: DFACard[];

        // Handle both export formats: structured object with metadata or plain array
        if (Array.isArray(parsedData)) {
          // Legacy format: plain array of cards
          cards = parsedData;
        } else if (parsedData.cards && Array.isArray(parsedData.cards)) {
          // New format: structured object with cards array
          cards = parsedData.cards;
        } else {
          throw new Error('Invalid data format - expected array of cards or object with cards property');
        }

        // Import the cards
        importCards(JSON.stringify(cards), 'replace');
        showNotification('Data imported successfully', 'success');
        this.renderAtlas();
        this.updateStats();
      } catch (error) {
        console.error('Import error:', error);
        showNotification('Import failed - invalid JSON format', 'error');
      }
    };

    reader.readAsText(file);
    target.value = ''; // Reset file input
  }

  /**
   * Clear all data.
   */
  private clearAllData(): void {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem('dfa-cards');
      showNotification('All data cleared', 'success');
      this.renderAtlas();
      this.updateStats();
    }
  }

  /**
   * Refresh atlas selector when atlas list changes.
   */
  public refreshAtlasSelector(): void {
    if (this.atlasSelector) {
      this.atlasSelector.refresh();
    }
  }

  /**
   * Update statistics display.
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
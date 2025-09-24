import {
  getUniqueLocations,
  addLocation,
  removeLocation,
  editLocation,
  getScopes,
  addScopeWithLabel,
  removeScope,
  editScope,
  getScopeLabel,
  getCategories,
  addCategoryWithLabel,
  removeCategory,
  editCategory,
  getCategoryLabel,
  getDataLayersByType,
  saveDataLayer,
  deleteDataLayer,
  dataLayerExists,
  generateLayerId,
  DataLayerType,
  type DataLayer,
} from '../utils/settings.js';
import { getElement, updateLocationOptions, updateLayerOptions, updateLayerFilterOptions, updateConnectionOptions, updateScopeOptions, updateCategoryOptions } from './ui.js';

/**
 * Settings panel management for Data Flow Atlas.
 */

const PANEL_STATES_KEY = 'dfa__settings_panel_states';

/**
 * Get the current panel states from localStorage.
 */
function getPanelStates(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(PANEL_STATES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load panel states:', error);
    return {};
  }
}

/**
 * Save panel states to localStorage.
 */
function savePanelStates(states: Record<string, boolean>): void {
  try {
    localStorage.setItem(PANEL_STATES_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to save panel states:', error);
  }
}

/**
 * Get whether a panel is expanded (with default fallback).
 */
function isPanelExpanded(panelId: string, defaultExpanded = false): boolean {
  const states = getPanelStates();
  return states[panelId] !== undefined ? states[panelId] : defaultExpanded;
}

/**
 * Set a panel's expanded state.
 */
function setPanelExpanded(panelId: string, expanded: boolean): void {
  const states = getPanelStates();
  states[panelId] = expanded;
  savePanelStates(states);
}

/**
 * Open the settings modal.
 */
export function openSettingsModal(): void {
  const modal = getElement('settings-modal');
  if (!modal) return;

  // Store the current active tab before opening settings
  const dfdAtlas = (window as any).dfdAtlas;
  if (dfdAtlas && typeof dfdAtlas.storeCurrentActiveTab === 'function') {
    dfdAtlas.storeCurrentActiveTab();
  }

  populateSettingsContent();
  modal.classList.add('active');
}

/**
 * Close the settings modal.
 */
export function closeSettingsModal(): void {
  const modal = getElement('settings-modal');
  if (!modal) return;

  modal.classList.remove('active');

  // Restore the previously active tab
  const dfdAtlas = (window as any).dfdAtlas;
  if (dfdAtlas && typeof dfdAtlas.restorePreviousActiveTab === 'function') {
    dfdAtlas.restorePreviousActiveTab();
  }
}

/**
 * Generate the data layer management section HTML.
 */
function generateDataLayerManagementSection(): string {
  const { endpoints, throughpoints } = getDataLayersByType();

  // Check localStorage for collapsed state (defaults to collapsed)
  const isExpanded = isPanelExpanded('layer-management', false);

  return `
    <div class="settings-section">
      <h4 class="collapsible-header" data-target="layer-management">
        <span class="expand-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '►'}</span>
        Data Layer Management
      </h4>
      <div id="layer-management" class="collapsible-content ${isExpanded ? 'expanded' : ''}">
        <p class="setting-description">Manage the data layers available when creating DFA cards. Layers are organized as Endpoints (final destinations) and Throughpoints (intermediate processing).</p>

        <div class="settings-item">
          <label>Add New Data Layer:</label>
          <div class="data-layer-form">
            <input type="text" id="new-layer-name-input" class="settings-input" placeholder="Display name (e.g., 'Pinia Store')">
                        <select id="new-layer-type-select" class="form-control">
              <option value="">Choose classification...</option>
              <option value="${DataLayerType.Endpoint}">Endpoint - Data belongs to...</option>
              <option value="${DataLayerType.Throughpoint}">Throughpoint - Data passes through...</option>
            </select>
            <button id="add-layer-btn" class="btn-secondary">Add Layer</button>
          </div>
        </div>

        <div class="layers-grid">
          <div class="layers-column">
            <h5>Endpoints - <span class="no-wrap">Data belongs to...</span></h5>
            <div class="layer-list">
              ${endpoints.length > 0 ? endpoints.map(layer => `
                <div class="layer-item-compact" data-layer-id="${escapeHtml(layer.id)}">
                  <span class="layer-name">${escapeHtml(layer.name)}</span>
                  <div class="layer-actions">
                    <button class="layer-edit edit-btn btn-compact" data-layer-id="${escapeHtml(layer.id)}">Edit</button>
                    <button class="layer-delete delete-btn btn-compact" data-layer-id="${escapeHtml(layer.id)}">Delete</button>
                  </div>
                </div>
              `).join('') : '<div class="empty-layer-list">No endpoints defined</div>'}
            </div>
          </div>

          <div class="layers-column">
            <h5>Thrupoints - <span class="no-wrap">Data passes through...</span></h5>
            <div class="layer-list">
              ${throughpoints.length > 0 ? throughpoints.map(layer => `
                <div class="layer-item-compact" data-layer-id="${escapeHtml(layer.id)}">
                  <span class="layer-name">${escapeHtml(layer.name)}</span>
                  <div class="layer-actions">
                    <button class="layer-edit edit-btn btn-compact" data-layer-id="${escapeHtml(layer.id)}">Edit</button>
                    <button class="layer-delete delete-btn btn-compact" data-layer-id="${escapeHtml(layer.id)}">Delete</button>
                  </div>
                </div>
              `).join('') : '<div class="empty-layer-list">No throughpoints defined</div>'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate Scope Management section.
 */
function generateScopeManagementSection(): string {
  const scopes = getScopes();
  const isScopesExpanded = isPanelExpanded('scope-management', false);

  return `
    <div class="settings-section">
      <h4 class="collapsible-header" data-target="scope-management">
        <span class="expand-icon ${isScopesExpanded ? 'expanded' : ''}">${isScopesExpanded ? '▼' : '►'}</span>
        Scope Management
      </h4>
      <div id="scope-management" class="collapsible-content ${isScopesExpanded ? 'expanded' : ''}">
        <p class="setting-description">Manage the list of data scopes for your DFA cards. These define the ownership level of data (app-wide, user-specific, session-only).</p>

        <div class="settings-item">
          <label id="scope-form-label">Add New Scope:</label>
          <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm);">
            <input type="text" required id="new-scope-key-input" class="settings-input" placeholder="Key (e.g., global)" style="flex: 1;">
            <input type="text" required id="new-scope-label-input" class="settings-input" placeholder="Display Label (e.g., Global)" style="flex: 1;">
            <button id="add-scope-btn" class="btn-secondary">Add</button>
            <button id="cancel-scope-btn" class="btn-secondary" style="display: none;">Cancel</button>
          </div>
          <div class="input-help">
            <small>Key is used internally, label is shown in forms. If label is empty, key will be auto-capitalized.</small>
          </div>
        </div>

        ${scopes.length > 0 ? `
          <div class="settings-item">
            <label>Existing Scopes:</label>
            <div class="scope-manager">
              ${scopes.map(scope => `
                <div class="scope-item">
                  <div class="scope-details">
                    <span class="scope-key">${escapeHtml(scope)}</span>
                    <span class="scope-label">${escapeHtml(getScopeLabel(scope))}</span>
                  </div>
                  <div class="item-actions">
                    <button class="scope-edit edit-btn btn-compact" data-scope="${escapeHtml(scope)}">Edit</button>
                    <button class="scope-delete delete-btn btn-compact" data-scope="${escapeHtml(scope)}">Remove</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Generate Category Management section.
 */
function generateCategoryManagementSection(): string {
  const categories = getCategories();
  const isCategoriesExpanded = isPanelExpanded('category-management', false);

  return `
    <div class="settings-section">
      <h4 class="collapsible-header" data-target="category-management">
        <span class="expand-icon ${isCategoriesExpanded ? 'expanded' : ''}">${isCategoriesExpanded ? '▼' : '►'}</span>
        Category Management
      </h4>
      <div id="category-management" class="collapsible-content ${isCategoriesExpanded ? 'expanded' : ''}">
        <p class="setting-description">Manage the list of content categories for your DFA cards. These help classify the type of data being tracked.</p>

        <div class="settings-item">
          <label id="category-form-label">Add New Category:</label>
          <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm);">
            <input type="text" required id="new-category-key-input" class="settings-input" placeholder="Key (e.g., ui-state)" style="flex: 1;">
            <input type="text" required id="new-category-label-input" class="settings-input" placeholder="Display Label (e.g., UI State)" style="flex: 1;">
            <button id="add-category-btn" class="btn-secondary">Add</button>
            <button id="cancel-category-btn" class="btn-secondary" style="display: none;">Cancel</button>
          </div>
          <div class="input-help">
            <small>Key is used internally, label is shown in forms. If label is empty, key will be auto-capitalized.</small>
          </div>
        </div>

        ${categories.length > 0 ? `
          <div class="settings-item">
            <label>Existing Categories:</label>
            <div class="category-manager">
              ${categories.map(category => `
                <div class="category-item">
                  <div class="category-details">
                    <span class="category-key">${escapeHtml(category)}</span>
                    <span class="category-label">${escapeHtml(getCategoryLabel(category))}</span>
                  </div>
                  <div class="item-actions">
                    <button class="category-edit edit-btn btn-compact" data-category="${escapeHtml(category)}">Edit</button>
                    <button class="category-delete delete-btn btn-compact" data-category="${escapeHtml(category)}">Remove</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Populate the settings modal content.
 */
export function populateSettingsContent(): void {
  const container = getElement('settings-content');
  if (!container) return;

  const locations = getUniqueLocations();
  const isLocationsExpanded = isPanelExpanded('layer-names', false); // Default to collapsed

  container.innerHTML = `
    <div class="settings-section">
      <h4 class="collapsible-header" data-target="layer-names">
        <span class="expand-icon ${isLocationsExpanded ? 'expanded' : ''}">${isLocationsExpanded ? '▼' : '►'}</span>
        Layer Object Names
      </h4>
      <div id="layer-names" class="collapsible-content ${isLocationsExpanded ? 'expanded' : ''}">
        <p class="setting-description">Manage the list of 'layer object names' for your DFA cards. These will appear as dropdown options when creating or editing cards.</p>

        <div class="settings-item">
          <label id="location-form-label">Add New Location:</label>
          <div style="display: flex; gap: var(--spacing-sm);">
            <input type="text" id="new-location-input" class="settings-input" placeholder="e.g., userStore.profile">
            <button id="add-location-btn" class="btn-secondary">Add</button>
            <button id="cancel-location-btn" class="btn-secondary" style="display: none;">Cancel</button>
          </div>
        </div>

        ${locations.length > 0 ? `
          <div class="settings-item">
            <label>Existing Names:</label>
            <div class="location-manager">
              ${locations.map(location => `
                <div class="location-item">
                  <span class="location-name">${escapeHtml(location)}</span>
                  <div class="item-actions">
                    <button class="location-edit edit-btn btn-compact" data-location="${escapeHtml(location)}">Edit</button>
                    <button class="location-delete delete-btn btn-compact" data-location="${escapeHtml(location)}">Remove</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    ${generateDataLayerManagementSection()}

    ${generateScopeManagementSection()}

    ${generateCategoryManagementSection()}

    <div class="settings-section hidden">
      <h4>General Settings</h4>
      <div class="settings-item">
        <div>
          <label>Auto-save Form Data</label>
          <div class="setting-description">Automatically save form data as you type (coming soon)</div>
        </div>
        <input type="checkbox" disabled>
      </div>

      <div class="settings-item">
        <div>
          <label>Show Field Tooltips</label>
          <div class="setting-description">Display helpful tooltips on form fields (coming soon)</div>
        </div>
        <input type="checkbox" disabled>
      </div>
    </div>

    <div class="settings-section hidden">
      <h4>Tips & Information</h4>
      <div class="settings-item">
        <div>
          <label>Getting Started Guide</label>
          <div class="setting-description">Tips, tricks, and insights on using the Data Flow Atlas.</div>
        </div>
        <button id="show-tips-btn" class="btn-secondary">Show Tips</button>
      </div>
    </div>
  `;

  setupSettingsEventListeners();
  attachEditHandlers(); // Attach edit handlers after content is populated
}

/**
 * Setup event listeners for settings interactions.
 */
function setupSettingsEventListeners(): void {
  // Add new location.
  const addBtn = getElement('add-location-btn');
  const input = getElement<HTMLInputElement>('new-location-input');

  if (addBtn && input) {
    const handleAddOrUpdateLocation = (): void => {
      const value = input.value.trim();

      if (!value) {
        alert('Please provide a location name.');
        return;
      }

      let success = false;
      if (currentEditState && currentEditState.type === 'location') {
        // Edit mode
        success = editLocation(currentEditState.originalKey, value);
        if (success) {
          exitEditMode();
        } else {
          alert('Failed to update location. It may already exist.');
          return;
        }
      } else {
        // Add mode
        addLocation(value);
        input.value = '';
        success = true;
      }

      if (success) {
        populateSettingsContent(); // Refresh the content.
        updateLocationOptions(); // Update main form options.
      }
    };

    addBtn.addEventListener('click', handleAddOrUpdateLocation);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrUpdateLocation();
      }
    });
  }

  // Remove location buttons.
  document.querySelectorAll('.location-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const location = target.getAttribute('data-location');
      if (location) {
        removeLocation(location);
        populateSettingsContent(); // Refresh the content.
        updateLocationOptions(); // Update main form options.
      }
    });
  });

  // Scope management.
  const addScopeBtn = getElement('add-scope-btn');
  const scopeKeyInput = getElement<HTMLInputElement>('new-scope-key-input');
  const scopeLabelInput = getElement<HTMLInputElement>('new-scope-label-input');

  if (addScopeBtn && scopeKeyInput && scopeLabelInput) {
    const handleAddOrUpdateScope = (): void => {
      const key = scopeKeyInput.value.trim();
      const label = scopeLabelInput.value.trim();

      if (!key) {
        alert('Please provide a key for the scope.');
        return;
      }

      let success = false;
      if (currentEditState && currentEditState.type === 'scope') {
        // Edit mode - only update the label, keep the original key
        success = editScope(currentEditState.originalKey, currentEditState.originalKey, label);
        if (success) {
          exitEditMode();
        } else {
          alert('Failed to update scope.');
          return;
        }
      } else {
        // Add mode
        addScopeWithLabel(key, label);
        scopeKeyInput.value = '';
        scopeLabelInput.value = '';
        success = true;
      }

      if (success) {
        populateSettingsContent(); // Refresh the content.
        updateScopeOptions(); // Update main form scope options.
      }
    };

    addScopeBtn.addEventListener('click', handleAddOrUpdateScope);
    scopeKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrUpdateScope();
      }
    });
    scopeLabelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrUpdateScope();
      }
    });
  }

  // Remove scope buttons.
  document.querySelectorAll('.scope-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const scope = target.getAttribute('data-scope');
      if (scope) {
        removeScope(scope);
        populateSettingsContent(); // Refresh the content.
        updateScopeOptions(); // Update main form scope options.
      }
    });
  });

  // Category management.
  const addCategoryBtn = getElement('add-category-btn');
  const categoryKeyInput = getElement<HTMLInputElement>('new-category-key-input');
  const categoryLabelInput = getElement<HTMLInputElement>('new-category-label-input');

  if (addCategoryBtn && categoryKeyInput && categoryLabelInput) {
    const handleAddOrUpdateCategory = (): void => {
      const key = categoryKeyInput.value.trim();
      const label = categoryLabelInput.value.trim();

      if (!key) {
        alert('Please provide a key for the category.');
        return;
      }

      let success = false;
      if (currentEditState && currentEditState.type === 'category') {
        // Edit mode - only update the label, keep the original key
        success = editCategory(currentEditState.originalKey, currentEditState.originalKey, label);
        if (success) {
          exitEditMode();
        } else {
          alert('Failed to update category.');
          return;
        }
      } else {
        // Add mode
        addCategoryWithLabel(key, label);
        categoryKeyInput.value = '';
        categoryLabelInput.value = '';
        success = true;
      }

      if (success) {
        populateSettingsContent(); // Refresh the content.
        updateCategoryOptions(); // Update main form category options.
      }
    };

    addCategoryBtn.addEventListener('click', handleAddOrUpdateCategory);
    categoryKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrUpdateCategory();
      }
    });
    categoryLabelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrUpdateCategory();
      }
    });
  }

  // Remove category buttons.
  document.querySelectorAll('.category-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const category = target.getAttribute('data-category');
      if (category) {
        removeCategory(category);
        populateSettingsContent(); // Refresh the content.
        updateCategoryOptions(); // Update main form category options.
      }
    });
  });

  // Data layer management.
  const addLayerBtn = getElement('add-layer-btn');
  const layerNameInput = getElement<HTMLInputElement>('new-layer-name-input');
  const layerTypeSelect = getElement<HTMLSelectElement>('new-layer-type-select');

  if (addLayerBtn && layerNameInput && layerTypeSelect) {
    const handleAddLayer = (): void => {
      const name = layerNameInput.value.trim();
      const type = layerTypeSelect.value as DataLayerType;

      if (!name || !type) {
        alert('Please fill in all fields for the new data layer.');
        return;
      }

      const id = generateLayerId(name);
      if (dataLayerExists(id)) {
        alert(`A data layer with this name already exists. Please choose a different name.`);
        return;
      }

      const layer: DataLayer = { name, id, type };
      saveDataLayer(layer);

      // Update dropdowns in real-time
      updateLayerOptions();
      updateLayerFilterOptions();
      updateConnectionOptions();

      // Clear inputs
      layerNameInput.value = '';
      layerTypeSelect.value = '';

      // Refresh the settings panel
      populateSettingsContent();
    };

    addLayerBtn.addEventListener('click', handleAddLayer);
  }

  // Edit/Delete layer buttons.
  document.querySelectorAll('.layer-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const layerId = target.getAttribute('data-layer-id');
      if (layerId) {
        handleEditDataLayer(layerId);
      }
    });
  });

  document.querySelectorAll('.layer-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const layerId = target.getAttribute('data-layer-id');
      if (layerId) {
        handleDeleteDataLayer(layerId);
      }
    });
  });

  // Collapsible sections
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const targetId = target.getAttribute('data-target') || target.parentElement?.getAttribute('data-target');
      if (targetId) {
        toggleCollapsibleSection(targetId);
      }
    });
  });

  // Tips button.
  const tipsBtn = getElement('show-tips-btn');
  if (tipsBtn) {
    tipsBtn.addEventListener('click', () => {
      // TODO: Implement tips modal.
      alert('Tips modal coming soon!');
    });
  }
}

/**
 * Toggle collapsible section and save state.
 */
function toggleCollapsibleSection(sectionId: string): void {
  const content = document.getElementById(sectionId);
  const header = document.querySelector(`[data-target="${sectionId}"]`);
  const icon = header?.querySelector('.expand-icon');

  if (!content || !header || !icon) return;

  const isExpanded = content.classList.contains('expanded');

  if (isExpanded) {
    content.classList.remove('expanded');
    icon.classList.remove('expanded');
    icon.textContent = '►';
    setPanelExpanded(sectionId, false);
  } else {
    content.classList.add('expanded');
    icon.classList.add('expanded');
    icon.textContent = '▼';
    setPanelExpanded(sectionId, true);
  }
}

/**
 * Handle editing a data layer.
 */
function handleEditDataLayer(layerId: string): void {
  const { endpoints, throughpoints } = getDataLayersByType();
  const layer = [...endpoints, ...throughpoints].find(l => l.id === layerId);

  if (!layer) return;

  const newName = prompt(`Edit layer name:`, layer.name);
  if (newName === null || !newName.trim()) return; // User cancelled or empty

  // Anything that starts with a 't' will be a throughpoint.
  // Everything else will be an endpoint.
  const newTypePrompt = prompt(`Layer type ['e'ndpoint / 't'hroughpoint]:`, layer.type.charAt(0));
  if (newTypePrompt === null) return; // User cancelled
  const newType = newTypePrompt.trim().toLowerCase().startsWith('t') ? 'throughpoint' : 'endpoint';
  if (newType !== 'endpoint' && newType !== 'throughpoint') {
    if (newType !== null) {
      alert('Type must be either "e", "t", "endpoint" or "throughpoint"');
    }
    return;
  }

  const newId = generateLayerId(newName.trim());
  if (newId !== layer.id && dataLayerExists(newId)) {
    alert(`A data layer with this name already exists. Please choose a different name.`);
    return;
  }

  const updatedLayer: DataLayer = {
    name: newName.trim(),
    id: newId,
    type: newType as DataLayerType,
  };

  saveDataLayer(updatedLayer, layer.id);

  // Update dropdowns in real-time
  updateLayerOptions();
  updateLayerFilterOptions();
  updateConnectionOptions();

  // Refresh the settings panel
  populateSettingsContent();
}

/**
 * Handle deleting a data layer.
 */
function handleDeleteDataLayer(layerId: string): void {
  const { endpoints, throughpoints } = getDataLayersByType();
  const layer = [...endpoints, ...throughpoints].find(l => l.id === layerId);

  if (!layer) return;

  if (confirm(`Delete data layer "${layer.name}"?`)) {
    deleteDataLayer(layerId);

    // Update dropdowns in real-time
    updateLayerOptions();
    updateLayerFilterOptions();
    updateConnectionOptions();

    // Refresh the settings panel
    populateSettingsContent();
  }
}/**
 * Initialize settings panel functionality.
 */
export function initializeSettingsPanel(): void {
  // Settings modal event listeners.
  const modal = getElement('settings-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.id === 'settings-modal' ||
        target.classList.contains('modal-close') ||
        target.classList.contains('modal-cancel')
      ) {
        closeSettingsModal();
      }
    });
  }

  // Save button.
  const saveBtn = getElement('settings-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      closeSettingsModal();
      // Settings are saved in real-time, so we just need to close the modal.
      // In the future, we could trigger a UI refresh here if needed.
    });
  }

  // Settings navigation button.
  const settingsNavBtn = getElement('nav-settings');
  if (settingsNavBtn) {
    settingsNavBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSettingsModal();
    });
  }
}

// Track editing state
let currentEditState: {
  type: 'scope' | 'category' | 'location';
  originalKey: string;
} | null = null;

/**
 * Enter edit mode for an item by populating the form fields.
 */
function enterEditMode(type: 'scope' | 'category' | 'location', key: string, label?: string): void {
  currentEditState = { type, originalKey: key };

  if (type === 'scope') {
    const keyInput = getElement<HTMLInputElement>('new-scope-key-input');
    const labelInput = getElement<HTMLInputElement>('new-scope-label-input');
    const addBtn = getElement('add-scope-btn');
    const cancelBtn = getElement('cancel-scope-btn');
    const formLabel = getElement('scope-form-label');

    if (keyInput && labelInput && addBtn && cancelBtn && formLabel) {
      keyInput.value = key;
      keyInput.disabled = true; // Disable key editing
      labelInput.value = label || '';
      addBtn.textContent = 'Update';
      addBtn.className = 'btn-primary';
      cancelBtn.style.display = 'inline-block';
      formLabel.textContent = 'Edit Scope:';
      labelInput.focus(); // Focus on label since key is disabled
    }
  } else if (type === 'category') {
    const keyInput = getElement<HTMLInputElement>('new-category-key-input');
    const labelInput = getElement<HTMLInputElement>('new-category-label-input');
    const addBtn = getElement('add-category-btn');
    const cancelBtn = getElement('cancel-category-btn');
    const formLabel = getElement('category-form-label');

    if (keyInput && labelInput && addBtn && cancelBtn && formLabel) {
      keyInput.value = key;
      keyInput.disabled = true; // Disable key editing
      labelInput.value = label || '';
      addBtn.textContent = 'Update';
      addBtn.className = 'btn-primary';
      cancelBtn.style.display = 'inline-block';
      formLabel.textContent = 'Edit Category:';
      labelInput.focus(); // Focus on label since key is disabled
    }
  } else if (type === 'location') {
    const input = getElement<HTMLInputElement>('new-location-input');
    const addBtn = getElement('add-location-btn');
    const cancelBtn = getElement('cancel-location-btn');
    const formLabel = getElement('location-form-label');

    if (input && addBtn && cancelBtn && formLabel) {
      input.value = key;
      addBtn.textContent = 'Update';
      addBtn.className = 'btn-primary';
      cancelBtn.style.display = 'inline-block';
      formLabel.textContent = 'Edit Location:';
      input.focus();
    }
  }
}

/**
 * Exit edit mode and reset form to add mode.
 */
function exitEditMode(): void {
  currentEditState = null;

  // Reset scope form
  const scopeKeyInput = getElement<HTMLInputElement>('new-scope-key-input');
  const scopeLabelInput = getElement<HTMLInputElement>('new-scope-label-input');
  const scopeAddBtn = getElement('add-scope-btn');
  const scopeCancelBtn = getElement('cancel-scope-btn');
  const scopeFormLabel = getElement('scope-form-label');

  if (scopeKeyInput && scopeLabelInput && scopeAddBtn && scopeCancelBtn && scopeFormLabel) {
    scopeKeyInput.value = '';
    scopeKeyInput.disabled = false; // Re-enable key input
    scopeLabelInput.value = '';
    scopeAddBtn.textContent = 'Add';
    scopeAddBtn.className = 'btn-secondary';
    scopeCancelBtn.style.display = 'none';
    scopeFormLabel.textContent = 'Add New Scope:';
  }

  // Reset category form
  const categoryKeyInput = getElement<HTMLInputElement>('new-category-key-input');
  const categoryLabelInput = getElement<HTMLInputElement>('new-category-label-input');
  const categoryAddBtn = getElement('add-category-btn');
  const categoryCancelBtn = getElement('cancel-category-btn');
  const categoryFormLabel = getElement('category-form-label');

  if (categoryKeyInput && categoryLabelInput && categoryAddBtn && categoryCancelBtn && categoryFormLabel) {
    categoryKeyInput.value = '';
    categoryKeyInput.disabled = false; // Re-enable key input
    categoryLabelInput.value = '';
    categoryAddBtn.textContent = 'Add';
    categoryAddBtn.className = 'btn-secondary';
    categoryCancelBtn.style.display = 'none';
    categoryFormLabel.textContent = 'Add New Category:';
  }

  // Reset location form
  const locationInput = getElement<HTMLInputElement>('new-location-input');
  const locationAddBtn = getElement('add-location-btn');
  const locationCancelBtn = getElement('cancel-location-btn');
  const locationFormLabel = getElement('location-form-label');

  if (locationInput && locationAddBtn && locationCancelBtn && locationFormLabel) {
    locationInput.value = '';
    locationAddBtn.textContent = 'Add';
    locationAddBtn.className = 'btn-secondary';
    locationCancelBtn.style.display = 'none';
    locationFormLabel.textContent = 'Add New Location:';
  }
}/**
 * Attach edit event handlers for all types.
 */
function attachEditHandlers(): void {
  // Scope edit handlers
  document.querySelectorAll('.scope-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const scope = target.getAttribute('data-scope');
      if (scope) {
        const currentLabel = getScopeLabel(scope);
        enterEditMode('scope', scope, currentLabel);
      }
    });
  });

  // Category edit handlers
  document.querySelectorAll('.category-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const category = target.getAttribute('data-category');
      if (category) {
        const currentLabel = getCategoryLabel(category);
        enterEditMode('category', category, currentLabel);
      }
    });
  });

  // Location edit handlers
  document.querySelectorAll('.location-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const location = target.getAttribute('data-location');
      if (location) {
        enterEditMode('location', location);
      }
    });
  });

  // Cancel button handlers
  const scopeCancelBtn = getElement('cancel-scope-btn');
  if (scopeCancelBtn) {
    scopeCancelBtn.addEventListener('click', exitEditMode);
  }

  const categoryCancelBtn = getElement('cancel-category-btn');
  if (categoryCancelBtn) {
    categoryCancelBtn.addEventListener('click', exitEditMode);
  }

  const locationCancelBtn = getElement('cancel-location-btn');
  if (locationCancelBtn) {
    locationCancelBtn.addEventListener('click', exitEditMode);
  }
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

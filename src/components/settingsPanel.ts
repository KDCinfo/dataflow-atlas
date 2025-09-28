import {
  getUniqueLocations,
  addLocationWithLabel,
  removeLocation,
  editLocation,
  getLocationLabel,
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
import {
  validateAtlasName,
  createAtlas,
  deleteAtlas,
  renameAtlas,
  getAtlasInfoList,
  getActiveAtlas,
  setActiveAtlas,
  initializeDefaultAtlas,
  restoreFromBackup,
  hasActiveBackup
} from '../utils/atlasManagerOptimized.js';
import AppConstants from '../utils/appConstants.js';

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
 * Generate the atlas management section HTML.
 */
function generateAtlasManagementSection(): string {
  // For now, we'll import them dynamically to avoid circular dependencies
  // Import atlas management functions at the top level.

  const isExpanded = isPanelExpanded('atlas-management', true); // Default to expanded

  return `
    <div class="settings-section">
      <h4 class="collapsible-header" data-target="atlas-management">
        <span class="expand-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '►'}</span>
        Atlas Management
      </h4>
      <div id="atlas-management" class="collapsible-content storage-buttons-modal ${isExpanded ? 'expanded' : ''}">
        <p class="setting-description">Create, rename, and manage multiple atlas instances. Each atlas stores its own set of DFA cards independently.</p>

        <div class="settings-item">
          <label id="atlas-form-label">Create New Atlas:</label>
          <div class="settings-flex-row storage-create-name-modal">
            <input type="text" required id="new-atlas-name-input" class="storage-new-name-input settings-input settings-flex-item" placeholder="my_project or myProject">
            <span style="position: relative;">
              <button disabled id="create-atlas-btn" class="btn-primary storage-new-name-button" title="Please provide an atlas name.">Create</button>
              <span id="create-atlas-help-icon" class="help-icon-overlay" style="display: none;" title="Atlas name format help">ⓘ</span>
            </span>
            <button id="cancel-atlas-btn" class="btn-secondary settings-hidden-btn">Cancel</button>
          </div>
          <div class="input-help full-width text-right">
            <small>Atlas names must use either <code>snake_case</code> or <code>camelCase</code>.</small>
          </div>
        </div>

        <div class="settings-item hidden">
          <label>Auto-Backup:</label>
          <div class="settings-flex-row">
            <button id="restore-backup-btn" class="btn-danger" disabled title="No backup available for the active atlas">
              Restore Auto-Backup
            </button>
          </div>
          <div class="input-help full-width text-right">
            <small>A backup is performed automatically each time a card is added or edited. This will overwrite <span class="no-wrap">the currently active atlas.</span></small>
          </div>
        </div>

        <div class="settings-item settings-item-column">
          <label class="full-width">Existing Atlases:<span id="storage-capacity" class="settings-item-label-right font-small muted"></span></label>
          <div id="atlas-list-container" class="atlas-manager">
            <!-- Atlas list will be populated by JavaScript -->
          </div>
        </div>
      </div>
    </div>
  `;
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
            <input type="text" id="new-layer-name-input" class="settings-input" placeholder="Display name ('Pinia Store')" title="Display name (e.g., 'Pinia Store')">
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
          <div class="settings-flex-row">
            <input type="text" required id="new-scope-key-input" class="settings-input settings-flex-item" placeholder="Key (global)" title="Key (e.g., global)">
            <input type="text" required id="new-scope-label-input" class="settings-input settings-flex-item" placeholder="Display Label (Global)" title="Display Label (e.g., Global)">
            <button id="add-scope-btn" class="btn-secondary">Add</button>
            <button id="cancel-scope-btn" class="btn-secondary settings-hidden-btn">Cancel</button>
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
          <div class="settings-flex-row">
            <input type="text" required id="new-category-key-input" class="settings-input settings-flex-item" placeholder="Key (ui-state)" title="Key (e.g., ui-state)">
            <input type="text" required id="new-category-label-input" class="settings-input settings-flex-item" placeholder="Display Label (UI State)" title="Display Label (e.g., UI State)">
            <button id="add-category-btn" class="btn-secondary">Add</button>
            <button id="cancel-category-btn" class="btn-secondary settings-hidden-btn">Cancel</button>
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
    ${generateAtlasManagementSection()}

    <div class="settings-section">
      <h4 class="collapsible-header" data-target="layer-names">
        <span class="expand-icon ${isLocationsExpanded ? 'expanded' : ''}">${isLocationsExpanded ? '▼' : '►'}</span>
        Layer Names
      </h4>
      <div id="layer-names" class="collapsible-content ${isLocationsExpanded ? 'expanded' : ''}">
        <p class="setting-description">Manage the list of 'layer names' (data locations) for your DFA cards. These will appear as dropdown options when creating or editing cards.</p>

        <div class="settings-item">
          <label id="location-form-label">Add New Location:</label>
          <div class="settings-flex-row">
            <input type="text" required id="new-location-key-input" class="settings-input settings-flex-item" placeholder="Key (userStore)" title="Key (e.g., user-store)">
            <input type="text" required id="new-location-label-input" class="settings-input settings-flex-item" placeholder="Display Label (User Store)" title="Display Label (e.g., User Store)">
            <button id="add-location-btn" class="btn-secondary">Add</button>
            <button id="cancel-location-btn" class="btn-secondary settings-hidden-btn">Cancel</button>
          </div>
          <div class="input-help">
            <small>Key is used internally, label is shown in forms. If label is empty, key will be auto-capitalized.</small>
          </div>
        </div>

        ${locations.length > 0 ? `
          <div class="settings-item">
            <label>Existing Names:</label>
            <div class="location-manager">
              ${locations.map(location => `
                <div class="location-item">
                  <div class="location-details">
                    <span class="location-key">${escapeHtml(location)}</span>
                    <span class="location-label">${escapeHtml(getLocationLabel(location))}</span>
                  </div>
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
  // Location management.
  const addLocationBtn = getElement('add-location-btn');
  const locationKeyInput = getElement<HTMLInputElement>('new-location-key-input');
  const locationLabelInput = getElement<HTMLInputElement>('new-location-label-input');

  if (addLocationBtn && locationKeyInput && locationLabelInput) {
    const handleAddOrUpdateLocation = (): void => {
      const key = locationKeyInput.value.trim();
      const label = locationLabelInput.value.trim();

      if (!key) {
        alert('Please provide a key for the location.');
        return;
      }

      let success = false;
      if (currentEditState && currentEditState.type === 'location') {
        // Edit mode - only update the label, keep the original key
        success = editLocation(currentEditState.originalKey, label);
        if (success) {
          exitEditMode();
        } else {
          alert('Failed to update location.');
          return;
        }
      } else {
        // Add mode
        addLocationWithLabel(key, label);
        locationKeyInput.value = '';
        locationLabelInput.value = '';
        success = true;
      }

      if (success) {
        populateSettingsContent(); // Refresh the content.
        updateLocationOptions(); // Update main form options.
      }
    };

    addLocationBtn.addEventListener('click', handleAddOrUpdateLocation);
    locationKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddOrUpdateLocation();
      }
    });
    locationLabelInput.addEventListener('keypress', (e) => {
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

  // Atlas Management Handlers
  setupAtlasManagementHandlers();

  // Initialize atlas list and name selector
  refreshAtlasList();
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
  type: 'scope' | 'category' | 'location' | 'atlas';
  originalKey: string;
} | null = null;

/**
 * Enter edit mode for an item by populating the form fields.
 */
function enterEditMode(type: 'scope' | 'category' | 'location' | 'atlas', key: string, label?: string): void {
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
      cancelBtn.classList.remove('settings-hidden-btn');
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
      cancelBtn.classList.remove('settings-hidden-btn');
      formLabel.textContent = 'Edit Category:';
      labelInput.focus(); // Focus on label since key is disabled
    }
  } else if (type === 'location') {
    const keyInput = getElement<HTMLInputElement>('new-location-key-input');
    const labelInput = getElement<HTMLInputElement>('new-location-label-input');
    const addBtn = getElement('add-location-btn');
    const cancelBtn = getElement('cancel-location-btn');
    const formLabel = getElement('location-form-label');

    if (keyInput && labelInput && addBtn && cancelBtn && formLabel) {
      keyInput.value = key;
      keyInput.disabled = true; // Disable key editing
      labelInput.value = label || '';
      addBtn.textContent = 'Update';
      addBtn.className = 'btn-primary';
      cancelBtn.classList.remove('settings-hidden-btn');
      formLabel.textContent = 'Edit Location:';
      labelInput.focus(); // Focus on label since key is disabled
    }
  } else if (type === 'atlas') {
    const nameInput = getElement<HTMLInputElement>('new-atlas-name-input');
    const createBtn = getElement('create-atlas-btn');
    const cancelBtn = getElement('cancel-atlas-btn');
    const formLabel = getElement('atlas-form-label');

    if (nameInput && createBtn && cancelBtn && formLabel) {
      nameInput.value = key;
      createBtn.textContent = 'Update';
      createBtn.className = 'btn-primary';
      cancelBtn.classList.remove('settings-hidden-btn');
      formLabel.textContent = 'Edit Atlas Name:';
      nameInput.focus();
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
    scopeCancelBtn.classList.add('settings-hidden-btn');
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
    categoryCancelBtn.classList.add('settings-hidden-btn');
    categoryFormLabel.textContent = 'Add New Category:';
  }

  // Reset location form
  const locationKeyInput = getElement<HTMLInputElement>('new-location-key-input');
  const locationLabelInput = getElement<HTMLInputElement>('new-location-label-input');
  const locationAddBtn = getElement('add-location-btn');
  const locationCancelBtn = getElement('cancel-location-btn');
  const locationFormLabel = getElement('location-form-label');

  if (locationKeyInput && locationLabelInput && locationAddBtn && locationCancelBtn && locationFormLabel) {
    locationKeyInput.value = '';
    locationKeyInput.disabled = false; // Re-enable key input
    locationLabelInput.value = '';
    locationAddBtn.textContent = 'Add';
    locationAddBtn.className = 'btn-secondary';
    locationCancelBtn.classList.add('settings-hidden-btn');
    locationFormLabel.textContent = 'Add New Location:';
  }

  // Reset atlas form
  const atlasNameInput = getElement<HTMLInputElement>('new-atlas-name-input');
  const atlasCreateBtn = getElement('create-atlas-btn');
  const atlasCancelBtn = getElement('cancel-atlas-btn');
  const atlasFormLabel = getElement('atlas-form-label');

  if (atlasNameInput && atlasCreateBtn && atlasCancelBtn && atlasFormLabel) {
    atlasNameInput.value = '';
    atlasCreateBtn.textContent = 'Create';
    atlasCreateBtn.className = 'btn-primary';
    atlasCancelBtn.classList.add('settings-hidden-btn');
    atlasFormLabel.textContent = 'Create New Atlas:';
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
        const currentLabel = getLocationLabel(location);
        enterEditMode('location', location, currentLabel);
      }
    });
  });

  // Atlas edit handlers
  document.querySelectorAll('.atlas-rename-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const atlasName = target.getAttribute('data-atlas-name');
      if (atlasName) {
        // Prevent renaming default atlas
        if (atlasName === 'default') {
          alert('Cannot rename the default atlas.');
          return;
        }

        // Prevent renaming active atlas
        const activeAtlas = getActiveAtlas();
        if (atlasName === activeAtlas) {
          alert('Cannot rename the currently active atlas.');
          return;
        }

        enterEditMode('atlas', atlasName);
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

  const atlasCancelBtn = getElement('cancel-atlas-btn');
  if (atlasCancelBtn) {
    atlasCancelBtn.addEventListener('click', exitEditMode);
  }
}

/**
 * Update the backup button state based on whether active atlas has backup.
 */
export function updateBackupButtonState(): void {
  const hasBackup = hasActiveBackup();
  const activeAtlas = getActiveAtlas();

  // Update settings panel button
  const restoreBackupBtn = document.getElementById('restore-backup-btn') as HTMLButtonElement;
  if (restoreBackupBtn) {
    restoreBackupBtn.disabled = !hasBackup;
    restoreBackupBtn.title = hasBackup
      ? `Restore ${activeAtlas} from auto-backup`
      : 'No backup available for the active atlas';
  }

  // Update main page button
  const manageRestoreBackupBtn = document.getElementById('manage-restore-backup-btn') as HTMLButtonElement;
  if (manageRestoreBackupBtn) {
    manageRestoreBackupBtn.disabled = !hasBackup;
    manageRestoreBackupBtn.title = hasBackup
      ? `Restore ${activeAtlas} from auto-backup`
      : 'No backup available for the active atlas';
  }
}

/**
 * Setup event handlers for atlas management.
 */
async function setupAtlasManagementHandlers(): Promise<void> {
  // Create Atlas Form - fix element ID to match HTML
  const createAtlasBtn = document.getElementById('create-atlas-btn') as HTMLButtonElement;
  const atlasNameInput = document.getElementById('new-atlas-name-input') as HTMLInputElement;

  if (createAtlasBtn && atlasNameInput) {
    const handleCreateOrUpdateAtlas = () => {
      const name = atlasNameInput.value.trim();
      const validation = validateAtlasName(name);

      if (!validation.valid) {
        // Button should already be disabled, but show alert anyway
        alert(validation.error || 'Invalid atlas name.');
        return;
      }

      try {
        let success = false;

        if (currentEditState && currentEditState.type === 'atlas') {
          // Update mode
          success = renameAtlas(currentEditState.originalKey, name);
          if (success) {
            exitEditMode();
            refreshAtlasList();
            // Refresh the main atlas selector if we're on the main page
            if (window.location.pathname.includes('app') && (window as any).app) {
              (window as any).app.refreshAtlasSelector();
            }
            alert(`Atlas renamed to "${name}" successfully!`);
          } else {
            alert('Failed to rename atlas.');
          }
        } else {
          // Create mode
          success = createAtlas(name);
          if (success) {
            atlasNameInput.value = '';
            updateAtlasButtonStates(); // Reset button states after clearing input
            refreshAtlasList();
            // Refresh the main atlas selector if we're on the main page
            if (window.location.pathname.includes('app') && (window as any).app) {
              (window as any).app.refreshAtlasSelector();
            }
            alert(`Atlas "${name}" created successfully!`);
          } else {
            alert('Failed to create atlas.');
          }
        }
      } catch (error) {
        console.error('Error creating/updating atlas:', error);
        alert('Failed to create/update atlas.');
      }
    };

    // Real-time button state management (following AppSettings.js pattern)
    const updateAtlasButtonStates = () => {
      const inputValue = atlasNameInput.value.trim();
      const validation = validateAtlasName(inputValue);
      const helpIcon = document.getElementById('create-atlas-help-icon');

      // Apply validation styling to input
      if (inputValue === '') {
        atlasNameInput.classList.remove('valid', 'invalid');
      } else if (validation.valid) {
        atlasNameInput.classList.remove('invalid');
        atlasNameInput.classList.add('valid');
      } else {
        atlasNameInput.classList.remove('valid');
        atlasNameInput.classList.add('invalid');
      }

      // Update button state, tooltip, and help icon visibility
      if (inputValue === '') {
        createAtlasBtn.disabled = true;
        atlasNameInput.title = AppConstants.atlasNameErrTextNameEmpty;
        createAtlasBtn.title = AppConstants.atlasNameErrTextNameEmpty;
        if (helpIcon) {
          helpIcon.title = AppConstants.atlasNameErrTextNameEmpty;
          helpIcon.style.display = 'inline';
        }
      } else if (!validation.valid) {
        createAtlasBtn.disabled = true;
        atlasNameInput.title = validation.error || 'Invalid atlas name';
        createAtlasBtn.title = validation.error || 'Invalid atlas name';
        if (helpIcon) {
          helpIcon.title = validation.error || 'Invalid atlas name';
          helpIcon.style.display = 'inline';
        }
      } else {
        createAtlasBtn.disabled = false;
        atlasNameInput.title = '';
        createAtlasBtn.title = '';
        if (helpIcon) {
          helpIcon.title = '';
          helpIcon.style.display = 'none';
        }
      }
    };    // Input event listener (like AppSettings newStorageNameInput)
    atlasNameInput.addEventListener('input', updateAtlasButtonStates);

    // Enter key handler
    atlasNameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!createAtlasBtn.disabled) {
          handleCreateOrUpdateAtlas();
        }
      }
    });

    // Click handler
    createAtlasBtn.addEventListener('click', handleCreateOrUpdateAtlas);

    // Initial button state
    updateAtlasButtonStates();
  }

  // Restore Backup Button Handler
  const restoreBackupBtn = document.getElementById('restore-backup-btn') as HTMLButtonElement;
  if (restoreBackupBtn) {
    restoreBackupBtn.addEventListener('click', () => {
      const backupWarning = `\n!!! WARNING !!! All current data WILL BE REPLACED!
            \nActive atlas: ${getActiveAtlas()}
            \nThis will restore from the auto-backup created before your last edit.
            \nYou can also consider using the import/export options.\n`;

      if (confirm(backupWarning)) {
        try {
          const success = restoreFromBackup();
          if (success) {
            refreshAtlasList();
            updateBackupButtonState();
            // Refresh the main atlas view if we're on the main page
            if (window.location.pathname.includes('app') && (window as any).app) {
              (window as any).app.renderAtlas();
              (window as any).app.updateStats();
              (window as any).app.refreshAtlasSelector();
            }
            alert('Atlas restored from backup successfully!');
          } else {
            alert('Failed to restore from backup. No backup available.');
          }
        } catch (error) {
          console.error('Error restoring backup:', error);
          alert('Failed to restore from backup.');
        }
      }
    });
  }

  const storageCapacity = document.getElementById('storage-capacity') as HTMLSpanElement;
  if (storageCapacity) {
    const { usageMB, limitMB, percent, keysLength } = await AppConstants.getLocalStorageUsage();
    const localUsage = usageMB.toFixed(2);
    const localRemaining = limitMB.toFixed(2);
    const localPercent = percent.toFixed(0);
    storageCapacity.innerHTML = `localStorage [${keysLength}] | Usage (MB): ${localUsage} | <span class="no-wrap">Remaining: ${localRemaining} | ${localPercent}%</span>`;
  }

  // Initialize default atlas and refresh list
  console.log('[Atlas] Initializing atlas management...');
  initializeDefaultAtlas();

  // Debug: Check if elements exist
  console.log('[Atlas] Create button found:', !!createAtlasBtn);
  console.log('[Atlas] Input found:', !!atlasNameInput);
  console.log('[Atlas] List container exists:', !!document.getElementById('atlas-list-container'));

  // Add a small delay to ensure initialization is complete
  setTimeout(() => {
    console.log('[Atlas] Refreshing atlas list...');
    refreshAtlasList();
  }, 100);
}



/**
 * Refresh the atlas list display.
 */
function refreshAtlasList(): void {
  const listContainer = document.getElementById('atlas-list-container');
  if (!listContainer) {
    console.warn('[Settings] Atlas list container not found');
    return;
  }

  const atlases = getAtlasInfoList();
  const activeAtlas = getActiveAtlas();

  console.log('[Settings] Refreshing atlas list:', { atlases, activeAtlas });

  if (atlases.length === 0) {
    console.warn('[Settings] No atlases found, initializing default');
    initializeDefaultAtlas();
    // Try again after initialization
    const retryAtlases = getAtlasInfoList();
    if (retryAtlases.length === 0) {
      listContainer.innerHTML = '<p class="empty-atlas-list">No atlases found. Try refreshing the page.</p>';
      return;
    } else {
      // Use the retry results
      console.log('[Settings] Found atlases after initialization:', retryAtlases);
      renderAtlasList(retryAtlases, activeAtlas, listContainer);
      return;
    }
  }

  renderAtlasList(atlases, activeAtlas, listContainer);
}

function renderAtlasList(atlases: any[], activeAtlas: string, listContainer: HTMLElement): void {

  const atlasItems = atlases.map(atlas => {
    const isActive = atlas.name === activeAtlas;
    const isDefault = atlas.name === 'default';
    const activeClass = isActive ? 'active-atlas' : '';
    const lastModified = atlas.lastModified
      ? new Date(atlas.lastModified).toLocaleDateString()
      : 'Unknown';

    // Determine which buttons to show
    const showActivate = !isActive;
    const showRename = !isDefault && !isActive;
    const showDelete = !isDefault && !isActive;

    return `
      <div class="atlas-item ${activeClass}" data-atlas-name="${escapeHtml(atlas.name)}">
        <div class="atlas-details">
          <div class="atlas-name">${escapeHtml(atlas.name)}</div>
          <div class="atlas-meta">${atlas.cardCount} cards • Modified: ${lastModified}</div>
        </div>
        <div class="atlas-actions">
          <button class="btn btn-sm atlas-copy-name-btn" data-atlas-name="${escapeHtml(atlas.name)}" title="Copy atlas name to input field">📋</button>
          ${showActivate ? `<button class="btn btn-sm atlas-activate-btn" data-atlas-name="${escapeHtml(atlas.name)}">Activate</button>` : ''}
          ${showRename ? `<button class="btn btn-sm atlas-rename-btn" data-atlas-name="${escapeHtml(atlas.name)}">Rename</button>` : ''}
          ${showDelete ? `<button class="btn btn-sm btn-danger atlas-delete-btn" data-atlas-name="${escapeHtml(atlas.name)}">Delete</button>` : ''}
          ${isActive ? '<span class="atlas-status">Current</span>' : ''}
          ${isDefault && !isActive ? '<span class="atlas-status">Default</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  listContainer.innerHTML = atlasItems;

  // Attach event handlers for atlas actions
  attachAtlasActionHandlers();

  // Attach edit handlers for rename buttons
  attachEditHandlers();

  // Update backup button state
  updateBackupButtonState();
}

/**
 * Attach event handlers for atlas action buttons.
 */
function attachAtlasActionHandlers(): void {
  // Copy name buttons
  document.querySelectorAll('.atlas-copy-name-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const atlasName = (e.target as HTMLElement).getAttribute('data-atlas-name');
      if (atlasName) {
        handleCopyAtlasName(atlasName);
      }
    });
  });

  // Activate buttons
  document.querySelectorAll('.atlas-activate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const atlasName = (e.target as HTMLElement).getAttribute('data-atlas-name');
      if (atlasName) {
        handleActivateAtlas(atlasName);
      }
    });
  });



  // Delete buttons
  document.querySelectorAll('.atlas-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const atlasName = (e.target as HTMLElement).getAttribute('data-atlas-name');
      if (atlasName) {
        handleDeleteAtlas(atlasName);
      }
    });
  });
}

/**
 * Handle copying atlas name to input field.
 */
function handleCopyAtlasName(atlasName: string): void {
  const atlasNameInput = document.getElementById('new-atlas-name-input') as HTMLInputElement;
  if (atlasNameInput) {
    atlasNameInput.value = atlasName;
    atlasNameInput.focus();

    // Trigger validation update by calling the update function if it exists
    // We need to call the updateAtlasButtonStates function from setupAtlasManagementHandlers
    const event = new Event('input', { bubbles: true });
    atlasNameInput.dispatchEvent(event);
  }
}

/**
 * Handle atlas activation.
 */
function handleActivateAtlas(atlasName: string): void {
  if (confirm(`Switch to atlas "${atlasName}"? This will reload the page.`)) {
    setActiveAtlas(atlasName);
    window.location.reload();
  }
}


/**
 * Handle atlas deletion.
 */
function handleDeleteAtlas(atlasName: string): void {
  // Prevent deleting default atlas
  if (atlasName === 'default') {
    alert('Cannot delete the default atlas.');
    return;
  }

  // Prevent deleting active atlas
  const activeAtlas = getActiveAtlas();
  if (atlasName === activeAtlas) {
    alert('Cannot delete the currently active atlas.');
    return;
  }

  if (confirm(`Are you sure you want to delete atlas "${atlasName}"? This action cannot be undone.`)) {
    try {
      const success = deleteAtlas(atlasName);
      if (success) {
        refreshAtlasList();
        // Refresh the main atlas selector if we're on the main page
        if (window.location.pathname.includes('app') && (window as any).app) {
          (window as any).app.refreshAtlasSelector();
        }
        alert(`Atlas "${atlasName}" deleted successfully!`);
      } else {
        alert('Failed to delete atlas.');
      }
    } catch (error) {
      console.error('Error deleting atlas:', error);
      alert('Failed to delete atlas.');
    }
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

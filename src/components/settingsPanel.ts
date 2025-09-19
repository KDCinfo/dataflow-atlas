import {
  getUniqueLocations,
  addLocation,
  removeLocation,
  getDataLayersByType,
  saveDataLayer,
  deleteDataLayer,
  dataLayerExists,
  generateLayerId,
  DataLayerType,
  type DataLayer,
} from '../utils/settings.js';
import { getElement, updateLocationOptions } from './ui.js';

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
        <p class="setting-description">Manage the data layers available when creating DFDC cards. Layers are organized as Endpoints (final destinations) and Throughpoints (intermediate processing).</p>

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
                    <button class="layer-edit btn-compact" data-layer-id="${escapeHtml(layer.id)}">Edit</button>
                    <button class="layer-delete btn-compact" data-layer-id="${escapeHtml(layer.id)}">Delete</button>
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
                    <button class="layer-edit btn-compact" data-layer-id="${escapeHtml(layer.id)}">Edit</button>
                    <button class="layer-delete btn-compact" data-layer-id="${escapeHtml(layer.id)}">Delete</button>
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
        <p class="setting-description">Manage the list of 'layer object names' for your DFDC cards. These will appear as dropdown options when creating or editing cards.</p>

        <div class="settings-item">
          <label>Add New Location:</label>
          <div style="display: flex; gap: var(--spacing-sm);">
            <input type="text" id="new-location-input" class="settings-input" placeholder="e.g., userStore.profile">
            <button id="add-location-btn" class="btn-secondary">Add</button>
          </div>
        </div>

        ${locations.length > 0 ? `
          <div class="settings-item">
            <label>Existing Names:</label>
            <div class="location-manager">
              ${locations.map(location => `
                <div class="location-item">
                  <span>${escapeHtml(location)}</span>
                  <button class="location-delete" data-location="${escapeHtml(location)}">Remove</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    ${generateDataLayerManagementSection()}

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
}

/**
 * Setup event listeners for settings interactions.
 */
function setupSettingsEventListeners(): void {
  // Add new location.
  const addBtn = getElement('add-location-btn');
  const input = getElement<HTMLInputElement>('new-location-input');

  if (addBtn && input) {
    const handleAdd = (): void => {
      const value = input.value.trim();
      if (value) {
        addLocation(value);
        input.value = '';
        populateSettingsContent(); // Refresh the content.
        updateLocationOptions(); // Update main form options.
      }
    };

    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
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

  const newType = prompt(`Edit layer type (endpoint/throughpoint):`, layer.type);
  if (newType === null || (newType !== 'endpoint' && newType !== 'throughpoint')) {
    if (newType !== null) {
      alert('Type must be either "endpoint" or "throughpoint"');
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
      if (target.id === 'settings-modal' || target.classList.contains('modal-close')) {
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

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
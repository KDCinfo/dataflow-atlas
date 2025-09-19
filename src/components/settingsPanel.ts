import {
  getUniqueLocations,
  addLocation,
  removeLocation,
  getDataLayersByType,
  saveDataLayer,
  deleteDataLayer,
  dataLayerExists,
  type DataLayer,
} from '../utils/settings.js';
import { getElement, updateLocationOptions } from './ui.js';

/**
 * Settings panel management for Data Flow Atlas.
 */

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
  
  return `
    <div class="settings-section">
      <h4>Data Layer Management</h4>
      <p class="setting-description">Manage the data layers available when creating DFDC cards. Layers are organized as Endpoints (final destinations) and Throughpoints (intermediate processing).</p>

      <div class="settings-item">
        <label>Add New Data Layer:</label>
        <div class="data-layer-form">
          <input type="text" id="new-layer-name-input" class="settings-input" placeholder="Display name (e.g., 'Pinia Store')">
          <input type="text" id="new-layer-value-input" class="settings-input" placeholder="Value (e.g., 'store')">
          <select id="new-layer-type-select" class="settings-input">
            <option value="">Select Type</option>
            <option value="endpoint">Endpoint - Data belongs to...</option>
            <option value="throughpoint">Throughpoint - Data passes through...</option>
          </select>
          <button id="add-layer-btn" class="btn-secondary">Add Layer</button>
        </div>
      </div>

      ${endpoints.length > 0 ? `
        <div class="settings-item">
          <label>Endpoints (Data belongs to...):</label>
          <div class="layer-manager">
            ${endpoints.map(layer => `
              <div class="layer-item" data-layer-value="${escapeHtml(layer.value)}">
                <span class="layer-info">
                  <strong>${escapeHtml(layer.name)}</strong> <em>(${escapeHtml(layer.value)})</em>
                </span>
                <div class="layer-actions">
                  <button class="layer-edit btn-secondary" data-layer-value="${escapeHtml(layer.value)}">Edit</button>
                  <button class="layer-delete btn-secondary" data-layer-value="${escapeHtml(layer.value)}">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${throughpoints.length > 0 ? `
        <div class="settings-item">
          <label>Throughpoints (Data passes through...):</label>
          <div class="layer-manager">
            ${throughpoints.map(layer => `
              <div class="layer-item" data-layer-value="${escapeHtml(layer.value)}">
                <span class="layer-info">
                  <strong>${escapeHtml(layer.name)}</strong> <em>(${escapeHtml(layer.value)})</em>
                </span>
                <div class="layer-actions">
                  <button class="layer-edit btn-secondary" data-layer-value="${escapeHtml(layer.value)}">Edit</button>
                  <button class="layer-delete btn-secondary" data-layer-value="${escapeHtml(layer.value)}">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
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

  container.innerHTML = `
    <div class="settings-section">
      <h4>Specific Locations</h4>
      <p class="setting-description">Manage the list of specific locations for your DFDC cards. These will appear as dropdown options when creating or editing cards.</p>

      <div class="settings-item">
        <label>Add New Location:</label>
        <div style="display: flex; gap: var(--spacing-sm);">
          <input type="text" id="new-location-input" class="settings-input" placeholder="e.g., userStore.profile">
          <button id="add-location-btn" class="btn-secondary">Add</button>
        </div>
      </div>

      ${locations.length > 0 ? `
        <div class="settings-item">
          <label>Existing Locations:</label>
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
  const layerValueInput = getElement<HTMLInputElement>('new-layer-value-input');
  const layerTypeSelect = getElement<HTMLSelectElement>('new-layer-type-select');

  if (addLayerBtn && layerNameInput && layerValueInput && layerTypeSelect) {
    const handleAddLayer = (): void => {
      const name = layerNameInput.value.trim();
      const value = layerValueInput.value.trim();
      const type = layerTypeSelect.value as 'endpoint' | 'throughpoint';

      if (!name || !value || !type) {
        alert('Please fill in all fields for the new data layer.');
        return;
      }

      if (dataLayerExists(value)) {
        alert(`A data layer with value "${value}" already exists. Please choose a different value.`);
        return;
      }

      const layer: DataLayer = { name, value, type };
      saveDataLayer(layer);

      // Clear inputs
      layerNameInput.value = '';
      layerValueInput.value = '';
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
      const layerValue = target.getAttribute('data-layer-value');
      if (layerValue) {
        handleEditDataLayer(layerValue);
      }
    });
  });

  document.querySelectorAll('.layer-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const layerValue = target.getAttribute('data-layer-value');
      if (layerValue) {
        handleDeleteDataLayer(layerValue);
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
 * Handle editing a data layer.
 */
function handleEditDataLayer(layerValue: string): void {
  const { endpoints, throughpoints } = getDataLayersByType();
  const layer = [...endpoints, ...throughpoints].find(l => l.value === layerValue);
  
  if (!layer) return;

  const newName = prompt(`Edit layer name:`, layer.name);
  if (newName === null) return; // User cancelled
  
  const newValue = prompt(`Edit layer value:`, layer.value);
  if (newValue === null) return; // User cancelled

  const newType = prompt(`Edit layer type (endpoint/throughpoint):`, layer.type);
  if (newType === null || (newType !== 'endpoint' && newType !== 'throughpoint')) {
    if (newType !== null) {
      alert('Type must be either "endpoint" or "throughpoint"');
    }
    return;
  }

  if (newValue !== layer.value && dataLayerExists(newValue)) {
    alert(`A data layer with value "${newValue}" already exists. Please choose a different value.`);
    return;
  }

  const updatedLayer: DataLayer = {
    name: newName.trim(),
    value: newValue.trim(),
    type: newType as 'endpoint' | 'throughpoint',
  };

  saveDataLayer(updatedLayer, layer.value);
  
  // Refresh the settings panel
  populateSettingsContent();
}

/**
 * Handle deleting a data layer.
 */
function handleDeleteDataLayer(layerValue: string): void {
  const { endpoints, throughpoints } = getDataLayersByType();
  const layer = [...endpoints, ...throughpoints].find(l => l.value === layerValue);
  
  if (!layer) return;

  if (confirm(`Delete data layer "${layer.name}" (${layer.value})?`)) {
    deleteDataLayer(layerValue);
    
    // Refresh the settings panel
    populateSettingsContent();
  }
}

/**
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
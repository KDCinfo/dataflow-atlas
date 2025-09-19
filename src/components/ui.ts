import type { DFDCCard } from '../types/dfdc.js';
import { DATA_TYPES } from '../types/dfdc.js';
import { getUniqueLocations, getDataLayersByType } from '../utils/settings.js';

/**
 * UI utility functions and components for the Data Flow Atlas.
 */

/**
 * Initialize data type dropdown with predefined options.
 */
export function initializeDataTypeDropdown(): void {
  const typeSelect = getElement<HTMLSelectElement>('type');
  if (typeSelect && typeSelect.tagName === 'SELECT') {
    // Clear existing options except the first placeholder.
    const placeholder = typeSelect.querySelector('option[value=""]');
    typeSelect.innerHTML = '';

    // Add placeholder back.
    if (placeholder) {
      typeSelect.appendChild(placeholder);
    } else {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = 'Select Type';
      typeSelect.appendChild(placeholderOption);
    }

    // Add DATA_TYPES options.
    DATA_TYPES.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
  }
}

/**
 * Initialize location dropdown/input hybrid.
 */
export function initializeLocationDropdown(): void {
  const locationInput = getElement<HTMLInputElement>('location');
  if (!locationInput) return;

  // Convert input to datalist for hybrid functionality.
  const datalist = document.createElement('datalist');
  datalist.id = 'location-options';
  locationInput.setAttribute('list', 'location-options');
  locationInput.parentElement?.appendChild(datalist);

  // Populate with existing locations.
  updateLocationOptions();
}

/**
 * Update location dropdown options.
 */
export function updateLocationOptions(): void {
  const datalist = document.getElementById('location-options');
  if (!datalist) return;

  const locations = getUniqueLocations();
  datalist.innerHTML = '';

  locations.forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    datalist.appendChild(option);
  });
}

/**
 * Generate grouped layer options HTML.
 */
function generateLayerOptions(selectedLayer?: string): string {
  const { endpoints, throughpoints } = getDataLayersByType();

  let html = '<option value="">Select Layer</option>';

  if (endpoints.length > 0) {
    html += '<optgroup label="Endpoints - Data belongs to...">';
    endpoints.forEach(layer => {
      const selected = selectedLayer === layer.name ? 'selected' : '';
      html += `<option value="${layer.name}" ${selected}>${layer.name}</option>`;
    });
    html += '</optgroup>';
  }

  if (throughpoints.length > 0) {
    html += '<optgroup label="Throughpoints - Data passes through...">';
    throughpoints.forEach(layer => {
      const selected = selectedLayer === layer.name ? 'selected' : '';
      html += `<option value="${layer.name}" ${selected}>${layer.name}</option>`;
    });
    html += '</optgroup>';
  }

  return html;
}

/**
 * Create a unified form for both create and edit modes.
 */
export function createDFAForm(mode: 'create' | 'edit', card?: DFDCCard): string {
  const isEdit = mode === 'edit';
  const idPrefix = isEdit ? 'edit-' : '';
  const c = card || {} as Partial<DFDCCard>; // Use card data or empty object

  return `
    <div class="form-grid">
      <!-- What (Content Type) -->
      <div class="form-group">
        <label class="required" for="${idPrefix}field">${isEdit ? 'Field/Key Name:' : 'Field/Key Name:'} *</label>
        <input type="text" id="${idPrefix}field" name="field" ${isEdit ? `value="${escapeHtml(c.field || '')}"` : ''} required
               placeholder="e.g., nightmode, userToken, email">
      </div>

      <div class="form-group">
        <label class="required" for="${idPrefix}type">Data Type: *</label>
        <select id="${idPrefix}type" name="type" required>
          <option value="">Select Type</option>
          ${DATA_TYPES.map(type => `<option value="${type}" ${c.type === type ? 'selected' : ''}>${type}</option>`).join('')}
        </select>
      </div>

      <!-- Where (Layer) -->
      <div class="form-group">
        <label class="required" for="${idPrefix}layer">Data Layer: *</label>
        <select id="${idPrefix}layer" name="layer" required>
          ${generateLayerOptions(c?.layer)}
        </select>
      </div>

      <div class="form-group">
        <label class="required" for="${idPrefix}location">Layer Object Name: *</label>
        <input type="text" id="${idPrefix}location" name="location" ${isEdit ? `value="${escapeHtml(c.location || '')}"` : ''} list="${idPrefix}location-options"
               placeholder="e.g., appStateStore.nightmode, users.email" required>
        <datalist id="${idPrefix}location-options">
          ${getUniqueLocations().map(location => `<option value="${escapeHtml(location)}"></option>`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label for="${idPrefix}getter_name">Getter Function Name:</label>
        <input type="text" id="${idPrefix}getter_name" name="getter_name" ${isEdit ? `value="${escapeHtml(c.getter_name || '')}"` : ''}
               placeholder="e.g., getUsername, userStore.getProfile">
      </div>

      <div class="form-group">
        <label for="${idPrefix}setter_name">Setter Function Name:</label>
        <input type="text" id="${idPrefix}setter_name" name="setter_name" ${isEdit ? `value="${escapeHtml(c.setter_name || '')}"` : ''}
               placeholder="e.g., setUsername, userStore.setProfile">
      </div>

      <div class="code-sections-container">
        <div class="form-group full-width code-section ${c.getter_name ? '' : 'hidden'}" id="${idPrefix}getter-code-section">
          <label for="${idPrefix}getter_code">Getter Code (optional):</label>
          <textarea id="${idPrefix}getter_code" name="getter_code" rows="3"
                    placeholder="Implementation code for the getter...">${isEdit ? escapeHtml(c.getter_code || '') : ''}</textarea>
        </div>

        <div class="form-group full-width code-section ${c.setter_name ? '' : 'hidden'}" id="${idPrefix}setter-code-section">
          <label for="${idPrefix}setter_code">Setter Code (optional):</label>
          <textarea id="${idPrefix}setter_code" name="setter_code" rows="3"
                    placeholder="Implementation code for the setter...">${isEdit ? escapeHtml(c.setter_code || '') : ''}</textarea>
        </div>
      </div>

      <!-- Who (Scope) -->
      <div class="form-group">
        <label for="${idPrefix}scope">Scope:</label>
        <select id="${idPrefix}scope" name="scope">
          <option value="">Select Scope</option>
          <option value="app" ${c.scope === 'app' ? 'selected' : ''}>App-level (device/browser)</option>
          <option value="user" ${c.scope === 'user' ? 'selected' : ''}>User-level (account)</option>
          <option value="session" ${c.scope === 'session' ? 'selected' : ''}>Session-level (temporary)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="${idPrefix}category">Category:</label>
        <select id="${idPrefix}category" name="category">
          <option value="">Select Category</option>
          <option value="user-preference" ${c.category === 'user-preference' ? 'selected' : ''}>User Preference</option>
          <option value="account-setting" ${c.category === 'account-setting' ? 'selected' : ''}>Account Setting</option>
          <option value="runtime-state" ${c.category === 'runtime-state' ? 'selected' : ''}>Runtime State</option>
          <option value="feature-data" ${c.category === 'feature-data' ? 'selected' : ''}>Feature Data</option>
          <option value="app-preference" ${c.category === 'app-preference' ? 'selected' : ''}>App Preference</option>
        </select>
      </div>

      <div class="form-group full-width">
        <label for="${idPrefix}persists_in">Also Persists In:</label>
        <textarea id="${idPrefix}persists_in" name="persists_in" rows="2"
                  placeholder="One per line: backend.api.users, localStorage.userData">${isEdit ? (c.persists_in || []).join('\n') : ''}</textarea>
      </div>

      <div class="form-group full-width">
        <label for="${idPrefix}notes">Notes & Description:</label>
        <textarea id="${idPrefix}notes" name="notes" rows="4"
                  placeholder="Purpose, usage notes, conflicts, deprecation status, etc.">${isEdit ? escapeHtml(c.notes || '') : ''}</textarea>
      </div>
    </div>

    ${isEdit ? `
    <div class="form-actions">
      <button type="submit" class="btn-primary">Update DFA Card</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
    </div>
    ` : ''}
  `;
}

/**
 * Initialize getter/setter code section visibility management.
 */
export function initializeCodeSectionToggle(): void {
  const getterNameInput = getElement<HTMLInputElement>('getter_name');
  const setterNameInput = getElement<HTMLInputElement>('setter_name');
  const getterCodeSection = getElement<HTMLElement>('getter-code-section');
  const setterCodeSection = getElement<HTMLElement>('setter-code-section');

  if (!getterNameInput || !setterNameInput || !getterCodeSection || !setterCodeSection) {
    return;
  }

  // Debounce timers.
  let getterTimeout: number | undefined;
  let setterTimeout: number | undefined;

  const toggleSection = (section: HTMLElement, show: boolean): void => {
    if (show) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  };

  const handleGetterChange = (): void => {
    if (getterTimeout) {
      window.clearTimeout(getterTimeout);
    }
    getterTimeout = window.setTimeout(() => {
      const hasValue = getterNameInput.value.trim().length > 0;
      toggleSection(getterCodeSection, hasValue);
    }, 500);
  };

  const handleSetterChange = (): void => {
    if (setterTimeout) {
      window.clearTimeout(setterTimeout);
    }
    setterTimeout = window.setTimeout(() => {
      const hasValue = setterNameInput.value.trim().length > 0;
      toggleSection(setterCodeSection, hasValue);
    }, 500);
  };

  // Add event listeners.
  getterNameInput.addEventListener('input', handleGetterChange);
  setterNameInput.addEventListener('input', handleSetterChange);

  // Initial check.
  handleGetterChange();
  handleSetterChange();
}

/**
 * Initialize getter/setter code section visibility management for edit forms.
 */
export function initializeEditCodeSectionToggle(): void {
  const getterNameInput = getElement<HTMLInputElement>('edit-getter_name');
  const setterNameInput = getElement<HTMLInputElement>('edit-setter_name');
  const getterCodeSection = getElement<HTMLElement>('edit-getter-code-section');
  const setterCodeSection = getElement<HTMLElement>('edit-setter-code-section');

  if (!getterNameInput || !setterNameInput || !getterCodeSection || !setterCodeSection) {
    return;
  }

  // Debounce timers.
  let getterTimeout: number | undefined;
  let setterTimeout: number | undefined;

  const toggleSection = (section: HTMLElement, show: boolean): void => {
    if (show) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  };

  const handleGetterChange = (): void => {
    if (getterTimeout) {
      window.clearTimeout(getterTimeout);
    }
    getterTimeout = window.setTimeout(() => {
      const hasValue = getterNameInput.value.trim().length > 0;
      toggleSection(getterCodeSection, hasValue);
    }, 500);
  };

  const handleSetterChange = (): void => {
    if (setterTimeout) {
      window.clearTimeout(setterTimeout);
    }
    setterTimeout = window.setTimeout(() => {
      const hasValue = setterNameInput.value.trim().length > 0;
      toggleSection(setterCodeSection, hasValue);
    }, 500);
  };

  // Add event listeners.
  getterNameInput.addEventListener('input', handleGetterChange);
  setterNameInput.addEventListener('input', handleSetterChange);

  // Initial check.
  handleGetterChange();
  handleSetterChange();
}

/**
 * Notification types for user feedback.
 */
export type NotificationType = 'success' | 'error' | 'info';

/**
 * Safely get DOM element with type assertion.
 */
export function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Safely get DOM element or throw error if not found.
 */
export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T | null;
  if (!element) {
    throw new Error(`Required element not found: ${id}`);
  }
  return element;
}

/**
 * Show a notification message to the user.
 */
export function showNotification(message: string, type: NotificationType = 'info'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1001;
    transition: all 0.3s ease;
    ${type === 'success' ? 'background-color: #059669;' : ''}
    ${type === 'error' ? 'background-color: #dc2626;' : ''}
    ${type === 'info' ? 'background-color: #2563eb;' : ''}
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds.
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

/**
 * Escape HTML to prevent XSS attacks.
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate a unique ID for DFDC cards.
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format scope value for display.
 */
export function formatScope(scope: string): string {
  const scopeMap: Record<string, string> = {
    'app': 'App-level',
    'user': 'User-level',
    'session': 'Session-level',
  };
  return scopeMap[scope] || scope;
}

/**
 * Format category value for display.
 */
export function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'preference': 'App Preference',
    'user-preference': 'User Preference',
    'account': 'Account Setting',
    'auth': 'Authentication',
    'runtime': 'Runtime State',
    'feature': 'Feature Data',
  };
  return categoryMap[category] || category;
}

/**
 * Render a single DFDC card as HTML.
 */
export function renderDFDCCard(card: DFDCCard): string {
  const persistsInList = card.persists_in && card.persists_in.length > 0
    ? `<div class="dfdc-card-label">Also persists in:</div>
       <div class="dfdc-card-value">${card.persists_in.join(', ')}</div>`
    : '';

  const getterSection = card.getter_name
    ? `<div class="dfdc-card-label">Getter:</div>
       <div class="dfdc-card-value">${escapeHtml(card.getter_name)}</div>`
    : '';

  const setterSection = card.setter_name
    ? `<div class="dfdc-card-label">Setter:</div>
       <div class="dfdc-card-value">${escapeHtml(card.setter_name)}</div>`
    : '';

  const notesSection = card.notes
    ? `<div class="dfdc-card-notes">${escapeHtml(card.notes)}</div>`
    : '';

  return `
    <div class="dfdc-card">
      <div class="dfdc-card-header">
        <h3 class="dfdc-card-title">${escapeHtml(card.field)}</h3>
        <div class="dfdc-card-actions">
          <button class="card-action-btn" data-action="edit" data-card-id="${card.field}" title="Edit">✏️</button>
          <button class="card-action-btn" data-action="delete" data-card-id="${card.field}" title="Delete">🗑️</button>
        </div>
      </div>

      <div class="dfdc-card-meta">
        <div class="dfdc-card-label">Layer:</div>
        <div class="dfdc-card-value">${escapeHtml(card.layer)}</div>

        <div class="dfdc-card-label">Location:</div>
        <div class="dfdc-card-value">${escapeHtml(card.location || 'Not specified')}</div>

        <div class="dfdc-card-label">Type:</div>
        <div class="dfdc-card-value">${escapeHtml(card.type || 'Not specified')}</div>

        ${getterSection}
        ${setterSection}
        ${persistsInList}
      </div>

      <div style="margin-top: 1rem;">
        <span class="dfdc-card-tag scope-${card.scope}">${formatScope(card.scope)}</span>
        ${card.category ? `<span class="dfdc-card-tag">${formatCategory(card.category)}</span>` : ''}
      </div>

      ${notesSection}
    </div>
  `;
}

/**
 * Render empty state when no cards are available.
 */
export function renderEmptyState(): string {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">No DFDC Cards Found</div>
      <div class="empty-state-description">
        Start building your Data Flow Atlas by adding your first DFDC card.
        Use the "Add DFDC Card" tab to get started.
      </div>
    </div>
  `;
}

/**
 * Clear form validation styles.
 */
export function clearFormValidation(): void {
  document.querySelectorAll('.form-group input, .form-group select, .form-group textarea')
    .forEach(input => {
      const element = input as HTMLElement;
      element.style.borderColor = '';
    });
}

/**
 * Update data statistics display.
 */
export function updateDataStats(cardCount: number): void {
  const countText = cardCount === 1 ? '1 DFDC card' : `${cardCount} DFDC cards`;
  const countElement = document.getElementById('card-count');
  if (countElement) {
    countElement.textContent = countText;
  }
}

/**
 * Download data as JSON file.
 */
export function downloadJson(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
import type { DFACard, CardSize } from '../types/dfa.js';
import { DATA_TYPES } from '../types/dfa.js';
import { getUniqueLocations, getDataLayersByType, getScopes, getCategories, getScopeLabel, getCategoryLabel, getLocationLabel, getFormVisibility, updateFormVisibility } from '../utils/settings.js';
import { loadCards } from '../utils/storage.js';

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
    option.value = location; // Store the key as the value
    option.textContent = getLocationLabel(location); // Display the label
    datalist.appendChild(option);
  });
}

/**
 * Update connection dropdown options in forms.
 */
export function updateConnectionOptions(): void {
  // Update connection options for both create and edit forms
  const createLinkedTo = document.querySelector('select[name="linkedTo"]:not([id*="edit"])') as HTMLSelectElement;
  const editLinkedTo = document.querySelector('select[name="linkedTo"][id*="edit"]') as HTMLSelectElement;

  [createLinkedTo, editLinkedTo].forEach(select => {
    if (select) {
      const currentValue = select.value;
      const currentCardId = select.closest('form')?.dataset?.cardId; // We'll need to set this for edit forms
      select.innerHTML = generateConnectionOptions(currentCardId, currentValue);
    }
  });
}

/**
 * Update all layer dropdown options in forms.
 */
export function updateLayerOptions(): void {
  // Find all layer select elements (they have names ending with "layer")
  const layerSelects = document.querySelectorAll('select[name="layer"]') as NodeListOf<HTMLSelectElement>;

  layerSelects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = generateLayerOptions(currentValue);
  });
}

/**
 * Update the layer filter dropdown in the atlas view.
 */
export function updateLayerFilterOptions(): void {
  const select = document.getElementById('filter-layer') as HTMLSelectElement;
  if (select) {
    const currentValue = select.value;
    select.innerHTML = generateLayerFilterOptions(currentValue);
  }
}

/**
 * Update scope options in all forms.
 */
export function updateScopeOptions(): void {
  const selects = ['scope', 'edit-scope'];

  selects.forEach(id => {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (select) {
      const currentValue = select.value;
      select.innerHTML = generateScopeOptions(currentValue);
    }
  });
}

/**
 * Update category options in all forms.
 */
export function updateCategoryOptions(): void {
  const selects = ['category', 'edit-category'];

  selects.forEach(id => {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (select) {
      const currentValue = select.value;
      select.innerHTML = generateCategoryOptions(currentValue);
    }
  });
}

/**
 * Generate layer filter options HTML (for atlas view filtering).
 */
function generateLayerFilterOptions(selectedLayer?: string): string {
  const { endpoints, throughpoints } = getDataLayersByType();

  let html = '<option value="">All Layers</option>';

  if (endpoints.length > 0) {
    html += '<optgroup label="Endpoints">';
    endpoints.forEach(layer => {
      const selected = selectedLayer === layer.name ? 'selected' : '';
      html += `<option value="${layer.name}" ${selected}>${layer.name}</option>`;
    });
    html += '</optgroup>';
  }

  if (throughpoints.length > 0) {
    html += '<optgroup label="Throughpoints">';
    throughpoints.forEach(layer => {
      const selected = selectedLayer === layer.name ? 'selected' : '';
      html += `<option value="${layer.name}" ${selected}>${layer.name}</option>`;
    });
    html += '</optgroup>';
  }

  return html;
}

/**
 * Generate connection options for throughpoint linking.
 */
function generateConnectionOptions(currentCardId?: string, selectedConnection?: string): string {
  const cards = loadCards();
  const { endpoints, throughpoints } = getDataLayersByType();

  // Get layer names for filtering
  const endpointNames = endpoints.map(layer => layer.name);
  const throughpointNames = throughpoints.map(layer => layer.name);

  // Filter out current card and cards that might create circular references
  const availableCards = cards.filter(card => {
    // Exclude the current card being edited
    if (currentCardId && card.id === currentCardId) return false;

    // Exclude cards that are already linked to the current card (prevent circular links)
    if (currentCardId && card.linkedTo === currentCardId) return false;

    return true;
  });

  let html = '<option value="">Select connection (optional)</option>';

  if (availableCards.length === 0) {
    html += '<option disabled>No cards available to connect to</option>';
    return html;
  }

  // Group by endpoints and throughpoints
  const endpointCards = availableCards.filter(card => endpointNames.includes(card.layer));
  const throughpointCards = availableCards.filter(card => throughpointNames.includes(card.layer));

  if (endpointCards.length > 0) {
    html += '<optgroup label="Endpoints">';
    endpointCards.forEach(card => {
      const selected = selectedConnection === card.id ? 'selected' : '';
      const locationLabel = card.location ? getLocationLabel(card.location) : '';
      const displayName = locationLabel ? `${card.field} (${locationLabel})` : card.field;
      html += `<option value="${card.id}" ${selected}>${escapeHtml(displayName)}</option>`;
    });
    html += '</optgroup>';
  }

  if (throughpointCards.length > 0) {
    html += '<optgroup label="Throughpoints">';
    throughpointCards.forEach(card => {
      const selected = selectedConnection === card.id ? 'selected' : '';
      const locationLabel = card.location ? getLocationLabel(card.location) : '';
      const displayName = locationLabel ? `${card.field} (${locationLabel})` : card.field;
      html += `<option value="${card.id}" ${selected}>${escapeHtml(displayName)}</option>`;
    });
    html += '</optgroup>';
  }

  return html;
}

/**
 * Generate scope options for form selects.
 */
function generateScopeOptions(selectedScope?: string): string {
  const scopes = getScopes();
  let html = '<option value="">Select Scope</option>';

  scopes.forEach(scope => {
    const selected = selectedScope === scope ? 'selected' : '';
    const label = getScopeLabel(scope);
    html += `<option value="${scope}" ${selected}>${label}</option>`;
  });

  return html;
}

/**
 * Generate category options for form selects.
 */
function generateCategoryOptions(selectedCategory?: string): string {
  const categories = getCategories();
  let html = '<option value="">Select Category</option>';

  categories.forEach(category => {
    const selected = selectedCategory === category ? 'selected' : '';
    const label = getCategoryLabel(category);
    html += `<option value="${category}" ${selected}>${label}</option>`;
  });

  return html;
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
export function createDFAForm(mode: 'create' | 'edit', card?: DFACard): string {
  const isEdit = mode === 'edit';
  const idPrefix = isEdit ? 'edit-' : '';
  const c = card || {} as Partial<DFACard>; // Use card data or empty object

  return `
    <div class="form-grid">
      <!-- What (Content Type) -->
      <div class="form-group">
        <label class="required" for="${idPrefix}field">${isEdit ? 'Field/Key Name:' : 'Field/Key Name:'} *</label>
        <input class="required-input" type="text" id="${idPrefix}field" name="field" ${isEdit ? `value="${escapeHtml(c.field || '')}"` : ''} required
               placeholder="e.g., nightmode, userToken, email">
      </div>

      <div class="form-group">
        <label class="required" for="${idPrefix}type">Data Type: *</label>
        <select class="required-input" id="${idPrefix}type" name="type" required>
          <option value="">Select Type</option>
          ${DATA_TYPES.map(type => `<option value="${type}" ${c.type === type ? 'selected' : ''}>${type}</option>`).join('')}
        </select>
      </div>

      <!-- Where (Layer) -->
      <div class="form-group">
        <label class="required" for="${idPrefix}layer">Data Layer: *</label>
        <select class="required-input" id="${idPrefix}layer" name="layer" required>
          ${generateLayerOptions(c?.layer)}
        </select>

        <!-- Connected To (for throughpoints) -->
        <div class="form-group form-group-sub" id="${idPrefix}connected-to-group">
          <label for="${idPrefix}linkedTo">Connected To:</label>
          <select id="${idPrefix}linkedTo" name="linkedTo">
            ${generateConnectionOptions(c?.id, c?.linkedTo)}
          </select>
          <small class="form-help">Optional: Link this throughpoint to another card</small>
        </div>
      </div>

      <div class="form-group">
        <label class="required" for="${idPrefix}location">Layer Name: *</label>
        <input class="required-input" type="text" id="${idPrefix}location" name="location" ${isEdit ? `value="${escapeHtml(c.location || '')}"` : ''} list="${idPrefix}location-options"
               placeholder="e.g., appStateStore, userStore, authStore" required>
        <datalist id="${idPrefix}location-options">
          ${getUniqueLocations().map(location => `<option value="${escapeHtml(location)}"></option>`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label for="${idPrefix}getter_name">Getter Function Name:</label>
        <input type="text" id="${idPrefix}getter_name" name="getter_name" ${isEdit ? `value="${escapeHtml(c.getter_name || '')}"` : ''}
               placeholder="e.g., getUsername, getProfile">
        <div class="form-group form-group-sub code-section ${c.getter_name ? 'show' : ''}" id="${idPrefix}getter-code-section">
          <label for="${idPrefix}getter_code">Getter Code (optional):</label>
          <textarea id="${idPrefix}getter_code" name="getter_code" rows="3"
                    placeholder="Implementation code for the getter...">${isEdit ? escapeHtml(c.getter_code || '') : ''}</textarea>
        </div>
      </div>

      <div class="form-group">
        <label for="${idPrefix}setter_name">Setter Function Name:</label>
        <input type="text" id="${idPrefix}setter_name" name="setter_name" ${isEdit ? `value="${escapeHtml(c.setter_name || '')}"` : ''}
               placeholder="e.g., setUsername, setProfile">
        <div class="form-group form-group-sub code-section ${c.setter_name ? 'show' : ''}" id="${idPrefix}setter-code-section">
          <label for="${idPrefix}setter_code">Setter Code (optional):</label>
          <textarea id="${idPrefix}setter_code" name="setter_code" rows="3"
                    placeholder="Implementation code for the setter...">${isEdit ? escapeHtml(c.setter_code || '') : ''}</textarea>
        </div>
      </div>

      <!-- Who (Scope) -->
      <div class="form-group">
        <label for="${idPrefix}scope">Scope:</label>
        <select id="${idPrefix}scope" name="scope">
          ${generateScopeOptions(c.scope)}
        </select>
      </div>

      <div class="form-group">
        <label for="${idPrefix}category">Category:</label>
        <select id="${idPrefix}category" name="category">
          ${generateCategoryOptions(c.category)}
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

    <div class="form-actions">
      ${isEdit ? `
        <button type="submit" class="btn-primary">Update DFA Card</button>
        <button type="button" class="btn-secondary modal-cancel">Cancel</button>
      ` : `
        <button type="submit" class="btn-primary">Save DFA Card</button>
        <button type="button" id="reset-form" class="btn-secondary">Reset Form</button>
      `}
    </div>
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
      section.classList.add('show');
    } else {
      section.classList.remove('show');
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
 * Initialize connection field visibility based on data layer type.
 */
export function initializeConnectionFieldToggle(mode: 'create' | 'edit' = 'create'): void {
  const prefix = mode === 'edit' ? 'edit-' : '';
  const layerSelect = getElement<HTMLSelectElement>(`${prefix}layer`);
  const connectionGroup = getElement<HTMLElement>(`${prefix}connected-to-group`);

  if (!layerSelect || !connectionGroup) return;

  const { throughpoints } = getDataLayersByType();
  const throughpointNames = throughpoints.map(layer => layer.name);

  const toggleConnectionField = (): void => {
    const selectedLayer = layerSelect.value;
    const isThroughpoint = throughpointNames.includes(selectedLayer);

    if (isThroughpoint) {
      connectionGroup.classList.add('show');
    } else {
      connectionGroup.classList.remove('show');
      // Clear the linkedTo value if switching away from throughpoint
      const linkedToSelect = getElement<HTMLSelectElement>(`${prefix}linkedTo`);
      if (linkedToSelect) linkedToSelect.value = '';
    }
  };

  // Set initial state
  toggleConnectionField();

  // Add event listener for changes
  layerSelect.addEventListener('change', toggleConnectionField);
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
      section.classList.add('show');
    } else {
      section.classList.remove('show');
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
  }, 15000);
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
 * Generate a unique ID for DFA cards.
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format scope value for display.
 */
export function formatScope(scope?: string): string {
  if (!scope) return 'No scope';
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
 * Render a single DFA card as HTML.
 */
export function renderDFACard(card: DFACard, size: CardSize = 'standard'): string {
  const persistsInList = card.persists_in && card.persists_in.length > 0
    ? `<div class="dfa-card-label">Also persists in:</div>
       <div class="dfa-card-value">${card.persists_in.join(', ')}</div>`
    : '';

  const getterSection = card.getter_name
    ? `<div class="dfa-card-label">Getter:</div>
       <div class="dfa-card-value">${escapeHtml(card.getter_name)}</div>`
    : '';

  const setterSection = card.setter_name
    ? `<div class="dfa-card-label">Setter:</div>
       <div class="dfa-card-value">${escapeHtml(card.setter_name)}</div>`
    : '';

  // Get linked card name for display
  const linkedToSection = card.linkedTo
    ? (() => {
        const linkedCard = loadCards().find(c => c.id === card.linkedTo);
        const linkedName = linkedCard ? linkedCard.field : `Card ID: ${card.linkedTo}`;
        return `<div class="dfa-card-label">Linked to:</div>
         <div class="dfa-card-value">${escapeHtml(linkedName)}</div>`;
      })()
    : '';

  const notesSection = (card.notes && size !== 'mini')
    ? `<div class="dfa-card-notes">${escapeHtml(card.notes)}</div>`
    : '';

  // Define fields to show based on card size
  const showAllFields = size === 'standard';
  const showCompactFields = size === 'compact';
  const showMiniFields = size === 'mini';

  // For mini cards, create ultra-compact view with key details visible
  if (showMiniFields) {
    return `
      <div class="dfa-card size-mini">
        <div class="dfa-card-header">
          <h3 class="dfa-card-title">${escapeHtml(card.field)}</h3>
          <div class="dfa-card-mini-actions">
            <button class="card-action-btn mini" data-action="relationships" data-card-id="${card.id}" title="Show Connected Network">🔗</button>
          </div>
        </div>

        <div class="dfa-card-meta">
          <div class="dfa-card-label">Layer:</div>
          <div class="dfa-card-value">${escapeHtml(card.layer)}</div>
          <div class="dfa-card-label">Location:</div>
          <div class="dfa-card-value">${escapeHtml(card.location ? getLocationLabel(card.location) : 'Not specified')}</div>
        </div>

        <div style="margin-top: 0.5rem;">
          ${card.category ? `<span class="dfa-card-tag">${formatCategory(card.category)}</span>` : ''}
        </div>
      </div>
    `;
  }

  // Core fields (always shown for standard and compact)
  const coreFields = `
    <div class="dfa-card-label">Layer:</div>
    <div class="dfa-card-value">${escapeHtml(card.layer)}</div>
    <div class="dfa-card-label">Location:</div>
    <div class="dfa-card-value">${escapeHtml(card.location ? getLocationLabel(card.location) : 'Not specified')}</div>`;

  // Standard fields (shown in standard and compact)
  // const standardFields = (showAllFields || showCompactFields) ? `
  const standardFields = (showAllFields) ? `
    <div class="dfa-card-label">Type:</div>
    <div class="dfa-card-value">${escapeHtml(card.type || 'Not specified')}</div>` : '';

  // Essential linkage info for compact (only linked connections, most important)
  const compactFields = showAllFields || showCompactFields ? `
    ${linkedToSection}` : '';

  // Extended fields (only in standard size)
  const extendedFields = showAllFields ? `
    ${getterSection}
    ${setterSection}
    ${persistsInList}` : '';

  return `
    <div class="dfa-card${size !== 'standard' ? ` size-${size}` : ''}">
      <div class="dfa-card-header">
        <h3 class="dfa-card-title">${escapeHtml(card.field)}</h3>
        <div class="dfa-card-actions">
          <button class="card-action-btn" data-action="edit" data-card-id="${card.id}" title="Edit">✏️</button>
          <button class="card-action-btn" data-action="delete" data-card-id="${card.id}" title="Delete">🗑️</button>
        </div>
      </div>

      <div class="dfa-card-meta">
        ${coreFields}
        ${standardFields}
        ${compactFields}
        ${extendedFields}
      </div>

      <div style="margin-top: 1rem;">
        <span class="dfa-card-tag scope-${card.scope || 'none'}">${formatScope(card.scope)}</span>
        ${card.category ? `<span class="dfa-card-tag">${formatCategory(card.category)}</span>` : ''}
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
      <div class="empty-state-title">No DFA Cards Found</div>
      <div class="empty-state-description">
        Start building your Data Flow Atlas by adding your first DFA card.
        Use the "Add DFA Card" tab to get started.
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
 * Reset the create form to its initial state.
 * This includes clearing all fields and hiding the connection group.
 */
export function resetCreateForm(): void {
  const form = document.getElementById('dfa-form') as HTMLFormElement;
  if (!form) return;

  // Reset all form fields
  form.reset();

  // Clear validation styles
  clearFormValidation();

  // Hide the connection group and clear linkedTo value
  const connectionGroup = getElement<HTMLElement>('connected-to-group');
  const linkedToSelect = getElement<HTMLSelectElement>('linkedTo');

  if (connectionGroup) {
    connectionGroup.classList.remove('show');
  }

  if (linkedToSelect) {
    linkedToSelect.value = '';
  }
}

/**
 * Update data statistics display.
 */
export function updateDataStats(cardCount: number): void {
  const countText = cardCount === 1 ? '1 DFA card' : `${cardCount} DFA cards`;
  const countElement = document.getElementById('card-count');
  if (countElement) {
    countElement.textContent = countText;
  }
}

/**
 * Initialize form visibility checkboxes for both create and edit forms.
 */
export function initializeFormVisibilityCheckboxes(): void {
  renderVisibilityCheckboxes('create');
  renderVisibilityCheckboxes('edit');

  // Set initial visibility state immediately
  updateFormSectionVisibility();

  // Also update labels to match current state
  const visibility = getFormVisibility();
  updateVisibilityCheckboxLabels(visibility);
}

/**
 * Render visibility checkboxes in a DRY fashion.
 */
function renderVisibilityCheckboxes(mode: 'create' | 'edit'): void {
  const prefix = mode === 'edit' ? 'edit-' : '';
  const containerId = mode === 'create' ? 'add-section' : 'edit-modal';
  const container = document.querySelector(`#${containerId} .visibility-checkboxes`);

  if (!container) return;

  const visibility = getFormVisibility();

  container.innerHTML = `
    <div class="visibility-controls">
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="${prefix}show-scope" ${visibility.showScope ? 'checked' : ''}>
          <span class="checkmark"></span>
          <span class="label-text">${visibility.showScope ? 'Hide' : 'Show'} 'Scope'</span>
        </label>

        <label class="checkbox-label">
          <input type="checkbox" id="${prefix}show-category" ${visibility.showCategory ? 'checked' : ''}>
          <span class="checkmark"></span>
          <span class="label-text">${visibility.showCategory ? 'Hide' : 'Show'} 'Category'</span>
        </label>

        <label class="checkbox-label">
          <input type="checkbox" id="${prefix}show-persists-in" ${visibility.showPersistsIn ? 'checked' : ''}>
          <span class="checkmark"></span>
          <span class="label-text">${visibility.showPersistsIn ? 'Hide' : 'Show'} 'Also Persists In'</span>
        </label>
      </div>
    </div>
  `;  // Add event listeners
  addVisibilityCheckboxListeners(prefix);
}

/**
 * Add event listeners to visibility checkboxes.
 */
function addVisibilityCheckboxListeners(prefix: string): void {
  const showScopeCheckbox = document.getElementById(`${prefix}show-scope`) as HTMLInputElement;
  const showCategoryCheckbox = document.getElementById(`${prefix}show-category`) as HTMLInputElement;
  const showPersistsInCheckbox = document.getElementById(`${prefix}show-persists-in`) as HTMLInputElement;

  const createUpdateHandler = (field: 'showScope' | 'showCategory' | 'showPersistsIn') => {
    return (event: Event) => {
      const checkbox = event.target as HTMLInputElement;
      const currentVisibility = getFormVisibility();

      // Update the specific field based on the checkbox that was clicked
      const visibility = {
        ...currentVisibility,
        [field]: checkbox.checked
      };

      updateFormVisibility(visibility);
      updateFormSectionVisibility();

      // Sync all checkboxes across both forms
      syncVisibilityCheckboxes(visibility);

      // Update checkbox labels
      updateVisibilityCheckboxLabels(visibility);
    };
  };

  if (showScopeCheckbox) showScopeCheckbox.addEventListener('change', createUpdateHandler('showScope'));
  if (showCategoryCheckbox) showCategoryCheckbox.addEventListener('change', createUpdateHandler('showCategory'));
  if (showPersistsInCheckbox) showPersistsInCheckbox.addEventListener('change', createUpdateHandler('showPersistsIn'));
}

/**
 * Sync checkbox states across both forms.
 */
function syncVisibilityCheckboxes(visibility: any): void {
  // Update all show-scope checkboxes
  document.querySelectorAll('input[id$="show-scope"]').forEach((checkbox) => {
    (checkbox as HTMLInputElement).checked = visibility.showScope;
  });

  // Update all show-category checkboxes
  document.querySelectorAll('input[id$="show-category"]').forEach((checkbox) => {
    (checkbox as HTMLInputElement).checked = visibility.showCategory;
  });

  // Update all show-persists-in checkboxes
  document.querySelectorAll('input[id$="show-persists-in"]').forEach((checkbox) => {
    (checkbox as HTMLInputElement).checked = visibility.showPersistsIn;
  });
}

/**
 * Update checkbox labels to show/hide based on current state.
 */
function updateVisibilityCheckboxLabels(visibility: any): void {
  // Update scope labels
  document.querySelectorAll('input[id$="show-scope"]').forEach((checkbox) => {
    const labelText = checkbox.parentElement?.querySelector('.label-text');
    if (labelText) {
      labelText.textContent = visibility.showScope ? 'Hide Scope' : 'Show Scope';
    }
  });

  // Update category labels
  document.querySelectorAll('input[id$="show-category"]').forEach((checkbox) => {
    const labelText = checkbox.parentElement?.querySelector('.label-text');
    if (labelText) {
      labelText.textContent = visibility.showCategory ? 'Hide Category' : 'Show Category';
    }
  });

  // Update persists-in labels
  document.querySelectorAll('input[id$="show-persists-in"]').forEach((checkbox) => {
    const labelText = checkbox.parentElement?.querySelector('.label-text');
    if (labelText) {
      labelText.textContent = visibility.showPersistsIn ? 'Hide Also Persists In' : 'Show Also Persists In';
    }
  });
}

/**
 * Update form section visibility based on current settings.
 */
export function updateFormSectionVisibility(): void {
  const visibility = getFormVisibility();

  // Update both create and edit forms
  ['', 'edit-'].forEach(prefix => {
    // Scope sections - look for exact ID match
    const scopeId = prefix === '' ? 'scope' : 'edit-scope';
    const scopeElement = document.getElementById(scopeId);
    const scopeGroup = scopeElement?.closest('.form-group') as HTMLElement;
    if (scopeGroup) {
      scopeGroup.style.display = visibility.showScope ? 'inherit' : 'none';
    }

    // Category sections - look for exact ID match
    const categoryId = prefix === '' ? 'category' : 'edit-category';
    const categoryElement = document.getElementById(categoryId);
    const categoryGroup = categoryElement?.closest('.form-group') as HTMLElement;
    if (categoryGroup) {
      categoryGroup.style.display = visibility.showCategory ? 'inherit' : 'none';
    }

    // Also Persists In sections - look for exact ID match
    const persistsInId = prefix === '' ? 'persists_in' : 'edit-persists_in';
    const persistsInElement = document.getElementById(persistsInId);
    const persistsInGroup = persistsInElement?.closest('.form-group') as HTMLElement;
    if (persistsInGroup) {
      persistsInGroup.style.display = visibility.showPersistsIn ? 'inherit' : 'none';
    }
  });
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

import type { DFDCCard } from '../types/dfdc.js';
import { DATA_TYPES } from '../types/dfdc.js';

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
 * Create edit form HTML for a DFDC card.
 */
export function createEditForm(card: DFDCCard): string {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label for="edit-field">Field/Key Name:</label>
        <input type="text" id="edit-field" name="field" value="${escapeHtml(card.field)}" required>
      </div>

      <div class="form-group">
        <label for="edit-type">Data Type:</label>
        <select id="edit-type" name="type">
          <option value="">Select Type</option>
          ${DATA_TYPES.map(type => `<option value="${type}" ${card.type === type ? 'selected' : ''}>${type}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label for="edit-layer">Primary Layer:</label>
        <select id="edit-layer" name="layer" required>
          <option value="">Select Layer</option>
          <option value="store" ${card.layer === 'store' ? 'selected' : ''}>Pinia Store</option>
          <option value="localStorage" ${card.layer === 'localStorage' ? 'selected' : ''}>Local Storage</option>
          <option value="sessionStorage" ${card.layer === 'sessionStorage' ? 'selected' : ''}>Session Storage</option>
          <option value="api" ${card.layer === 'api' ? 'selected' : ''}>Backend API</option>
          <option value="database" ${card.layer === 'database' ? 'selected' : ''}>Database</option>
        </select>
      </div>

      <div class="form-group">
        <label for="edit-location">Specific Location:</label>
        <input type="text" id="edit-location" name="location" value="${escapeHtml(card.location || '')}">
      </div>

      <div class="form-group">
        <label for="edit-scope">Scope:</label>
        <select id="edit-scope" name="scope" required>
          <option value="">Select Scope</option>
          <option value="app" ${card.scope === 'app' ? 'selected' : ''}>App-level (device/browser)</option>
          <option value="user" ${card.scope === 'user' ? 'selected' : ''}>User-level (account)</option>
          <option value="session" ${card.scope === 'session' ? 'selected' : ''}>Session-level (temporary)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="edit-category">Category:</label>
        <select id="edit-category" name="category">
          <option value="">Select Category</option>
          <option value="user-preference" ${card.category === 'user-preference' ? 'selected' : ''}>User Preference</option>
          <option value="account-setting" ${card.category === 'account-setting' ? 'selected' : ''}>Account Setting</option>
          <option value="runtime-state" ${card.category === 'runtime-state' ? 'selected' : ''}>Runtime State</option>
          <option value="feature-data" ${card.category === 'feature-data' ? 'selected' : ''}>Feature Data</option>
          <option value="app-preference" ${card.category === 'app-preference' ? 'selected' : ''}>App Preference</option>
        </select>
      </div>

      <div class="form-group">
        <label for="edit-getter_name">Getter Function:</label>
        <input type="text" id="edit-getter_name" name="getter_name" value="${escapeHtml(card.getter_name || '')}" placeholder="e.g., getUsername, userStore.getProfile">
      </div>

      <div class="form-group">
        <label for="edit-setter_name">Setter Function:</label>
        <input type="text" id="edit-setter_name" name="setter_name" value="${escapeHtml(card.setter_name || '')}" placeholder="e.g., setUsername, userStore.setProfile">
      </div>

      <div class="form-group full-width">
        <label for="edit-getter_code">Getter Code (optional):</label>
        <textarea id="edit-getter_code" name="getter_code" rows="3" placeholder="Implementation code for the getter...">${escapeHtml(card.getter_code || '')}</textarea>
      </div>

      <div class="form-group full-width">
        <label for="edit-setter_code">Setter Code (optional):</label>
        <textarea id="edit-setter_code" name="setter_code" rows="3" placeholder="Implementation code for the setter...">${escapeHtml(card.setter_code || '')}</textarea>
      </div>

      <div class="form-group full-width">
        <label for="edit-persists_in">Also Persists In:</label>
        <textarea id="edit-persists_in" name="persists_in" rows="2" placeholder="One per line: backend.api.users, localStorage.userData">${(card.persists_in || []).join('\n')}</textarea>
      </div>

      <div class="form-group full-width">
        <label for="edit-notes">Notes & Description:</label>
        <textarea id="edit-notes" name="notes" rows="4" placeholder="Purpose, usage notes, conflicts, deprecation status, etc.">${escapeHtml(card.notes || '')}</textarea>
      </div>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn-primary">Update DFDC Card</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
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
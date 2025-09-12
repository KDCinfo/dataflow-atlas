/**
 * DFD Assistant: Data Flow Atlas
 * A web-based tool for manually cataloging and organizing application data flows.
 */

class DFDAtlas {
    constructor() {
        this.storageKey = 'dfd-atlas-data';
        this.data = this.loadData();
        this.currentEditId = null;

        this.initializeEventListeners();
        this.renderAtlas();
        this.updateDataStats();
    }

    /**
     * Initialize all event listeners for the application.
     */
    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Form submission
        document.getElementById('dfdc-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Form reset
        document.getElementById('dfdc-form').addEventListener('reset', () => {
            setTimeout(() => this.clearFormValidation(), 0);
        });

        // Filters
        document.getElementById('filter-layer').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-scope').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-category').addEventListener('change', () => this.applyFilters());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());

        // Import/Export
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-btn').addEventListener('click', () => this.triggerImport());
        document.getElementById('import-file').addEventListener('change', (e) => this.handleImport(e));
        document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllData());

        // Modal
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal' || e.target.classList.contains('modal-close')) {
                this.closeModal();
            }
        });

        // Edit form submission
        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditSubmit();
        });
    }

    /**
     * Handle navigation between sections.
     */
    handleNavigation(e) {
        const targetSection = e.target.id.replace('nav-', '') + '-section';

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(targetSection).classList.add('active');
    }

    /**
     * Handle form submission for creating new DFDC cards.
     */
    handleFormSubmit() {
        const formData = new FormData(document.getElementById('dfdc-form'));
        const dfdcCard = this.createDFDCCard(formData);

        if (this.validateDFDCCard(dfdcCard)) {
            this.addDFDCCard(dfdcCard);
            document.getElementById('dfdc-form').reset();
            this.clearFormValidation();
            this.showNotification('DFDC card added successfully!', 'success');
        }
    }

    /**
     * Create a DFDC card object from form data.
     */
    createDFDCCard(formData) {
        const persistsIn = formData.get('persists_in')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        return {
            id: this.generateId(),
            field: formData.get('field').trim(),
            layer: formData.get('layer'),
            location: formData.get('location').trim(),
            type: formData.get('type').trim(),
            scope: formData.get('scope'),
            purpose: formData.get('purpose').trim(),
            category: formData.get('category'),
            persists_in: persistsIn,
            notes: formData.get('notes').trim(),
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        };
    }

    /**
     * Validate a DFDC card before adding to the atlas.
     */
    validateDFDCCard(card) {
        const errors = [];

        if (!card.field) errors.push('Field name is required');
        if (!card.layer) errors.push('Layer is required');
        if (!card.scope) errors.push('Scope is required');

        // Check for duplicate field names
        if (this.data.some(existing => existing.field === card.field && existing.id !== card.id)) {
            errors.push('A DFDC card with this field name already exists');
        }

        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return false;
        }

        return true;
    }

    /**
     * Add a new DFDC card to the atlas.
     */
    addDFDCCard(card) {
        this.data.push(card);
        this.saveData();
        this.renderAtlas();
        this.updateDataStats();
    }

    /**
     * Update an existing DFDC card.
     */
    updateDFDCCard(id, updatedCard) {
        const index = this.data.findIndex(card => card.id === id);
        if (index !== -1) {
            updatedCard.updated = new Date().toISOString();
            this.data[index] = { ...this.data[index], ...updatedCard };
            this.saveData();
            this.renderAtlas();
            this.updateDataStats();
        }
    }

    /**
     * Delete a DFDC card from the atlas.
     */
    deleteDFDCCard(id) {
        if (confirm('Are you sure you want to delete this DFDC card? This action cannot be undone.')) {
            this.data = this.data.filter(card => card.id !== id);
            this.saveData();
            this.renderAtlas();
            this.updateDataStats();
            this.showNotification('DFDC card deleted successfully!', 'success');
        }
    }

    /**
     * Render the atlas view with all DFDC cards.
     */
    renderAtlas() {
        const atlasGrid = document.getElementById('atlas-grid');
        const filteredData = this.getFilteredData();

        if (filteredData.length === 0) {
            atlasGrid.innerHTML = this.renderEmptyState();
            return;
        }

        atlasGrid.innerHTML = filteredData
            .map(card => this.renderDFDCCard(card))
            .join('');

        // Add event listeners to card actions
        atlasGrid.querySelectorAll('.card-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const cardId = e.target.dataset.cardId;

                if (action === 'edit') {
                    this.editDFDCCard(cardId);
                } else if (action === 'delete') {
                    this.deleteDFDCCard(cardId);
                }
            });
        });
    }

    /**
     * Render a single DFDC card.
     */
    renderDFDCCard(card) {
        const persistsInList = card.persists_in && card.persists_in.length > 0
            ? `<div class="dfdc-card-label">Also persists in:</div>
               <div class="dfdc-card-value">${card.persists_in.join(', ')}</div>`
            : '';

        const notesSection = card.notes
            ? `<div class="dfdc-card-notes">${this.escapeHtml(card.notes)}</div>`
            : '';

        return `
            <div class="dfdc-card">
                <div class="dfdc-card-header">
                    <h3 class="dfdc-card-title">${this.escapeHtml(card.field)}</h3>
                    <div class="dfdc-card-actions">
                        <button class="card-action-btn" data-action="edit" data-card-id="${card.id}" title="Edit">✏️</button>
                        <button class="card-action-btn" data-action="delete" data-card-id="${card.id}" title="Delete">🗑️</button>
                    </div>
                </div>

                <div class="dfdc-card-meta">
                    <div class="dfdc-card-label">Layer:</div>
                    <div class="dfdc-card-value">${this.escapeHtml(card.layer)}</div>

                    <div class="dfdc-card-label">Location:</div>
                    <div class="dfdc-card-value">${this.escapeHtml(card.location || 'Not specified')}</div>

                    <div class="dfdc-card-label">Type:</div>
                    <div class="dfdc-card-value">${this.escapeHtml(card.type || 'Not specified')}</div>

                    <div class="dfdc-card-label">Purpose:</div>
                    <div class="dfdc-card-value">${this.escapeHtml(card.purpose || 'Not specified')}</div>

                    ${persistsInList}
                </div>

                <div style="margin-top: 1rem;">
                    <span class="dfdc-card-tag scope-${card.scope}">${this.formatScope(card.scope)}</span>
                    ${card.category ? `<span class="dfdc-card-tag">${this.formatCategory(card.category)}</span>` : ''}
                </div>

                ${notesSection}
            </div>
        `;
    }

    /**
     * Render empty state when no cards are available.
     */
    renderEmptyState() {
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
     * Open edit modal for a DFDC card.
     */
    editDFDCCard(id) {
        const card = this.data.find(c => c.id === id);
        if (!card) return;

        this.currentEditId = id;
        this.populateEditForm(card);
        document.getElementById('edit-modal').classList.add('active');
    }

    /**
     * Populate the edit form with card data.
     */
    populateEditForm(card) {
        const editForm = document.getElementById('edit-form');
        editForm.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-field">Field/Key Name:</label>
                    <input type="text" id="edit-field" name="field" value="${this.escapeHtml(card.field)}" required>
                </div>

                <div class="form-group">
                    <label for="edit-type">Data Type:</label>
                    <input type="text" id="edit-type" name="type" value="${this.escapeHtml(card.type || '')}">
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
                    <input type="text" id="edit-location" name="location" value="${this.escapeHtml(card.location || '')}">
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
                    <label for="edit-purpose">Purpose/Description:</label>
                    <input type="text" id="edit-purpose" name="purpose" value="${this.escapeHtml(card.purpose || '')}">
                </div>

                <div class="form-group">
                    <label for="edit-category">Category:</label>
                    <select id="edit-category" name="category">
                        <option value="">Select Category</option>
                        <option value="preference" ${card.category === 'preference' ? 'selected' : ''}>App Preference</option>
                        <option value="user-preference" ${card.category === 'user-preference' ? 'selected' : ''}>User Preference</option>
                        <option value="account" ${card.category === 'account' ? 'selected' : ''}>User Account Setting</option>
                        <option value="auth" ${card.category === 'auth' ? 'selected' : ''}>Authentication</option>
                        <option value="runtime" ${card.category === 'runtime' ? 'selected' : ''}>Runtime State</option>
                        <option value="feature" ${card.category === 'feature' ? 'selected' : ''}>Core/Feature Data</option>
                    </select>
                </div>

                <div class="form-group full-width">
                    <label for="edit-persists_in">Also Persists In:</label>
                    <textarea id="edit-persists_in" name="persists_in" rows="2">${(card.persists_in || []).join('\n')}</textarea>
                </div>

                <div class="form-group full-width">
                    <label for="edit-notes">Notes:</label>
                    <textarea id="edit-notes" name="notes" rows="3">${this.escapeHtml(card.notes || '')}</textarea>
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn-primary">Update DFDC Card</button>
                <button type="button" class="btn-secondary" onclick="dfdAtlas.closeModal()">Cancel</button>
            </div>
        `;
    }

    /**
     * Handle edit form submission.
     */
    handleEditSubmit() {
        const formData = new FormData(document.getElementById('edit-form'));
        const updatedCard = this.createDFDCCard(formData);
        updatedCard.id = this.currentEditId;

        if (this.validateDFDCCard(updatedCard)) {
            this.updateDFDCCard(this.currentEditId, updatedCard);
            this.closeModal();
            this.showNotification('DFDC card updated successfully!', 'success');
        }
    }

    /**
     * Close the edit modal.
     */
    closeModal() {
        document.getElementById('edit-modal').classList.remove('active');
        this.currentEditId = null;
    }

    /**
     * Apply filters to the atlas view.
     */
    applyFilters() {
        this.renderAtlas();
    }

    /**
     * Get filtered data based on current filter selections.
     */
    getFilteredData() {
        const layerFilter = document.getElementById('filter-layer').value;
        const scopeFilter = document.getElementById('filter-scope').value;
        const categoryFilter = document.getElementById('filter-category').value;

        return this.data.filter(card => {
            if (layerFilter && card.layer !== layerFilter) return false;
            if (scopeFilter && card.scope !== scopeFilter) return false;
            if (categoryFilter && card.category !== categoryFilter) return false;
            return true;
        });
    }

    /**
     * Clear all filters.
     */
    clearFilters() {
        document.getElementById('filter-layer').value = '';
        document.getElementById('filter-scope').value = '';
        document.getElementById('filter-category').value = '';
        this.renderAtlas();
    }

    /**
     * Export data to JSON file.
     */
    exportData() {
        const dataToExport = {
            version: '1.0',
            exported: new Date().toISOString(),
            cards: this.data,
        };

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dfd-atlas-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully!', 'success');
    }

    /**
     * Trigger file input for import.
     */
    triggerImport() {
        document.getElementById('import-file').click();
    }

    /**
     * Handle file import.
     */
    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                this.processImportedData(importedData);
            } catch (error) {
                this.showNotification('Error importing file: Invalid JSON format', 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Process imported data.
     */
    processImportedData(importedData) {
        const importMode = document.querySelector('input[name="import-mode"]:checked').value;

        if (!importedData.cards || !Array.isArray(importedData.cards)) {
            this.showNotification('Error: Invalid data format', 'error');
            return;
        }

        if (importMode === 'replace') {
            this.data = importedData.cards.map(card => ({ ...card, id: this.generateId() }));
        } else {
            // Merge mode
            importedData.cards.forEach(importedCard => {
                const existingIndex = this.data.findIndex(card => card.field === importedCard.field);
                if (existingIndex !== -1) {
                    // Update existing card
                    this.data[existingIndex] = { ...importedCard, id: this.data[existingIndex].id };
                } else {
                    // Add new card
                    this.data.push({ ...importedCard, id: this.generateId() });
                }
            });
        }

        this.saveData();
        this.renderAtlas();
        this.updateDataStats();
        this.showNotification(`Data imported successfully! (${importMode} mode)`, 'success');

        // Reset file input
        document.getElementById('import-file').value = '';
    }

    /**
     * Clear all data after confirmation.
     */
    clearAllData() {
        const confirmation = prompt('Type "DELETE ALL" to confirm clearing all DFDC cards:');
        if (confirmation === 'DELETE ALL') {
            this.data = [];
            this.saveData();
            this.renderAtlas();
            this.updateDataStats();
            this.showNotification('All data cleared successfully!', 'success');
        }
    }

    /**
     * Update data statistics display.
     */
    updateDataStats() {
        const cardCount = this.data.length;
        const countText = cardCount === 1 ? '1 DFDC card' : `${cardCount} DFDC cards`;
        document.getElementById('card-count').textContent = countText;
    }

    /**
     * Show validation errors.
     */
    showValidationErrors(errors) {
        this.showNotification(`Validation errors: ${errors.join(', ')}`, 'error');
    }

    /**
     * Clear form validation styles.
     */
    clearFormValidation() {
        document.querySelectorAll('.form-group input, .form-group select, .form-group textarea')
            .forEach(input => {
                input.style.borderColor = '';
            });
    }

    /**
     * Show notification message.
     */
    showNotification(message, type = 'info') {
        // Simple notification system
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

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    /**
     * Load data from localStorage.
     */
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            return [];
        }
    }

    /**
     * Save data to localStorage.
     */
    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            this.showNotification('Error saving data to browser storage', 'error');
        }
    }

    /**
     * Generate a unique ID for DFDC cards.
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Escape HTML to prevent XSS.
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format scope for display.
     */
    formatScope(scope) {
        const scopeMap = {
            'app': 'App-level',
            'user': 'User-level',
            'session': 'Session-level',
        };
        return scopeMap[scope] || scope;
    }

    /**
     * Format category for display.
     */
    formatCategory(category) {
        const categoryMap = {
            'preference': 'App Preference',
            'user-preference': 'User Preference',
            'account': 'Account Setting',
            'auth': 'Authentication',
            'runtime': 'Runtime State',
            'feature': 'Feature Data',
        };
        return categoryMap[category] || category;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dfdAtlas = new DFDAtlas();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DFDAtlas;
}

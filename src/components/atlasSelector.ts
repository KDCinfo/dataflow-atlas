/**
 * Atlas Selector Component for managing multiple atlases in the navigation bar.
 */

import { getAllAtlases, getActiveAtlas, setActiveAtlas, getAtlasCardCount } from '../utils/atlasManagerOptimized.js';

export class AtlasSelector {
  private dropdownElement: HTMLSelectElement | null = null;
  private activateButtonElement: HTMLButtonElement | null = null;

  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.updateDropdown();
  }

  private initializeElements(): void {
    this.dropdownElement = document.getElementById('atlas-dropdown') as HTMLSelectElement;
    this.activateButtonElement = document.getElementById('activate-atlas-btn') as HTMLButtonElement;
  }

  private bindEvents(): void {
    if (this.activateButtonElement) {
      this.activateButtonElement.addEventListener('click', () => this.activateSelectedAtlas());
    }

    if (this.dropdownElement) {
      this.dropdownElement.addEventListener('change', () => this.updateActivateButton());
    }
  }

  /**
   * Update the dropdown with all available atlases.
   */
  public updateDropdown(): void {
    if (!this.dropdownElement) return;

    const atlases = getAllAtlases();
    const activeAtlas = getActiveAtlas();

    // Clear existing options
    this.dropdownElement.innerHTML = '';

    // Add atlas options
    atlases.forEach(atlas => {
      const option = document.createElement('option');
      option.value = atlas;

      const cardCount = getAtlasCardCount(atlas);
      option.textContent = `${atlas} (${cardCount})`;

      option.selected = atlas === activeAtlas;
      this.dropdownElement!.appendChild(option);
    });

    this.updateActivateButton();
  }

  /**
   * Update the activate button state based on selection.
   */
  private updateActivateButton(): void {
    if (!this.dropdownElement || !this.activateButtonElement) return;

    const selectedAtlas = this.dropdownElement.value;
    const activeAtlas = getActiveAtlas();
    const isCurrentlyActive = selectedAtlas === activeAtlas;

    this.activateButtonElement.disabled = isCurrentlyActive;
    this.activateButtonElement.textContent = isCurrentlyActive ? 'Active' : 'Activate';

    if (isCurrentlyActive) {
      this.activateButtonElement.classList.add('btn-active');
      this.activateButtonElement.classList.remove('btn-secondary');
    } else {
      this.activateButtonElement.classList.remove('btn-active');
      this.activateButtonElement.classList.add('btn-secondary');
    }
  }

  /**
   * Activate the selected atlas.
   */
  private activateSelectedAtlas(): void {
    if (!this.dropdownElement) return;

    const selectedAtlas = this.dropdownElement.value;
    const currentActive = getActiveAtlas();

    if (selectedAtlas === currentActive) {
      return; // Already active
    }

    // Confirm atlas switch if current atlas has data
    const confirmMessage = `Switch to "${selectedAtlas}" atlas?\\n\\nThis will reload the page and switch to the selected atlas data.`;

    if (confirm(confirmMessage)) {
      setActiveAtlas(selectedAtlas);

      // Show brief loading message and reload
      this.showActivationMessage(selectedAtlas);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  /**
   * Show activation message.
   */
  private showActivationMessage(atlasName: string): void {
    if (!this.activateButtonElement) return;

    this.activateButtonElement.textContent = 'Switching...';
    this.activateButtonElement.disabled = true;

    // Create temporary status message
    const statusDiv = document.createElement('div');
    statusDiv.className = 'atlas-status-message';
    statusDiv.textContent = `Activating "${atlasName}"...`;
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--color-primary);
      color: black;
      padding: 10px 15px;
      border-radius: 5px;
      font-weight: bold;
      z-index: 10000;
    `;

    document.body.appendChild(statusDiv);
  }

  /**
   * Get the currently selected atlas name.
   */
  public getSelectedAtlas(): string {
    return this.dropdownElement?.value || 'default';
  }

  /**
   * Set the selected atlas in the dropdown.
   */
  public setSelectedAtlas(atlasName: string): void {
    if (this.dropdownElement) {
      this.dropdownElement.value = atlasName;
      this.updateActivateButton();
    }
  }

  /**
   * Refresh the component after atlas list changes.
   */
  public refresh(): void {
    this.updateDropdown();
  }
}
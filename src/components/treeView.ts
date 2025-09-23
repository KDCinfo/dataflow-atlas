import type { DFACard, TreeNode, TreeLayout } from '../types/dfa.js';
import { loadCards } from '../utils/storage.js';
import { renderDFACard } from './ui.js';

/**
 * Tree View System for visualizing card relationships in a hierarchical layout.
 * Handles tree building, positioning, rendering, and connection drawing.
 */
export class TreeView {
  private rootCardId: string | null = null;

  /**
   * Build and render a tree layout for the given root card.
   */
  public renderTree(rootCardId: string): boolean {
    this.rootCardId = rootCardId;

    const layout = this.buildTreeLayout(rootCardId);
    if (!layout) return false;

    this.renderTreeLayout(layout);
    return true;
  }

  /**
   * Clear the current tree view.
   */
  public clearTree(): void {
    this.rootCardId = null;
    this.clearConnectionLines();
  }

  /**
   * Get the current root card ID.
   */
  public getRootCardId(): string | null {
    return this.rootCardId;
  }

  /**
   * Create a tree layout from the relationships of a root card.
   */
  private buildTreeLayout(rootCardId: string): TreeLayout | null {
    const allCards = loadCards();
    const rootCard = allCards.find(c => c.id === rootCardId);

    if (!rootCard) return null;

    const visited = new Set<string>();

    const buildNode = (card: DFACard, parent?: TreeNode, depth = 0): TreeNode => {
      visited.add(card.id);

      const node: TreeNode = {
        id: card.id,
        card,
        children: [],
        parent,
        x: 0, // Will be calculated later
        y: 0, // Will be calculated later
        depth,
      };

      // Build tree by finding cards that link TO this card (reverse direction)
      // These become children of the current node
      allCards.forEach(otherCard => {
        if (!visited.has(otherCard.id) && otherCard.linkedTo === card.id) {
          const childNode = buildNode(otherCard, node, depth + 1);
          node.children.push(childNode);
        }
      });

      return node;
    };

    const root = buildNode(rootCard);

    // Collect all nodes in breadth-first order for rendering
    const nodes: TreeNode[] = [];
    const queue = [root];

    while (queue.length > 0) {
      const current = queue.shift()!;
      nodes.push(current);
      queue.push(...current.children);
    }

    const layout = this.calculateTreePositions(root, nodes);
    return layout;
  }

  /**
   * Calculate positions for tree layout - Vertical branching style.
   */
  private calculateTreePositions(root: TreeNode, nodes: TreeNode[]): TreeLayout {
    const cardWidth = 150; // Mini card width - matches CSS .size-mini width
    const horizontalSpacing = 80;
    const verticalSpacing = 120;

    // First pass: Calculate subtree widths for each node
    const calculateSubtreeWidth = (node: TreeNode): number => {
      if (node.children.length === 0) {
        return cardWidth;
      }

      const childWidths = node.children.map(child => calculateSubtreeWidth(child));
      const totalChildWidth = childWidths.reduce((sum, width) => sum + width, 0);
      const childSpacing = Math.max(0, (node.children.length - 1) * horizontalSpacing);

      return Math.max(cardWidth, totalChildWidth + childSpacing);
    };

    // Second pass: Position nodes
    const positionNode = (node: TreeNode, centerX: number, y: number): void => {
      node.x = centerX;
      node.y = y;

      if (node.children.length === 0) return;

      // Calculate positions for children
      const subtreeWidths = node.children.map(child => calculateSubtreeWidth(child));
      const totalWidth = subtreeWidths.reduce((sum, width) => sum + width, 0);
      const totalSpacing = (node.children.length - 1) * horizontalSpacing;
      const totalRequiredWidth = totalWidth + totalSpacing;

      // Start position for first child
      let currentX = centerX - (totalRequiredWidth / 2);

      node.children.forEach((child, index) => {
        const subtreeWidth = subtreeWidths[index];
        const childCenterX = currentX + (subtreeWidth / 2);

        // Recursively position child and its subtree
        positionNode(child, childCenterX, y + verticalSpacing);

        // Move to next child position
        currentX += subtreeWidth + horizontalSpacing;
      });
    };

    // Calculate tree dimensions
    const rootSubtreeWidth = calculateSubtreeWidth(root);
    const startX = Math.max(rootSubtreeWidth / 2, cardWidth) + 10; // Reduced padding for leftmost at 10px
    const startY = 0; // Start at top with no padding

    // Position all nodes
    positionNode(root, startX, startY);

    // Calculate final layout bounds
    const allXPositions = nodes.map(n => n.x);
    const allYPositions = nodes.map(n => n.y);
    const minX = Math.min(...allXPositions);
    const maxX = Math.max(...allXPositions);
    const minY = Math.min(...allYPositions);
    const maxY = Math.max(...allYPositions);

    return {
      root,
      nodes,
      width: Math.max(maxX - minX + cardWidth, 600), // Reduced padding and minimum width
      height: maxY - minY + 120, // Account for card height + padding
    };
  }

  /**
   * Render cards in tree layout.
   */
  private renderTreeLayout(layout: TreeLayout): void {
    const atlasGrid = document.getElementById('atlas-grid');
    if (!atlasGrid) return;

    const cardWidth = 150; // Mini card width - matches CSS .size-mini width

    // Switch to tree layout mode
    atlasGrid.style.display = 'relative';
    atlasGrid.style.position = 'relative';
    atlasGrid.style.width = '100%'; // Use full container width instead of fixed width
    atlasGrid.style.minHeight = `${layout.height}px`; // Set minimum height instead of fixed
    atlasGrid.style.overflow = 'visible'; // Allow content to be visible

    // Clear existing content
    atlasGrid.innerHTML = '';

    // Render nodes with absolute positioning
    layout.nodes.forEach(node => {
      const cardHtml = renderDFACard(node.card, 'mini');
      const cardWrapper = document.createElement('div');
      cardWrapper.innerHTML = cardHtml;
      const cardElement = cardWrapper.firstElementChild as HTMLElement;

      if (cardElement) {
        cardElement.style.position = 'absolute';
        cardElement.style.left = `${node.x - cardWidth/2}px`; // Center card properly using actual card width
        cardElement.style.top = `${node.y}px`; // Root at top:0, others maintain relative spacing
        cardElement.style.zIndex = '2';
        cardElement.title = node.card.field; // Add tooltip showing full field name
        atlasGrid.appendChild(cardElement);
      }
    });

    // Draw tree connections
    this.drawTreeConnections(layout);
  }

  /**
   * Draw SVG connections for tree layout with curved branches.
   */
  private drawTreeConnections(layout: TreeLayout): void {
    const connectionsSvg = document.getElementById('atlas-connections') as unknown as SVGSVGElement;
    if (!connectionsSvg) return;

    // Update SVG size
    connectionsSvg.setAttribute('width', '100%'); // Use full container width
    connectionsSvg.setAttribute('height', layout.height.toString());
    connectionsSvg.style.position = 'absolute';
    connectionsSvg.style.top = '0';
    connectionsSvg.style.left = '0';
    connectionsSvg.style.width = '100%';
    connectionsSvg.style.zIndex = '1';

    // Clear existing connections
    connectionsSvg.innerHTML = '';

    // Draw connections between parent and children with curves
    layout.nodes.forEach(node => {
      node.children.forEach(child => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Connection points - carefully calculated to align with card edges
        const cardHeight = 70; // Reduced mini card height estimate to fix 10px offset
        const parentX = node.x; // Center X of parent card
        const parentY = node.y + 20 + cardHeight; // Bottom of parent card (y + cardTopPadding + cardHeight)
        const childX = child.x; // Center X of child card
        const childY = child.y + 20; // Top of child card (y + cardTopPadding)

        // Create curved path - quadratic bezier
        const midY = (parentY + childY) / 2;
        const pathData = `M ${parentX},${parentY} Q ${parentX},${midY} ${childX},${childY}`;

        path.setAttribute('d', pathData);
        path.setAttribute('class', 'tree-connection');
        path.setAttribute('stroke', '#00bcd4');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');

        connectionsSvg.appendChild(path);
      });
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
}
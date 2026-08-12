import Phaser from 'phaser';
import { Coin } from '../entities/Coin.ts';

/**
 * CoinManager — places coins on grass lanes and handles collection.
 * Fires `onCoinCollected` when the player steps on a coin.
 */
export class CoinManager {
  private scene: Phaser.Scene;
  private coins: Coin[] = [];
  private populatedRows: Set<number> = new Set();
  private onCoinCollectedCallback?: () => void;

  // Number of coins to scatter per grass lane (0-2)
  private readonly COINS_PER_LANE = 2;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  public onCoinCollected(callback: () => void): void {
    this.onCoinCollectedCallback = callback;
  }

  /**
   * Call from GameScene.update — passes current lane list and player grid pos.
   */
  public update(
    visibleGrassRows: number[],
    playerGridX: number,
    playerGridY: number,
    getBlockedColsCallback?: (gridY: number) => Set<number>
  ): void {
    // 1. Populate new grass lanes that entered view
    for (const gridY of visibleGrassRows) {
      if (!this.populatedRows.has(gridY)) {
        const blockedCols = getBlockedColsCallback ? getBlockedColsCallback(gridY) : new Set<number>();
        this._populate(gridY, blockedCols);
      }
    }

    // 2. Check collection at player's current position
    for (const coin of this.coins) {
      if (coin.isAt(playerGridX, playerGridY)) {
        coin.collect();
        this.onCoinCollectedCallback?.();
      }
    }

    // 3. Prune destroyed coins
    this.coins = this.coins.filter(c => !c.collected && c.active);
  }

  /**
   * Remove coins on rows that have been culled from the world.
   */
  public pruneRow(gridY: number): void {
    this.populatedRows.delete(gridY);
    const toRemove = this.coins.filter(c => c.gridY === gridY);
    toRemove.forEach(c => { if (!c.collected) c.destroy(); });
    this.coins = this.coins.filter(c => c.gridY !== gridY);
  }

  public clearAll(): void {
    this.coins.forEach(c => c.destroy());
    this.coins = [];
    this.populatedRows.clear();
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private _populate(gridY: number, blockedCols: Set<number>): void {
    this.populatedRows.add(gridY);

    // Skip the very bottom starting row (gridY 18-19) to not block the player
    if (gridY >= 17) return;

    // Place 0-COINS_PER_LANE coins at random X columns, avoiding edges and building blocks
    const usedCols = new Set<number>(blockedCols);
    const count = Phaser.Math.Between(0, this.COINS_PER_LANE);
    for (let i = 0; i < count; i++) {
      let col: number;
      let attempts = 0;
      do {
        col = Phaser.Math.Between(1, 10);
        attempts++;
      } while (usedCols.has(col) && attempts < 10);

      if (!usedCols.has(col)) {
        usedCols.add(col);
        const coin = new Coin(this.scene, col, gridY);
        this.coins.push(coin);
      }
    }
  }
}

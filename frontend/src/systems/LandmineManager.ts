import Phaser from 'phaser';
import { Landmine } from '../entities/Landmine.ts';
import { Player } from '../entities/Player.ts';
import { SoundEffects } from '../utils/sound.ts';

/**
 * LandmineManager — handles spawning, detection, and detonation of landmines.
 */
export class LandmineManager {
  private scene: Phaser.Scene;
  private landmines: Landmine[] = [];
  private populatedRows: Set<number> = new Set();
  private onPlayerHitCallback?: () => void;

  // Maximum landmines per grass lane
  private readonly LANDMINES_PER_LANE = 1;
  // Spawning probability (e.g. 60% chance to spawn a mine on a grass lane)
  private readonly SPAWN_CHANCE = 0.6;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public onPlayerHit(callback: () => void): void {
    this.onPlayerHitCallback = callback;
  }

  /**
   * Called from GameScene.update.
   * Spawns landmines on new grass lanes, checks if player triggers any,
   * and handles explosion logic.
   */
  public update(
    visibleGrassRows: number[],
    player: Player,
    getShopColAtRow: (gridY: number) => number | null,
    getBlockedColsCallback?: (gridY: number) => Set<number>
  ): void {
    // 1. Populate new grass lanes that entered view
    for (const gridY of visibleGrassRows) {
      if (!this.populatedRows.has(gridY)) {
        const blockedCols = getBlockedColsCallback ? getBlockedColsCallback(gridY) : new Set<number>();
        const shopCol = getShopColAtRow(gridY);
        this._populate(gridY, blockedCols, shopCol);
      }
    }

    // 2. Check if player stepped on a landmine
    const px = player.gridX;
    const py = player.gridY;
    
    for (const mine of this.landmines) {
      if (!mine.isTriggered && !mine.isExploded && mine.isAt(px, py)) {
        // Trigger landmine countdown!
        mine.trigger(() => {
          this._detonate(mine, player);
        });
      }
    }

    // 3. Keep list clean of destroyed/exploded mines
    this.landmines = this.landmines.filter(m => !m.isExploded && m.active);
  }

  /**
   * Remove mines on rows that have been culled from the world.
   */
  public pruneRow(gridY: number): void {
    this.populatedRows.delete(gridY);
    const toRemove = this.landmines.filter(m => m.gridY === gridY);
    toRemove.forEach(m => m.destroy());
    this.landmines = this.landmines.filter(m => m.gridY !== gridY);
  }

  public clearAll(): void {
    this.landmines.forEach(m => m.destroy());
    this.landmines = [];
    this.populatedRows.clear();
  }

  // ─── Internal Spawning ─────────────────────────────────────────────────────

  private _populate(gridY: number, blockedCols: Set<number>, shopCol: number | null): void {
    this.populatedRows.add(gridY);

    // Don't spawn mines on starting rows to avoid instant death
    if (gridY >= 17) return;

    // Roll spawn chance
    if (Math.random() > this.SPAWN_CHANCE) return;

    const usedCols = new Set<number>(blockedCols);
    
    // If there is a shop, block shop columns (around shopCol)
    if (shopCol !== null) {
      usedCols.add(shopCol);
      if (shopCol > 0) usedCols.add(shopCol - 1);
      if (shopCol < 11) usedCols.add(shopCol + 1);
    }

    // Attempt to place a landmine
    const count = Phaser.Math.Between(0, this.LANDMINES_PER_LANE);
    for (let i = 0; i < count; i++) {
      let col: number;
      let attempts = 0;
      do {
        col = Phaser.Math.Between(1, 10);
        attempts++;
      } while (usedCols.has(col) && attempts < 10);

      if (!usedCols.has(col)) {
        usedCols.add(col);
        const mine = new Landmine(this.scene, col, gridY);
        this.landmines.push(mine);
      }
    }
  }

  // ─── Detonation ────────────────────────────────────────────────────────────

  private _detonate(mine: Landmine, player: Player): void {
    const mineX = mine.gridX;
    const mineY = mine.gridY;

    // 1. Play hit sound (explosion)
    SoundEffects.playHit(this.scene);

    // 2. Play visual explosions in 3x3 grid radius
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const gx = mineX + dx;
        const gy = mineY + dy;

        // Bound check (game grid is X: 0-11)
        if (gx < 0 || gx >= 12) continue;

        // Calculate screen positions
        const px = gx * 40 + 20;
        const py = gy * 60 + 30;

        // Play explosion animation (larger in center, smaller around)
        const isCenter = (dx === 0 && dy === 0);
        const exp = this.scene.add.sprite(px, py, 'tank_explosion2');
        exp.setScale(isCenter ? 1.4 : 0.85);
        exp.setDepth(9999);
        
        // Slightly tint outer explosions orange for a premium effect
        if (!isCenter) {
          exp.setTint(0xffaa44);
        }

        exp.play('tank_explode');
        exp.on('animationcomplete', () => exp.destroy());
      }
    }

    // 3. Screen shake
    this.scene.cameras.main.shake(200, 0.015);

    // 4. Damage calculation (is player within 3x3 radius?)
    const distanceX = Math.abs(player.gridX - mineX);
    const distanceY = Math.abs(player.gridY - mineY);

    if (distanceX <= 1 && distanceY <= 1) {
      if (player.isInvincible || player.isFlying) {
        return; // Invincible or flying above ground
      }

      if (player.hasShield) {
        // Shield absorbs the blast
        player.setHasShield(false);
        player.becomeInvincible(1000);
        
        // Show status feedback
        const popup = this.scene.add.text(player.x, player.y - 25, 'โล่แตก! (SHIELD BROKEN)', {
          font: 'bold 12px Mitr, Nunito, sans-serif',
          color: '#ffffff',
          backgroundColor: '#d32f2f',
          padding: { x: 6, y: 3 }
        }).setOrigin(0.5).setDepth(200);

        this.scene.tweens.add({
          targets: popup,
          y: popup.y - 45,
          alpha: 0,
          duration: 800,
          onComplete: () => popup.destroy()
        });
      } else {
        // No shield: invoke hit callback (lose a life)
        this.onPlayerHitCallback?.();
      }
    }
  }
}

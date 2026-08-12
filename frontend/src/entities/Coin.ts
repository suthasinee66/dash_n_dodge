import Phaser from 'phaser';
import { Raft } from '../entities/Raft.ts';

/**
 * Coin — collectible pickup placed on Grass lanes.
 * Collected when the player steps onto the same grid cell.
 */
export class Coin extends Phaser.GameObjects.Container {
  public gridX: number;
  public gridY: number;
  public collected: boolean = false;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    const px = gridX * 40 + 20;
    const py = gridY * 60 + 30;
    super(scene, px, py);

    this.gridX = gridX;
    this.gridY = gridY;

    this._drawCoin();
    this._startIdle();

    this.setDepth(75);
    scene.add.existing(this);
  }

  // ─── Visual ────────────────────────────────────────────────────────────────

  private _drawCoin(): void {
    // Outer gold ring
    const ring = this.scene.add.graphics();
    ring.fillStyle(0xffd600, 1);
    ring.fillCircle(0, 0, 13.5);

    // Inner lighter circle (shine)
    ring.fillStyle(0xffee58, 1);
    ring.fillCircle(-3, -3, 7.5);

    // Small star / $-mark
    const text = this.scene.add.text(0, 0, '★', {
      font: 'bold 12px Nunito, sans-serif',
      color: '#b8860b'
    }).setOrigin(0.5, 0.5);

    this.add([ring, text]);
  }

  private _startIdle(): void {
    // Gentle bob up/down
    this.scene.tweens.add({
      targets: this,
      y: this.y - 4,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // ─── Collect ───────────────────────────────────────────────────────────────

  public collect(): void {
    if (this.collected) return;
    this.collected = true;

    // Burst scale-out + fade
    this.scene.tweens.add({
      targets: this,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 220,
      ease: 'Power2',
      onComplete: () => this.destroy()
    });
  }

  // Utility ─────────────────────────────────────────────────────────────────

  /** Returns true if player grid position matches this coin */
  public isAt(gx: number, gy: number): boolean {
    return this.gridX === gx && this.gridY === gy && !this.collected;
  }
}

// Re-export Raft for convenient import in CoinManager
export { Raft };

import Phaser from 'phaser';

/**
 * Landmine — hidden trap placed on sidewalks/grass lanes.
 * Becomes visible when the player steps on it.
 * Counts down for 2 seconds and explodes in a 3x3 grid radius.
 */
export class Landmine extends Phaser.GameObjects.Container {
  public gridX: number;
  public gridY: number;
  public isTriggered: boolean = false;
  public isExploded: boolean = false;

  private mineBody!: Phaser.GameObjects.Graphics;
  private blinkingLight!: Phaser.GameObjects.Graphics;
  private countdownText!: Phaser.GameObjects.Text;
  private blinkEvent?: Phaser.Time.TimerEvent;
  private dangerZone!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    const px = gridX * 40 + 20;
    const py = gridY * 60 + 30;
    super(scene, px, py);

    this.gridX = gridX;
    this.gridY = gridY;

    this._drawMine();
    this.setDepth(74); // Just under player, above background curbs

    // Invisible initially
    this.setVisible(false);

    scene.add.existing(this);
  }

  // ─── Draw Components ────────────────────────────────────────────────────────

  private _drawMine(): void {
    // 1. Dark metallic base
    this.mineBody = this.scene.add.graphics();
    this.mineBody.fillStyle(0x37474f, 1); // Dark blue-grey metal
    this.mineBody.fillCircle(0, 0, 14);
    
    // Outer metallic ring details
    this.mineBody.lineStyle(2, 0x263238, 1);
    this.mineBody.strokeCircle(0, 0, 14);
    this.mineBody.strokeCircle(0, 0, 8);

    // 2. Blinking LED in the center
    this.blinkingLight = this.scene.add.graphics();
    this.blinkingLight.fillStyle(0xff1744, 1); // Bright red LED
    this.blinkingLight.fillCircle(0, 0, 4.5);

    // 3. Mini countdown timer text overlay
    this.countdownText = this.scene.add.text(0, -22, '2.0', {
  font: 'bold 11px Nunito, Mitr, sans-serif',
  color: '#ff1744',
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  padding: { x: 3, y: 1 }
}).setOrigin(0.5).setVisible(false);

// 🔴 พื้นที่อันตราย 3x3 ช่อง
this.dangerZone = this.scene.add.graphics();
this.dangerZone.fillStyle(0xff1744, 0.22);
this.dangerZone.fillRect(-60, -90, 120, 180);
this.dangerZone.setAlpha(0);
this.dangerZone.setDepth(-1);

this.add([
  this.dangerZone,
  this.mineBody,
  this.blinkingLight,
  this.countdownText
]);
  }

  // ─── Trigger & Countdown ───────────────────────────────────────────────────

  /**
   * Reveal the landmine and start the 2-second countdown
   */
  public trigger(onExplodeCallback: () => void): void {
    if (this.isTriggered || this.isExploded) return;
    this.isTriggered = true;
    this.setVisible(true);
    this.countdownText.setVisible(true);

    // Start blinking faster and faster
    let blinkDelay = 300;
    let elapsed = 0;
    const duration = 2000; // 2 seconds countdown

    const triggerBlink = () => {
  if (this.isExploded) return;

  // 🔴 กะพริบพื้นที่ระเบิด 3x3
  this.dangerZone.setAlpha(
    this.dangerZone.alpha > 0 ? 0 : 0.28
  );

  // 🔴 กะพริบไฟบนกับระเบิด
  this.blinkingLight.setAlpha(
    this.blinkingLight.alpha === 1 ? 0.2 : 1
  );

  elapsed += blinkDelay;

      // Update countdown text
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      this.countdownText.setText(remaining.toFixed(1) + 's');

      if (elapsed >= duration) {
        this.explode(onExplodeCallback);
      } else {
        // Accelerate blink rate as it approaches detonation
        if (elapsed > 1400) {
          blinkDelay = 75;
        } else if (elapsed > 800) {
          blinkDelay = 150;
        }
        this.blinkEvent = this.scene.time.delayedCall(blinkDelay, triggerBlink);
      }
    };

    triggerBlink();
  }

  // ─── Detonation ────────────────────────────────────────────────────────────

  private explode(onExplodeCallback: () => void): void {
    if (this.isExploded) return;
    this.isExploded = true;

    if (this.blinkEvent) {
  this.blinkEvent.destroy();
}

this.dangerZone?.destroy();

    // Call manager callback to apply damage, screen shake, etc.
    onExplodeCallback();

    // Destroy this game object
    this.destroy();
  }

  // Utility ─────────────────────────────────────────────────────────────────

  public isAt(gx: number, gy: number): boolean {
    return this.gridX === gx && this.gridY === gy;
  }
}

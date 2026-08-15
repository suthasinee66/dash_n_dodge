import Phaser from 'phaser';
import { Raft } from './Raft.ts';

export class Player extends Phaser.GameObjects.Sprite {
  // Logical grid coordinates
  public gridX: number;
  public gridY: number;

  // Grid dimensions
  private readonly columns: number = 12;
  private readonly rows: number = 20;
  private readonly cellWidth: number = 40;
  private readonly cellHeight: number = 60;

  // Movement state
  private isMoving: boolean = false;
  private readonly moveSpeed: number = 120; // tween duration ms

  // Raft-riding state
  public isRiding: boolean = false;
  public currentRaft: Raft | null = null;
  // Waiting at map edge for a raft from the opposite side
public isWaitingForRaft: boolean = false;
public waitingSide: 'left' | 'right' | null = null;

  // Stun state
  public isStunned: boolean = false;
  private stunTween?: Phaser.Tweens.Tween;
  private stunWobbleTween?: Phaser.Tweens.Tween;
  private stunStars?: Phaser.GameObjects.Text;

  // Scale normalization
  public baseScale: number = 1.2;

  // Invincibility state
  public isInvincible: boolean = false;
  private invincibleTween: Phaser.Tweens.Tween | null = null;

  // Item states
  public isFlying: boolean = false;
  public hasShield: boolean = false;
  public speedBoostActive: boolean = false;
  private shieldGraphics: Phaser.GameObjects.Graphics | null = null;

  // Callbacks
  public onMoveCompleteCallback?: (nextX: number, nextY: number) => void;

  constructor(scene: Phaser.Scene, startGridX: number, startGridY: number) {
    const skin = scene.registry.get('characterSkin') || 'man';
    const pixelX = startGridX * 40 + 20;
    const pixelY = startGridY * 60 + 30;

    super(scene, pixelX, pixelY, skin);

    this.gridX = startGridX;
    this.gridY = startGridY;
    this.baseScale = 0.21 ;

    this.setScale(this.baseScale);
    const originY = 0.8;
    this.setOrigin(0.5, originY);

    // Arcade Physics circle body
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      // Normalize scaled collision radius to 18px on-screen (comfort size for 60x60 grid)
      const localRadius = 18 / this.baseScale;
      const offsetX = this.width * 0.5 - localRadius;
      const offsetY = this.height * originY - localRadius;
      body.setCircle(localRadius, offsetX, offsetY);
      body.setImmovable(true);
    }

    scene.add.existing(this);
  }

  // ─── Movement ──────────────────────────────────────────────────────────────

  public move(dirX: number, dirY: number): void {
    if (this.isMoving) return;

    const nextX = this.gridX + dirX;
    const nextY = this.gridY + dirY;

    if (nextX < 0 || nextX >= this.columns || nextY >= this.rows) return;

    this.isMoving = true;
    this.isRiding = false;     // break any raft attachment on new step
    this.currentRaft = null;

    const skin = this.scene.registry.get('characterSkin') || 'man';

    // Always point head upwards, flip sprite horizontally for left/right movement
    this.setAngle(0);
    if (dirX === -1) {
      this.setFlipX(true);
    } else if (dirX === 1) {
      this.setFlipX(false);
    }

    this.setTexture(skin + '_walk1');

    const targetX = nextX * this.cellWidth + this.cellWidth / 2;
    const targetY = nextY * this.cellHeight + this.cellHeight / 2;

    const speed = this.getMoveSpeed();

    // Squash-and-stretch relative to baseScale
    this.scene.tweens.add({
      targets: this,
      scaleY: this.baseScale * 1.35,
      scaleX: this.baseScale * 0.75,
      duration: speed / 2,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: speed,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        if (tween.progress > 0.55 && this.texture.key !== skin + '_walk2') {
          this.setTexture(skin + '_walk2');
        }
      },
      onComplete: () => {
        this.gridX = nextX;
        this.gridY = nextY;
        this.isMoving = false;
        this.setTexture(skin);
        this.onMoveCompleteCallback?.(nextX, nextY);
      }
    });
  }

  // ─── Raft Riding ───────────────────────────────────────────────────────────

  /**
   * Attach to a raft — called from GameScene when player lands on a river lane
   * and a raft is found under them.
   */
  public attachToRaft(raft: Raft): void {
  this.isRiding = true;
  this.currentRaft = raft;

  // เจอแพฝั่งตรงข้ามแล้ว
  this.isWaitingForRaft = false;
  this.waitingSide = null;
}

  /**
   * Drift horizontally with the attached raft every frame.
   * Called from GameScene.update() when isRiding is true.
   */
  public driftWithRaft(delta: number): void {
  if (!this.isRiding || !this.currentRaft || this.isMoving) return;

  const raft = this.currentRaft;
  const mapWidth = this.columns * this.cellWidth; // 480
  const amount = (raft.speed * delta) / 1000;
  const drift = raft.direction === 'right' ? amount : -amount;

  // ถ้ากำลังรอแพฝั่งตรงข้าม
  // ห้ามขยับตามแพเดิมอีก
  if (this.isWaitingForRaft) {
    return;
  }

  this.x += drift;

  // ─────────────────────────────────────────
  // แพออกทางขวา
  // ─────────────────────────────────────────
  if (raft.direction === 'right' && this.x >= mapWidth) {
    this.x = mapWidth - 1;

    this.isWaitingForRaft = true;
    this.waitingSide = 'right';

    return;
  }

  // ─────────────────────────────────────────
  // แพออกทางซ้าย
  // ─────────────────────────────────────────
  if (raft.direction === 'left' && this.x <= 0) {
    this.x = 1;

    this.isWaitingForRaft = true;
    this.waitingSide = 'left';

    return;
  }

  // Update grid position
  this.gridX = Phaser.Math.Clamp(
    Math.round((this.x - 20) / this.cellWidth),
    0,
    this.columns - 1
  );
}

  // ─── Death poses ───────────────────────────────────────────────────────────

  public triggerCrash(): void {
    const skin = this.scene.registry.get('characterSkin') || 'man';
    this.setTexture(skin + '_down');
    this.setAngle(0);
  }

  public triggerDrown(): void {
    // Spin and shrink into the water
    this.setTint(0x4fc3f7);
    this.scene.tweens.add({
      targets: this,
      angle: 360,
      scale: 0,
      duration: 450,
      ease: 'Power2'
    });
  }

  /**
   * Apply stun state to the player, disabling inputs, wiggling character, and spinning 💫 stars.
   */
  public stun(durationMs: number): void {
    if (this.isStunned) return;
    this.isStunned = true;

    // Reset current walk animations/tweens on player if any
    this.scene.tweens.killTweensOf(this);
    this.isMoving = false;
    this.setScale(this.baseScale); // reset scale squash

    const originalAngle = this.angle;
    this.stunWobbleTween = this.scene.tweens.add({
      targets: this,
      angle: { from: originalAngle - 15, to: originalAngle + 15 },
      duration: 100,
      yoyo: true,
      repeat: -1
    });

    // Create floating, spinning stars
    this.stunStars = this.scene.add.text(this.x, this.y - 30, '💫', {
      font: '22px Arial, sans-serif'
    }).setOrigin(0.5).setDepth(200);

    // Spin the stars and follow the player
    this.stunTween = this.scene.tweens.add({
      targets: this.stunStars,
      angle: 360,
      duration: 1000,
      repeat: -1,
      onUpdate: () => {
        if (this.stunStars) {
          this.stunStars.x = this.x;
          this.stunStars.y = this.y - 30;
        }
      }
    });

    // Stun timeout
    this.scene.time.delayedCall(durationMs, () => {
      this.clearStun(originalAngle);
    });
  }

  public clearStun(originalAngle: number): void {
    this.isStunned = false;
    this.stunWobbleTween?.stop();
    this.stunTween?.stop();
    this.stunStars?.destroy();
    this.stunStars = undefined;
    this.setAngle(originalAngle);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  public onMoveComplete(cb: (nextX: number, nextY: number) => void): void {
    this.onMoveCompleteCallback = cb;
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public getIsStunned(): boolean {
    return this.isStunned;
  }

  public resetPosition(startGridX: number, startGridY: number): void {
    this.clearStun(0);
    this.gridX = startGridX;
    this.gridY = startGridY;
    this.x = startGridX * this.cellWidth + this.cellWidth / 2;
    this.y = startGridY * this.cellHeight + this.cellHeight / 2;
    this.setAngle(0);
    this.setFlipX(false);
    this.isMoving = false;
    this.isRiding = false;
    this.currentRaft = null;
    this.isWaitingForRaft = false;
this.waitingSide = null;
    const skin = this.scene.registry.get('characterSkin') || 'man';
    this.setTexture(skin);
    this.clearTint();
    
    // Reset invincibility state
    this.isInvincible = false;
    if (this.invincibleTween) {
      this.invincibleTween.stop();
      this.invincibleTween = null;
    }
    this.alpha = 1;
    this.setHasShield(false);
    this.setIsFlying(false);
    this.speedBoostActive = false;

    const toonSkins = ['female_adventurer', 'female_person', 'male_adventurer', 'male_person', 'robot', 'zombie'];
    this.baseScale = toonSkins.includes(skin) ? 0.21 : 3.6;
    this.setScale(this.baseScale);

    const originY = 0.8;
    this.setOrigin(0.5, originY);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      const localRadius = 18 / this.baseScale;
      const offsetX = this.width * 0.5 - localRadius;
      const offsetY = this.height * originY - localRadius;
      body.setCircle(localRadius, offsetX, offsetY);
    }
  }

  public becomeInvincible(durationMs: number): void {
    if (this.isInvincible) return;
    this.isInvincible = true;

    // Blink tween
    this.invincibleTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.2,
      duration: 100,
      yoyo: true,
      repeat: -1
    });

    this.scene.time.delayedCall(durationMs, () => {
      this.isInvincible = false;
      if (this.invincibleTween) {
        this.invincibleTween.stop();
        this.invincibleTween = null;
      }
      this.alpha = 1;
    });
  }

  public setHasShield(val: boolean): void {
    this.hasShield = val;
    if (val) {
      if (!this.shieldGraphics) {
        this.shieldGraphics = this.scene.add.graphics();
      }
    } else {
      if (this.shieldGraphics) {
        this.shieldGraphics.destroy();
        this.shieldGraphics = null;
      }
    }
  }

  public setIsFlying(val: boolean): void {
    this.isFlying = val;
    if (val) {
      this.setAlpha(0.7);
      this.setTint(0x00ffff);
    } else {
      this.setAlpha(1);
      this.clearTint();
    }
  }

  public setSpeedBoostActive(val: boolean): void {
    this.speedBoostActive = val;
  }

  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.shieldGraphics) {
      this.shieldGraphics.clear();
this.shieldGraphics.fillStyle(0x00bfff, 0.25);
this.shieldGraphics.fillCircle(this.x, this.y - 8, 28);
this.shieldGraphics.setDepth(this.depth + 1);
    }
  }

  public getMoveSpeed(): number {
    return this.speedBoostActive ? 65 : this.moveSpeed;
  }
}

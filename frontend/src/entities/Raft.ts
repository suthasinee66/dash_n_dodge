import Phaser from 'phaser';

/**
 * Raft — a moving platform on River lanes.
 * Sizes: 1 cell (40px), 2 cells (80px), 3 cells (120px).
 * The player rides it across the river; missing = drowning.
 */
export class Raft extends Phaser.GameObjects.Container {
  public speed: number;
  public direction: 'left' | 'right';
  public gridY: number;
  public raftWidth: number;
  public isShip: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: 'left' | 'right',
    speed: number,
    gridY: number,
    size: 1 | 2 | 3,  // grid cells
    isShip: boolean = false
  ) {
    super(scene, x, y);

    this.speed = speed;
    this.direction = direction;
    this.gridY = gridY;
    this.isShip = isShip;

    if (isShip) {
      this.raftWidth = 65; // size of a car
      this._drawShip();
    } else {
      this.raftWidth = size * 40;
      this._drawRaft(size);
    }

    // Physics body attached to the Container
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.allowGravity = false;
    // Body slightly narrower than visual for fair hitbox
    body.setSize(this.raftWidth - 4, 27);
    body.setOffset(-this.raftWidth / 2 + 2, -13.5);

    this.setDepth(70);
    scene.add.existing(this);
  }

  // ─── Visual ────────────────────────────────────────────────────────────────

  private _drawShip(): void {
    const idx = Phaser.Math.Between(1, 6);
    const textureKey = idx === 1 ? 'pirate_ship' : `pirate_ship${idx}`;
    const shipSprite = this.scene.add.sprite(0, 0, textureKey);
    // The original image is vertical (taller than it is wide). 
    // We set display size to width=35, height=65, then rotate it to lie horizontally (65px wide, 35px tall).
    shipSprite.setDisplaySize(52.5, 97.5);
    shipSprite.setOrigin(0.5, 0.5);
    
    if (this.direction === 'right') {
      shipSprite.setAngle(-90);
    } else {
      shipSprite.setAngle(90);
    }
    this.add(shipSprite);
  }

  private _drawRaft(size: 1 | 2 | 3): void {
    const w = size * 40;
    const h = 30;

    // Base log / plank (brown wood)
    const base = this.scene.add.graphics();
    base.fillStyle(0x6d4c41, 1);           // warm brown
    base.fillRoundedRect(-w / 2, -h / 2, w, h, 5);

    // Wood grain lines
    base.lineStyle(1, 0x4e342e, 0.6);
    const grainCount = size * 2;
    for (let i = 1; i < grainCount; i++) {
      const gx = -w / 2 + (w / grainCount) * i;
      base.lineBetween(gx, -h / 2 + 3, gx, h / 2 - 3);
    }

    // Top highlight strip (lighter wood)
    const shine = this.scene.add.graphics();
    shine.fillStyle(0xa1887f, 0.55);
    shine.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, 5, 3);

    this.add([base, shine]);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  public moveStep(delta: number): void {
    const amount = (this.speed * delta) / 1000;
    if (this.direction === 'right') {
      this.x += amount;
    } else {
      this.x -= amount;
    }

    // Sync physics body with container position
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.reset(this.x, this.y);
    }
  }
}

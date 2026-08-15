import Phaser from 'phaser';
import { Player } from '../entities/Player.ts';
import { Vehicle } from '../entities/Vehicle.ts';
import { Lane, LaneConfig, GameTheme } from '../entities/Lane.ts';
import { TrafficManager } from '../systems/TrafficManager.ts';
import { RaftManager } from '../systems/RaftManager.ts';
import { CoinManager } from '../systems/CoinManager.ts';
import { CollisionManager } from '../systems/CollisionManager.ts';
import { LandmineManager } from '../systems/LandmineManager.ts';
import { ScoreManager } from '../systems/ScoreManager.ts';
import { DifficultyManager } from '../systems/DifficultyManager.ts';
import { TouchControls } from '../ui/TouchControls.ts';
import { SoundEffects } from '../utils/sound.ts';


export class GameScene extends Phaser.Scene {
  private player!: Player;
  private lanes: Map<number, Lane> = new Map();

  private trafficManager!: TrafficManager;
  private raftManager!: RaftManager;
  private coinManager!: CoinManager;
  private landmineManager!: LandmineManager;
  private collisionManager!: CollisionManager;
  private scoreManager!: ScoreManager;
  private touchControls!: TouchControls;
  private readonly GAME_FONT = "'Noto Sans Thai', sans-serif";
  // Bullets & buildings groups/state
  private bullets!: Phaser.Physics.Arcade.Group;
  private buildings: Map<number, Set<number>> = new Map(); // gridY -> Set of gridX
  private clouds!: Phaser.GameObjects.Group;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private difficultyText!: Phaser.GameObjects.Text;
  private instructText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private countdownOverlay!: Phaser.GameObjects.Rectangle;

  private coinText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text | null;
  private livesText!: Phaser.GameObjects.Text;
  private lives: number = 3;

  private isGameOver: boolean = false;
  private isCountdown: boolean = true;

  // Inventory & Shop properties
  private inventory: (string | null)[] = [null, null];
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private isShopOpen: boolean = false;

  // River-lane set (row indices that are river type)
  private riverRows: Set<number> = new Set();

  // Skills
  public isRiverFrozen: boolean = false;
  public isMidasActive: boolean = false;
  private currentPlayersList: any[] = [];

  // Active item countdown
  private itemCountdownText!: Phaser.GameObjects.Text;
  private activeItemTimer?: Phaser.Time.TimerEvent;
  private activeItemEndTime: number = 0;

  // ─── Theme progression ─────────────────────────────
private shopsPassed: number = 0;
private currentTheme: GameTheme = 'garden';
private passedShopRows: Set<number> = new Set();


  constructor() {
    super('GameScene');
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async create(): Promise<void> {
    
    const isMultiplayer = this.registry.get('isMultiplayer') === true;
    const isHost = this.registry.get('isHost') === true;

    if (isMultiplayer && isHost) {
      this.isGameOver = true;
      this.physics.pause();
      this.showHostDashboard();
      return;
    }

    this.lanes.clear();
    this.riverRows.clear();
    this.buildings.clear();
    this.isGameOver = false;
    this.isCountdown = true;
    this.lives = 3;
    this.streakText = null;

    this.shopsPassed = 0;
    this.currentTheme = 'garden';
    this.passedShopRows.clear();

    this.physics.resume();

    // Reset skills
    this.isRiverFrozen = false;
    this.isMidasActive = false;


    // Reset Inventory and Shop state
    this.inventory = [null, null];
    this.isShopOpen = false;

    if (this.input.keyboard) {
      this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    }

    this.player = new Player(this, 6, 18);
  // ─── Active Item Countdown ───────────────────────
this.itemCountdownText = this.add.text(
  this.player.x,
  this.player.y - 48,
  '',
  {
    fontFamily: this.GAME_FONT,
fontSize: '15px',
fontStyle: 'bold',
    color: '#ffffff',
    align: 'center'
  }
)
  .setOrigin(0.5)
  .setDepth(500)
  .setVisible(false);

    this.player.onMoveComplete((nextX, nextY) => {
      // Shop trigger
      this.checkShopTrigger(nextX, nextY);

      // Score update
      const prevScore = this.scoreManager.getScore();
      const pts = this.scoreManager.updateRowPosition(nextY);
      if (pts > 0) {
        SoundEffects.playScore(this);
        this._triggerScorePopup(pts);
        this._showStreakIndicator();
      }
      if (this.scoreManager.getScore() > prevScore || pts > 0) {
        this.updateScoreUI();
      }
    });
    this.trafficManager = new TrafficManager(this);
    this.raftManager = new RaftManager(this);
    this.coinManager = new CoinManager(this);
    this.landmineManager = new LandmineManager(this);
    this.landmineManager.onPlayerHit(() => {
      this.handlePlayerCollision();
    });
    this.collisionManager = new CollisionManager(this);
    this.scoreManager = new ScoreManager();
    this.bullets = this.physics.add.group();
    this.clouds = this.add.group();

    this.clouds = this.add.group();

    this.setupHUD();
    this.setupGameResultListener();

    // Spawn 5 drifting clouds at start (restricted to top 30% of screen)
    const topLimit = this.cameras.main.height * 0.3;
    for (let i = 0; i < 5; i++) {
      const cx = Phaser.Math.Between(-50, 430);
      const cy = Phaser.Math.Between(10, topLimit);
      const cloudIndex = Phaser.Math.Between(1, 8);
      const cloud = this.add.sprite(cx, cy, `cloud${cloudIndex}`).setDepth(150);
      cloud.setScale(0.4 * (0.8 + Math.random() * 0.4));
      cloud.setAlpha(0.65 + Math.random() * 0.25);
      cloud.setData('speed', 15 + Math.random() * 15);
      cloud.setScrollFactor(0); // fixed to screen viewport
      this.clouds.add(cloud);
    }

    const viewWidth = this.cameras.main.width;
    const viewHeight = this.cameras.main.height;

    // Countdown overlay (full-screen dim)
    this.countdownOverlay = this.add.rectangle(
      viewWidth / 2, viewHeight / 2, viewWidth, viewHeight,
      0x000000, 0.70
    ).setScrollFactor(0).setDepth(299);

    // Countdown text — large, center-screen
    this.countdownText = this.add.text(viewWidth / 2, viewHeight / 2, '', {
      fontFamily: this.GAME_FONT,
fontSize: '22px',
fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1565C0',
      strokeThickness: 8,
      align: 'center',
      shadow: {
        offsetX: 0,
        offsetY: 8,
        color: '#0d47a1',
        blur: 24,
        fill: true
      }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    // Vehicle collision
    this.collisionManager.setupCollision(this.player, this.trafficManager, () => {
      this.handlePlayerCollision();
    });

    // Bullets overlap with player
    this.physics.add.overlap(this.player, this.bullets, (_pObj, bObj) => {
      this.handleBulletHit(bObj as Phaser.Physics.Arcade.Sprite);
    });

    // Score update on move completion
    // NOTE: Removed - now merged into the single onMoveComplete callback above.

    // Coin collection
    this.coinManager.onCoinCollected(() => {
      const pts = this.scoreManager.collectCoin();
      SoundEffects.playScore(this);
      this._triggerCoinPopup(pts);
      this.updateScoreUI();
    });

    // Touch / swipe controls
    this.touchControls = new TouchControls(this, (dirX, dirY) => {
      if (this.isCountdown || this.isGameOver || this.player.getIsStunned()) return;
      this.attemptPlayerMove(dirX, dirY);
    });

    // Keyboard input
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (this.isCountdown || this.isGameOver || this.player.getIsStunned()) return;
        switch (event.code) {
          case 'ArrowUp': case 'KeyW': this.attemptPlayerMove(0, -1); break;
          case 'ArrowDown': case 'KeyS': this.attemptPlayerMove(0, 1); break;
          case 'ArrowLeft': case 'KeyA': this.attemptPlayerMove(-1, 0); break;
          case 'ArrowRight': case 'KeyD': this.attemptPlayerMove(1, 0); break;
        }
      });
    }

    // Instruction text
    this.instructText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 20, 'ลูกศร / WASD หรือปัดหน้าจอเพื่อเดิน', {
      fontFamily: this.GAME_FONT,
fontSize: '13px',
fontStyle: 'bold',
      color: '#1a3a5c',
      backgroundColor: 'rgba(255,255,255,0.7)',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    this.startCountdown();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

      // ทำให้ Countdown ติดตามหัวตัวละคร
if (this.itemCountdownText?.active && this.itemCountdownText.visible) {
  this.itemCountdownText.setPosition(
    this.player.x,
    this.player.y - 48
  );
}

    // Handle Item usage from keyboard hotkeys
    if (this.input.keyboard && !this.isShopOpen && !this.isCountdown) {
      if (Phaser.Input.Keyboard.JustDown(this.keyQ) || Phaser.Input.Keyboard.JustDown(this.key1)) {
        this.useItem(0);
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyE) || Phaser.Input.Keyboard.JustDown(this.key2)) {
        this.useItem(1);
      }
    }

    // 1. Camera follow (smooth lerp)
    const targetScrollY = this.player.y - (this.cameras.main.height * 0.75);
    const maxScrollY = 1200 - this.cameras.main.height;
    const cappedScrollY = Math.min(maxScrollY, targetScrollY);
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, cappedScrollY, 0.08);

    if (this.instructText) {
      this.instructText.y = this.cameras.main.scrollY + this.cameras.main.height - 20;
    }

    // 2. Clouds drift (restricted to top 30% of viewport Y space)
    const currentTopLimit = this.cameras.main.height * 0.3;
    this.clouds.getChildren().forEach(c => {
      const cloud = c as Phaser.GameObjects.Sprite;
      cloud.x += (cloud.getData('speed') * delta) / 1000;
      if (cloud.x > 560) {
        cloud.x = -80;
        // respawn Y coordinate relative to screen (fixed with scrollFactor 0)
        cloud.y = Phaser.Math.Between(10, currentTopLimit);
      }
    });

    // 3. Lane spawning / pruning
    const topRow = Math.floor(this.cameras.main.scrollY / 60) - 2;
    const bottomRow = Math.floor((this.cameras.main.scrollY + this.cameras.main.height) / 60) + 2;

    for (let y = topRow; y <= bottomRow; y++) {
      this.getOrCreateLane(y);
    }

    for (const [y, lane] of this.lanes.entries()) {
      if (y < topRow - 6 || y > bottomRow + 6) {
        lane.destroyAll();
        this.lanes.delete(y);
        this.trafficManager.pruneLaneMemory(y);
        this.raftManager.pruneLaneMemory(y);
        this.coinManager.pruneRow(y);
        this.landmineManager.pruneRow(y);
        this.riverRows.delete(y);
        this.buildings.delete(y);
      }
    }

    // 4. Traffic update & shoot bullets callback
    this.trafficManager.update(delta, Array.from(this.lanes.values()), this.scoreManager.getScore(), (bx, by, dir) => {
      this.fireBullet(bx, by, dir);
    });

    // 5. Raft update (move rafts)
    this.raftManager.update(delta, Array.from(this.lanes.values()));

    // 6. Raft riding drift
    if (this.player.isRiding) {
      this.player.driftWithRaft(delta * this.raftManager.timeScale);
    }

    // 7. River drowning check
    const onRiverLane = this.riverRows.has(this.player.gridY);
    this.collisionManager.updateRiverCheck(
      this.player,
      this.raftManager,
      onRiverLane,
      () => this.handleDrowning()
    );

    // 8. Out-of-bounds check (player drifted off screen on raft)
    this.collisionManager.checkOutOfBounds(this.player, () => this.handleDrowning());

    // 9. Coin collection check (avoiding spawning coins on buildings/shops/trees)
    const grassRows = Array.from(this.lanes.values())
      .filter(l => l.type === 'grass')
      .map(l => l.gridY);
    this.coinManager.update(grassRows, this.player.gridX, this.player.gridY, (y) => {
      return this.getBlockedColsAtRow(y);
    });

    // 9.5. Landmine check (avoiding spawning on buildings/shops/trees, updating tick/explosion)
    this.landmineManager.update(
      grassRows,
      this.player,
      (y) => {
        const lane = this.lanes.get(y);
        return lane && lane.hasShop ? lane.shopCol : null;
      },
      (y) => {
        return this.getBlockedColsAtRow(y);
      }
    );

    // 10. Prune off-screen bullets
    this.bullets.getChildren().forEach(b => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (bullet.x < -60 || bullet.x > 540) {
        this.bullets.remove(bullet, true, true);
      }
    });
  }

  // ─── Lane Factory ──────────────────────────────────────────────────────────

  private getOrCreateLane(gridY: number): Lane | null {
    if (gridY > 19) return null;
    if (this.lanes.has(gridY)) return this.lanes.get(gridY)!;

    const progress = 18 - gridY;
    let type: 'grass' | 'road' | 'river' = 'road';

    if (gridY === 19 || progress === 0 || progress === 1 || (progress >= 7 && (progress % 7 === 0 || progress % 7 === 1))) {
      type = 'grass'; // Treat grass as Median
    } else if (progress >= 7 && (progress % 7 === 5 || progress % 7 === 6)) {
      type = 'river';
    } else {
      type = 'road';
    }

    let hasShop = false;
    if (type === 'grass' && progress >= 14) {
      const isTopLane = progress % 7 === 0; // Top lane of a median pair
      const medianPairIndex = Math.floor(progress / 7); // 2, 3, 4...
      hasShop = isTopLane && medianPairIndex % 2 === 0; // Every 2nd median pair
    }
const direction = gridY % 2 === 0 ? 'left' : 'right';

// ─── คุมความเร็วรถตามระดับความยาก ─────────────────
const diffConfig = DifficultyManager.getConfig(this.scoreManager.getScore());

let speed = 70;

switch (diffConfig.tier) {
  case 'easy':
    speed = 65;
    break;

  case 'normal':
    speed = 70;
    break;

  case 'hard':
    speed = 80;
    break;

  case 'extreme':
    speed = 85;
    break;
}

speed += Math.min(15, Math.abs(gridY) * 0.5);
speed = Math.min(speed, 110);

    const config: LaneConfig = {
  gridY,
  type,
  direction,
  speed,
  vehicleTypes: ['vehicle'],
  hasShop,
  theme: this.currentTheme
};
    const lane = new Lane(this, config);

    if (type === 'river') {
      this.riverRows.add(gridY);
    }

    // Spawn impassable buildings on grass lanes in Hard / Extreme difficulty
    if (type === 'grass' && gridY < 17 && lane) {
      const diffConfig = DifficultyManager.getConfig(this.scoreManager.getScore());
      if (diffConfig.tier === 'hard' || diffConfig.tier === 'extreme') {
        const buildCount = Phaser.Math.Between(1, 2);
        const blockedCols = new Set<number>();

        // Avoid spawning buildings on top of trees or shop
        const avoidCols = new Set<number>();
        if (lane.shopCol !== null) avoidCols.add(lane.shopCol);
        lane.treeCols.forEach(c => avoidCols.add(c));

        const rowBelow = this.buildings.get(gridY + 1);
        const rowAbove = this.buildings.get(gridY - 1);

        for (let i = 0; i < buildCount; i++) {
          let col: number = 6;
          let attempts = 0;
          let isValid = false;
          while (!isValid && attempts < 25) {
            col = Phaser.Math.Between(1, 10);
            attempts++;

            const hasAdjacentBelow = rowBelow && (rowBelow.has(col - 1) || rowBelow.has(col) || rowBelow.has(col + 1));
            const hasAdjacentAbove = rowAbove && (rowAbove.has(col - 1) || rowAbove.has(col) || rowAbove.has(col + 1));

            if (col !== 6 && !blockedCols.has(col) && !avoidCols.has(col) && !hasAdjacentBelow && !hasAdjacentAbove) {
              isValid = true;
            }
          }

          if (isValid) {
            blockedCols.add(col);
            const houseKeys = [
              'house1', 'house2', 'houseAlt1', 'houseAlt2',
              'houseSmall1', 'houseSmall2', 'houseSmallAlt1', 'houseSmallAlt2'
            ];
            const houseKey = Phaser.Utils.Array.GetRandom(houseKeys);
            const buildSprite = this.add.sprite(col * 40 + 20, 30, houseKey);

            // Set proportional scale based on target width
            let targetWidth = 48;
            if (houseKey.includes('Small')) {
              targetWidth = 40;
            }
            const ratio = targetWidth / buildSprite.width;
            buildSprite.setScale(ratio);

            buildSprite.setOrigin(0.5, 0.65);
            buildSprite.setDepth(9);
            lane.add(buildSprite);
          }
        }
        this.buildings.set(gridY, blockedCols);
      }
    }

    // Depth sorting: set lane depth to gridY so higher rows (smaller gridY) sit behind lower rows (larger gridY)
    // Set other moving entity depths significantly higher so they always draw on top of all lanes
    lane.setDepth(gridY);
    this.player.setDepth(100);
    this.trafficManager.vehicleGroup.setDepth(80);
    this.raftManager.raftGroup.setDepth(70);
    this.bullets.setDepth(90);

    this.lanes.set(gridY, lane);
    return lane;
  }

  // ─── Player movement helper ────────────────────────────────────────────────

  private attemptPlayerMove(dirX: number, dirY: number): void {
    if (this.player.getIsMoving() || this.player.getIsStunned()) return;

    const nextX = this.player.gridX + dirX;
    const nextY = this.player.gridY + dirY;

    // Check if path is blocked by a building
    if (this.hasBuildingAt(nextX, nextY)) {
      this.player.stun(1000);
      SoundEffects.playHit(this); // play thud sound
      this._triggerStunPopup();
      this._triggerBuildingCrashEffect(nextX * 40 + 20, nextY * 60 + 30);
      return; // blocked
    }

    if (nextX >= 0 && nextX < 12 && nextY <= 19) {
      SoundEffects.playMove(this);
    }

    this.player.move(dirX, dirY);
  }

  private hasBuildingAt(gx: number, gy: number): boolean {
    const cols = this.buildings.get(gy);
    return cols ? cols.has(gx) : false;
  }

  private getBlockedColsAtRow(gridY: number): Set<number> {
    const blocked = new Set<number>();

    // Add buildings
    const buildCols = this.buildings.get(gridY);
    if (buildCols) {
      buildCols.forEach(c => blocked.add(c));
    }

    // Add shop and trees from lane
    const lane = this.lanes.get(gridY);
    if (lane) {
      if (lane.shopCol !== null) {
        blocked.add(lane.shopCol);
      }
      lane.treeCols.forEach(c => blocked.add(c));
    }

    return blocked;
  }

  // ─── Tank Bullets ──────────────────────────────────────────────────────────

  private fireBullet(bx: number, by: number, dir: 'left' | 'right'): void {
    if (this.isGameOver) return;

    // Use physics group create method to spawn bullet correctly
    const bullet = this.bullets.create(bx, by, 'tank_bullet') as Phaser.Physics.Arcade.Sprite;
    bullet.setDepth(11);
    bullet.setScale(0.5); // reduced by 50%

    // Bounding circle for bullet
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCircle(4, 2, 2);
      body.allowGravity = false;
      body.velocity.x = dir === 'right' ? 220 : -220; // medium speed
    }

    if (dir === 'left') {
      bullet.setFlipX(true);
    }
  }

  private handleBulletHit(bullet: Phaser.Physics.Arcade.Sprite): void {
    if (this.isGameOver) return;

    // Trigger premium explosion animation at hit point
    const exp = this.add.sprite(bullet.x, bullet.y, 'tank_explosion2');
    exp.setScale(0.85);
    exp.setDepth(9999);
    exp.play('tank_explode');
    exp.on('animationcomplete', () => exp.destroy());

    SoundEffects.playHit(this); // hit sound

    const penalty = this.scoreManager.deductScore(10);
    this._triggerDeductScorePopup(penalty);
    this.updateScoreUI();

    this.bullets.remove(bullet, true, true);
    this.cameras.main.shake(150, 0.012);
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  private setupHUD(): void {
  const nickname = this.registry.get('nickname') || 'PLAYER';
// ─────────────────────────────────────────────
// SCORE HUD
// ─────────────────────────────────────────────

const scoreBg = this.add.graphics();

// Shadow
scoreBg.fillStyle(0x1a3a5c, 0.12);
scoreBg.fillRoundedRect(
  12,
  16,
  100,
  82,
  16
);

// Main white card
scoreBg.fillStyle(0xffffff, 0.96);
scoreBg.fillRoundedRect(
  12,
  12,
  100,
  82,
  16
);

// Soft blue panel
scoreBg.fillStyle(0xf4faff, 0.96);
scoreBg.fillRoundedRect(
  16,
  16,
  92,
  74,
  12
);


// Border
scoreBg.lineStyle(1.5, 0x90caf9, 0.8);
scoreBg.strokeRoundedRect(
  12,
  12,
  100,
  82,
  16
);

scoreBg.setScrollFactor(0);
scoreBg.setDepth(198);


// Score text
this.scoreText = this.add.text(
  24,
  27,
  `${nickname}\nSCORE: 0\nBEST: ${this.scoreManager.getBestScore()}`,
  {
    fontFamily: this.GAME_FONT,
fontSize: '12px',
fontStyle: 'bold',
    color: '#1a3a5c',
    lineSpacing: 3
  }
)
  .setOrigin(0, 0)
  .setScrollFactor(0)
  .setDepth(200);

  // ─────────────────────────────────────────────
  // DIFFICULTY CARD
  // ─────────────────────────────────────────────
  const difficultyBg = this.add.graphics();

  difficultyBg.fillStyle(0xffffff, 0.94);
  difficultyBg.fillRoundedRect(
    this.cameras.main.width - 82,
    12,
    70,
    34,
    12
  );

  difficultyBg.lineStyle(1.5, 0xa5d6a7, 0.9);
  difficultyBg.strokeRoundedRect(
    this.cameras.main.width - 82,
    12,
    70,
    34,
    12
  );

  difficultyBg.setScrollFactor(0);
  difficultyBg.setDepth(198);

  this.difficultyText = this.add.text(
    this.cameras.main.width - 47,
    29,
    'ง่าย',
    {
      fontFamily: this.GAME_FONT,
fontSize: '14px',
fontStyle: 'bold',
      color: '#388E3C',
      align: 'center',
      padding: { x: 2, y: 2 }
    }
  )
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(200);


  // ─────────────────────────────────────────────
  // COIN CARD
  // ─────────────────────────────────────────────
  const coinBg = this.add.graphics();

  coinBg.fillStyle(0xffffff, 0.94);
  coinBg.fillRoundedRect(
    this.cameras.main.width - 82,
    52,
    70,
    34,
    12
  );

  coinBg.lineStyle(1.5, 0xffd54f, 0.9);
  coinBg.strokeRoundedRect(
    this.cameras.main.width - 82,
    52,
    70,
    34,
    12
  );

  coinBg.setScrollFactor(0);
  coinBg.setDepth(198);

  this.coinText = this.add.text(
    this.cameras.main.width - 47,
    69,
    '🪙 0',
    {
      fontFamily: this.GAME_FONT,
fontSize: '14px',
fontStyle: 'bold',
      color: '#b8860b',
      align: 'center',
      padding: { x: 2, y: 2 }
    }
  )
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(200);


  // ─────────────────────────────────────────────
  // LIVES HUD
  // ─────────────────────────────────────────────
  const livesX = this.cameras.main.width / 2;
  const livesY = 12;

  const livesShadow = this.add.graphics();

  livesShadow.fillStyle(0x1a3a5c, 0.14);
  livesShadow.fillRoundedRect(
    livesX - 66,
    livesY + 4,
    132,
    42,
    18
  );

  livesShadow.setScrollFactor(0);
  livesShadow.setDepth(198);


  const livesBg = this.add.graphics();

  livesBg.fillStyle(0xffffff, 0.96);
  livesBg.fillRoundedRect(
    livesX - 66,
    livesY,
    132,
    42,
    18
  );

  livesBg.fillStyle(0xf0f8ff, 0.96);
  livesBg.fillRoundedRect(
    livesX - 62,
    livesY + 4,
    124,
    34,
    14
  );

  livesBg.lineStyle(2, 0xef5350, 0.9);
  livesBg.strokeRoundedRect(
    livesX - 66,
    livesY,
    132,
    42,
    18
  );

  livesBg.setScrollFactor(0);
  livesBg.setDepth(199);


  this.livesText = this.add.text(
    livesX,
    livesY + 21,
    '❤️ ❤️ ❤️',
    {
      fontFamily: this.GAME_FONT,
fontSize: '18px',
fontStyle: 'bold',
      color: '#d32f2f',
      align: 'center',
      padding: { x: 4, y: 2 }
    }
  )
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(200);

  this.updateLivesUI();


  // ─────────────────────────────────────────────
  // HTML INVENTORY
  // ─────────────────────────────────────────────
  const uiLayer = document.getElementById('ui-layer');

  if (uiLayer) {
    uiLayer.classList.remove('hidden');

    uiLayer.innerHTML = `
      <div id="game-inventory-slots" style="
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 12px;
        pointer-events: auto;
        z-index: 100;
      ">
      <div id="slot-1" class="inv-slot">
  <div class="slot-name"></div>
  <div class="slot-icon">ว่าง</div>
  <span class="slot-key">Q / 1</span>
</div>

<div id="slot-2" class="inv-slot">
  <div class="slot-name"></div>
  <div class="slot-icon">ว่าง</div>
  <span class="slot-key">E / 2</span>
</div>
      </div>
    `;

    document.getElementById('slot-1')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.useItem(0);
    });

    document.getElementById('slot-2')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.useItem(1);
    });
  }
}

  private updateScoreUI(): void {
    const nickname = this.registry.get('nickname') || 'PLAYER';
    const score = this.scoreManager.getScore();
    const best = this.scoreManager.getBestScore();
    const diffConfig = DifficultyManager.getConfig(score);
    const thaiLabel = DifficultyManager.getThaiLabel(diffConfig.tier);

    this.scoreText.setText(`${nickname}\nSCORE: ${score}\nBEST: ${best}`);
    this.difficultyText.setText(thaiLabel);
    this.coinText.setText(`🪙 ${this.scoreManager.getCoinCount()}`);

    const isMultiplayer = this.registry.get('isMultiplayer') === true;
    if (isMultiplayer) {
      const ws = this.registry.get('roomWs') as WebSocket;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'update_score',
          score: score
        }));
      }
    }

    this.tweens.add({
      targets: this.scoreText,
      scale: 1.08,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  private updateLivesUI(): void {
    let hearts = '';
    for (let i = 0; i < 3; i++) {
      hearts += i < this.lives ? '❤️ ' : '🖤 ';
    }
    this.livesText.setText(hearts.trim());
  }

  // ─── Popups & Particle Effects ─────────────────────────────────────────────
private _triggerScorePopup(pts: number): void {
  const isStreak = this.scoreManager.isStreakActive();

  const label = isStreak
    ? `🔥 +${pts}`
    : `+${pts}`;

  const popup = this.add.text(
    this.player.x,
    this.player.y - 28,
    label,
    {
      fontFamily: this.GAME_FONT,
      fontSize: isStreak ? '20px' : '18px',
      fontStyle: 'bold',
      color: isStreak ? '#ff6d00' : '#1565C0',

      // ขอบตัวอักษร
      stroke: '#ffffff',
      strokeThickness: 4,

      // เงา
      shadow: {
        offsetX: 0,
        offsetY: 3,
        color: 'rgba(0,0,0,0.35)',
        blur: 5,
        stroke: true,
        fill: true
      },

      align: 'center'
    }
  )
    .setOrigin(0.5)
    .setDepth(300)
    .setScale(0.65)
    .setAlpha(0);

  // เด้งเข้ามา
  this.tweens.add({
    targets: popup,
    scale: 1,
    alpha: 1,
    duration: 160,
    ease: 'Back.easeOut'
  });

  // ลอยขึ้น + จางหาย
  this.tweens.add({
    targets: popup,
    y: popup.y - 42,
    alpha: 0,
    duration: 650,
    delay: 120,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      popup.destroy();
    }
  });
}

  private _triggerDeductScorePopup(penalty: number): void {
    if (penalty <= 0) return;
    const popup = this.add.text(this.player.x, this.player.y - 20, `💥 -${penalty}`, {
      fontFamily: this.GAME_FONT,
fontSize: '18px',
fontStyle: 'bold',
      color: '#d32f2f',
      backgroundColor: 'rgba(255,235,235,0.95)',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: popup,
      y: popup.y - 45,
      alpha: 0,
      duration: 600,
      ease: 'Power1',
      onComplete: () => popup.destroy()
    });
  }
private _triggerCoinPopup(pts: number): void {
  const popup = this.add.text(
    this.player.x + 18,
    this.player.y - 28,
    `🪙 +${pts}`,
    {
      fontFamily: this.GAME_FONT,
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#d89b00',

      // ขอบสีขาว
      stroke: '#ffffff',
      strokeThickness: 4,

      // เงา
      shadow: {
        offsetX: 0,
        offsetY: 3,
        color: 'rgba(0,0,0,0.35)',
        blur: 5,
        stroke: true,
        fill: true
      },

      align: 'center'
    }
  )
    .setOrigin(0.5)
    .setDepth(300)
    .setScale(0.65)
    .setAlpha(0);

  // เด้งเข้ามา
  this.tweens.add({
    targets: popup,
    scale: 1,
    alpha: 1,
    duration: 160,
    ease: 'Back.easeOut'
  });

  // ลอยขึ้นแล้วหาย
  this.tweens.add({
    targets: popup,
    x: popup.x + 8,
    y: popup.y - 42,
    alpha: 0,
    duration: 650,
    delay: 120,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      popup.destroy();
    }
  });
}

  private _triggerStunPopup(): void {
    const popup = this.add.text(this.player.x, this.player.y - 25, 'มึนงง! (STUNNED)', {
      fontFamily: this.GAME_FONT,
fontSize: '13px',
fontStyle: 'bold',
      color: '#7b1fa2',
      backgroundColor: 'rgba(243,229,245,0.95)',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: popup,
      y: popup.y - 45,
      alpha: 0,
      duration: 650,
      ease: 'Power1',
      onComplete: () => popup.destroy()
    });
  }

  private _triggerBuildingCrashEffect(bx: number, by: number): void {
    // Small dust/impact explosion particle sequence
    const exp = this.add.sprite(bx, by, 'tank_explosion2');
    exp.setScale(0.55);
    exp.setDepth(9999);
    exp.play('tank_explode');
    exp.on('animationcomplete', () => exp.destroy());
    this.cameras.main.shake(100, 0.008);
  }
private streakBg: Phaser.GameObjects.Graphics | null = null;

private _showStreakIndicator(): void {
  if (!this.scoreManager.isStreakActive()) {
    this.streakText?.destroy();
    this.streakBg?.destroy();

    this.streakText = null;
    this.streakBg = null;
    return;
  }

  const streakN = this.scoreManager.getStreakCount();

  // สร้างพื้นหลังขอบมน
  if (!this.streakBg) {
    this.streakBg = this.add.graphics();

    this.streakBg.fillStyle(0xfff3e0, 0.96);
    this.streakBg.fillRoundedRect(
      12,
      103,
      155,
      32,
      10
    );

    this.streakBg.lineStyle(1.5, 0xffcc80, 0.9);
    this.streakBg.strokeRoundedRect(
      12,
      103,
      155,
      32,
      10
    );

    this.streakBg.setScrollFactor(0);
    this.streakBg.setDepth(199);
  }

  // สร้างข้อความ
  if (!this.streakText) {
    this.streakText = this.add.text(
      20,
      109,
      '',
      {
        fontFamily: this.GAME_FONT,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#e65100',
        align: 'left'
      }
    )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200);
  }

  this.streakText.setText(
    `🔥 STREAK x${streakN}  •  x2 คะแนน`
  );
}

  // ─── Countdown ────────────────────────────────────────────────────────────

  private startCountdown(): void {
    this.runCountdownStep('3', '#FFFFFF', false, () => {
      this.runCountdownStep('2', '#FFFFFF', false, () => {
        this.runCountdownStep('1', '#FFFFFF', false, () => {
          this.runCountdownStep('GO!', '#FFFFFF', true, () => {
            // Remove overlay and text, then start game
            if (this.countdownOverlay && this.countdownOverlay.active) {
              this.tweens.add({
                targets: this.countdownOverlay,
                alpha: 0,
                duration: 280,
                onComplete: () => { this.countdownOverlay?.destroy(); }
              });
            }
            if (this.countdownText && this.countdownText.active) {
              this.countdownText.destroy();
            }
            this.isCountdown = false;
          });
        });
      });
    });
  }

  private runCountdownStep(text: string, color: string, isGo: boolean, onCompleteAction: () => void): void {
    if (!this.countdownText || !this.countdownText.active) return;

    // Play sound
    if (isGo) {
      SoundEffects.playCountdownGo(this);
    } else {
      SoundEffects.playCountdownBeep(this);
    }

    this.countdownText.setText(text);
    this.countdownText.setColor(color);

    // For GO! use slightly smaller font to fit nicely (5x original size)
    this.countdownText.setFontSize(isGo ? 120 : 180);
    this.countdownText.setAlpha(1);

    // Punch-in: start big, slam to normal size, then fade out
    this.countdownText.setScale(2.5);
    this.tweens.add({
      targets: this.countdownText,
      scale: 1.0,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for a moment then fade out
        this.time.delayedCall(isGo ? 500 : 520, () => {
          if (!this.countdownText || !this.countdownText.active) return;
          this.tweens.add({
            targets: this.countdownText,
            alpha: 0,
            scale: 0.7,
            duration: 220,
            ease: 'Power2.easeIn',
            onComplete: onCompleteAction
          });
        });
      }
    });

    // Camera shake on each number
    if (!isGo) {
      this.cameras.main.shake(120, 0.006);
    } else {
      // Big shake on GO!
      this.cameras.main.shake(250, 0.012);
    }
  }

  private setupGameResultListener(): void {
  const isMultiplayer = this.registry.get('isMultiplayer') === true;
  if (!isMultiplayer) return;

  const ws = this.registry.get('roomWs') as WebSocket;
  if (!ws) return;

  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type !== 'results') return;

      console.log('🏁 เกมถูกยุติโดย Host → ไปหน้าสรุปผลทันที');

      // ป้องกันการทำงานซ้ำ
      if (this.isGameOver) return;

      this.isGameOver = true;

      // หยุดเกมทันที
      this.physics.pause();

      // หยุดระบบรถ / แพ
      if (this.trafficManager) {
        this.trafficManager.timeScale = 0;
      }

      if (this.raftManager) {
        this.raftManager.timeScale = 0;
      }

      // หยุด Item Countdown
      if (this.activeItemTimer) {
        this.activeItemTimer.remove(false);
        this.activeItemTimer = undefined;
      }

      // ลบ Touch Controls
      this.touchControls?.destroy();

      // เก็บผลการแข่งขัน
      this.registry.set(
        'resultsLeaderboard',
        data.leaderboard || []
      );

      // ล้าง HTML UI
      const uiLayer = document.getElementById('ui-layer');

      if (uiLayer) {
        uiLayer.innerHTML = '';
        uiLayer.classList.add('hidden');
      }

      // เปลี่ยนไปหน้าสรุปผลทันที
      this.scene.start('PodiumScene');

    } catch (error) {
      console.error('❌ Error handling results:', error);
    }
  });
}

  // ─── Death handlers ───────────────────────────────────────────────────────

  private handlePlayerCollision(): void {
    if (this.isGameOver || this.player.isInvincible) return;

    SoundEffects.playHit(this);

    // Explosion impact effect
    const exp = this.add.sprite(this.player.x, this.player.y, 'tank_explosion2');
    exp.setScale(1.4);
    exp.setDepth(9999);
    exp.play('tank_explode');
    exp.on('animationcomplete', () => exp.destroy());
    this.cameras.main.shake(150, 0.015);

    this.lives--;
    this.updateLivesUI();

    if (this.lives > 0) {
      this.player.becomeInvincible(1000);
      this.collisionManager.reset();
    } else {
      this.endGameSession(false);
    }
  }

  private handleDrowning(): void {
    if (this.isGameOver || this.player.isInvincible) return;

    SoundEffects.playHit(this);

    // Splash burst effect
    const exp = this.add.sprite(this.player.x, this.player.y, 'tank_explosion2');
    exp.setScale(1.1);
    exp.setTint(0x64b5f6); // blue splash color
    exp.setDepth(9999);
    exp.play('tank_explode');
    exp.on('animationcomplete', () => exp.destroy());
    this.cameras.main.shake(150, 0.012);

    this.lives--;
    this.updateLivesUI();

    if (this.lives > 0) {
      this.player.becomeInvincible(1000);
      this.collisionManager.reset();
    } else {
      this.endGameSession(true);
    }
  }

  private _storeScores(): void {
    this.registry.set('lastScore', this.scoreManager.getScore());
    this.registry.set('bestScore', this.scoreManager.getBestScore());
    this.registry.set('lastCoins', this.scoreManager.getCoinCount());
  }

  private endGameSession(isDrowning: boolean): void {
    this.isGameOver = true;
    this.touchControls?.destroy();

    if (isDrowning) {
      this.player.triggerDrown();
    } else {
      this.player.triggerCrash();
    }

    this.physics.pause();
    this._storeScores();

    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.innerHTML = '';
      uiLayer.classList.add('hidden');
    }

    const delay = isDrowning ? 700 : 800;
    this.time.delayedCall(delay, () => {
      const isMultiplayer = this.registry.get('isMultiplayer') === true;
      if (isMultiplayer) {
        const score = this.scoreManager.getScore();
        const ws = this.registry.get('roomWs') as WebSocket;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'submit_score',
            score: score
          }));
        }
        this.showPlayerWaitingScreen(score);
      } else {
        this.scene.start('GameOverScene');
      }
    });
  }

  private showHostDashboard(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    uiLayer.classList.remove('hidden');
    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 500px; width: 95%;">
        <h2 class="title-main" style="color: #0288d1; font-size: 1.6rem; margin-bottom: 0.2rem;">📊 แดชบอร์ดผู้ดูแลห้อง (Host)</h2>
        <p style="font-size: 0.82rem; color: #5c8fa8; margin-bottom: 1rem; font-weight: 600;">PIN ห้อง: ${this.registry.get('roomPin')}</p>
        
        <div style="display: flex; justify-content: space-around; margin-bottom: 0.8rem; font-size: 0.88rem; font-weight: 700;">
          <div style="color: #f57c00;">🎮 กำลังเล่น: <span id="host-playing-count">0</span> คน</div>
          <div style="color: #43a047;">✅ เล่นจบแล้ว: <span id="host-finished-count">0</span> คน</div>
        </div>
        
        <div id="host-scoreboard-container" style="
          background: rgba(0,0,0,0.03);
          border-radius: 12px;
          padding: 10px;
          max-height: 250px;
          overflow-y: auto;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(0,0,0,0.04);
        ">
          <div style="color: #90a4ae; font-weight: 600; padding: 20px;">👥 กำลังรอผู้เล่นเริ่มเล่น...</div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="host-force-end-btn" class="sky-btn green" style="font-size: 1.05rem; flex: 2;">🏁 ยุติเกมและดูผลลัพธ์</button>
          <button id="host-leave-btn" class="sky-btn secondary" style="font-size: 1.05rem; flex: 1; background: #ffebee; border-color: #ef9a9a; color: #c62828;">🚪 ออก</button>
        </div>
      </div>
    `;

    const ws = this.registry.get('roomWs') as WebSocket;
    if (ws) {
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'scoreboard_update' || data.type === 'lobby_update') {
            this.updateHostScoreboard(data.players);
          } else if (data.type === 'results') {
            this.registry.set('resultsLeaderboard', data.leaderboard);
            ws.onmessage = null;
            uiLayer.classList.add('hidden');
            uiLayer.innerHTML = '';
            this.scene.start('PodiumScene');
          }
        } catch (e) {
          console.error(e);
        }
      };
    }

    document.getElementById('host-force-end-btn')?.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'end_game' }));
      }
    });

    document.getElementById('host-leave-btn')?.addEventListener('click', () => {
      const playingCount = this.currentPlayersList.filter(p => !p.is_finished).length;
      if (playingCount > 0) {
        const confirmLeave = confirm(`⚠️ ยังมีผู้เล่นกำลังแข่งขันอยู่ ${playingCount} คน คุณแน่ใจหรือไม่ว่าต้องการออกจากห้อง? (การแข่งขันจะถูกยุติและห้องจะถูกลบทันที)`);
        if (!confirmLeave) return;
      }
      this.leaveRoomFromSpectator();
    });
  }

  private leaveRoomFromSpectator(): void {
    const ws = this.registry.get('roomWs') as WebSocket;
    if (ws) {
      ws.close();
    }
    this.registry.set('roomWs', null);
    this.registry.set('isMultiplayer', false);
    this.registry.set('roomPin', null);

    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
    }
    this.scene.start('MenuScene');
  }

  private updateHostScoreboard(players: any[]): void {
    this.currentPlayersList = players || [];
    const container = document.getElementById('host-scoreboard-container');
    if (!container) return;

    if (!players || players.length === 0) {
      container.innerHTML = `<div style="color: #90a4ae; font-weight: 600; padding: 20px;">👥 ไม่มีผู้เล่นในห้อง</div>`;
      return;
    }

    const playingCount = players.filter(p => !p.is_finished).length;
    const finishedCount = players.filter(p => p.is_finished).length;

    const playingEl = document.getElementById('host-playing-count');
    const finishedEl = document.getElementById('host-finished-count');
    if (playingEl) playingEl.textContent = playingCount.toString();
    if (finishedEl) finishedEl.textContent = finishedCount.toString();

    const sorted = [...players].sort((a, b) => b.score - a.score);

    container.innerHTML = sorted.map((p, idx) => {
      const status = p.is_finished ? '✅ เล่นจบแล้ว' : '🎮 กำลังเล่น...';
      const statusColor = p.is_finished ? '#43a047' : '#f57c00';
      return `
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 6px;
          border: 1px solid #e0e0e0;
        ">
          <div style="text-align: left;">
            <span style="font-weight: 800; color: #1a3a5c;">${idx + 1}. ${p.nickname}</span>
            <div style="font-size: 0.72rem; color: ${statusColor}; font-weight: 700;">${status}</div>
          </div>
          <div style="font-size: 1.2rem; font-weight: 900; color: #1565C0;">${p.score}</div>
        </div>
      `;
    }).join('');
  }

  private showPlayerWaitingScreen(score: number): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    uiLayer.classList.remove('hidden');
    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 440px; width: 95%;">
        <div style="font-size: 2.8rem; margin-bottom: 0.2rem; line-height: 1;">🏁</div>
        <h2 class="title-main" style="color: #43a047; font-size: 1.6rem;">ส่งคะแนนสำเร็จ!</h2>
        <p style="font-size: 0.85rem; color: #5c8fa8; margin-bottom: 1.2rem; font-weight: 600;">คะแนนของคุณคือ: <strong style="color: #1565C0; font-size: 1.3rem;">${score}</strong></p>

        <div id="player-scoreboard-container" style="
          background: rgba(0,0,0,0.03);
          border-radius: 12px;
          padding: 10px;
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(0,0,0,0.04);
        ">
          <div style="color: #90a4ae; font-weight: 600; padding: 20px;">⏳ กำลังโหลดตารางคะแนนสด...</div>
        </div>

        <p style="font-size: 0.82rem; color: #78909c; font-weight: 700; text-align: center;">⏳ กรุณารอผู้เล่นคนอื่นเล่นจบ...</p>
      </div>
    `;

    const ws = this.registry.get('roomWs') as WebSocket;
    if (ws) {
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'scoreboard_update') {
            this.updatePlayerScoreboard(data.players);
          } else if (data.type === 'results') {
  this.registry.set(
    'resultsLeaderboard',
    data.leaderboard || []
  );

  this.isGameOver = true;

  ws.onmessage = null;

  uiLayer.classList.add('hidden');
  uiLayer.innerHTML = '';

  this.scene.start('PodiumScene');
}
        } catch (e) {
          console.error(e);
        }
      };
    }
  }

  private updatePlayerScoreboard(players: any[]): void {
    const container = document.getElementById('player-scoreboard-container');
    if (!container) return;

    if (!players || players.length === 0) {
      container.innerHTML = `<div style="color: #90a4ae; font-weight: 600; padding: 20px;">👥 ไม่มีข้อมูลคะแนน</div>`;
      return;
    }

    const sorted = [...players].sort((a, b) => b.score - a.score);

    container.innerHTML = sorted.map((p, idx) => {
      const status = p.is_finished ? '✅ จบแล้ว' : '🎮 กำลังเล่น';
      const statusColor = p.is_finished ? '#43a047' : '#f57c00';
      return `
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 6px 10px;
          border-radius: 8px;
          margin-bottom: 4px;
          border: 1px solid #e0e0e0;
          font-size: 0.82rem;
        ">
          <div style="text-align: left; display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 800; color: #1a3a5c;">${idx + 1}. ${p.nickname}</span>
            <span style="font-size: 0.65rem; color: ${statusColor}; font-weight: 700;">(${status})</span>
          </div>
          <div style="font-weight: 900; color: #1565C0;">${p.score}</div>
        </div>
      `;
    }).join('');
  }

  private showThemeTransition(theme: GameTheme): void {
  const themeNames: Record<GameTheme, string> = {
    garden: '🌳 พื้นที่สีเขียว',
    forest: '🌲 ป่า',
    autumn: '🍂 ฤดูใบไม้ร่วง',
    city: '🏙️ เมือง',
    desert: '🏜️ ทะเลทราย',
    snow: '❄️ ดินแดนหิมะ'
  };

  const label = themeNames[theme];

  const overlay = this.add.rectangle(
    this.cameras.main.width / 2,
    this.cameras.main.scrollY + this.cameras.main.height / 2,
    this.cameras.main.width,
    this.cameras.main.height,
    theme === 'desert'
      ? 0xf4a261
      : 0x90caf9,
    0.18
  )
    .setScrollFactor(0)
    .setDepth(1000);

  const text = this.add.text(
    this.cameras.main.width / 2,
    this.cameras.main.scrollY + this.cameras.main.height / 2,
    label,
    {
      fontFamily: this.GAME_FONT,
fontSize: '30px',
fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a3a5c',
      strokeThickness: 6,
      align: 'center'
    }
  )
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(1001)
    .setScale(0.5)
    .setAlpha(0);

  this.tweens.add({
    targets: [overlay, text],
    alpha: 1,
    duration: 300,
    ease: 'Power2'
  });

  this.tweens.add({
    targets: text,
    scale: 1,
    duration: 450,
    ease: 'Back.easeOut'
  });

  this.time.delayedCall(1200, () => {
    this.tweens.add({
      targets: [overlay, text],
      alpha: 0,
      duration: 400,
      onComplete: () => {
        overlay.destroy();
        text.destroy();
      }
    });
  });
}

  private updateThemeByShopCount(): void {
  let newTheme: GameTheme = 'garden';

  // ร้านที่ 1-3
  if (this.shopsPassed <= 3) {
    newTheme = 'garden';
  }

  // ร้านที่ 4-6
  else if (this.shopsPassed <= 6) {
    newTheme = 'desert';
  }

  // ร้านที่ 7 เป็นต้นไป
  else {
    newTheme = 'snow';
  }

  if (newTheme === this.currentTheme) {
    return;
  }

  const previousTheme = this.currentTheme;
  this.currentTheme = newTheme;

  console.log(
    `🌍 THEME CHANGE: ${previousTheme} → ${newTheme}`
  );

  this.showThemeTransition(newTheme);
}
  // ─── Shop & Item Implementation ───────────────────────────────────────────
private checkShopTrigger(gridX: number, gridY: number): void {
  const lane = this.lanes.get(gridY);

  // ไม่ใช่แถวร้าน → ไม่ทำอะไร
  if (!lane || !lane.hasShop) {
    return;
  }

  // ─────────────────────────────────────
  // ผู้เล่นเข้ามาใน "แถวร้าน" = ผ่านร้าน
  // นับทันที ไม่ต้องยืนตรงร้าน
  // ─────────────────────────────────────
  if (!this.passedShopRows.has(gridY)) {
    this.passedShopRows.add(gridY);

    this.shopsPassed++;

    this.updateThemeByShopCount();

    console.log(
      `🛒 ผ่านร้านค้า ${this.shopsPassed} ร้าน | Theme: ${this.currentTheme}`
    );
  }

  // เปิดร้านถ้าอยู่ใกล้ช่องร้าน
  if (
    !this.isShopOpen &&
    lane.shopCol !== null &&
    Math.abs(gridX - lane.shopCol) <= 1
  ) {
    this.openShop();
  }
}



  private openShop(): void {
    if (this.isGameOver || this.isCountdown) return;
    this.isShopOpen = true;
    this.physics.pause();
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
    }

    // Pause moving obstacles
    this.trafficManager.timeScale = 0;
    this.raftManager.timeScale = 0;

    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    // Create the shop modal overlay
    const shopModal = document.createElement('div');
    shopModal.id = 'shop-modal';
    shopModal.className = 'glass-panel';
    shopModal.style.position = 'absolute';
    shopModal.style.zIndex = '150';
    shopModal.style.pointerEvents = 'auto';
    shopModal.style.maxWidth = '440px';
    shopModal.style.width = '95%';
    shopModal.style.padding = '1.8rem 1.5rem';
const items = [
  {
    id: 'shield',
    name: 'โล่บาเรีย',
    img: '/assets/items/shield.png',
    price: 3,
    desc: 'กันการชนหรือจมน้ำ 1 ครั้ง'
  },
  {
    id: 'freezewater',
    name: 'แช่แข็งแม่น้ำ',
    img: '/assets/items/freezewater.png',
    price: 2,
    desc: 'เปลี่ยนแม่น้ำเป็นน้ำแข็ง เดินข้ามได้เลย 6 วินาที'
  },
  {
    id: 'teleport',
    name: 'วาร์ปข้ามเลน',
    img: '/assets/items/teleport.png',
    price: 4,
    desc: 'พุ่งตัวข้ามไปข้างหน้า 3 เลนทันที หลบรถหรือข้ามแม่น้ำได้'
  },
  {
    id: 'midas',
    name: 'เหรียญนำโชค',
    img: '/assets/items/midas.png',
    price: 3,
    desc: 'รถที่ชนเราจะกลายเป็นเหรียญทอง 5 วินาที'
  },
  {
    id: 'shoes',
    name: 'รองเท้าสปริง',
    img: '/assets/items/shoes.png',
    price: 2,
    desc: 'เดินเร็วขึ้น 50% นาน 6 วินาที'
  },
  {
    id: 'timestop',
    name: 'หยุดเวลา',
    img: '/assets/items/timestop.png',
    price: 5,
    desc: 'หยุดขบวนรถยนต์ทั้งหมด 5 วินาที'
  },
  {
    id: 'timeslow',
    name: 'ชะลอเวลา',
    img: '/assets/items/timeslow.png',
    price: 3,
    desc: 'ชะลอรถลงเหลือ 30% นาน 6 วินาที'
  },
  {
    id: 'score2x',
    name: 'คะแนน x2',
    img: '/assets/items/score2x.png',
    price: 5,
    desc: 'คูณคะแนน 2 เท่า นาน 10 วินาที'
  },
  {
    id: 'cape',
    name: 'ผ้าคลุมบินได้',
    img: '/assets/items/cape.png',
    price: 4,
    desc: 'บินผ่านรถ/ลอยเหนือน้ำอิสระ 5 วินาที'
  },
  {
    id: 'blast',
    name: 'ระเบิดพลัง',
    img: '/assets/items/blast.png',
    price: 3,
    desc: 'ระเบิดเคลียร์รถรอบตัว 2 เลน'
  }
];


    let itemsHtml = '';

items.forEach(item => {
  itemsHtml += `
    <div class="shop-item" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255,255,255,0.72);
      padding: 8px 12px;
      margin-bottom: 8px;
      border-radius: 12px;
      border: 1px solid rgba(26,58,92,0.1);
      text-align: left;
    ">

      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      ">

        <!-- รูปไอเทม -->
        <div style="
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(240,248,255,0.9);
          border-radius: 10px;
          border: 1px solid rgba(144,202,249,0.5);
        ">
          <img
            src="${item.img}"
            alt="${item.name}"
            style="
              width: 40px;
              height: 40px;
              object-fit: contain;
              image-rendering: auto;
            "
          />
        </div>

        <!-- ชื่อ + รายละเอียด -->
        <div>
          <div style="
            font-weight: 800;
            font-size: 0.9rem;
            color: #1a3a5c;
          ">
            ${item.name}
          </div>

          <div style="
            font-size: 0.72rem;
            color: #5c8fa8;
            font-weight: 600;
          ">
            ${item.desc}
          </div>
        </div>

      </div>

      <!-- ปุ่มซื้อ -->
      <button
        class="buy-btn"
        data-id="${item.id}"
        data-price="${item.price}"
        style="
          background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 800;
          cursor: pointer;
          font-size: 0.82rem;
          box-shadow: 0 2px 0 #2e7d32;
          white-space: nowrap;
          transition: all 0.1s;
        "
      >
        🪙 ${item.price}
      </button>

    </div>
  `;
});

    const currentCoins = this.scoreManager.getCoinCount();
    shopModal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 style="font-size: 1.3rem; margin: 0; font-weight: 900; color: #1a3a5c;">🛒 ร้านตู้กดอัตโนมัติ</h3>
        <div id="shop-coins-display" style="font-weight: 800; color: #b8860b; font-size: 1.15rem; background: rgba(255,253,231,0.9); padding: 4px 10px; border-radius: 12px; border: 1px solid #fff59d;">🪙 ${currentCoins}</div>
      </div>
      <div class="scrollable-y" style="max-height: 250px; padding-right: 4px; margin-bottom: 12px;">
        ${itemsHtml}
      </div>
      <button id="close-shop-btn" class="sky-btn" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); box-shadow: 0 4px 0 #b71c1c; margin-top: 0;">ปิดร้านค้า</button>
    `;

    uiLayer.appendChild(shopModal);

    // ── Native touch-scroll fix for Phaser overlay ──────────────────────────
    // Phaser intercepts all touch events on the canvas layer. We must manually
    // drive scrollTop from touchstart/touchmove so the list scrolls reliably.
    const scrollContainer = shopModal.querySelector('.scrollable-y') as HTMLElement | null;
    if (scrollContainer) {
      let touchStartY = 0;
      let scrollStartTop = 0;

      scrollContainer.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
        scrollStartTop = scrollContainer.scrollTop;
      }, { passive: true });

      scrollContainer.addEventListener('touchmove', (e: TouchEvent) => {
        const deltaY = touchStartY - e.touches[0].clientY;
        scrollContainer.scrollTop = scrollStartTop + deltaY;
        e.stopPropagation(); // stop Phaser from eating this event
      }, { passive: true });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Bind listeners
    document.getElementById('close-shop-btn')?.addEventListener('click', () => this.closeShop());
    const buyBtns = shopModal.querySelectorAll('.buy-btn');
    buyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id')!;
        const price = parseInt(btn.getAttribute('data-price')!);
        this.buyItem(id, price);
      });
    });
  }

  private buyItem(id: string, price: number): void {
    if (this.scoreManager.getCoinCount() < price) {
      SoundEffects.playHit(this);
      this.cameras.main.shake(80, 0.006);
      return;
    }

    // Check for empty slots
    let slotIdx = -1;
    if (this.inventory[0] === null) slotIdx = 0;
    else if (this.inventory[1] === null) slotIdx = 1;

    if (slotIdx === -1) {
      // Inventory full
      SoundEffects.playHit(this);
      this.cameras.main.shake(80, 0.006);
      return;
    }

    this.scoreManager.deductCoins(price);
    this.updateScoreUI();

    this.inventory[slotIdx] = id;
    this.updateInventoryUI();

    SoundEffects.playScore(this);

    // Update display coins
    const display = document.getElementById('shop-coins-display');
    if (display) {
      display.textContent = `🪙 ${this.scoreManager.getCoinCount()}`;
    }
  }

  private closeShop(): void {
    const modal = document.getElementById('shop-modal');
    modal?.remove();
    this.isShopOpen = false;

    // Resume physics and inputs
    this.physics.resume();
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
    }
    this.trafficManager.timeScale = 1;
    this.raftManager.timeScale = 1;
  }

  // ─── Active Item Countdown ───────────────────────

private startItemCountdown(itemId: string, durationMs: number): void {
  // ยกเลิก Countdown เก่าก่อน
  if (this.activeItemTimer) {
    this.activeItemTimer.remove(false);
    this.activeItemTimer = undefined;
  }

  this.activeItemEndTime = this.time.now + durationMs;

  const itemNames: Record<string, string> = {
    freezewater: '❄️ แช่แข็งแม่น้ำ',
    midas: '🪙 เหรียญนำโชค',
    shoes: '👟 รองเท้าสปริง',
    timestop: '⏸️ หยุดเวลา',
    timeslow: '🐌 ชะลอเวลา',
    score2x: '✖️ คะแนน x2',
    cape: '🦸 ผ้าคลุมบินได้'
  };

  this.itemCountdownText.setVisible(true);
  this.itemCountdownText.setAlpha(1);
  this.itemCountdownText.setScale(1);

  const updateText = () => {
  if (!this.itemCountdownText?.active) return;

  const remaining = Math.max(
    0,
    this.activeItemEndTime - this.time.now
  );

  const seconds = Math.ceil(remaining / 1000);
  const name = itemNames[itemId] || itemId;

  this.itemCountdownText.setText(
    `${name}\n${seconds}s`
  );
if (seconds <= 3) {
  // 🔴 เหลือ 3 วินาที → ตัวหนังสือแดง
  this.itemCountdownText.setColor('#ff0000');

  // กระพริบเล็กน้อย
  this.itemCountdownText.setScale(
    1 + Math.sin(this.time.now / 80) * 0.06
  );
} else {
  // ⚪ ปกติ
  this.itemCountdownText.setColor('#ffffff');
  this.itemCountdownText.setScale(1);
}

  if (remaining <= 0) {
    this.stopItemCountdown();
  }
};

  updateText();

  this.activeItemTimer = this.time.addEvent({
    delay: 100,
    loop: true,
    callback: updateText
  });
}

private stopItemCountdown(): void {
  if (this.activeItemTimer) {
    this.activeItemTimer.remove(false);
    this.activeItemTimer = undefined;
  }

  this.activeItemEndTime = 0;

  if (this.itemCountdownText?.active) {
    this.tweens.add({
      targets: this.itemCountdownText,
      alpha: 0,
      scale: 0.7,
      duration: 180,
      onComplete: () => {
        if (this.itemCountdownText?.active) {
          this.itemCountdownText.setVisible(false);
          this.itemCountdownText.setAlpha(1);
          this.itemCountdownText.setScale(1);
        }
      }
    });
  }
}

  private useItem(slotIdx: number): void {
    const itemId = this.inventory[slotIdx];
    if (!itemId) return;

    // Remove from inventory
    this.inventory[slotIdx] = null;
    this.updateInventoryUI();

    // Trigger score sound for item use feedback
    SoundEffects.playScore(this);

    // Trigger item effect
    switch (itemId) {
      case 'shield':
        this.player.setHasShield(true);
        break;

      case 'freezewater':
        this.isRiverFrozen = true;
        this.startItemCountdown('freezewater', 6000);
        // Call setFrozen on all river lanes
        this.lanes.forEach(lane => {
          if (lane.type === 'river') {
            lane.setFrozen(true);
          }
        });
        this.cameras.main.flash(200, 224, 247, 250); // ice color flash
        this.time.delayedCall(6000, () => {
          this.isRiverFrozen = false;
          this.lanes.forEach(lane => {
            if (lane.type === 'river') {
              lane.setFrozen(false);
            }
          });
        });
        break;

      case 'teleport': {
        const targetGridY = this.player.gridY - 3;
        let targetGridX = this.player.gridX;

        // Ensure target row is within game bounds and check buildings
        const colsBlocked = this.buildings.get(targetGridY) || new Set<number>();
        if (colsBlocked.has(targetGridX)) {
          let found = false;
          for (let dist = 1; dist < 12; dist++) {
            if (targetGridX - dist >= 0 && !colsBlocked.has(targetGridX - dist)) {
              targetGridX -= dist;
              found = true;
              break;
            }
            if (targetGridX + dist < 12 && !colsBlocked.has(targetGridX + dist)) {
              targetGridX += dist;
              found = true;
              break;
            }
          }
          if (!found) {
            // Refund item if absolutely no free spots on the target row
            this.inventory[slotIdx] = 'teleport';
            this.updateInventoryUI();
            return; // Skip playing activation sounds
          }
        }

        // Trigger flash / warp visuals
        this.cameras.main.flash(200, 0, 229, 255); // neon cyan flash

        // Instantly position player at target grid location
        this.player.gridX = targetGridX;
        this.player.gridY = targetGridY;
        this.player.x = targetGridX * 40 + 20;
        this.player.y = targetGridY * 60 + 30;

        // Reset riding status
        this.player.isRiding = false;
        this.player.currentRaft = null;

        // Trigger move complete callbacks (so score updates and shop/coins work)
        this.player.onMoveCompleteCallback?.(targetGridX, targetGridY);
        break;
      }

      case 'midas':
        this.isMidasActive = true;
        this.startItemCountdown('midas', 5000);
        // Add a golden particle/tint/glow effect on player
        this.player.setTint(0xffd700); // gold tint
        this.time.delayedCall(5000, () => {
          this.isMidasActive = false;
          this.player.clearTint();
        });
        break;


      case 'shoes':
        this.player.setSpeedBoostActive(true);
        this.startItemCountdown('shoes', 6000);
        this.time.delayedCall(6000, () => {
          this.player.setSpeedBoostActive(false);
        });
        break;

      case 'timestop':
        this.trafficManager.timeScale = 0;
        this.raftManager.timeScale = 0;

        this.startItemCountdown('timestop', 5000);

        this.cameras.main.flash(200, 255, 255, 255);
        this.time.delayedCall(5000, () => {
          this.trafficManager.timeScale = 1;
          this.raftManager.timeScale = 1;
        });
        break;

      case 'timeslow':
        this.trafficManager.timeScale = 0.3;
        this.raftManager.timeScale = 0.3;

        this.startItemCountdown('timeslow', 6000);

        this.cameras.main.flash(200, 255, 255, 255);
        this.time.delayedCall(6000, () => {
          this.trafficManager.timeScale = 1;
          this.raftManager.timeScale = 1;
        });
        break;

      case 'score2x':
        this.scoreManager.setScoreMultiplier(2);
        this.scoreText.setColor('#e65100'); // Orange highlight
        this.startItemCountdown('score2x', 10000);
        this.time.delayedCall(10000, () => {
          this.scoreManager.setScoreMultiplier(1);
          this.scoreText.setColor('#1a3a5c');
        });
        break;

      case 'cape':
        this.player.setIsFlying(true);
        this.startItemCountdown('cape', 5000);
        this.time.delayedCall(5000, () => {
          this.player.setIsFlying(false);
          this.collisionManager.reset();
        });
        break;

      case 'blast':
        const rangeY = 120; // 2 rows up/down
        const vehicles = this.trafficManager.vehicleGroup.getChildren() as Vehicle[];
        for (let i = vehicles.length - 1; i >= 0; i--) {
          const v = vehicles[i];
          if (Math.abs(v.y - this.player.y) <= rangeY) {
            const exp = this.add.sprite(v.x, v.y, 'tank_explosion2');
            exp.setScale(1.2);
            exp.setDepth(9999);
            exp.play('tank_explode');
            exp.on('animationcomplete', () => exp.destroy());
            this.trafficManager.vehicleGroup.remove(v, true, true);
          }
        }
        this.cameras.main.shake(200, 0.02);
        SoundEffects.playHit(this);
        break;
    }
  }
private updateInventoryUI(): void {
  const slotImages: Record<string, string> = {
    shield: '/assets/items/shield.png',
    freezewater: '/assets/items/freezewater.png',
    teleport: '/assets/items/teleport.png',
    midas: '/assets/items/midas.png',
    shoes: '/assets/items/shoes.png',
    timestop: '/assets/items/timestop.png',
    timeslow: '/assets/items/timeslow.png',
    score2x: '/assets/items/score2x.png',
    cape: '/assets/items/cape.png',
    blast: '/assets/items/blast.png'
  };

  const itemNames: Record<string, string> = {
    shield: 'โล่บาเรีย',
    freezewater: 'แช่แข็งแม่น้ำ',
    teleport: 'วาร์ปข้ามเลน',
    midas: 'เหรียญนำโชค',
    shoes: 'รองเท้าสปริง',
    timestop: 'หยุดเวลา',
    timeslow: 'ชะลอเวลา',
    score2x: 'คะแนน x2',
    cape: 'ผ้าคลุมบินได้',
    blast: 'ระเบิดพลัง'
  };

  for (let i = 0; i < 2; i++) {
    const slot = document.querySelector(`#slot-${i + 1}`);
    const el = document.querySelector(`#slot-${i + 1} .slot-icon`);
    const nameEl = document.querySelector(`#slot-${i + 1} .slot-name`);

    if (!el || !nameEl || !slot) continue;

    const itemId = this.inventory[i];

    if (itemId && slotImages[itemId]) {

      // ชื่อไอเทมด้านบนกรอบ
      nameEl.textContent = itemNames[itemId] || itemId;

      nameEl.setAttribute(
        'style',
        `
          display: block;
          color: #1a3a5c;
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 5px;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(255,255,255,0.8);
        `
      );

      // รูปไอเทม
      el.innerHTML = `
        <img
          src="${slotImages[itemId]}"
          alt="${itemNames[itemId] || itemId}"
          style="
            width: 42px;
            height: 42px;
            object-fit: contain;
            display: block;
          "
        />
      `;

      el.setAttribute(
        'style',
        `
          color: #1a3a5c;
          display: flex;
          align-items: center;
          justify-content: center;
        `
      );

    } else {

      // ไม่มีไอเทม → ลบชื่อออก
      nameEl.textContent = '';

      nameEl.setAttribute(
        'style',
        `
          display: block;
          height: 18px;
          margin-bottom: 5px;
        `
      );

      el.textContent = 'ว่าง';

      el.setAttribute(
        'style',
        `
          color: #90a4ae;
          display: flex;
          align-items: center;
          justify-content: center;
        `
      );
    }
  }
}
}

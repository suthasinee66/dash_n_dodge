import Phaser from 'phaser';
import { Player } from '../entities/Player.ts';
import { Vehicle } from '../entities/Vehicle.ts';
import { Lane, LaneConfig } from '../entities/Lane.ts';
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


  constructor() {
    super('GameScene');
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create(): void {
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

    this.setupHUD();

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
      font: 'bold 280px Nunito, Mitr, sans-serif',
      color: '#ffffff',
      stroke: '#1565C0',
      strokeThickness: 80,
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
      font: '13px Mitr, Nunito, sans-serif',
      color: '#1a3a5c',
      backgroundColor: 'rgba(255,255,255,0.7)',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(100);

    this.startCountdown();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

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
    const speed = 60 + Math.min(120, Math.abs(gridY) * 2.5);

    const config: LaneConfig = { gridY, type, direction, speed, vehicleTypes: ['vehicle'], hasShop };
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

    this.scoreText = this.add.text(12, 12, `${nickname}\nSCORE: 0\nBEST: ${this.scoreManager.getBestScore()}`, {
      font: 'bold 14px Nunito, Mitr, sans-serif',
      color: '#1a3a5c',
      backgroundColor: 'rgba(255,255,255,0.82)',
      padding: { x: 8, y: 6 },
      align: 'left'
    }).setScrollFactor(0).setDepth(200);

    this.difficultyText = this.add.text(468, 12, 'ง่าย', {
      font: 'bold 12px Nunito, Mitr, sans-serif',
      color: '#388E3C',
      backgroundColor: 'rgba(255,255,255,0.82)',
      padding: { x: 8, y: 6 }
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);

    this.coinText = this.add.text(468, 38, '🪙 0', {
      font: 'bold 12px Nunito, Mitr, sans-serif',
      color: '#b8860b',
      backgroundColor: 'rgba(255,255,255,0.82)',
      padding: { x: 8, y: 6 }
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);

    // Setup Lives (Hearts) in top center
    this.livesText = this.add.text(this.cameras.main.width / 2, 12, '❤️ ❤️ ❤️', {
      font: 'bold 16px Outfit, Mitr, sans-serif',
      color: '#d32f2f',
      backgroundColor: 'rgba(255,255,255,0.82)',
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200);
    this.updateLivesUI();

    // Render HTML inventory quick slots
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
            <span class="slot-key">Q / 1</span>
            <div class="slot-icon">ว่าง</div>
          </div>
          <div id="slot-2" class="inv-slot">
            <span class="slot-key">E / 2</span>
            <div class="slot-icon">ว่าง</div>
          </div>
        </div>
      `;

      // Bind click listeners for mobile tapping
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
    const label = isStreak ? `🔥 +${pts}` : `+${pts}`;
    const color = isStreak ? '#e65100' : '#1565C0';
    const bgColor = isStreak ? 'rgba(255,224,178,0.95)' : 'rgba(255,255,255,0.88)';

    const popup = this.add.text(this.player.x, this.player.y - 20, label, {
      font: `bold ${isStreak ? 20 : 18}px Nunito, Mitr, sans-serif`,
      color,
      backgroundColor: bgColor,
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: popup,
      y: popup.y - 50,
      alpha: 0,
      duration: 580,
      ease: 'Power1.easeOut',
      onComplete: () => popup.destroy()
    });
  }

  private _triggerDeductScorePopup(penalty: number): void {
    if (penalty <= 0) return;
    const popup = this.add.text(this.player.x, this.player.y - 20, `💥 -${penalty}`, {
      font: 'bold 18px Nunito, Mitr, sans-serif',
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
    const popup = this.add.text(this.player.x + 20, this.player.y - 15, `🪙 +${pts}`, {
      font: 'bold 15px Nunito, Mitr, sans-serif',
      color: '#b8860b',
      backgroundColor: 'rgba(255,253,231,0.95)',
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: popup,
      y: popup.y - 42,
      alpha: 0,
      duration: 500,
      ease: 'Power1',
      onComplete: () => popup.destroy()
    });
  }

  private _triggerStunPopup(): void {
    const popup = this.add.text(this.player.x, this.player.y - 25, 'มึนงง! (STUNNED)', {
      font: 'bold 13px Mitr, Nunito, sans-serif',
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

  private _showStreakIndicator(): void {
    if (!this.scoreManager.isStreakActive()) {
      if (this.streakText) { this.streakText.destroy(); this.streakText = null; }
      return;
    }
    const streakN = this.scoreManager.getStreakCount();
    if (!this.streakText) {
      this.streakText = this.add.text(12, 48, '', {
        font: 'bold 12px Nunito, Mitr, sans-serif',
        color: '#e65100',
        backgroundColor: 'rgba(255,224,178,0.92)',
        padding: { x: 8, y: 5 }
      }).setScrollFactor(0).setDepth(200);
    }
    this.streakText.setText(`🔥 STREAK x${streakN} (x2 คะแนน)`);
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
    this.countdownText.setFontSize(isGo ? 700 : 1100);
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

  // ─── Shop & Item Implementation ───────────────────────────────────────────

  private checkShopTrigger(gridX: number, gridY: number): void {
    if (this.isShopOpen) return;
    const lane = this.lanes.get(gridY);
    // Trigger if player is on the shop lane and within 1 cell of the shop's column
    if (lane && lane.hasShop && lane.shopCol !== null && Math.abs(gridX - lane.shopCol) <= 1) {
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
      { id: 'shield', name: '🛡️ โล่บาเรีย', price: 1, desc: 'กันการชนหรือจมน้ำ 1 ครั้ง' },
      { id: 'freezewater', name: '❄️ แช่แข็งแม่น้ำ', price: 1, desc: 'เปลี่ยนแม่น้ำเป็นน้ำแข็ง เดินข้ามได้เลย 6 วินาที' },
      { id: 'teleport', name: '⚡ วาร์ปข้ามเลน', price: 1, desc: 'พุ่งตัวข้ามไปข้างหน้า 3 เลนทันที หลบรถหรือข้ามแม่น้ำได้' },
      { id: 'midas', name: '💰 เหรียญนำโชค', price: 1, desc: 'รถที่ชนเราจะกลายเป็นเหรียญทอง 5 วินาที' },
      { id: 'shoes', name: '👟 รองเท้าสปริง', price: 1, desc: 'เดินเร็วขึ้น 50% นาน 6 วินาที' },
      { id: 'timestop', name: '⏱️ หยุดเวลา', price: 1, desc: 'หยุดขบวนรถยนต์ทั้งหมด 5 วินาที' },
      { id: 'timeslow', name: '⏳ ชะลอเวลา', price: 1, desc: 'ชะลอรถลงเหลือ 30% นาน 6 วินาที' },
      { id: 'score2x', name: '🔥 คะแนน x2', price: 1, desc: 'คูณคะแนน 2 เท่า นาน 10 วินาที' },
      { id: 'cape', name: '🦸 ผ้าคลุมบินได้', price: 1, desc: 'บินผ่านรถ/ลอยเหนือน้ำอิสระ 5 วินาที' },
      { id: 'blast', name: '💥 ระเบิดพลัง', price: 1, desc: 'ระเบิดเคลียร์รถรอบตัว 2 เลน' }
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
          <div>
            <div style="font-weight: 800; font-size: 0.9rem; color: #1a3a5c;">${item.name}</div>
            <div style="font-size: 0.72rem; color: #5c8fa8; font-weight: 600;">${item.desc}</div>
          </div>
          <button class="buy-btn" data-id="${item.id}" data-price="${item.price}" style="
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
          ">🪙 ${item.price}</button>
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
      <button id="close-shop-btn" class="sky-btn" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); box-shadow: 0 4px 0 #b71c1c; margin-top: 0;">❌ ปิดร้านค้า</button>
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
        // Add a golden particle/tint/glow effect on player
        this.player.setTint(0xffd700); // gold tint
        this.time.delayedCall(5000, () => {
          this.isMidasActive = false;
          this.player.clearTint();
        });
        break;


      case 'shoes':
        this.player.setSpeedBoostActive(true);
        this.time.delayedCall(6000, () => {
          this.player.setSpeedBoostActive(false);
        });
        break;

      case 'timestop':
        this.trafficManager.timeScale = 0;
        this.raftManager.timeScale = 0;
        this.cameras.main.flash(200, 255, 255, 255);
        this.time.delayedCall(5000, () => {
          this.trafficManager.timeScale = 1;
          this.raftManager.timeScale = 1;
        });
        break;

      case 'timeslow':
        this.trafficManager.timeScale = 0.3;
        this.raftManager.timeScale = 0.3;
        this.cameras.main.flash(200, 255, 255, 255);
        this.time.delayedCall(6000, () => {
          this.trafficManager.timeScale = 1;
          this.raftManager.timeScale = 1;
        });
        break;

      case 'score2x':
        this.scoreManager.setScoreMultiplier(2);
        this.scoreText.setColor('#e65100'); // Orange highlight
        this.time.delayedCall(10000, () => {
          this.scoreManager.setScoreMultiplier(1);
          this.scoreText.setColor('#1a3a5c');
        });
        break;

      case 'cape':
        this.player.setIsFlying(true);
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
    const slotEmojis: Record<string, string> = {
      shield: '🛡️',
      freezewater: '❄️',
      teleport: '⚡',
      midas: '💰',
      shoes: '👟',
      timestop: '⏱️',
      timeslow: '⏳',
      score2x: '🔥',
      cape: '🦸',
      blast: '💥'
    };


    for (let i = 0; i < 2; i++) {
      const el = document.querySelector(`#slot-${i + 1} .slot-icon`);
      if (el) {
        const itemId = this.inventory[i];
        el.textContent = itemId ? slotEmojis[itemId] || '❓' : 'ว่าง';
        el.setAttribute('style', itemId ? 'color: #1a3a5c;' : 'color: #90a4ae;');
      }
    }
  }
}

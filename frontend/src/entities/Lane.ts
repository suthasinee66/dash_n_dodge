import Phaser from 'phaser';

export interface LaneConfig {
  gridY: number;
  type: 'grass' | 'road' | 'river';
  direction: 'left' | 'right';
  speed: number;
  vehicleTypes: string[];
  hasShop?: boolean;
}

export class Lane extends Phaser.GameObjects.Container {
  public gridY: number;
  public type: 'grass' | 'road' | 'river';
  public direction: 'left' | 'right';
  public speed: number;
  public hasShop: boolean;
  public shopCol: number | null = null;
  public treeCols: Set<number> = new Set();
  private iceGraphics: Phaser.GameObjects.Graphics | null = null;



  constructor(scene: Phaser.Scene, config: LaneConfig) {
    const pixelY = config.gridY * 60;
    super(scene, 0, pixelY);

    this.gridY = config.gridY;
    this.type = config.type;
    this.direction = config.direction;
    this.speed = config.speed;
    this.hasShop = config.hasShop || false;
    if (this.hasShop) {
      this.shopCol = Math.random() < 0.5 ? 0 : 11;
    }
 
    this.createGraphics();
    scene.add.existing(this);
  }

  /**
   * Draw the visual background of the lane depending on type and theme coordinates
   */
  private createGraphics(): void {
    const width = 480;
    const height = 60;

    // Calculate vertical grid progress from start zone (18)
    const progress = 18 - this.gridY;
    let theme: 'garden' | 'forest' | 'autumn' | 'city' = 'garden';
    if (progress > 35) {
      theme = 'city';
    } else if (progress > 20) {
      theme = 'autumn';
    } else if (progress > 10) {
      theme = 'forest';
    }

    if (this.type === 'river') {
      this.createWaterBackground(width, height);
    } else if (this.type === 'grass') {
      this.createGrassBackground(width, height, theme);
    } else {
      this.createRoadBackground(width, height, theme);
    }
  }

  private createGrassBackground(width: number, height: number, theme: string): void {
    const bg = this.scene.add.graphics();

    // Mortar (base color - slightly darker grey)
    bg.fillStyle(0x8c8c8c, 1);
    bg.fillRect(0, 0, width, height);

    // Draw paving bricks (Concrete grey 0x9e9e9e)
    const brickW = 16;
    const brickH = 8;
    const padding = 1;

    bg.fillStyle(0x9e9e9e, 1);
    for (let y = 0; y < height; y += brickH + padding) {
      const isOffset = Math.floor(y / (brickH + padding)) % 2 === 1;
      const startX = isOffset ? -(brickW / 2) : 0;

      for (let x = startX; x < width; x += brickW + padding) {
        bg.fillRect(x, y, brickW, brickH);
      }
    }

    const isMedian = (gY: number) => {
      if (gY > 19) return false;
      const p = 18 - gY;
      return gY === 19 || p === 0 || p === 1 || (p >= 7 && (p % 7 === 0 || p % 7 === 1));
    };

    const drawTopCurb = !isMedian(this.gridY - 1);
    const drawBottomCurb = !isMedian(this.gridY + 1);

    // Top and Bottom Curbs (White / Yellow alternating pattern)
    const curbHeight = 4;
    const segmentWidth = 24;
    for (let x = 0; x < width; x += segmentWidth) {
      const isYellow = Math.floor(x / segmentWidth) % 2 === 0;
      bg.fillStyle(isYellow ? 0xffcc00 : 0xffffff, 1);

      if (drawTopCurb) {
        bg.fillRect(x, 0, Math.min(segmentWidth, width - x), curbHeight);
      }
      if (drawBottomCurb) {
        bg.fillRect(x, height - curbHeight, Math.min(segmentWidth, width - x), curbHeight);
      }
    }

    // Inner lines to give depth to the curbs
    bg.lineStyle(1, 0x000000, 0.3);
    if (drawTopCurb) bg.lineBetween(0, curbHeight, width, curbHeight);
    if (drawBottomCurb) bg.lineBetween(0, height - curbHeight, width, height - curbHeight);

    this.add(bg);

    // Spawn Vending Machine Shop if configured
    if (this.hasShop && this.shopCol !== null) {
      const shopCol = this.shopCol;
      const shopSprite = this.scene.add.sprite(shopCol * 40 + 20, height / 2 - 4, 'shop_booth');
      this.add(shopSprite);
 
      const shopText = this.scene.add.text(shopCol * 40 + 20, height / 2 - 38, '🛒 SHOP', {
        font: 'bold 9px Nunito, Mitr, sans-serif',
        color: '#ffffff',
        backgroundColor: '#d32f2f',
        padding: { x: 3, y: 1 }
      }).setOrigin(0.5);
      this.add(shopText);
    }
 
    // Spawn decorative trees (skip starting row indices to keep entry zone clean)
    if (this.gridY < 18) {
      const treeCount = Phaser.Math.Between(1, 2);
      const usedCols = new Set<number>();
      if (this.hasShop && this.shopCol !== null) {
        usedCols.add(this.shopCol); // Do not overlap trees with the shop
      }
      for (let i = 0; i < treeCount; i++) {
        const col = Phaser.Math.Between(1, 10);
        if (!usedCols.has(col)) {
          usedCols.add(col);
          this.treeCols.add(col);
          let treeKey = 'tree';
          if (theme === 'forest') treeKey = 'treePine';
          else if (theme === 'autumn') treeKey = 'treeOrange';
          else if (theme === 'city') treeKey = Phaser.Math.Between(0, 1) === 0 ? 'treeDead' : 'treePalm';

          const treeSprite = this.scene.add.sprite(col * 40 + 20, height / 2 - 8, treeKey);
          treeSprite.setDisplaySize(34, 38);
          treeSprite.setOrigin(0.5, 0.5);
          this.add(treeSprite);
        }
      }
    }
  }

  private createRoadBackground(width: number, height: number, _theme: string): void {
    const road = this.scene.add.graphics();

    // Asphalt dark grey road with white lines (dashed and solid) for all themes
    let roadColor = 0x212121;
    let lineColor = 0xffffff;
    let dashColor = 0xffffff;

    road.fillStyle(roadColor, 1);
    road.fillRect(0, 0, width, height);

    // Top/bottom edge lines
    road.lineStyle(1.5, lineColor, 0.25);
    road.lineBetween(0, 0, width, 0);
    road.lineBetween(0, height, width, height);

    // Dashed centre line
    road.lineStyle(1.5, dashColor, 0.2);
    const dashLen = 10;
    const gap = 14;
    for (let x = 0; x < width; x += dashLen + gap) {
      road.lineBetween(x, height / 2, x + dashLen, height / 2);
    }
    this.add(road);

    // Spawn pixel traffic signs/light poles along the divider line
    if (Phaser.Math.Between(0, 1) === 0) {
      const signs = ['light', 'sign_blue', 'sign_red', 'sign_street'];
      const signKey = Phaser.Math.RND.pick(signs);
      const col = Phaser.Math.Between(1, 10);
      const signSprite = this.scene.add.sprite(col * 40 + 20, 0, signKey);
      signSprite.setDisplaySize(20, 32);
      signSprite.setOrigin(0.5, 0.7);
      this.add(signSprite);
    }
  }

  private createWaterBackground(width: number, height: number): void {
    // Water colour is classic river blue across all themes
    let waterColor = 0x1e88e5;
    let surfaceColor = 0x42a5f5;
    let rippleColor = 0x90caf9;

    // Base water fill
    const bg = this.scene.add.graphics();
    bg.fillStyle(waterColor, 1);
    bg.fillRect(0, 0, width, height);
    this.add(bg);

    // Lighter surface band (top half)
    const surface = this.scene.add.graphics();
    surface.fillStyle(surfaceColor, 0.35);
    surface.fillRect(0, 0, width, height / 2);
    this.add(surface);

    // Animated ripple tile sprite using built-in water texture or a thin rect
    // We draw 3 thin horizontal ripple lines
    const ripples = this.scene.add.graphics();
    ripples.lineStyle(1, rippleColor, 0.55);
    const positions = [12, 30, 48];
    for (const py of positions) {
      for (let rx = 4; rx < width; rx += 28) {
        ripples.lineBetween(rx, py, rx + 14, py);
      }
    }
    this.add(ripples);

    // Bank edge lines (top and bottom)
    const banks = this.scene.add.graphics();
    banks.lineStyle(2.5, 0x1a237e, 0.35);
    banks.lineBetween(0, 0, width, 0);
    banks.lineBetween(0, height, width, height);
    this.add(banks);
  }

  /**
   * Call once per frame to scroll water ripple animation
   */
  public updateWater(delta: number): void {
    // Future enhancement: scroll the water tile offset for animation
    // Currently the water is static-ripple — good enough for Phase 15
    void delta;
  }

  /**
   * Toggle frozen ice appearance on river lanes
   */
  public setFrozen(frozen: boolean): void {
    if (this.type !== 'river') return;

    if (frozen) {
      if (!this.iceGraphics) {
        this.iceGraphics = this.scene.add.graphics();
        // Light blue-cyan ice sheet with semi-transparency
        this.iceGraphics.fillStyle(0x80deea, 0.7);
        this.iceGraphics.fillRect(0, 0, 480, 60);

        // Draw some white cracks for icy texture
        this.iceGraphics.lineStyle(2, 0xffffff, 0.85);
        this.iceGraphics.beginPath();
        // Crack 1
        this.iceGraphics.moveTo(50, 10);
        this.iceGraphics.lineTo(75, 25);
        this.iceGraphics.lineTo(65, 45);
        
        // Crack 2
        this.iceGraphics.moveTo(180, 48);
        this.iceGraphics.lineTo(210, 30);
        this.iceGraphics.lineTo(235, 12);
        
        // Crack 3
        this.iceGraphics.moveTo(340, 20);
        this.iceGraphics.lineTo(320, 38);
        this.iceGraphics.lineTo(360, 50);
        
        this.iceGraphics.strokePath();

        // Add a highlight/glow border around the ice lane
        this.iceGraphics.lineStyle(2.5, 0xe0f7fa, 0.9);
        this.iceGraphics.strokeRect(0, 0, 480, 60);

        this.add(this.iceGraphics);
      }
    } else {
      if (this.iceGraphics) {
        this.iceGraphics.destroy();
        this.iceGraphics = null;
      }
    }
  }

  /**
   * Helper to clean up any nested graphics
   */
  public destroyAll(): void {
    if (this.iceGraphics) {
      this.iceGraphics.destroy();
      this.iceGraphics = null;
    }
    this.destroy(true);
  }

}

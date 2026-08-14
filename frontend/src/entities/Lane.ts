import Phaser from 'phaser';

export type GameTheme =
  | 'garden'
  | 'forest'
  | 'autumn'
  | 'city'
  | 'desert'
  | 'snow';

export interface LaneConfig {
  gridY: number;
  type: 'grass' | 'road' | 'river';
  direction: 'left' | 'right';
  speed: number;
  vehicleTypes: string[];
  hasShop?: boolean;
  theme?: GameTheme;
}
export class Lane extends Phaser.GameObjects.Container {
  public gridY: number;
  public type: 'grass' | 'road' | 'river';
  public direction: 'left' | 'right';
  public speed: number;
  public hasShop: boolean;
  public shopCol: number | null = null;
  public treeCols: Set<number> = new Set();

  public theme: GameTheme;

  private iceGraphics: Phaser.GameObjects.Graphics | null = null;


constructor(scene: Phaser.Scene, config: LaneConfig) {
  const pixelY = config.gridY * 60;
  super(scene, 0, pixelY);

  this.gridY = config.gridY;
  this.type = config.type;
  this.direction = config.direction;
  this.speed = config.speed;
  this.hasShop = config.hasShop || false;
  this.theme = config.theme || 'garden';

  if (this.hasShop) {
    this.shopCol = Math.random() < 0.5 ? 0 : 11;
  }

  this.createGraphics();
  scene.add.existing(this);
}

private createDesertBackground(
  width: number,
  height: number
): void {
  const bg = this.scene.add.graphics();

  // ==============================
  // พื้นทราย
  // ==============================
  bg.fillStyle(0xe8c27a, 1);
  bg.fillRect(0, 0, width, height);

  // ==============================
  // เนินทราย
  // ==============================
  bg.fillStyle(0xf0d08a, 0.7);

  for (let x = -20; x < width; x += 70) {
    bg.fillEllipse(
      x,
      Phaser.Math.Between(10, 50),
      90,
      30
    );
  }

  // ==============================
  // ลายทราย
  // ==============================
  bg.lineStyle(1, 0xc99545, 0.35);

  for (let y = 8; y < height; y += 12) {
    for (let x = 0; x < width; x += 35) {
      bg.lineBetween(
        x,
        y,
        x + Phaser.Math.Between(8, 22),
        y
      );
    }
  }

  // ==============================
  // เม็ดทราย
  // ==============================
  for (let i = 0; i < 25; i++) {
    const x = Phaser.Math.Between(0, width);
    const y = Phaser.Math.Between(0, height);

    bg.fillStyle(0xb9823c, 0.45);
    bg.fillCircle(
      x,
      y,
      Phaser.Math.Between(1, 2)
    );
  }

  this.add(bg);

  // ==============================
  // ร้านค้า
  // ==============================
  if (this.hasShop && this.shopCol !== null) {
    const x = this.shopCol * 40 + 20;

    const shopSprite = this.scene.add.sprite(
      x,
      height / 2 - 4,
      'shop_booth'
    );

    this.add(shopSprite);

    const shopText = this.scene.add.text(
      x,
      height / 2 - 38,
      '🛒 SHOP',
      {
        font: 'bold 9px Nunito, Mitr, sans-serif',
        color: '#ffffff',
        backgroundColor: '#e67e22',
        padding: { x: 3, y: 1 }
      }
    ).setOrigin(0.5);

    this.add(shopText);
  }
// ==============================
// 🌵 กระบองเพชร
// ==============================
if (this.gridY < 18) {
  const cactusCount = Phaser.Math.Between(1, 2);
  const usedCols = new Set<number>();

  if (this.hasShop && this.shopCol !== null) {
    usedCols.add(this.shopCol);
  }

  const cactusKeys = [
    'cactus1',
    'cactus2',
    'cactus3',
    'cactus4',
    'cactus5'
  ];

  for (let i = 0; i < cactusCount; i++) {
    const col = Phaser.Math.Between(1, 10);

    if (usedCols.has(col)) {
      continue;
    }

    usedCols.add(col);

    // สุ่มกระบองเพชร 1 ใน 5 แบบ
    const cactusKey = Phaser.Math.RND.pick(cactusKeys);

    const cactusSprite = this.scene.add.sprite(
      col * 40 + 20,
      height / 2 + 5,
      cactusKey
    );

    cactusSprite.setDisplaySize(30, 42);
    cactusSprite.setOrigin(0.5, 0.5);

    this.add(cactusSprite);
  }
}
}

  /**
   * Draw the visual background of the lane depending on type and theme coordinates
   */
  private createGraphics(): void {
  const width = 480;
  const height = 60;

  if (this.type === 'river') {
    if (this.theme === 'desert') {
      this.createOasisBackground(width, height);
    } else if (this.theme === 'snow') {
      this.createSnowRiverBackground(width, height);
    } else {
      this.createWaterBackground(width, height);
    }

  } else if (this.type === 'grass') {
    if (this.theme === 'desert') {
      this.createDesertBackground(width, height);
    } else if (this.theme === 'snow') {
      this.createSnowBackground(width, height);
    } else {
      this.createGrassBackground(width, height, this.theme);
    }

  } else {
    this.createRoadBackground(width, height, this.theme);
  }
}

private createGrassBackground(width: number, height: number, theme: string): void {
  const bg = this.scene.add.graphics();

  // ─────────────────────────────────────────────
  // THEME COLORS
  // ─────────────────────────────────────────────

  let baseColor = 0x8c8c8c;
  let tileColor = 0x9e9e9e;
  let curbYellow = 0xffcc00;
  let curbWhite = 0xffffff;

  if (theme === 'desert') {
    baseColor = 0xc89b5a;
    tileColor = 0xe0b96f;
    curbYellow = 0xf4c542;
    curbWhite = 0xfff3cd;
  }

  if (theme === 'snow') {
    baseColor = 0xb8c7d9;
    tileColor = 0xdce8f2;
    curbYellow = 0x90caf9;
    curbWhite = 0xffffff;
  }

  // ─────────────────────────────────────────────
  // BASE
  // ─────────────────────────────────────────────

  bg.fillStyle(baseColor, 1);
  bg.fillRect(0, 0, width, height);

  // ─────────────────────────────────────────────
  // TILES
  // ─────────────────────────────────────────────

  const brickW = 16;
  const brickH = 8;
  const padding = 1;

  bg.fillStyle(tileColor, 1);

  for (let y = 0; y < height; y += brickH + padding) {
    const isOffset =
      Math.floor(y / (brickH + padding)) % 2 === 1;

    const startX = isOffset ? -(brickW / 2) : 0;

    for (let x = startX; x < width; x += brickW + padding) {
      bg.fillRect(x, y, brickW, brickH);
    }
  }

  // ─────────────────────────────────────────────
  // MEDIAN
  // ─────────────────────────────────────────────

  const isMedian = (gY: number) => {
    if (gY > 19) return false;

    const p = 18 - gY;

    return (
      gY === 19 ||
      p === 0 ||
      p === 1 ||
      (p >= 7 && (p % 7 === 0 || p % 7 === 1))
    );
  };

  const drawTopCurb = !isMedian(this.gridY - 1);
  const drawBottomCurb = !isMedian(this.gridY + 1);

  // ─────────────────────────────────────────────
  // CURBS
  // ─────────────────────────────────────────────

  const curbHeight = 4;
  const segmentWidth = 24;

  for (let x = 0; x < width; x += segmentWidth) {
    const isYellow =
      Math.floor(x / segmentWidth) % 2 === 0;

    bg.fillStyle(
      isYellow ? curbYellow : curbWhite,
      1
    );

    if (drawTopCurb) {
      bg.fillRect(
        x,
        0,
        Math.min(segmentWidth, width - x),
        curbHeight
      );
    }

    if (drawBottomCurb) {
      bg.fillRect(
        x,
        height - curbHeight,
        Math.min(segmentWidth, width - x),
        curbHeight
      );
    }
  }

  bg.lineStyle(1, 0x000000, 0.3);

  if (drawTopCurb) {
    bg.lineBetween(
      0,
      curbHeight,
      width,
      curbHeight
    );
  }

  if (drawBottomCurb) {
    bg.lineBetween(
      0,
      height - curbHeight,
      width,
      height - curbHeight
    );
  }

  this.add(bg);

  // ─────────────────────────────────────────────
  // SHOP
  // ─────────────────────────────────────────────

  if (this.hasShop && this.shopCol !== null) {
    const shopCol = this.shopCol;

    const shopSprite = this.scene.add.sprite(
      shopCol * 40 + 20,
      height / 2 - 4,
      'shop_booth'
    );

    this.add(shopSprite);

    const shopText = this.scene.add.text(
      shopCol * 40 + 20,
      height / 2 - 38,
      '🛒 SHOP',
      {
        font: 'bold 9px Nunito, Mitr, sans-serif',
        color: '#ffffff',
        backgroundColor:
          theme === 'desert'
            ? '#e67e22'
            : theme === 'snow'
              ? '#1976d2'
              : '#d32f2f',
        padding: { x: 3, y: 1 }
      }
    ).setOrigin(0.5);

    this.add(shopText);
  }

  // ─────────────────────────────────────────────
  // DECORATIONS
  // ─────────────────────────────────────────────

  if (this.gridY < 18) {
    const treeCount = Phaser.Math.Between(1, 2);
    const usedCols = new Set<number>();

    if (this.hasShop && this.shopCol !== null) {
      usedCols.add(this.shopCol);
    }

    for (let i = 0; i < treeCount; i++) {
      let col = Phaser.Math.Between(1, 10);

      if (usedCols.has(col)) continue;

      usedCols.add(col);
      this.treeCols.add(col);

      let treeKey = 'tree';

      if (theme === 'forest') {
        treeKey = 'treePine';
      }

      else if (theme === 'autumn') {
        treeKey = 'treeOrange';
      }

      else if (theme === 'city') {
        treeKey =
          Phaser.Math.Between(0, 1) === 0
            ? 'treeDead'
            : 'treePalm';
      }

      else if (theme === 'desert') {
        treeKey = 'treePalm';
      }

      else if (theme === 'snow') {
        treeKey = 'treePine';
      }

      const treeSprite = this.scene.add.sprite(
        col * 40 + 20,
        height / 2 - 8,
        treeKey
      );

      treeSprite.setDisplaySize(34, 38);
      treeSprite.setOrigin(0.5, 0.5);

      this.add(treeSprite);
    }
  }
}

private createRoadBackground(
  width: number,
  height: number,
  theme: GameTheme
): void {

  if (theme === 'desert') {
    this.createDesertRoadBackground(width, height);
    return;
  }

  if (theme === 'snow') {
    this.createSnowRoadBackground(width, height);
    return;
  }

  const road = this.scene.add.graphics();

  const roadColor = 0x212121;
  const lineColor = 0xffffff;

  road.fillStyle(roadColor, 1);
  road.fillRect(0, 0, width, height);

  road.lineStyle(1.5, lineColor, 0.25);

  road.lineBetween(0, 0, width, 0);
  road.lineBetween(0, height, width, height);

  road.lineStyle(1.5, lineColor, 0.2);

  const dashLen = 10;
  const gap = 14;

  for (
    let x = 0;
    x < width;
    x += dashLen + gap
  ) {
    road.lineBetween(
      x,
      height / 2,
      x + dashLen,
      height / 2
    );
  }

  this.add(road);

  this.createRoadSign();
}
private createDesertRoadBackground(
  width: number,
  height: number
): void {
  const road = this.scene.add.graphics();

  // ==============================
  // ทรายด้านข้าง
  // ==============================
  road.fillStyle(0xe8c27a, 1);
  road.fillRect(0, 0, width, height);

  // ==============================
  // ถนน
  // ==============================
  road.fillStyle(0x51463b, 1);
  road.fillRect(
    0,
    6,
    width,
    height - 12
  );

  // ==============================
  // ขอบถนน
  // ==============================
  road.lineStyle(
    3,
    0xf5d58a,
    1
  );

  road.lineBetween(
    0,
    6,
    width,
    6
  );

  road.lineBetween(
    0,
    height - 6,
    width,
    height - 6
  );

  // ==============================
  // เส้นกลางถนน
  // ==============================
  road.lineStyle(
    2,
    0xffe082,
    0.9
  );

  const dashLen = 16;
  const gap = 12;

  for (
    let x = 0;
    x < width;
    x += dashLen + gap
  ) {
    road.lineBetween(
      x,
      height / 2,
      x + dashLen,
      height / 2
    );
  }

  // ==============================
  // ทรายบนถนนเล็กน้อย
  // ==============================
  for (let i = 0; i < 15; i++) {
    road.fillStyle(
      0xc89b5a,
      0.35
    );

    road.fillCircle(
      Phaser.Math.Between(0, width),
      Phaser.Math.Between(8, height - 8),
      Phaser.Math.Between(1, 2)
    );
  }

  this.add(road);

  this.createRoadSign();
}
private createRoadSign(): void {
  if (Phaser.Math.Between(0, 1) !== 0) {
    return;
  }

  const signs = [
    'light',
    'sign_blue',
    'sign_red',
    'sign_street'
  ];

  const signKey = Phaser.Math.RND.pick(signs);

  const col = Phaser.Math.Between(1, 10);

  const signSprite = this.scene.add.sprite(
    col * 40 + 20,
    0,
    signKey
  );

  signSprite.setDisplaySize(20, 32);
  signSprite.setOrigin(0.5, 0.7);

  this.add(signSprite);
}


private createSnowBackground(
  width: number,
  height: number
): void {
  const bg = this.scene.add.graphics();

  // พื้นหิมะ
  bg.fillStyle(0xeaf6ff, 1);
  bg.fillRect(0, 0, width, height);

  // กองหิมะ
  bg.fillStyle(0xffffff, 0.9);

  for (let x = -20; x < width + 20; x += 35) {
    bg.fillEllipse(
      x,
      height,
      Phaser.Math.Between(35, 55),
      Phaser.Math.Between(12, 20)
    );
  }

  // เงาบนหิมะ
  bg.lineStyle(
    2,
    0xb3d7eb,
    0.5
  );

  for (let y = 12; y < height; y += 15) {
    for (let x = 0; x < width; x += 40) {
      bg.lineBetween(
        x,
        y,
        x + 18,
        y
      );
    }
  }

  this.add(bg);

  // ต้นสน
  if (this.gridY < 18) {
    const treeCount = Phaser.Math.Between(1, 2);

    for (let i = 0; i < treeCount; i++) {
      const col = Phaser.Math.Between(1, 10);

      this.createSnowPine(
        col * 40 + 20,
        height / 2 + 8
      );
    }
  }
}

private createSnowPine(
  x: number,
  y: number
): void {
  const tree = this.scene.add.graphics();

  // ลำต้น
  tree.fillStyle(0x795548, 1);
  tree.fillRect(
    x - 3,
    y - 10,
    6,
    18
  );

  // ใบ
  tree.fillStyle(0x2e7d32, 1);

  tree.fillTriangle(
    x,
    y - 38,
    x - 15,
    y - 10,
    x + 15,
    y - 10
  );

  tree.fillTriangle(
    x,
    y - 27,
    x - 18,
    y,
    x + 18,
    y
  );

  // หิมะ
  tree.fillStyle(0xffffff, 1);

  tree.fillTriangle(
    x,
    y - 39,
    x - 8,
    y - 23,
    x + 8,
    y - 23
  );

  tree.fillTriangle(
    x,
    y - 28,
    x - 10,
    y - 15,
    x + 10,
    y - 15
  );

  this.add(tree);
}

private createSnowRoadBackground(
  width: number,
  height: number
): void {
  const road = this.scene.add.graphics();

  // หิมะด้านข้าง
  road.fillStyle(
    0xeaf6ff,
    1
  );

  road.fillRect(
    0,
    0,
    width,
    height
  );

  // ถนน
  road.fillStyle(
    0x52636d,
    1
  );

  road.fillRect(
    0,
    6,
    width,
    height - 12
  );

  // ขอบหิมะ
  road.lineStyle(
    4,
    0xffffff,
    1
  );

  road.lineBetween(
    0,
    6,
    width,
    6
  );

  road.lineBetween(
    0,
    height - 6,
    width,
    height - 6
  );

  // เส้นกลาง
  road.lineStyle(
    2,
    0xe3f2fd,
    0.8
  );

  const dashLen = 16;
  const gap = 12;

  for (
    let x = 0;
    x < width;
    x += dashLen + gap
  ) {
    road.lineBetween(
      x,
      height / 2,
      x + dashLen,
      height / 2
    );
  }

  // หิมะเล็ก ๆ
  for (let i = 0; i < 15; i++) {
    road.fillStyle(
      0xffffff,
      0.7
    );

    road.fillCircle(
      Phaser.Math.Between(0, width),
      Phaser.Math.Between(0, height),
      Phaser.Math.Between(1, 2)
    );
  }

  this.add(road);

  this.createRoadSign();
}

private createOasisBackground(
  width: number,
  height: number
): void {
  const bg = this.scene.add.graphics();

  // น้ำโอเอซิส
  bg.fillStyle(
    0x29b6d1,
    1
  );

  bg.fillRect(
    0,
    0,
    width,
    height
  );

  // แสงสะท้อนน้ำ
  bg.lineStyle(
    2,
    0x9be7f5,
    0.6
  );

  for (
    let y = 10;
    y < height;
    y += 16
  ) {
    for (
      let x = 0;
      x < width;
      x += 35
    ) {
      bg.lineBetween(
        x,
        y,
        x + 15,
        y
      );
    }
  }

  // ขอบทราย
  bg.fillStyle(
    0xe8c27a,
    1
  );

  bg.fillRect(
    0,
    0,
    width,
    5
  );

  bg.fillRect(
    0,
    height - 5,
    width,
    5
  );

  this.add(bg);
}

private createSnowRiverBackground(
  width: number,
  height: number
): void {
  const bg = this.scene.add.graphics();

  // น้ำแข็ง
  bg.fillStyle(
    0xbde7f5,
    1
  );

  bg.fillRect(
    0,
    0,
    width,
    height
  );

  // แผ่นน้ำแข็ง
  bg.lineStyle(
    2,
    0xffffff,
    0.8
  );

  for (let x = 0; x < width; x += 70) {
    bg.lineBetween(
      x,
      0,
      x + 25,
      height
    );
  }

  // รอยแตก
  bg.lineStyle(
    1.5,
    0x75bcd3,
    0.8
  );

  for (let i = 0; i < 5; i++) {
    const x = Phaser.Math.Between(
      0,
      width
    );

    const y = Phaser.Math.Between(
      5,
      height - 5
    );

    bg.lineBetween(
      x,
      y,
      x + 20,
      y + 8
    );

    bg.lineBetween(
      x + 20,
      y + 8,
      x + 35,
      y - 3
    );
  }

  this.add(bg);
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

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 40,
      text: 'LOADING NETWORK...',
      style: {
        font: 'bold 20px Outfit, Mitr, sans-serif',
        color: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0xe3f2fd, 0.8);
    progressBox.fillRoundedRect(
  width / 2 - 160,
  height / 2 - 15,
  320,
  30,
  15
);

progressBox.lineStyle(2, 0x90a4ae, 0.6);

progressBox.strokeRoundedRect(
  width / 2 - 160,
  height / 2 - 15,
  320,
  30,
  15
);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x1565C0, 1);
      progressBar.fillRoundedRect(
  width / 2 - 155,
  height / 2 - 10,
  310 * value,
  20,
  10
);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // 1. Load Background textures
    this.load.image('backgroundColorGrass', '/assets/backgrounds/backgroundColorGrass.png');
    this.load.image('backgroundColorFall', '/assets/backgrounds/backgroundColorFall.png');
    this.load.image('backgroundColorForest', '/assets/backgrounds/backgroundColorForest.png');
    this.load.image('backgroundColorDesert', '/assets/backgrounds/backgroundColorDesert.png');

    // Load clouds (1-8)
    for (let i = 1; i <= 8; i++) {
      this.load.image(`cloud${i}`, `/assets/backgrounds/cloud${i}.png`);
    }

    // Load theme trees
    const trees = [
  'tree',
  'treeDead',
  'treeFrozen',
  'treeOrange',
  'treePine',
  'treePalm'
];

trees.forEach(t => {
  this.load.image(t, `/assets/backgrounds/${t}.png`);
});

// Load desert cactus
const cactuses = [
  'cactus1',
  'cactus2',
  'cactus3',
  'cactus4',
  'cactus5'
];

cactuses.forEach(cactus => {
  this.load.image(
    cactus,
    `/assets/backgrounds/${cactus}.png`
  );
});

    // 2. Load Player skin textures (including toon characters)
    const skins = [
      'sea_urchin', 'shark', 'squid',
      'TRex', 'triceratops', 'turtle',
      'lionfish', 'elephant', 'dolphin',
      'dog', 'doctor_stringray', 'brachiosaurus',
      'baby_stringray', 'baby_dolphin'
    ];
    skins.forEach(s => {
      this.load.image(s, `/assets/characters/${s}.png`);
      this.load.image(`${s}_walk1`, `/assets/characters/${s}_walk1.png`);
      this.load.image(`${s}_walk2`, `/assets/characters/${s}_walk2.png`);
      this.load.image(`${s}_down`, `/assets/characters/${s}_down.png`);
    });

    // 3. Load Vehicles
    const vehicles = [
      'scooter', 'sedan', 'buggy', 'convertible',
      'tractor', 'suv', 'truck', 'van', 'bus_school',
      'police', 'ambulance', 'taxi', 'sports_red', 'sports_green', 'firetruck', 'bus',
      'tanks_tankDesert1', 'tanks_tankDesert2', 'tanks_tankDesert3', 'tanks_tankDesert4', 'tanks_tankDesert5',
      'tanks_tankGreen1', 'tanks_tankGreen2', 'tanks_tankGreen3', 'tanks_tankGreen4', 'tanks_tankGreen5',
      'tanks_tankGrey1', 'tanks_tankGrey2', 'tanks_tankGrey3', 'tanks_tankGrey4', 'tanks_tankGrey5',
      'tanks_tankNavy1', 'tanks_tankNavy2', 'tanks_tankNavy3', 'tanks_tankNavy4', 'tanks_tankNavy5', // tanks
      'pirate_ship', 'pirate_ship2', 'pirate_ship3', 'pirate_ship4', 'pirate_ship5', 'pirate_ship6',
      // New vehicles
      'cycle', 'kart', 'rounded_green', 'rounded_red', 'rounded_yellow', 'sedan_blue',
      'suv_closed', 'suv_military', 'towtruck', 'truckcabin', 'truckdelivery', 'trucktank',
      'formula', 'hotdog', 'sports_convertible', 'sports_race', 'sports_yellow', 'vendor',
      // Remaining 16 vehicles (for a total of 50)
      'cycle_low', 'riot', 'sedan_vintage', 'station', 'suv_green', 'suv_large', 'suv_travel',
      'transport', 'truckcabin_vintage', 'truckdark',
      'van_flat', 'van_large', 'van_small', 'vintage'
    ];
    vehicles.forEach(v => {
      this.load.image(v, `/assets/vehicles/${v}.png`);
    });

    // 4. Load props (buildings, signs, bullet)
    const buildings = [
      'house1', 'house2', 'houseAlt1', 'houseAlt2',
      'houseSmall1', 'houseSmall2', 'houseSmallAlt1', 'houseSmallAlt2'
    ];
    buildings.forEach(b => {
      this.load.image(b, `/assets/props/${b}.png`);
    });
    const signs = ['light', 'sign_blue', 'sign_red', 'sign_street'];
    signs.forEach(s => {
      this.load.image(s, `/assets/props/${s}.png`);
    });
    this.load.image('tank_bullet', '/assets/props/tank_bullet.png');

    // 5. Load explosion particles
    for (let i = 2; i <= 4; i++) {
      this.load.image(`tank_explosion${i}`, `/assets/particles/tank_explosion{i}.png`.replace('{i}', i.toString()));
    }

    // 6. Load Audio files
    this.load.audio('snd_move', '/assets/audio/phaseJump1.ogg');
    this.load.audio('snd_score', '/assets/audio/powerUp1.ogg');
    this.load.audio('snd_hit', '/assets/audio/impactMetal_heavy_000.ogg');
    this.load.audio('snd_gameover', '/assets/audio/zap2.ogg');
  }

  create(): void {
    // Generate Neon Player Texture as fallback
    const pGraphics = this.make.graphics({ x: 0, y: 0 });
    pGraphics.lineStyle(3, 0x00f0ff, 0.8);
    pGraphics.strokeTriangle(20, 6, 6, 54, 34, 54);
    pGraphics.fillStyle(0xffffff, 0.95);
    pGraphics.fillTriangle(20, 15, 15, 50, 25, 50);
    pGraphics.generateTexture('player', 40, 60);

    // Generate Neon Vehicle Texture as fallback
    const vGraphics = this.make.graphics({ x: 0, y: 0 });
    vGraphics.lineStyle(3, 0xff007f, 0.85);
    vGraphics.strokeRoundedRect(6, 9, 78, 42, 9);
    vGraphics.fillStyle(0x1a0f30, 0.95);
    vGraphics.fillRoundedRect(12, 15, 66, 30, 6);

    vGraphics.fillStyle(0xffff00, 0.9);
    vGraphics.fillCircle(75, 18, 3.75);
    vGraphics.fillCircle(75, 42, 3.75);

    vGraphics.fillStyle(0xff0000, 0.9);
    vGraphics.fillCircle(15, 18, 3.75);
    vGraphics.fillCircle(15, 42, 3.75);

    vGraphics.generateTexture('vehicle', 90, 60);

    // Generate Vending Machine Shop texture procedurally
    const sGraphics = this.make.graphics({ x: 0, y: 0 });
    sGraphics.fillStyle(0x37474f, 1); // Dark blue-grey metal body
    sGraphics.fillRect(4, 4, 32, 52);
    sGraphics.fillStyle(0x00e5ff, 1); // Cyan light screen
    sGraphics.fillRect(8, 10, 24, 12);
    sGraphics.fillStyle(0xffd700, 1); // Gold coins slots
    sGraphics.fillRect(8, 26, 24, 4);
    sGraphics.fillStyle(0x212121, 1); // Dispenser tray
    sGraphics.fillRect(10, 38, 20, 12);
    sGraphics.generateTexture('shop_booth', 40, 60);




    // Create explosion animation sequence
    this.anims.create({
      key: 'tank_explode',
      frames: [
        { key: 'tank_explosion2' },
        { key: 'tank_explosion3' },
        { key: 'tank_explosion4' }
      ],
      frameRate: 15,
      hideOnComplete: true
    });

    this.scene.start('MenuScene');
  }
}

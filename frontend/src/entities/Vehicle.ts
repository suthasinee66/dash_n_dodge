import Phaser from 'phaser';

export class Vehicle extends Phaser.GameObjects.Sprite {
  public speed: number; // Pixels per second
  public direction: 'left' | 'right';
  public gridY: number;
  public isTank: boolean = false;
  public isBlocked: boolean = false;


  // Shooting timer for tanks: increased fire rate to 1 shot every 2 seconds
  private shootCooldown: number = 2000;
  private timeSinceLastShoot: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: 'left' | 'right',
    speed: number,
    gridY: number,
    isTank: boolean = false
  ) {
    const progress = 18 - gridY;
    let theme: 'garden' | 'forest' | 'autumn' | 'city' = 'garden';
    if (progress > 35) {
      theme = 'city';
    } else if (progress > 20) {
      theme = 'autumn';
    } else if (progress > 10) {
      theme = 'forest';
    }

    let textureKey = 'sedan';

    if (isTank) {
      const idx = Phaser.Math.Between(1, 5);
      if (theme === 'autumn') {
        textureKey = `tanks_tankDesert${idx}`;
      } else if (theme === 'city') {
        const useNavy = Math.random() < 0.5;
        textureKey = useNavy ? `tanks_tankNavy${idx}` : `tanks_tankGrey${idx}`;
      } else {
        textureKey = `tanks_tankGreen${idx}`;
      }
    } else {
      if (theme === 'garden') {
        const gardenVehicles = [
          'scooter', 'sedan', 'buggy', 'convertible',
          'cycle', 'kart', 'rounded_green', 'rounded_red', 'rounded_yellow', 'sedan_blue',
          'cycle_low', 'sedan_vintage', 'vintage'
        ];
        textureKey = gardenVehicles[Math.floor(Math.random() * gardenVehicles.length)];
      } else if (theme === 'forest' || theme === 'autumn') {
        const forestVehicles = [
          'tractor', 'suv', 'truck', 'van', 'bus_school',
          'suv_closed', 'suv_military', 'towtruck', 'truckcabin', 'truckdelivery', 'trucktank',
          'suv_green', 'suv_large', 'suv_travel', 'transport', 'truckcabin_vintage',
          'truckdark', 'van_flat', 'van_large', 'van_small'
        ];
        textureKey = forestVehicles[Math.floor(Math.random() * forestVehicles.length)];
      } else {
        const cityVehicles = [
          'police', 'ambulance', 'taxi', 'sports_red', 'sports_green', 'firetruck', 'bus',
          'formula', 'hotdog', 'sports_convertible', 'sports_race', 'sports_yellow', 'vendor',
          'riot', 'station'
        ];
        textureKey = cityVehicles[Math.floor(Math.random() * cityVehicles.length)];
      }
    }

    super(scene, x, y, textureKey);

    this.speed = speed;
    this.direction = direction;
    this.gridY = gridY;
    this.isTank = isTank;

    const largeVehicles = [
      'ambulance', 'bus', 'riot', 'truck', 'truckcabin', 'truckdark', 'trucktank',
      'bus_school', 'firetruck', 'hotdog', 'towtruck', 'transport',
      'truckcabin_vintage', 'truckdelivery'
    ];
    const normalVehicles = [
      'convertible', 'formula', 'rounded_red', 'sedan_blue', 'sports_convertible',
      'sports_race', 'sports_yellow', 'suv', 'suv_green', 'suv_military', 'taxi',
      'tractor', 'van', 'van_large', 'vendor', 'police', 'rounded_green',
      'rounded_yellow', 'sedan', 'sedan_vintage', 'sports_green', 'sports_red',
      'station', 'suv_closed', 'suv_large', 'suv_travel', 'van_flat', 'van_small',
      'vintage'
    ];
    const motorCycles = [
      'cycle_low', 'scooter', 'kart', 'buggy', 'cycle'
    ];

    if (isTank) {
      this.setScale(0.6);
    } else if (largeVehicles.includes(textureKey)) {
      this.setScale(1.6);
    } else if (normalVehicles.includes(textureKey)) {
      this.setScale(2.3);
    } else if (motorCycles.includes(textureKey)) {
      this.setScale(2.5);
    } else {
      this.setScale(2.7); // fallback
    }

    if (this.direction === 'left') {
      this.setFlipX(true);
    }

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      const bodyWidth = Math.max(24, this.width * 0.85);
      const bodyHeight = Math.max(16, this.height * 0.70);
      body.setSize(bodyWidth, bodyHeight);
      body.setOffset((this.width - bodyWidth) / 2, (this.height - bodyHeight) / 2);
    }

    this.setDepth(80);
    this.setOrigin(0.5, 0.5);
    scene.add.existing(this);

    // Randomize initial shot timing to offset fire times
    if (isTank) {
      this.timeSinceLastShoot = Phaser.Math.Between(0, 1000);
    }
  }

  /**
   * Move vehicle in its update step and handle tank firing
   * @param delta Frame delta time in ms
   * @param onShoot Callback triggered when a tank fires
   */
  public moveStep(delta: number, onShoot?: (x: number, y: number, dir: 'left' | 'right') => void): void {
    const moveAmount = this.isBlocked ? 0 : (this.speed * delta) / 1000;


    if (this.direction === 'right') {
      this.x += moveAmount;
    } else {
      this.x -= moveAmount;
    }

    // Bullet firing timer for tanks
    if (this.isTank && onShoot) {
      this.timeSinceLastShoot += delta;
      if (this.timeSinceLastShoot >= this.shootCooldown) {
        this.timeSinceLastShoot = 0;
        // Bullet offset: spawn slightly in front of the barrel
        const offsetX = this.direction === 'right' ? 32 : -32;
        onShoot(this.x + offsetX, this.y - 2, this.direction);
      }
    }
  }
}

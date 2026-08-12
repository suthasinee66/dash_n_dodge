import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    // Simple scene setup. In the future, we could configure global registry here.
    this.scene.start('PreloadScene');
  }
}

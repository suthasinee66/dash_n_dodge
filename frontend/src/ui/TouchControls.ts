import Phaser from 'phaser';

export class TouchControls {
  private scene: Phaser.Scene;
  private onSwipeCallback: (dirX: number, dirY: number) => void;

  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;

  // Swipe thresholds for responsive detection
  private readonly minDistance: number = 35;  // minimum swipe travel in pixels
  private readonly maxDuration: number = 280;  // maximum swipe swipe action duration in ms

  constructor(scene: Phaser.Scene, onSwipe: (dirX: number, dirY: number) => void) {
    this.scene = scene;
    this.onSwipeCallback = onSwipe;
    this.setupListeners();
  }

  /**
   * Bind Phaser pointer input events
   */
  private setupListeners(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startX = pointer.x;
      this.startY = pointer.y;
      this.startTime = this.scene.time.now;
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const endX = pointer.x;
      const endY = pointer.y;
      const endTime = this.scene.time.now;

      const diffX = endX - this.startX;
      const diffY = endY - this.startY;
      const duration = endTime - this.startTime;

      // Discard gestures that take too long (likely scrolls/drags, not swipes)
      if (duration > this.maxDuration) return;

      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      // Verify that travel exceeds minimum threshold
      if (absX > absY && absX >= this.minDistance) {
        // Horizontal Swiping
        if (diffX > 0) {
          this.onSwipeCallback(1, 0);  // RIGHT
        } else {
          this.onSwipeCallback(-1, 0); // LEFT
        }
      } else if (absY > absX && absY >= this.minDistance) {
        // Vertical Swiping
        if (diffY > 0) {
          this.onSwipeCallback(0, 1);  // DOWN
        } else {
          this.onSwipeCallback(0, -1); // UP
        }
      }
    });
  }

  /**
   * Clean up input listeners when scene changes or player restarts
   */
  public destroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointerup');
  }
}

import Phaser from 'phaser';
import { Vehicle } from '../entities/Vehicle.ts';
import { Lane } from '../entities/Lane.ts';
import { DifficultyManager } from './DifficultyManager.ts';

export class TrafficManager {
  private scene: Phaser.Scene;
  public vehicleGroup: Phaser.Physics.Arcade.Group;
  private prePopulatedLanes: Set<number> = new Set();
  public timeScale: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.vehicleGroup = scene.physics.add.group({
      classType: Vehicle,
      runChildUpdate: false
    });
  }

  /**
   * Update active vehicles and handle spawning for visible lanes
   * @param delta Frame delta time
   * @param visibleLanes List of active lanes in viewport
   * @param currentScore The current player score to fetch difficulty config
   * @param onShoot Callback triggered when a tank shoots a bullet
   */
  public update(
    delta: number,
    visibleLanes: Lane[],
    currentScore: number,
    onShoot?: (x: number, y: number, dir: 'left' | 'right') => void
  ): void {
    const config = DifficultyManager.getConfig(currentScore);

    // 1. Reset blocking status
    const vehicles = this.vehicleGroup.getChildren() as Vehicle[];
    for (const v of vehicles) {
      v.isBlocked = false;
    }

    // 2. Move active vehicles and remove off-screen ones
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const vehicle = vehicles[i];
      vehicle.moveStep(delta * this.timeScale, onShoot);

      // Remove vehicle if it goes out of horizontal bounds
      if (
        (vehicle.direction === 'right' && vehicle.x > 540) ||
        (vehicle.direction === 'left' && vehicle.x < -60)
      ) {
        this.vehicleGroup.remove(vehicle, true, true);
      }
    }


    // 2. Manage traffic spawn density for each visible road lane
    for (const lane of visibleLanes) {
      if (lane.type !== 'road') continue;

      // Ensure lane is pre-populated first time it enters view
      if (!this.prePopulatedLanes.has(lane.gridY)) {
        this.prePopulateLane(lane, currentScore);
        continue;
      }

      // Filter vehicles currently on this lane
      const laneVehicles = vehicles.filter(v => v.gridY === lane.gridY);

      // Enforce difficulty-based vehicle limits
      if (laneVehicles.length < config.maxVehiclesPerLane) {
        this.trySpawnVehicle(lane, laneVehicles, currentScore);
      }
    }
  }

  /**
   * Pre-populate a lane with vehicles at random positions to look busy instantly
   */
  private prePopulateLane(lane: Lane, currentScore: number): void {
    this.prePopulatedLanes.add(lane.gridY);

    const config = DifficultyManager.getConfig(currentScore);
    const direction = lane.direction;
    const speed = lane.speed * config.speedMultiplier;
    const y = lane.gridY * 60 + 30;

    // In extreme difficulty, we have a 30% chance to spawn a tank
    const isExtreme = config.tier === 'extreme';
    const numVehicles = Phaser.Math.Between(1, 2);

    for (let i = 0; i < numVehicles; i++) {
      let spawnX = 0;
      if (numVehicles === 1) {
        spawnX = Phaser.Math.Between(80, 400);
      } else {
        spawnX = i === 0 ? Phaser.Math.Between(80, 200) : Phaser.Math.Between(280, 400);
      }

      const roll = Phaser.Math.Between(1, 100);
      const isTank = isExtreme && (roll <= 30);

      const vehicle = new Vehicle(this.scene, spawnX, y, direction, speed, lane.gridY, isTank);
      this.vehicleGroup.add(vehicle);
    }
  }

  /**
   * Try to spawn a new vehicle at the screen border edge
   */
  private trySpawnVehicle(lane: Lane, laneVehicles: Vehicle[], currentScore: number): void {
    const config = DifficultyManager.getConfig(currentScore);
    const direction = lane.direction;
    const speed = lane.speed * config.speedMultiplier;
    const y = lane.gridY * 60 + 30;

    const minGap = config.minSpawnGap;
    let canSpawn = true;

    // Check if the spawning zone is clear of existing cars
    if (direction === 'right') {
      for (const v of laneVehicles) {
        if (v.x < -60 + minGap) {
          canSpawn = false;
          break;
        }
      }
      if (canSpawn) {
        const isExtreme = config.tier === 'extreme';
        const roll = Phaser.Math.Between(1, 100);
        const isTank = isExtreme && (roll <= 30);

        const vehicle = new Vehicle(this.scene, -60, y, direction, speed, lane.gridY, isTank);
        this.vehicleGroup.add(vehicle);
      }
    } else {
      for (const v of laneVehicles) {
        if (v.x > 540 - minGap) {
          canSpawn = false;
          break;
        }
      }
      if (canSpawn) {
        const isExtreme = config.tier === 'extreme';
        const roll = Phaser.Math.Between(1, 100);
        const isTank = isExtreme && (roll <= 30);

        const vehicle = new Vehicle(this.scene, 540, y, direction, speed, lane.gridY, isTank);
        this.vehicleGroup.add(vehicle);
      }
    }
  }

  /**
   * Clear all active traffic
   */
  public clearAll(): void {
    this.vehicleGroup.clear(true, true);
    this.prePopulatedLanes.clear();
  }

  /**
   * Prune pre-populated memory for lanes that have been deleted
   */
  public pruneLaneMemory(gridY: number): void {
    this.prePopulatedLanes.delete(gridY);
  }
}

import Phaser from 'phaser';
import { Raft } from '../entities/Raft.ts';
import { Lane } from '../entities/Lane.ts';

/**
 * RaftManager — equivalent of TrafficManager but for River lanes.
 * Spawns wooden rafts with mixed sizes (1-3 cells) and keeps them moving.
 */
export class RaftManager {
  private scene: Phaser.Scene;
  public raftGroup: Phaser.Physics.Arcade.Group;
  private prePopulatedLanes: Set<number> = new Set();
  public timeScale: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.raftGroup = scene.physics.add.group({
      runChildUpdate: false
    });
  }

  // ─── Public update loop ─────────────────────────────────────────────────────

  public update(delta: number, visibleLanes: Lane[]): void {
    // 1. Move all active rafts
    const rafts = this.raftGroup.getChildren() as Raft[];
    for (let i = rafts.length - 1; i >= 0; i--) {
      const raft = rafts[i];
      raft.moveStep(delta * this.timeScale);

      // Remove when fully off-screen on either side (give extra margin for wide rafts)
      const margin = raft.raftWidth / 2 + 20;
      if (
        (raft.direction === 'right' && raft.x > 480 + margin) ||
        (raft.direction === 'left' && raft.x < -margin)
      ) {
        this.raftGroup.remove(raft, true, true);
      }
    }

    // 2. Populate / spawn rafts for visible river lanes
    for (const lane of visibleLanes) {
      if (lane.type !== 'river') continue;

      if (!this.prePopulatedLanes.has(lane.gridY)) {
        this._prePopulate(lane);
        continue;
      }

      // Keep lane alive — try spawning a replacement when the lane is sparse
      const laneRafts = rafts.filter(r => r.gridY === lane.gridY);
      if (laneRafts.length < 3) {
        this._trySpawn(lane, laneRafts);
      }
    }
  }

  // ─── Spawn helpers ──────────────────────────────────────────────────────────

  /** Initial placement of 2-3 rafts spread across the visible width */
  private _prePopulate(lane: Lane): void {
    this.prePopulatedLanes.add(lane.gridY);

    const direction = lane.direction;
    const speed = lane.speed; // Use constant lane speed to prevent overlaps!
    const y = lane.gridY * 60 + 30;

    // Spread positions so the lane looks populated but still has gaps
    const positions = this._getSpreadPositions(3);
    let isShipToggle = false;
    for (const px of positions) {
      const size = this._randomSize();
      const raft = new Raft(this.scene, px, y, direction, speed, lane.gridY, size, isShipToggle);
      isShipToggle = !isShipToggle;
      this.raftGroup.add(raft);
    }
  }

  /** Try to spawn one new raft at the leading edge */
  private _trySpawn(lane: Lane, laneRafts: Raft[]): void {
    const direction = lane.direction;
    const speed = lane.speed; // Use constant lane speed to prevent overlaps!
    const y = lane.gridY * 60 + 30;
    
    // Find the latest spawned raft to alternate type
    const lastRaft = laneRafts.reduce((prev, current) => {
      if (direction === 'right') {
        return (!prev || prev.x < current.x) ? current : prev;
      } else {
        return (!prev || prev.x > current.x) ? current : prev;
      }
    }, null as Raft | null);

    const isShip = lastRaft ? !lastRaft.isShip : (Math.random() < 0.5);
    const size = this._randomSize();
    const currentWidth = isShip ? 97.5 : size * 40;
    const minGap = currentWidth + 70; // ensure visible gap between rafts

    if (direction === 'right') {
      // Spawn from left edge — make sure not too close to existing raft
      const tooClose = laneRafts.some(r => r.x < minGap);
      if (!tooClose) {
        const spawnX = -(currentWidth / 2) - 20;
        const raft = new Raft(this.scene, spawnX, y, direction, speed, lane.gridY, size, isShip);
        this.raftGroup.add(raft);
      }
    } else {
      const tooClose = laneRafts.some(r => r.x > 480 - minGap);
      if (!tooClose) {
        const spawnX = 480 + (currentWidth / 2) + 20;
        const raft = new Raft(this.scene, spawnX, y, direction, speed, lane.gridY, size, isShip);
        this.raftGroup.add(raft);
      }
    }
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  private _getSpreadPositions(count: number): number[] {
    const positions: number[] = [];
    const step = 480 / (count + 1);
    for (let i = 1; i <= count; i++) {
      positions.push(step * i + Phaser.Math.Between(-30, 30));
    }
    return positions;
  }

  private _randomSize(): 1 | 2 | 3 {
    const roll = Phaser.Math.Between(0, 2);
    return (roll + 1) as 1 | 2 | 3;
  }

  // ─── Memory management ──────────────────────────────────────────────────────

  public clearAll(): void {
    this.raftGroup.clear(true, true);
    this.prePopulatedLanes.clear();
  }

  public pruneLaneMemory(gridY: number): void {
    this.prePopulatedLanes.delete(gridY);
  }

  /** Return all rafts whose row matches the player's gridY */
  public getRaftsAtRow(gridY: number): Raft[] {
    return (this.raftGroup.getChildren() as Raft[]).filter(r => r.gridY === gridY);
  }
}


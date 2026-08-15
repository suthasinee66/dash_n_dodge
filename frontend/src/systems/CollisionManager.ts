import Phaser from 'phaser';
import { Player } from '../entities/Player.ts';
import { TrafficManager } from './TrafficManager.ts';
import { RaftManager } from './RaftManager.ts';
import { Raft } from '../entities/Raft.ts';

export class CollisionManager {
  private scene: Phaser.Scene;
  private hasCollided: boolean = false;

  // Grace period after landing on a river lane before drowning kicks in (ms)
  // This prevents instant-death when the tween is still settling.
  private readonly DROWN_GRACE_MS = 90; // +10 ms grace — reduces false drowning on raft-to-island hops

  private riverLandingTime: number = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ─── Vehicle collision ────────────────────────────────────────────────────

  public setupCollision(
    player: Player,
    trafficManager: TrafficManager,
    onCollide: () => void
  ): void {
    this.hasCollided = false;

    this.scene.physics.add.overlap(
      player,
      trafficManager.vehicleGroup,
      (_, vehicleObj) => {
        if (this.hasCollided || player.isInvincible || player.isFlying) return;


        // Midas Touch Effect
        if ((this.scene as any).isMidasActive) {
          const vehicle = vehicleObj as any;
          
          // Play coin chime sound
          (this.scene as any).sound.play('snd_score');

          // Collect coin and trigger score popup
          const pts = (this.scene as any).scoreManager.collectCoin();
          (this.scene as any).updateScoreUI();
          (this.scene as any)._triggerCoinPopup(pts);

          // Spawn explosion animation at vehicle location
          const exp = this.scene.add.sprite(vehicle.x, vehicle.y, 'tank_explosion2');
          exp.setScale(1.2);
          exp.setDepth(9999);
          exp.play('tank_explode');
          exp.on('animationcomplete', () => exp.destroy());

          // Remove vehicle
          trafficManager.vehicleGroup.remove(vehicle, true, true);
          this.scene.cameras.main.shake(80, 0.008);
          return;
        }

        if (player.hasShield) {
          player.setHasShield(false);
          player.becomeInvincible(1000);
          this.scene.cameras.main.shake(120, 0.012);
          return;
        }
        this.hasCollided = true;
        onCollide();
      },
      undefined,
      this.scene
    );
  }

  // ─── River / Drowning ────────────────────────────────────────────────────

  /**
   * Called once per frame from GameScene.update().
   * Timer starts the MOMENT the player's gridY is a river lane — even if the
   * move animation is still running.  Raft detection uses pixel position so
   * partially overlapping a raft counts as safe.  This prevents the exploit
   * of immediately moving off the river to reset the grace timer.
   *
   * Escape is still possible when a raft is under the player (full or partial).
   */
  public updateRiverCheck(
    player: Player,
    raftManager: RaftManager,
    isRiverLane: boolean,
    onDrown: () => void
  ): void {
    if (this.hasCollided) return;  // already dead
    if (player.isInvincible || player.isFlying || (this.scene as any).isRiverFrozen) {
      this.riverLandingTime = -1;
      if (player.isRiding) {
        player.isRiding = false;
        player.currentRaft = null;
      }
      return;
    }

    if (!isRiverLane) {
      // Not on water — reset grace timer and detach only when NOT in a move
      // animation (to avoid resetting mid-tween when crossing from water to land)
      if (!player.getIsMoving()) {
        this.riverLandingTime = -1;
        if (player.isRiding) {
          player.isRiding = false;
          player.currentRaft = null;
        }
      }
      return;
    }

    // ── On a river lane ──────────────────────────────────────────────────
    // Start grace timer immediately (even if still animating into the tile)
    if (this.riverLandingTime < 0) {
      this.riverLandingTime = this.scene.time.now;
    }

    // Always run pixel-based raft detection — works during tween too
    const raft = this._findRaftUnderPlayer(player, raftManager);

    if (raft) {
      // Safe: on or partially on a raft
      if (!player.getIsMoving()) {
        player.attachToRaft(raft);
      }
      this.riverLandingTime = -1;  // reset while riding
    } else {
      if (!player.getIsMoving()) {
        player.isRiding = false;
        player.currentRaft = null;
      }

      // Drown after short grace period — no raft contact at all
      const elapsed = this.scene.time.now - this.riverLandingTime;
      if (elapsed > this.DROWN_GRACE_MS) {
        if (player.hasShield) {
          player.setHasShield(false);
          player.becomeInvincible(1000);
          this.riverLandingTime = -1;
          this.scene.cameras.main.shake(120, 0.012);
          return;
        }
        this.hasCollided = true;
        onDrown();
      }
    }
  }
public checkOutOfBounds(player: Player, onDrown: () => void): void {
  if (this.hasCollided) return;

  // ถ้าอยู่บนแพ อนุญาตให้ออกขอบได้
  // เพราะแพจะวนกลับอีกฝั่ง
  if (player.isRiding && player.currentRaft) {
    return;
  }

  if (player.x < -20 || player.x > 500) {
    this.hasCollided = true;
    onDrown();
  }
}

  // ─── Internal ─────────────────────────────────────────────────────────────

  private _findRaftUnderPlayer(player: Player, raftManager: RaftManager): Raft | null {
    const rafts = raftManager.getRaftsAtRow(player.gridY);
    for (const raft of rafts) {
      const halfW = raft.raftWidth / 2 + 22; // +16 px extra tolerance — prevents false-drown on raft edges
      if (Math.abs(raft.x - player.x) < halfW) {
        return raft;
      }
    }
    return null;
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  public reset(): void {
    this.hasCollided = false;
    this.riverLandingTime = -1;
  }
}

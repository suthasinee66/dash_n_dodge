export type DifficultyTier = 'easy' | 'normal' | 'hard' | 'extreme';

export interface DifficultyConfig {
  tier: DifficultyTier;
  speedMultiplier: number;
  maxVehiclesPerLane: number;
  minSpawnGap: number;
}

export class DifficultyManager {
  /**
   * Determine the current difficulty configurations based on score
   * @param score Current player score
   */
  public static getConfig(score: number): DifficultyConfig {
    if (score <= 20) {
      return {
        tier: 'easy',
        speedMultiplier: 1.0,
        maxVehiclesPerLane: 2,
        minSpawnGap: 200
      };
    } else if (score <= 35) {
      return {
        tier: 'normal',
        speedMultiplier: 1.2,
        maxVehiclesPerLane: 2,
        minSpawnGap: 170
      };
    } else if (score <= 60) {
      return {
        tier: 'hard',
        speedMultiplier: 1.45,
        maxVehiclesPerLane: 3,
        minSpawnGap: 140
      };
    } else {
      return {
        tier: 'extreme',
        speedMultiplier: 1.7,
        maxVehiclesPerLane: 3,
        minSpawnGap: 110
      };
    }
  }

  /**
   * Returns a user-friendly Thai display string for the current difficulty tier
   * @param tier The difficulty tier
   */
  public static getThaiLabel(tier: DifficultyTier): string {
    switch (tier) {
      case 'easy':
        return 'ง่าย';
      case 'normal':
        return 'ปานกลาง';
      case 'hard':
        return 'ยาก';
      case 'extreme':
        return 'ท้าทาย';
    }
  }
}

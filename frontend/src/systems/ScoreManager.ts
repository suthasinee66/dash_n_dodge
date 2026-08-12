export class ScoreManager {
  private currentScore: number = 0;
  private maxRowReached: number = 18; // Start row index is 18
  private readonly storageKey: string = 'nhee_lor_best_score';

  // Streak tracking
  private streakCount: number = 0;
  private readonly STREAK_THRESHOLD = 3; // rows without backtracking for x2

  // Coin bonus
  private coinCount: number = 0;
  private readonly COIN_BONUS = 1; // +1 score per coin

  // Score multiplier item
  private scoreMultiplier: number = 1;

  constructor() {
    this.reset();
  }

  /**
   * Reset current score and tracking indicators
   */
  public reset(): void {
    this.currentScore = 0;
    this.maxRowReached = 18;
    this.streakCount = 0;
    this.coinCount = 0;
    this.scoreMultiplier = 1;
  }

  /**
   * Process a player's new grid position to check for forward progression scoring.
   * Returns how many points were actually awarded this step (0, 1, or 2).
   */
  public updateRowPosition(gridY: number): number {
    if (gridY < this.maxRowReached) {
      // Moved forward
      this.streakCount++;
      const multiplier = this.streakCount >= this.STREAK_THRESHOLD ? 2 : 1;
      const pointsEarned = (this.maxRowReached - gridY) * multiplier * this.scoreMultiplier;
      this.currentScore += pointsEarned;
      this.maxRowReached = gridY;

      // Update best score in localStorage if beaten
      const bestScore = this.getBestScore();
      if (this.currentScore > bestScore) {
        this.saveBestScore(this.currentScore);
      }

      return pointsEarned;
    } else if (gridY > this.maxRowReached) {
      // Moved backward — break the streak
      this.streakCount = 0;
    }
    // Moved sideways — streak preserved
    return 0;
  }

  /**
   * Award bonus score for collecting a coin.
   * Returns the points awarded.
   */
  public collectCoin(): number {
    this.coinCount++;
    const pointsAwarded = this.COIN_BONUS * this.scoreMultiplier;
    this.currentScore += pointsAwarded;
 
    const bestScore = this.getBestScore();
    if (this.currentScore > bestScore) {
      this.saveBestScore(this.currentScore);
    }
 
    return pointsAwarded;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  public getScore(): number {
    return this.currentScore;
  }

  public getCoinCount(): number {
    return this.coinCount;
  }

  /** True when a x2 streak is currently active */
  public isStreakActive(): boolean {
    return this.streakCount >= this.STREAK_THRESHOLD;
  }

  public getStreakCount(): number {
    return this.streakCount;
  }

  /**
   * Deduct score (e.g. from tank bullet hit). Capped at 0.
   * Returns actual points deducted.
   */
  public deductScore(points: number): number {
    const original = this.currentScore;
    this.currentScore = Math.max(0, this.currentScore - points);
    // Break the streak if hit
    this.streakCount = 0;
    return original - this.currentScore;
  }

  /**
   * Read the local highscore from localStorage
   */
  public getBestScore(): number {
    try {
      const val = localStorage.getItem(this.storageKey);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Write the best score to localStorage
   */
  private saveBestScore(score: number): void {
    try {
      localStorage.setItem(this.storageKey, score.toString());
    } catch {
      // Ignore if localStorage unavailable
    }
  }

  public deductCoins(amount: number): void {
    this.coinCount = Math.max(0, this.coinCount - amount);
  }

  public setScoreMultiplier(multiplier: number): void {
    this.scoreMultiplier = multiplier;
  }
}

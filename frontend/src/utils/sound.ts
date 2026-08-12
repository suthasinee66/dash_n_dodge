import Phaser from 'phaser';

export class SoundEffects {
  /**
   * Play preloaded hop sound when moving
   */
  public static playMove(scene: Phaser.Scene): void {
    if (scene.registry.get('soundOn') === false) return;
    try {
      scene.sound.play('snd_move', { volume: 0.35 });
    } catch (err) {
      console.warn('[SOUND ERROR] Failed to play move audio:', err);
    }
  }

  /**
   * Play coin chime when scoring
   */
  public static playScore(scene: Phaser.Scene): void {
    if (scene.registry.get('soundOn') === false) return;
    try {
      scene.sound.play('snd_score', { volume: 0.3 });
    } catch (err) {
      console.warn('[SOUND ERROR] Failed to play score audio:', err);
    }
  }

  /**
   * Play heavy impact metal sound on collision
   */
  public static playHit(scene: Phaser.Scene): void {
    if (scene.registry.get('soundOn') === false) return;
    try {
      scene.sound.play('snd_hit', { volume: 0.4 });
    } catch (err) {
      console.warn('[SOUND ERROR] Failed to play hit audio:', err);
    }
  }

  /**
   * Play digital down/game over chime sequence
   */
  public static playGameOver(scene: Phaser.Scene): void {
    if (scene.registry.get('soundOn') === false) return;
    try {
      scene.sound.play('snd_gameover', { volume: 0.35 });
    } catch (err) {
      console.warn('[SOUND ERROR] Failed to play game over audio:', err);
    }
  }

  /**
   * Play a short tick beep for each countdown number (3, 2, 1)
   * Uses Web Audio API to generate tone without external files.
   */
  public static playCountdownBeep(scene: Phaser.Scene): void {
    if (scene.registry.get('soundOn') === false) return;
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, ctx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.18);
    } catch (err) {
      console.warn('[SOUND ERROR] Failed to play countdown beep:', err);
    }
  }

  /**
   * Play a bright fanfare sound for 'GO!'
   * Uses Web Audio API.
   */
  public static playCountdownGo(scene: Phaser.Scene): void {
    if (scene.registry.get('soundOn') === false) return;
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const play = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      // Quick ascending fanfare: C5 → E5 → G5
      play(523, 0.00, 0.12);
      play(659, 0.10, 0.12);
      play(784, 0.20, 0.30);
    } catch (err) {
      console.warn('[SOUND ERROR] Failed to play countdown go:', err);
    }
  }
}

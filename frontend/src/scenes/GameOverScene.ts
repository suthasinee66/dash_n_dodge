import Phaser from 'phaser';
import { ApiService } from '../services/api.ts';
import { SoundEffects } from '../utils/sound.ts';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    const score = this.registry.get('lastScore') ?? 0;
    const best = this.registry.get('bestScore') ?? 0;
    const nickname = this.registry.get('nickname') || 'PLAYER';
    const coins = this.registry.get('lastCoins') ?? 0;

    SoundEffects.playGameOver(this);

    uiLayer.classList.remove('hidden');
    uiLayer.innerHTML = `
      <div class="glass-panel">
        <!-- Header -->
        <div style="font-size: 2.8rem; margin-bottom: 0.2rem; line-height: 1;">💥</div>
        <h2 class="title-main" style="color: #e53935;">เกมจบแล้ว!</h2>
        <p style="font-size: 0.85rem; color: #5c8fa8; margin-bottom: 1.2rem; font-weight: 600;">คุณชนล้อเข้าเต็มแรง!</p>

        <!-- Score Card -->
        <div class="score-badge">
          <div style="font-size: 0.78rem; color: #5c8fa8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">คะแนนรอบนี้</div>
          <div style="font-size: 3rem; font-weight: 900; color: #1565C0; line-height: 1.1; font-family: 'Nunito', sans-serif;">${score}</div>
          <hr class="sky-divider" style="margin: 8px 0;" />
          <div style="font-size: 0.82rem; color: #5c8fa8; font-weight: 600;">
            เหรียญที่เก็บได้:&nbsp;
            <strong style="color: #b8860b; font-size: 0.95rem;">🪙 ${coins}</strong>
          </div>
          <hr class="sky-divider" style="margin: 8px 0;" />
          <div style="font-size: 0.82rem; color: #5c8fa8; font-weight: 600;">
            คะแนนสูงสุดส่วนตัว:&nbsp;
            <strong style="color: #388E3C; font-size: 1rem; font-family: 'Nunito', sans-serif;">${best}</strong>
          </div>
        </div>

        <!-- Submit status -->
        <div id="submit-status" style="height: 20px; margin-bottom: 0.8rem;">
          <span style="color: #90a4ae; font-size: 0.78rem; font-weight: 600;">กำลังส่งคะแนนไปที่เซิร์ฟเวอร์...</span>
        </div>

        <!-- Action buttons -->
        <button id="restart-btn" class="sky-btn green">🔄 เล่นอีกครั้ง</button>
        <button id="leaderboard-btn" class="sky-btn">🏆 อันดับคะแนน</button>
        <button id="go-menu-btn" class="sky-btn secondary">🏠 เมนูหลัก</button>
      </div>
    `;

    ApiService.submitScore(nickname, score).then((result) => {
      const statusEl = document.getElementById('submit-status');
      if (statusEl) {
        if (result) {
          statusEl.innerHTML = `<span style="color: #43a047; font-size: 0.82rem; font-weight: 700;">✓ บันทึกคะแนนออนไลน์สำเร็จ!</span>`;
        } else {
          statusEl.innerHTML = `<span style="color: #90a4ae; font-size: 0.78rem; font-weight: 600;">เซิร์ฟเวอร์ออฟไลน์ บันทึกคะแนนในเครื่องแทน</span>`;
        }
      }
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
      this.scene.start('GameScene');
    });

    document.getElementById('leaderboard-btn')?.addEventListener('click', () => {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
      this.scene.start('LeaderboardScene');
    });

    document.getElementById('go-menu-btn')?.addEventListener('click', () => {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
      this.scene.start('MenuScene');
    });
  }
}

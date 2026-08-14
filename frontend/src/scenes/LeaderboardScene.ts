import Phaser from 'phaser';
import { ApiService } from '../services/api.ts';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  create(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    uiLayer.classList.remove('hidden');
    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 440px; width: 95%;">
        <div style="font-size: 2.6rem; margin-bottom: 0.2rem; line-height: 1;">🏆</div>
        <h2 class="title-main" style="font-size: 1.8rem; margin-bottom: 0.8rem;">บอร์ดคะแนน & ประวัติ</h2>

        <!-- Tab selection -->
        <div style="display: flex; gap: 8px; margin-bottom: 1.2rem; width: 100%;">
          <button id="tab-solo-btn" class="sky-btn green" style="flex: 1; padding: 8px; font-size: 0.85rem; margin-bottom: 0;">🏆 TOP 10 เดี่ยว</button>
          <button id="tab-group-btn" class="sky-btn secondary" style="flex: 1; padding: 8px; font-size: 0.85rem; margin-bottom: 0;">👥 ประวัติห้องกลุ่ม</button>
        </div>

        <div id="leaderboard-container" class="scrollable-y" style="
          margin-bottom: 1.2rem;
          text-align: left;
          height: 320px;
          padding-right: 2px;
        ">
          <!-- Dynamically populated -->
        </div>

        <button id="back-btn" class="sky-btn secondary">กลับหน้าหลัก</button>
      </div>
    `;

    const container = document.getElementById('leaderboard-container') as HTMLElement;
    const tabSoloBtn = document.getElementById('tab-solo-btn') as HTMLButtonElement;
    const tabGroupBtn = document.getElementById('tab-group-btn') as HTMLButtonElement;

    const selectSoloTab = () => {
      tabSoloBtn.className = 'sky-btn green';
      tabGroupBtn.className = 'sky-btn secondary';
      this.showSoloLeaderboard(container);
    };

    const selectGroupTab = () => {
      tabSoloBtn.className = 'sky-btn secondary';
      tabGroupBtn.className = 'sky-btn green';
      this.showGroupHistory(container);
    };

    tabSoloBtn.addEventListener('click', selectSoloTab);
    tabGroupBtn.addEventListener('click', selectGroupTab);

    document.getElementById('back-btn')?.addEventListener('click', () => {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
      this.scene.start('MenuScene');
    });

    // Default to Solo tab
    selectSoloTab();
  }

  private showSoloLeaderboard(container: HTMLElement): void {
    container.innerHTML = `
      <div style="text-align: center; color: #90a4ae; padding: 28px 0; font-size: 0.9rem; font-weight: 600;">
        กำลังโหลด...
      </div>
    `;

    ApiService.getLeaderboard(10).then((data) => {
      if (!data) {
        container.innerHTML = `
          <div style="color: #e53935; text-align: center; padding: 28px 0; font-weight: 700; font-size: 0.92rem;">
            ไม่สามารถโหลดข้อมูลได้ในขณะนี้
          </div>
        `;
        return;
      }

      if (data.length === 0) {
        container.innerHTML = `
          <div style="color: #90a4ae; text-align: center; padding: 32px 0; font-size: 0.9rem; font-weight: 600;">
            ยังไม่มีคะแนนบันทึกในขณะนี้
          </div>
        `;
        return;
      }

      let html = `
        <div class="lb-header" style="
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          color: #5c8fa8;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 6px;
          margin-bottom: 8px;
          font-size: 0.85rem;
        ">
          <span>ผู้เล่น</span>
          <span>คะแนน</span>
        </div>
      `;

      data.forEach((entry) => {
        let nameColor = '#1a3a5c';
        let scoreColor = '#1565C0';
        let weight = '600';
        let medal = `<span style="color:#90a4ae; font-size:0.8rem; margin-right:4px;">${entry.rank}.</span>`;

        if (entry.rank === 1) {
          nameColor = '#b8860b';
          scoreColor = '#b8860b';
          weight = '800';
          medal = '🥇 ';
        } else if (entry.rank === 2) {
          nameColor = '#546e7a';
          scoreColor = '#546e7a';
          weight = '700';
          medal = '🥈 ';
        } else if (entry.rank === 3) {
          nameColor = '#8d6e63';
          scoreColor = '#8d6e63';
          weight = '700';
          medal = '🥉 ';
        }

        html += `
          <div class="lb-row" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            margin-bottom: 6px;
            border: 1px solid #e0e0e0;
          ">
            <span style="
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 220px;
              color: ${nameColor};
              font-weight: ${weight};
            ">${medal}${entry.nickname}</span>
            <span style="
              font-family: 'Nunito', sans-serif;
              font-weight: 800;
              color: ${scoreColor};
              font-size: 1rem;
            ">${entry.score}</span>
          </div>
        `;
      });

      container.innerHTML = html;
    });
  }

  private showGroupHistory(container: HTMLElement): void {
    container.innerHTML = `
      <div style="text-align: center; color: #90a4ae; padding: 28px 0; font-size: 0.9rem; font-weight: 600;">
        กำลังโหลด...
      </div>
    `;

    ApiService.getRoomHistory().then((data) => {
      if (!data) {
        container.innerHTML = `
          <div style="color: #e53935; text-align: center; padding: 28px 0; font-weight: 700; font-size: 0.92rem;">
            ไม่สามารถโหลดประวัติได้ในขณะนี้
          </div>
        `;
        return;
      }

      if (data.length === 0) {
        container.innerHTML = `
          <div style="color: #90a4ae; text-align: center; padding: 32px 0; font-size: 0.9rem; font-weight: 600;">
            ยังไม่มีประวัติห้องเล่นกลุ่มบันทึกไว้
          </div>
        `;
        return;
      }

      let html = '';
      data.forEach((history: any) => {
        const dateStr = new Date(history.created_at).toLocaleString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: 'short'
        });

        const top3 = (history.results || []).slice(0, 3);
        const podiumSummary = top3.map((p: any) => {
          let emoji = '🥇';
          if (p.rank === 2) emoji = '🥈';
          if (p.rank === 3) emoji = '🥉';
          return `${emoji} ${p.nickname} (${p.score} pt)`;
        }).join('<br/>');

        html += `
          <div style="
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 10px;
            margin-bottom: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            font-size: 0.82rem;
          ">
            <div style="display: flex; justify-content: space-between; font-weight: 800; color: #0288d1; margin-bottom: 4px;">
              <span>🔑 PIN: ${history.room_pin}</span>
              <span style="color: #78909c; font-size: 0.72rem; font-weight: 700;">🕒 ${dateStr}</span>
            </div>
            <div style="color: #1a3a5c; line-height: 1.4; padding-left: 4px;">
              ${podiumSummary || 'ไม่มีผู้แข่งขันส่งคะแนน'}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    });
  }
}

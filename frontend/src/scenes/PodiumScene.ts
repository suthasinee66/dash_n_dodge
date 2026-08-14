import Phaser from 'phaser';

export class PodiumScene extends Phaser.Scene {
  private leaderboard: any[] = [];

  constructor() {
    super('PodiumScene');
  }

  create(): void {
    this.leaderboard = this.registry.get('resultsLeaderboard') || [];

    // Close WebSocket
    const ws = this.registry.get('roomWs') as WebSocket;
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        console.warn(e);
      }
    }
    this.registry.set('roomWs', null);

    this.renderPodiumUI();
    this.spawnConfettiParticles();
  }

  private renderPodiumUI(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    uiLayer.classList.remove('hidden');

    const skinsList: Record<string, string> = {
      sea_urchin: '/assets/characters/sea_urchin.png',
      shark: '/assets/characters/shark.png',
      squid: '/assets/characters/squid.png',
      TRex: '/assets/characters/TRex.png',
      triceratops: '/assets/characters/triceratops.png',
      turtle: '/assets/characters/turtle.png',
      lionfish: '/assets/characters/lionfish.png',
      elephant: '/assets/characters/elephant.png',
      dolphin: '/assets/characters/dolphin.png',
      dog: '/assets/characters/dog.png',
      doctor_stringray: '/assets/characters/doctor_stringray.png',
      brachiosaurus: '/assets/characters/brachiosaurus.png',
      baby_stringray: '/assets/characters/baby_stringray.png',
      baby_dolphin: '/assets/characters/baby_dolphin.png',
      
    };

    // Get top 3
    const first = this.leaderboard[0] || null;
    const second = this.leaderboard[1] || null;
    const third = this.leaderboard[2] || null;

    // Get others (rank 4+)
    const others = this.leaderboard.slice(3);

    const renderPodiumSlot = (player: any, position: 'first' | 'second' | 'third') => {
      if (!player) {
        return `<div style="visibility: hidden; flex: 1;"></div>`;
      }

      const img = skinsList[player.skin] || skinsList.man;
      let podiumHeight = '100px';
      let badge = '🏆';
      let podiumBg = '';
      let order = 0;

      if (position === 'first') {
        podiumHeight = '140px';
        badge = '🥇';
        podiumBg = 'linear-gradient(180deg, #FFE082 0%, #FFB300 100%)';
        order = 2; // middle
      } else if (position === 'second') {
        podiumHeight = '110px';
        badge = '🥈';
        podiumBg = 'linear-gradient(180deg, #ECEFF1 0%, #B0BEC5 100%)';
        order = 1; // left
      } else if (position === 'third') {
        podiumHeight = '90px';
        badge = '🥉';
        podiumBg = 'linear-gradient(180deg, #FFCCBC 0%, #FF8A65 100%)';
        order = 3; // right
      }

      return `
        <div style="
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          order: ${order};
        ">
          <!-- Character avatar -->
          <div style="position: relative; margin-bottom: 8px; animation: bounce 2s infinite ease-in-out;">
            <img src="${img}" style="width: 44px; height: 44px; image-rendering: pixelated;" />
            <div style="
              position: absolute;
              bottom: -4px;
              right: -4px;
              font-size: 1.2rem;
            ">${badge}</div>
          </div>
          
          <!-- Name and Score -->
          <div style="font-weight: 900; font-size: 0.85rem; color: #1a3a5c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">
            ${player.nickname}
          </div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #5c8fa8; margin-bottom: 4px;">
            ${player.score} pts
          </div>

          <!-- Podium pedestal -->
          <div style="
            width: 100%;
            height: ${podiumHeight};
            background: ${podiumBg};
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            border-bottom: none;
          ">
            <span style="font-size: 2.2rem; font-weight: 950; color: rgba(255,255,255,0.85); font-family: 'Nunito', sans-serif;">
              ${position === 'first' ? '1' : position === 'second' ? '2' : '3'}
            </span>
          </div>
        </div>
      `;
    };

    const othersHtml = others.length === 0
      ? ''
      : `
        <div style="
          width: 100%;
          background: rgba(0,0,0,0.03);
          border-radius: 12px;
          padding: 8px;
          max-height: 140px;
          overflow-y: auto;
          margin-bottom: 1.2rem;
          border: 1px solid rgba(0,0,0,0.04);
        ">
          ${others.map((p, idx) => {
        const skinImg = skinsList[p.skin] || skinsList.man;
        return `
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: white;
                padding: 6px 10px;
                border-radius: 8px;
                margin-bottom: 4px;
                font-size: 0.78rem;
                border: 1px solid #e0e0e0;
              ">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 800; color: #78909c;">#${idx + 4}</span>
                  <img src="${skinImg}" style="width: 20px; height: 20px; image-rendering: pixelated;" />
                  <span style="font-weight: 700; color: #1a3a5c;">${p.nickname}</span>
                </div>
                <div style="font-weight: 850; color: #1565C0;">${p.score}</div>
              </div>
            `;
      }).join('')}
        </div>
      `;

    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 480px; width: 95%; padding: 2rem 1.5rem;">
        <div style="font-size: 2.8rem; margin-bottom: 0.2rem; line-height: 1; animation: pulse 1s infinite alternate;">👑</div>
        <h2 class="title-main" style="color: #FFB300; font-size: 1.8rem; text-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 1.5rem;">HALL OF FAME</h2>

        <!-- Podium Row -->
        <div style="
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 8px;
          margin-bottom: 1.2rem;
          width: 100%;
        ">
          ${renderPodiumSlot(second, 'second')}
          ${renderPodiumSlot(first, 'first')}
          ${renderPodiumSlot(third, 'third')}
        </div>

        ${othersHtml}

        <button id="podium-menu-btn" class="sky-btn green" style="font-size: 1.1rem; padding: 12px 20px;">🏠 กลับหน้าหลัก</button>
      </div>
    `;

    document.getElementById('podium-menu-btn')?.addEventListener('click', () => {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
      this.scene.start('MenuScene');
    });
  }

  private spawnConfettiParticles(): void {
    // Generate simple procedural circular particles using Phaser
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('confetti', 8, 8);

    const colors = [0xffd700, 0xff4081, 0x00e5ff, 0x76ff03, 0xffeb3b, 0xe040fb];

    // Create emitter on the top of screen
    const emitter = this.add.particles(0, -20, 'confetti', {
      x: { min: 20, max: 460 },
      lifespan: 2500,
      speedY: { min: 150, max: 320 },
      speedX: { min: -50, max: 50 },
      scale: { start: 0.6, end: 1.4 },
      rotate: { start: 0, end: 360 },
      color: colors,
      frequency: 90,
      quantity: 2
    });

    emitter.setDepth(5); // behind UI panel but above basic sky
  }
}

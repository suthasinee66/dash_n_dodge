import Phaser from 'phaser';
import { ApiService } from '../services/api.ts';

export class RoomLobbyScene extends Phaser.Scene {
  private ws: WebSocket | null = null;
  private players: any[] = [];

  constructor() {
    super('RoomLobbyScene');
  }

  create(): void {
    const pin = this.registry.get('roomPin');
    const nickname = this.registry.get('nickname');

    // Connect to WebSocket
    const wsUrl = ApiService.getWebSocketUrl(pin, nickname);
    this.ws = new WebSocket(wsUrl);
    this.registry.set('roomWs', this.ws);

    this.ws.onopen = () => {
      console.log(`[WS] Connected to room ${pin} as ${nickname}`);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS MESSAGE]', data);

        if (data.type === 'lobby_update') {
          this.players = data.players || [];
          this.renderLobbyUI();
        } else if (data.type === 'start_game') {
          this.ws!.onmessage = null; // Detach lobby message listener
          const uiLayer = document.getElementById('ui-layer');
          if (uiLayer) {
            uiLayer.classList.add('hidden');
            uiLayer.innerHTML = '';
          }
          this.scene.start('GameScene');
        } else if (data.type === 'error') {
          alert(`เกิดข้อผิดพลาด: ${data.message}`);
          this.leaveRoom();
        }
      } catch (err) {
        console.error('[WS ERROR]', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Connection closed');
    };

    this.renderLobbyUI();
  }

  private renderLobbyUI(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    const isHost = this.registry.get('isHost') === true;
    const pin = this.registry.get('roomPin');

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

    const playersHtml = this.players.length === 0
      ? `<div style="grid-column: 1/-1; color: #90a4ae; font-weight: 600; padding: 20px;">🚗💨 กำลังรอผู้เข้าร่วมสู้ชีวิต...</div>`
      : this.players.map(p => {
        const skinImg = skinsList[p.skin] || skinsList.man;
        return `
            <div style="
              background: rgba(255,255,255,0.85);
              border: 2px solid #e0e0e0;
              border-radius: 12px;
              padding: 10px;
              display: flex;
              align-items: center;
              gap: 12px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.03);
            ">
              <img src="${skinImg}" style="width: 32px; height: 32px; image-rendering: pixelated;" />
              <div style="text-align: left;">
                <div style="font-weight: 800; color: #1a3a5c; font-size: 0.9rem;">${p.nickname}</div>
                <div style="font-size: 0.72rem; color: #78909c; font-weight: 700;">ผู้แข่งขัน</div>
              </div>
            </div>
          `;
      }).join('');

    const actionButton = isHost
      ? `<button id="lobby-start-btn" class="sky-btn green" style="font-size: 1.1rem; padding: 12px;" ${this.players.length === 0 ? 'disabled' : ''}>🚦 เริ่มประลอง (${this.players.length} คน)</button>`
      : `<button class="sky-btn secondary" style="font-size: 1rem; color: #90a4ae; cursor: not-allowed;" disabled>⏳ รอ Host เริ่มเกม...</button>`;

    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 520px; width: 95%; padding: 2rem 1.8rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
          <div style="text-align: left;">
            <span style="font-size: 0.78rem; color: #5c8fa8; font-weight: 700; text-transform: uppercase;">รหัสห้อง PIN</span>
            <div style="font-size: 2.2rem; font-weight: 900; color: #0288d1; line-height: 1; letter-spacing: 2px;">${pin}</div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.78rem; color: #5c8fa8; font-weight: 700; text-transform: uppercase;">ผู้เล่นในห้อง</span>
            <div style="font-size: 1.6rem; font-weight: 850; color: #1a3a5c; line-height: 1;">${this.players.length} คน</div>
          </div>
        </div>

        <hr class="sky-divider" style="margin-bottom: 1.2rem;" />

        <div id="lobby-players-grid" style="
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          max-height: 250px;
          overflow-y: auto;
          padding: 6px;
          background: rgba(0,0,0,0.03);
          border-radius: 14px;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(0,0,0,0.04);
        ">
          ${playersHtml}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${actionButton}
          <button id="lobby-leave-btn" class="sky-btn secondary">ออกจากห้อง</button>
        </div>
      </div>
    `;

    if (isHost) {
      document.getElementById('lobby-start-btn')?.addEventListener('click', () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'start' }));
        }
      });
    }

    document.getElementById('lobby-leave-btn')?.addEventListener('click', () => {
      this.leaveRoom();
    });
  }

  private leaveRoom(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.registry.set('roomWs', null);
    this.registry.set('isMultiplayer', false);
    this.registry.set('roomPin', null);

    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
    }
    this.scene.start('MenuScene');
  }
}

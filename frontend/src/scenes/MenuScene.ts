import Phaser from 'phaser';
import { ApiService } from '../services/api.ts';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.renderMainMenu();
  }

  /** Render Main Menu */
  private renderMainMenu(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    uiLayer.classList.remove('hidden');
    uiLayer.innerHTML = `
      <div class="glass-panel">
        <!-- Logo / Title -->
        <div style="font-size: 3rem; margin-bottom: 0.1rem; line-height: 1;">🐸</div>
        <h2 class="title-main">หนีล้อ ทะลวงเลน</h2>
        <p class="title-sub">Dash &amp; Dodge</p>

        <!-- Buttons -->
        <button id="play-btn" class="sky-btn green">🎮 เริ่มเล่น (คนเดียว)</button>
        <button id="multi-btn" class="sky-btn" style="background: #e1f5fe; border-color: #0288d1; color: #0288d1; margin-bottom: 0.6rem;">👥 เล่นหลายคน (Lobby)</button>
        <button id="leaderboard-btn" class="sky-btn secondary">🏆 อันดับคะแนน</button>

        <!-- Sound Toggle -->
        <div style="margin-top: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 0.6rem;">
          <span style="font-size: 0.82rem; color: #5c8fa8; font-weight: 700;">🔊 เสียงประกอบ:</span>
          <button id="sound-btn" style="
            background: #e3f2fd;
            border: 2px solid #90CAF9;
            border-radius: 20px;
            padding: 4px 14px;
            color: #1565C0;
            cursor: pointer;
            font-size: 0.82rem;
            font-weight: 800;
            font-family: 'Nunito','Mitr',sans-serif;
            transition: all 0.18s;
          ">เปิด</button>
        </div>
      </div>
    `;

    const playBtn = document.getElementById('play-btn');
    const multiBtn = document.getElementById('multi-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const soundBtn = document.getElementById('sound-btn') as HTMLButtonElement | null;

    playBtn?.addEventListener('click', () => {
      this.registry.set('isMultiplayer', false);
      this.renderNicknameForm();
    });

    multiBtn?.addEventListener('click', () => {
      this.renderMultiplayerOptions();
    });

    leaderboardBtn?.addEventListener('click', () => {
      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
      this.scene.start('LeaderboardScene');
    });

    let soundOn = this.registry.get('soundOn') !== false;
    if (soundBtn) {
      this._updateSoundBtn(soundBtn, soundOn);
      soundBtn.addEventListener('click', () => {
        soundOn = !soundOn;
        this.registry.set('soundOn', soundOn);
        this._updateSoundBtn(soundBtn, soundOn);
      });
    }
  }

  private _updateSoundBtn(btn: HTMLButtonElement, on: boolean): void {
    btn.textContent = on ? 'เปิด' : 'ปิด';
    btn.style.background = on ? '#e3f2fd' : '#f5f5f5';
    btn.style.borderColor = on ? '#90CAF9' : '#ccc';
    btn.style.color = on ? '#1565C0' : '#90a4ae';
  }

  /** Render Nickname + Character Selection form with 8 skin grid */
  private renderNicknameForm(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    const lastNickname = localStorage.getItem('nhee_lor_nickname') || '';
    let selectedSkin: string = this.registry.get('characterSkin') || 'man';

    const skinsList = [
      { id: 'man', label: 'เด็กหนุ่ม', img: '/assets/characters/man.png', border: '#1565C0' },
      { id: 'woman', label: 'เด็กสาว', img: '/assets/characters/woman.png', border: '#388E3C' },
      { id: 'female_adventurer', label: 'นักสำรวจหญิง', img: '/assets/characters/female_adventurer.png', border: '#e65100' },
      { id: 'female_person', label: 'ผู้หญิงทั่วไป', img: '/assets/characters/female_person.png', border: '#7b1fa2' },
      { id: 'male_adventurer', label: 'นักสำรวจชาย', img: '/assets/characters/male_adventurer.png', border: '#f57c00' },
      { id: 'male_person', label: 'ผู้ชายทั่วไป', img: '/assets/characters/male_person.png', border: '#0288d1' },
      { id: 'robot', label: 'หุ่นยนต์', img: '/assets/characters/robot.png', border: '#00796b' },
      { id: 'zombie', label: 'ซอมบี้', img: '/assets/characters/zombie.png', border: '#5d4037' }
    ];

    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 480px; width: 95%;">
        <div style="font-size: 2rem; margin-bottom: 0.2rem;">👤</div>
        <h2 class="title-main" style="font-size: 1.5rem;">ข้อมูลผู้เล่น</h2>
        <p style="font-size: 0.82rem; color: #5c8fa8; margin-bottom: 0.8rem; font-weight: 600;">กรอกชื่อและเลือกตัวละครก่อนเล่น</p>

        <input
          type="text"
          id="nickname-input"
          class="sky-input"
          placeholder="ชื่อ 2–12 ตัวอักษร"
          maxlength="12"
          value="${lastNickname}"
          autofocus
        />
        <div id="nickname-error" style="
          color: #e53935;
          font-size: 0.82rem;
          font-weight: 700;
          min-height: 18px;
          margin-top: -0.4rem;
          margin-bottom: 0.5rem;
        " class="hidden"></div>

        <!-- 8 Skins Grid Scrollable -->
        <label class="section-label" style="margin-bottom: 0.4rem;">เลือกตัวละคร (${skinsList.length} แบบ)</label>
        <div id="skins-grid" style="
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          max-height: 190px;
          overflow-y: auto;
          padding: 4px;
          margin-bottom: 1.2rem;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 8px;
          background: rgba(255,255,255,0.4);
        ">
          ${skinsList.map(skin => {
            const isSelected = skin.id === selectedSkin;
            return `
              <div id="char-${skin.id}" class="char-card" style="
                border: 2px solid ${isSelected ? skin.border : 'rgba(0,0,0,0.06)'};
                background: ${isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'};
                padding: 6px;
                border-radius: 8px;
                cursor: pointer;
                text-align: center;
                transition: all 0.15s ease;
                box-shadow: ${isSelected ? '0 3px 6px rgba(0,0,0,0.08)' : 'none'};
              ">
                <img src="${skin.img}" style="width: 32px; height: 32px; image-rendering: pixelated; margin-bottom: 4px;" />
                <div id="label-${skin.id}" style="
                  font-size: 0.72rem;
                  font-weight: ${isSelected ? '800' : '600'};
                  color: ${isSelected ? skin.border : '#5c8fa8'};
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                ">${skin.label}</div>
              </div>
            `;
          }).join('')}
        </div>

        <button id="start-game-btn" class="sky-btn green">🚀 เริ่มเกม</button>
        <button id="back-to-menu-btn" class="sky-btn secondary">← ย้อนกลับ</button>
      </div>
    `;

    this.registry.set('characterSkin', selectedSkin);

    const inputEl  = document.getElementById('nickname-input') as HTMLInputElement;
    const errorEl  = document.getElementById('nickname-error') as HTMLElement;
    const startBtn = document.getElementById('start-game-btn');
    const backBtn  = document.getElementById('back-to-menu-btn');

    inputEl?.focus();
    inputEl?.select();

    // Attach click listeners to skin cards
    skinsList.forEach(skin => {
      const card = document.getElementById(`char-${skin.id}`);
      card?.addEventListener('click', () => {
        // Deselect previous
        skinsList.forEach(s => {
          const prevCard = document.getElementById(`char-${s.id}`);
          const prevLabel = document.getElementById(`label-${s.id}`);
          if (prevCard) {
            prevCard.style.border = '2px solid rgba(0,0,0,0.06)';
            prevCard.style.background = 'rgba(255,255,255,0.6)';
            prevCard.style.boxShadow = 'none';
          }
          if (prevLabel) {
            prevLabel.style.color = '#5c8fa8';
            prevLabel.style.fontWeight = '600';
          }
        });

        // Select current
        selectedSkin = skin.id;
        this.registry.set('characterSkin', selectedSkin);
        if (card) {
          card.style.border = `2px solid ${skin.border}`;
          card.style.background = 'rgba(255,255,255,0.9)';
          card.style.boxShadow = '0 3px 6px rgba(0,0,0,0.08)';
        }
        const label = document.getElementById(`label-${skin.id}`);
        if (label) {
          label.style.color = skin.border;
          label.style.fontWeight = '800';
        }
      });
    });

    backBtn?.addEventListener('click', () => this.renderMainMenu());

    startBtn?.addEventListener('click', () => {
      const nickname = inputEl.value.trim().toUpperCase();

      if (nickname.length < 2 || nickname.length > 12) {
        errorEl.textContent = 'ชื่อต้องยาว 2 ถึง 12 ตัวอักษร';
        errorEl.classList.remove('hidden');
        return;
      }

      const sanitized = nickname.replace(/[^A-Z0-9ก-๙_-]/g, '');
      if (sanitized !== nickname) {
        errorEl.textContent = 'ชื่อต้องไม่มีอักขระพิเศษ';
        errorEl.classList.remove('hidden');
        return;
      }

      const profanityList = ['FUCK', 'SHIT', 'ASS', 'HELL', 'BITCH', 'เหี้ย', 'ควย', 'สัส', 'เย็ด', 'บ้า', 'หมา'];
      if (profanityList.some(w => sanitized.includes(w))) {
        errorEl.textContent = 'กรุณาใช้ชื่อที่สุภาพ';
        errorEl.classList.remove('hidden');
        return;
      }

      localStorage.setItem('nhee_lor_nickname', sanitized);
      this.registry.set('nickname', sanitized);

      uiLayer.classList.add('hidden');
      uiLayer.innerHTML = '';
      this.scene.start('GameScene');
    });
  }

  private renderMultiplayerOptions(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 440px; width: 95%;">
        <div style="font-size: 2.8rem; margin-bottom: 0.2rem; line-height: 1;">👥</div>
        <h2 class="title-main">เล่นหลายคน (Lobby)</h2>
        <p style="font-size: 0.85rem; color: #5c8fa8; margin-bottom: 1.5rem; font-weight: 600;">เลือกสร้างห้องในฐานะ Host หรือเข้าร่วมห้องด้วย PIN</p>

        <button id="create-room-btn" class="sky-btn green">👑 สร้างห้องใหม่ (Host)</button>
        <button id="join-room-ui-btn" class="sky-btn" style="background: #e1f5fe; border-color: #0288d1; color: #0288d1; margin-bottom: 0.6rem;">🔑 เข้าร่วมห้องด้วย PIN</button>
        <button id="back-to-menu-btn" class="sky-btn secondary">← ย้อนกลับ</button>
      </div>
    `;

    document.getElementById('create-room-btn')?.addEventListener('click', async () => {
      const pin = await ApiService.createRoom();
      if (pin) {
        this.registry.set('isMultiplayer', true);
        this.registry.set('isHost', true);
        this.registry.set('roomPin', pin);
        this.registry.set('nickname', '__host__');

        uiLayer.classList.add('hidden');
        uiLayer.innerHTML = '';
        this.scene.start('RoomLobbyScene');
      } else {
        alert('ไม่สามารถสร้างห้องได้ กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์');
      }
    });

    document.getElementById('join-room-ui-btn')?.addEventListener('click', () => {
      this.renderJoinRoomForm();
    });

    document.getElementById('back-to-menu-btn')?.addEventListener('click', () => {
      this.renderMainMenu();
    });
  }

  private renderJoinRoomForm(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    let selectedSkin: string = this.registry.get('characterSkin') || 'man';

    const skinsList = [
      { id: 'man', label: 'เด็กหนุ่ม', img: '/assets/characters/man.png', border: '#1565C0' },
      { id: 'woman', label: 'เด็กสาว', img: '/assets/characters/woman.png', border: '#388E3C' },
      { id: 'female_adventurer', label: 'นักสำรวจหญิง', img: '/assets/characters/female_adventurer.png', border: '#e65100' },
      { id: 'female_person', label: 'ผู้หญิงทั่วไป', img: '/assets/characters/female_person.png', border: '#7b1fa2' },
      { id: 'male_adventurer', label: 'นักสำรวจชาย', img: '/assets/characters/male_adventurer.png', border: '#f57c00' },
      { id: 'male_person', label: 'ผู้ชายทั่วไป', img: '/assets/characters/male_person.png', border: '#0288d1' },
      { id: 'robot', label: 'หุ่นยนต์', img: '/assets/characters/robot.png', border: '#00796b' },
      { id: 'zombie', label: 'ซอมบี้', img: '/assets/characters/zombie.png', border: '#5d4037' }
    ];

    uiLayer.innerHTML = `
      <div class="glass-panel" style="max-width: 480px; width: 95%;">
        <div style="font-size: 2rem; margin-bottom: 0.2rem;">👤</div>
        <h2 class="title-main" style="font-size: 1.5rem;">เข้าร่วมห้อง</h2>
        <p style="font-size: 0.82rem; color: #5c8fa8; margin-bottom: 0.8rem; font-weight: 600;">กรอก PIN 4 หลัก ชื่อ และเลือกตัวละคร</p>

        <div style="display: flex; gap: 8px; margin-bottom: 0.8rem;">
          <input
            type="text"
            id="pin-input"
            class="sky-input"
            placeholder="PIN 4 หลัก"
            maxlength="4"
            style="flex: 1; text-align: center; font-size: 1.2rem; font-weight: 900; letter-spacing: 2px;"
          />
          <input
            type="text"
            id="nickname-input"
            class="sky-input"
            placeholder="ชื่อผู้เล่น"
            maxlength="12"
            style="flex: 2;"
          />
        </div>
        <div id="join-error" style="
          color: #e53935;
          font-size: 0.82rem;
          font-weight: 700;
          min-height: 18px;
          margin-top: -0.4rem;
          margin-bottom: 0.5rem;
        " class="hidden"></div>

        <!-- 8 Skins Grid Scrollable -->
        <label class="section-label" style="margin-bottom: 0.4rem;">เลือกตัวละคร</label>
        <div id="skins-grid" style="
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          max-height: 190px;
          overflow-y: auto;
          padding: 4px;
          margin-bottom: 1.2rem;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 8px;
          background: rgba(255,255,255,0.4);
        ">
          ${skinsList.map(skin => {
            const isSelected = skin.id === selectedSkin;
            return `
              <div id="char-${skin.id}" class="char-card" style="
                border: 2px solid ${isSelected ? skin.border : 'rgba(0,0,0,0.06)'};
                background: ${isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'};
                padding: 6px;
                border-radius: 8px;
                cursor: pointer;
                text-align: center;
                transition: all 0.15s ease;
                box-shadow: ${isSelected ? '0 3px 6px rgba(0,0,0,0.08)' : 'none'};
              ">
                <img src="${skin.img}" style="width: 32px; height: 32px; image-rendering: pixelated; margin-bottom: 4px;" />
                <div id="label-${skin.id}" style="
                  font-size: 0.72rem;
                  font-weight: ${isSelected ? '800' : '600'};
                  color: ${isSelected ? skin.border : '#5c8fa8'};
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                ">${skin.label}</div>
              </div>
            `;
          }).join('')}
        </div>

        <button id="join-submit-btn" class="sky-btn green">🚀 เข้าร่วม</button>
        <button id="back-to-mp-btn" class="sky-btn secondary">← ย้อนกลับ</button>
      </div>
    `;

    skinsList.forEach(skin => {
      const card = document.getElementById(`char-${skin.id}`);
      card?.addEventListener('click', () => {
        skinsList.forEach(s => {
          const prevCard = document.getElementById(`char-${s.id}`);
          const prevLabel = document.getElementById(`label-${s.id}`);
          if (prevCard) {
            prevCard.style.border = '2px solid rgba(0,0,0,0.06)';
            prevCard.style.background = 'rgba(255,255,255,0.6)';
            prevCard.style.boxShadow = 'none';
          }
          if (prevLabel) {
            prevLabel.style.color = '#5c8fa8';
            prevLabel.style.fontWeight = '600';
          }
        });

        selectedSkin = skin.id;
        this.registry.set('characterSkin', selectedSkin);
        if (card) {
          card.style.border = `2px solid ${skin.border}`;
          card.style.background = 'rgba(255,255,255,0.9)';
          card.style.boxShadow = '0 3px 6px rgba(0,0,0,0.08)';
        }
        const label = document.getElementById(`label-${skin.id}`);
        if (label) {
          label.style.color = skin.border;
          label.style.fontWeight = '800';
        }
      });
    });

    document.getElementById('back-to-mp-btn')?.addEventListener('click', () => {
      this.renderMultiplayerOptions();
    });

    const pinInput = document.getElementById('pin-input') as HTMLInputElement;
    const nickInput = document.getElementById('nickname-input') as HTMLInputElement;
    const errorEl = document.getElementById('join-error') as HTMLElement;
    const joinSubmitBtn = document.getElementById('join-submit-btn');

    joinSubmitBtn?.addEventListener('click', async () => {
      const pin = pinInput.value.trim();
      const nickname = nickInput.value.trim().toUpperCase();

      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        errorEl.textContent = 'PIN ต้องเป็นตัวเลข 4 หลัก';
        errorEl.classList.remove('hidden');
        return;
      }

      if (nickname.length < 2 || nickname.length > 12) {
        errorEl.textContent = 'ชื่อต้องยาว 2 ถึง 12 ตัวอักษร';
        errorEl.classList.remove('hidden');
        return;
      }

      const sanitized = nickname.replace(/[^A-Z0-9ก-๙_-]/g, '');
      if (sanitized !== nickname) {
        errorEl.textContent = 'ชื่อต้องไม่มีอักขระพิเศษ';
        errorEl.classList.remove('hidden');
        return;
      }

      const profanityList = ['FUCK', 'SHIT', 'ASS', 'HELL', 'BITCH', 'เหี้ย', 'ควย', 'สัส', 'เย็ด', 'บ้า', 'หมา'];
      if (profanityList.some(w => sanitized.includes(w))) {
        errorEl.textContent = 'กรุณาใช้ชื่อที่สุภาพ';
        errorEl.classList.remove('hidden');
        return;
      }

      const success = await ApiService.joinRoom(pin, sanitized, selectedSkin);
      if (success) {
        this.registry.set('isMultiplayer', true);
        this.registry.set('isHost', false);
        this.registry.set('roomPin', pin);
        this.registry.set('nickname', sanitized);
        this.registry.set('characterSkin', selectedSkin);

        uiLayer.classList.add('hidden');
        uiLayer.innerHTML = '';
        this.scene.start('RoomLobbyScene');
      } else {
        errorEl.textContent = 'ไม่พบห้อง รหัสผ่านผิด หรือเกมเริ่มแล้ว';
        errorEl.classList.remove('hidden');
      }
    });
  }
}

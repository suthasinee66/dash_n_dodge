import Phaser from 'phaser';
import { ApiService } from '../services/api.ts';

interface SkinDef {
  id: string;
  label: string;
  img: string;
  border: string;
}

const SKINS: SkinDef[] = [
  { id: 'shark', label: 'ฉลาม', img: '/assets/characters/shark.png', border: '#1565C0' },
  { id: 'squid', label: 'หมึก', img: '/assets/characters/squid.png', border: '#1565C0' },
  { id: 'turtle', label: 'เต่า', img: '/assets/characters/turtle.png', border: '#1565C0' },
  { id: 'doctor_stringray', label: 'ปลากระเบน', img: '/assets/characters/doctor_stringray.png', border: '#1565C0' },
  { id: 'baby_stringray', label: 'ปลากระเบนเด็ก', img: '/assets/characters/baby_stringray.png', border: '#1565C0' },
  { id: 'baby_dolphin', label: 'โลมาเด็ก', img: '/assets/characters/baby_dolphin.png', border: '#1565C0' },
  { id: 'lionfish', label: 'ปลาสิงโต', img: '/assets/characters/lionfish.png', border: '#1565C0' },
  { id: 'sea_urchin', label: 'เม่น', img: '/assets/characters/sea_urchin.png', border: '#1565C0' },
  { id: 'dolphin', label: 'โลมา', img: '/assets/characters/dolphin.png', border: '#1565C0' },
  { id: 'elephant', label: 'ช้าง', img: '/assets/characters/elephant.png', border: '#1565C0' },
  { id: 'dog', label: 'สุนัข', img: '/assets/characters/dog.png', border: '#1565C0' },
  { id: 'brachiosaurus', label: 'บราคิโอซอรัส', img: '/assets/characters/brachiosaurus.png', border: '#1565C0' },
  { id: 'TRex', label: 'ทีเร็กซ์', img: '/assets/characters/TRex.png', border: '#1565C0' },
  { id: 'triceratops', label: 'ไทเซราทอป', img: '/assets/characters/triceratops.png', border: '#1565C0' },
  
];

const PROFANITY_LIST = ['FUCK', 'SHIT', 'ASS', 'HELL', 'BITCH', 'เหี้ย', 'ควย', 'สัส', 'เย็ด', 'บ้า', 'หมา'];

/**
 * Shared style block injected at the top of every screen this scene renders.
 * Scoped with a `dd-` prefix so it never collides with the app's global CSS
 * (glass-panel / sky-btn / sky-input / title-main etc. are untouched).
 */
const SHARED_STYLES = `
<style>
  @keyframes dd-fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes dd-pop { 0% { transform:scale(.85); opacity:0; } 100% { transform:scale(1); opacity:1; } }
  @keyframes dd-bounce { 0%,100% { transform:translateY(0) rotate(-2deg); } 50% { transform:translateY(-7px) rotate(2deg); } }
  @keyframes dd-pulseGlow { 0%,100% { box-shadow:0 0 0 0 rgba(56,142,60,.45); } 50% { box-shadow:0 0 0 9px rgba(56,142,60,0); } }
  @keyframes dd-shimmer { 0% { background-position:-150% 0; } 100% { background-position:250% 0; } }
  @keyframes dd-shake { 10%,90% { transform:translateX(-1px); } 20%,80% { transform:translateX(2px); } 30%,50%,70% { transform:translateX(-4px); } 40%,60% { transform:translateX(4px); } }

  .dd-panel { animation: dd-fadeInUp .4s cubic-bezier(.2,.8,.2,1) both; }
  .dd-logo { display:inline-block; animation: dd-bounce 2.6s ease-in-out infinite; }

  .dd-dash-divider {
    height: 3px; margin: 12px 0 14px;
    background-image: repeating-linear-gradient(90deg, #90CAF9 0 10px, transparent 10px 18px);
    border-radius: 2px;
  }

  .dd-cta { position:relative; overflow:hidden; animation: dd-pulseGlow 2.4s ease-in-out infinite; }
  .dd-cta::after {
    content:''; position:absolute; inset:0;
    background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.4) 50%, transparent 65%);
    background-size: 200% 100%; animation: dd-shimmer 2.8s linear infinite; pointer-events:none;
  }
  .dd-btn-loading { opacity:.65; pointer-events:none; }

  .dd-field-wrap { position:relative; margin-bottom: .3rem; }
  .dd-field-wrap .dd-input-icon {
    position:absolute; left:12px; top:50%; transform:translateY(-50%);
    font-size:1rem; pointer-events:none; opacity:.7;
  }
  .dd-field-wrap input.sky-input { padding-left: 34px !important; }
  .dd-char-count {
    position:absolute; right:10px; top:50%; transform:translateY(-50%);
    font-size:.68rem; font-weight:800; color:#90a4ae; pointer-events:none;
  }
  .dd-error-msg {
    color:#e53935; font-size:.82rem; font-weight:700; min-height:18px;
    margin-top:-.35rem; margin-bottom:.5rem; text-align:left;
  }
  .dd-error-msg.dd-shown { animation: dd-shake .38s ease; }

  .dd-section-label {
    display:flex; align-items:baseline; justify-content:space-between;
    margin-bottom:.45rem;
  }

  .dd-skins-grid {
    display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;
    max-height:196px; overflow-y:auto; padding:6px;
    margin-bottom:1.2rem; border:1px solid rgba(0,0,0,.06); border-radius:10px;
    background: rgba(255,255,255,.4);
  }
  .dd-char-card {
    position:relative; padding:9px; border-radius:10px; cursor:pointer;
    text-align:center; border:2px solid rgba(0,0,0,.06); background:rgba(255,255,255,.6);
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
    animation: dd-pop .3s ease both;
  }
  .dd-char-card:hover { transform: translateY(-2px); }
  .dd-char-card.dd-selected { box-shadow: 0 4px 10px rgba(0,0,0,.1); background: rgba(255,255,255,.95); }
  .dd-avatar-ring {
    width:52px; height:52px; border-radius:50%; margin:0 auto;
    display:flex; align-items:center; justify-content:center;
    border:2px solid transparent; transition: all .15s ease;
  }
  .dd-avatar-ring img { width:34px; height:34px; image-rendering:pixelated; }
  .dd-check {
    position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%;
    background:#388E3C; color:#fff; font-size:10px; font-weight:900;
    display:flex; align-items:center; justify-content:center;
    opacity:0; transform:scale(.3); transition: all .18s cubic-bezier(.34,1.56,.64,1);
    box-shadow: 0 1px 3px rgba(0,0,0,.3);
  }
  .dd-char-card.dd-selected .dd-check { opacity:1; transform:scale(1); }

  .dd-toggle-row {
    display:flex; align-items:center; justify-content:center; gap:.6rem; margin-top:1.1rem;
  }
  .dd-toggle-label { font-size:.82rem; color:#5c8fa8; font-weight:700; }
  .dd-toggle {
    width:46px; height:25px; border-radius:14px; position:relative; cursor:pointer;
    background:#90CAF9; transition: background .2s ease; flex-shrink:0;
  }
  .dd-toggle.dd-off { background:#e0e0e0; }
  .dd-toggle-knob {
    position:absolute; top:3px; left:24px; width:19px; height:19px; border-radius:50%;
    background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition: left .2s ease;
  }
  .dd-toggle.dd-off .dd-toggle-knob { left:3px; }

  .dd-choice-card {
    display:flex; align-items:center; gap:12px; text-align:left; cursor:pointer;
    border:2px solid rgba(0,0,0,.07); border-radius:14px; padding:14px;
    background: rgba(255,255,255,.6); margin-bottom:.7rem;
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
  }
  .dd-choice-card:hover {
    transform: translateY(-2px); border-color:#90CAF9;
    background: rgba(255,255,255,.92); box-shadow: 0 6px 14px rgba(2,136,209,.12);
  }
  .dd-choice-icon {
    font-size:1.7rem; flex-shrink:0; width:44px; height:44px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.7);
  }
  .dd-choice-text .dd-choice-title { font-weight:800; font-size:.95rem; color:#1565C0; margin-bottom:1px; }
  .dd-choice-text .dd-choice-sub { font-size:.75rem; color:#5c8fa8; font-weight:600; }

  .dd-pin-row { display:flex; gap:8px; justify-content:center; margin-bottom: .9rem; }
  .dd-pin-box {
    width:50px; height:56px; text-align:center; font-size:1.5rem; font-weight:900;
    border:2px solid #90CAF9; border-radius:12px; background:#fff; color:#1565C0;
    transition: all .15s ease; font-family: 'Nunito','Mitr',sans-serif;
  }
  .dd-pin-box:focus { outline:none; border-color:#0288d1; box-shadow:0 0 0 3px rgba(2,136,209,.18); transform:translateY(-2px); }

  .dd-back-row { margin-top: .2rem; }
  
  /* =========================
   Character Preview
========================= */

.dd-character-preview {
  position: relative;
  width: 100%;
  height: 120px;
  border: 2px dashed #b0bec5;
  border-radius: 16px;
  background: linear-gradient(145deg, #f5f7f8, #e9eef0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all .2s ease;
  margin-bottom: 1rem;
}

.dd-character-preview:hover {
  border-color: #90CAF9;
  background: linear-gradient(145deg, #fafdff, #eef7fb);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(2,136,209,.12);
}

.dd-character-preview img {
  width: 95px;
  height: 95px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: grayscale(1);
  opacity: .45;
  transition: all .2s ease;
}

.dd-character-preview.dd-has-character img {
  filter: grayscale(0);
  opacity: 1;
}
.dd-character-preview-text {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: .72rem;
  font-weight: 800;
  color: #78909c;
  pointer-events: none;
}

.dd-character-preview.dd-has-character .dd-character-preview-text {
  color: #1565C0;
}

/* =========================
   Character Popup
========================= */

.dd-character-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 30, 40, .55);
  backdrop-filter: blur(7px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: dd-fadeInUp .2s ease both;
}

.dd-character-popup {
  width: min(520px, 95vw);
  max-height: 85vh;
  background: rgba(255,255,255,.97);
  border: 2px solid rgba(144,202,249,.7);
  border-radius: 22px;
  box-shadow: 0 20px 60px rgba(0,0,0,.28);
  overflow: hidden;
  animation: dd-pop .25s cubic-bezier(.2,.8,.2,1) both;
}

.dd-character-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(0,0,0,.07);
  background: linear-gradient(135deg, #e3f2fd, #f8fdff);
}

.dd-character-popup-title {
  font-size: 1.1rem;
  font-weight: 900;
  color: #1565C0;
}

.dd-character-popup-subtitle {
  font-size: .72rem;
  color: #78909c;
  font-weight: 700;
  margin-top: 2px;
}

.dd-character-close {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #78909c;
  font-size: 1.2rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 2px 7px rgba(0,0,0,.12);
  transition: all .15s ease;
}

.dd-character-close:hover {
  background: #ffebee;
  color: #e53935;
  transform: rotate(8deg) scale(1.05);
}

/* 3 columns */
.dd-character-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
  max-height: calc(85vh - 90px);
  overflow-y: auto;
}
.dd-character-option {
  position: relative;
  border: 2px solid rgba(0,0,0,.07);
  border-radius: 16px;
  background: linear-gradient(145deg, #fff, #f5f8fa);

  height: 125px;
  padding: 0;

  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  transition: all .18s ease;
}

.dd-character-option:hover {
  transform: translateY(-4px);
  border-color: #90CAF9;
  box-shadow: 0 8px 18px rgba(2,136,209,.15);
}

.dd-character-option.dd-active {
  border-color: #388E3C;
  background: linear-gradient(145deg, #f1f8e9, #ffffff);
  box-shadow: 0 5px 15px rgba(56,142,60,.18);
}
.dd-character-option img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  image-rendering: pixelated;
  margin: 0;
  display: block;
}

.dd-character-name {
  font-size: .72rem;
  font-weight: 800;
  color: #455a64;
}

.dd-character-selected {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #388E3C;
  color: white;
  font-size: 12px;
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,.25);
}

.dd-character-option.dd-active .dd-character-selected {
  display: flex;
}

@media (max-width: 420px) {
  .dd-character-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px;
  }

  .dd-character-option {
  height: 90px;
  padding: 0;
}

  .dd-character-option img {
    width: 55px;
    height: 55px;
  }
}

</style>
`;

export class MenuScene extends Phaser.Scene {
  private menuBackground!: Phaser.GameObjects.Container;
  private menuCars: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.renderMainMenu();
  }


  private showFieldError(errorEl: HTMLElement, message: string): void {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    errorEl.classList.remove('dd-shown');
    // restart the shake animation
    void errorEl.offsetWidth;
    errorEl.classList.add('dd-shown');
  }

  private validateNickname(raw: string, errorEl: HTMLElement): string | null {
    const nickname = raw.trim().toUpperCase();

    if (nickname.length < 2 || nickname.length > 12) {
      this.showFieldError(errorEl, 'ชื่อต้องยาว 2 ถึง 12 ตัวอักษร');
      return null;
    }

    const sanitized = nickname.replace(/[^A-Z0-9ก-๙_-]/g, '');
    if (sanitized !== nickname) {
      this.showFieldError(errorEl, 'ชื่อต้องไม่มีอักขระพิเศษ');
      return null;
    }

    if (PROFANITY_LIST.some(w => sanitized.includes(w))) {
      this.showFieldError(errorEl, 'กรุณาใช้ชื่อที่สุภาพ');
      return null;
    }

    return sanitized;
  }

  private setBtnLoading(btn: HTMLButtonElement, loading: boolean, loadingText: string, originalText: string): void {
    btn.classList.toggle('dd-btn-loading', loading);
    btn.textContent = loading ? loadingText : originalText;
  }

private createMenuRoadBackground(): void {
  if (this.menuBackground) {
    this.menuBackground.destroy();
  }

  this.menuCars = [];

  const { width, height } = this.scale;

  this.menuBackground = this.add.container(0, 0);
  this.menuBackground.setDepth(-100);

  // =========================
  // 🌱 พื้นหญ้า
  // =========================
  const grass = this.add.rectangle(
    width / 2,
    height / 2,
    width,
    height,
    0x7cb342
  );

  this.menuBackground.add(grass);

  // =========================
  // 🛣️ ถนน
  // =========================
  const roadX = width * 0.12;
  const roadWidth = width * 0.76;

  const road = this.add.rectangle(
    width / 2,
    height / 2,
    roadWidth,
    height,
    0x303030
  );

  this.menuBackground.add(road);

  // =========================
  // ขอบถนน
  // =========================
  const leftEdge = this.add.rectangle(
    roadX,
    height / 2,
    6,
    height,
    0xffffff
  );

  const rightEdge = this.add.rectangle(
    width - roadX,
    height / 2,
    6,
    height,
    0xffffff
  );

  this.menuBackground.add(leftEdge);
  this.menuBackground.add(rightEdge);

  // =========================
  // เส้นแบ่งเลน
  // =========================
  const laneCount = 4;
  const laneWidth = roadWidth / laneCount;

  for (let lane = 1; lane < laneCount; lane++) {
    const x = roadX + laneWidth * lane;

    for (let y = -30; y < height + 30; y += 60) {
      const line = this.add.rectangle(
        x,
        y,
        5,
        30,
        0xffffff
      );

      line.setAlpha(0.7);
      this.menuBackground.add(line);
    }
  }


  // =========================
  // 🚗 รถ
  // =========================
  this.createMenuCars(roadX, roadWidth, height);
}
private createMenuCars(
  roadX: number,
  roadWidth: number,
  height: number
): void {
  const laneCount = 4;
  const laneWidth = roadWidth / laneCount;

  const carColors = [
    0xe53935,
    0x1e88e5,
    0xfdd835,
    0x43a047,
    0xfb8c00,
    0x8e24aa
  ];

  for (let lane = 0; lane < laneCount; lane++) {
    for (let i = 0; i < 2; i++) {

      const x =
        roadX +
        laneWidth * lane +
        laneWidth / 2;

      const direction = lane % 2 === 0 ? 1 : -1;

      const startY = Phaser.Math.Between(
        -height,
        height
      );

      // 🚗 ตัวรถ
      const car = this.add.rectangle(
        x,
        startY,
        34,
        58,
        Phaser.Utils.Array.GetRandom(carColors)
      );

      // 🚗 หน้าต่างรถ
      const window = this.add.rectangle(
        x,
        startY - 5,
        20,
        18,
        0x90caf9
      );

      // 🚗 ไฟรถ
      const light1 = this.add.rectangle(
        x - 9,
        startY + 24,
        5,
        5,
        0xffeb3b
      );

      const light2 = this.add.rectangle(
        x + 9,
        startY + 24,
        5,
        5,
        0xffeb3b
      );

      this.menuBackground.add(car);
      this.menuBackground.add(window);
      this.menuBackground.add(light1);
      this.menuBackground.add(light2);

      const speed = Phaser.Math.Between(120, 230);

      this.tweens.add({
        targets: [car, window, light1, light2],

        y: direction === 1
          ? height + 100
          : -100,

        duration: (height + 200) / speed * 1000,

        repeat: -1,

        onRepeat: () => {
          const newY =
            direction === 1
              ? -100
              : height + 100;

          car.setPosition(x, newY);
          window.setPosition(x, newY - 5);
          light1.setPosition(x - 9, newY + 24);
          light2.setPosition(x + 9, newY + 24);
        }
      });

      this.menuCars.push(car);
    }
  }
}

  /** Render Main Menu */
  private renderMainMenu(): void {
  const uiLayer = document.getElementById('ui-layer');
  if (!uiLayer) return;

  // 🛣️ สร้างถนนและรถวิ่งด้านหลัง Menu
  this.createMenuRoadBackground();

  uiLayer.classList.remove('hidden');
    uiLayer.innerHTML = `
      ${SHARED_STYLES}
      <div class="glass-panel dd-panel">
        <div class="dd-logo" style="font-size: 3rem; margin-bottom: 0.1rem; line-height: 1;">🤬🚗💨</div>
        <h2 class="title-main">ขับรถภาษาอะไร</h2>
        <p class="title-sub">Dash &amp; Dodge</p>

        <div class="dd-dash-divider"></div>

        <button id="play-btn" class="sky-btn green dd-cta">🚗💨 ลุย!! (คนเดียว)</button>
        <button id="multi-btn" class="sky-btn" style="background: #e1f5fe; border-color: #0288d1; color: #0288d1; margin-bottom: 0.6rem;">⚔️ ดวลหลายคน!! (Lobby)</button>
        <button id="leaderboard-btn" class="sky-btn secondary">🏆 อันดับคะแนน</button>

        <div class="dd-toggle-row">
          <span class="dd-toggle-label">🔊 เสียงประกอบ</span>
          <div id="sound-toggle" class="dd-toggle" role="switch" aria-checked="true" tabindex="0">
            <div class="dd-toggle-knob"></div>
          </div>
        </div>
      </div>
    `;

    const playBtn = document.getElementById('play-btn');
    const multiBtn = document.getElementById('multi-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const soundToggle = document.getElementById('sound-toggle');

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
    const applyToggleState = () => {
      soundToggle?.classList.toggle('dd-off', !soundOn);
      soundToggle?.setAttribute('aria-checked', String(soundOn));
    };
    applyToggleState();

    const flipSound = () => {
      soundOn = !soundOn;
      this.registry.set('soundOn', soundOn);
      applyToggleState();
    };
    soundToggle?.addEventListener('click', flipSound);
    soundToggle?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault();
        flipSound();
      }
    });
  }

  private showCharacterPopup(
  selectedSkin: string,
  onSelect: (id: string) => void
): void {
  const oldPopup = document.getElementById('character-popup-overlay');
  oldPopup?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'character-popup-overlay';
  overlay.className = 'dd-character-overlay';

  overlay.innerHTML = `
    <div class="dd-character-popup">

      <div class="dd-character-popup-header">
        <div>
          <div class="dd-character-popup-title">
            🎭 เลือกตัวละคร
          </div>
          <div class="dd-character-popup-subtitle">
            เลือกตัวละครที่คุณอยากใช้
          </div>
        </div>

        <button
          id="close-character-popup"
          class="dd-character-close"
        >
          ×
        </button>
      </div>

      <div class="dd-character-grid">
        ${SKINS.map(skin => `
          <div
            class="dd-character-option ${skin.id === selectedSkin ? 'dd-active' : ''}"
            data-skin="${skin.id}"
          >

            <span class="dd-character-selected">✓</span>

            <img
              src="${skin.img}"
              alt="${skin.label}"
            />


          </div>
        `).join('')}
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const closePopup = () => {
    overlay.remove();
  };

  document
    .getElementById('close-character-popup')
    ?.addEventListener('click', closePopup);

  // กดพื้นที่มืดเพื่อปิด
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });

  // เลือกตัวละคร
  overlay.querySelectorAll('.dd-character-option').forEach(option => {

    option.addEventListener('click', () => {

      const id = (option as HTMLElement).dataset.skin;

      if (!id) return;

      onSelect(id);

      this.registry.set('characterSkin', id);

      closePopup();
    });

  });
}
  /** Render Nickname + Character Selection form with 8 skin grid */
  private renderNicknameForm(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    const lastNickname = localStorage.getItem('nhee_lor_nickname') || '';
    let selectedSkin: string = this.registry.get('characterSkin') || 'dog';

    uiLayer.innerHTML = `
      ${SHARED_STYLES}
      <div class="glass-panel dd-panel" style="max-width: 480px; width: 95%;">
        <div style="font-size: 2rem; margin-bottom: 0.2rem;" class="dd-logo">🤬</div>
        <h2 class="title-main" style="font-size: 1.5rem;">ข้อมูลผู้เล่น</h2>
        <p style="font-size: 0.82rem; color: #5c8fa8; margin-bottom: 0.8rem; font-weight: 600;">กรอกชื่อและเลือกตัวละครก่อนเล่น</p>

        <div class="dd-field-wrap">
          <span class="dd-input-icon">🏷️</span>
          <input
            type="text"
            id="nickname-input"
            class="sky-input"
            placeholder="ชื่อ 2–12 ตัวอักษร"
            maxlength="12"
            value="${lastNickname}"
            autofocus
          />
          <span id="char-count" class="dd-char-count">${lastNickname.length}/12</span>
        </div>
        <div id="nickname-error" class="dd-error-msg hidden"></div>

        <div class="dd-section-label">
  <span class="section-label">ตัวละคร</span>
  
</div>
<div
  id="character-preview"
  class="dd-character-preview"
  style="width: 75%; margin: 0 auto 1rem;"
>
  <img
    id="character-preview-img"
    src="/assets/characters/${selectedSkin}.png"
    alt="ตัวละคร"
  />

  <div
    id="character-preview-text"
    class="dd-character-preview-text"
  >
    กดเพื่อเลือกตัวละคร
  </div>
</div>

        <button id="start-game-btn" class="sky-btn green dd-cta">ลุยเลย!</button>
        <div class="dd-back-row">
          <button id="back-to-menu-btn" class="sky-btn secondary">ย้อนกลับ</button>
        </div>
      </div>
    `;

    this.registry.set('characterSkin', selectedSkin);

    const inputEl = document.getElementById('nickname-input') as HTMLInputElement;
    const errorEl = document.getElementById('nickname-error') as HTMLElement;
    const charCount = document.getElementById('char-count') as HTMLElement;
    const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
    const backBtn = document.getElementById('back-to-menu-btn');
    const characterPreview =
  document.getElementById('character-preview') as HTMLElement;

const characterPreviewImg =
  document.getElementById('character-preview-img') as HTMLImageElement;

const characterPreviewText =
  document.getElementById('character-preview-text') as HTMLElement;
  characterPreview?.addEventListener('click', () => {

  this.showCharacterPopup(
    selectedSkin,
    (id: string) => {

      selectedSkin = id;

      const skin = SKINS.find(s => s.id === id);

      if (!skin) return;

      characterPreviewImg.src = skin.img;
      characterPreviewImg.alt = skin.label;

      characterPreview.classList.add('dd-has-character');


      characterPreviewText.style.color =
        skin.border;

    }
  );

});
    inputEl?.focus();
    inputEl?.select();

    inputEl?.addEventListener('input', () => {
      charCount.textContent = `${inputEl.value.length}/12`;
    });
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startBtn?.click();
    });

    backBtn?.addEventListener('click', () => this.renderMainMenu());

    startBtn?.addEventListener('click', () => {
      const sanitized = this.validateNickname(inputEl.value, errorEl);
      if (!sanitized) return;

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
      ${SHARED_STYLES}
      <div class="glass-panel dd-panel" style="max-width: 440px; width: 95%;">
        <div style="font-size: 2.8rem; margin-bottom: 0.2rem; line-height: 1;" class="dd-logo">🚗💥🚗</div>
        <h2 class="title-main">เล่นหลายคน (Lobby)</h2>
        <p style="font-size: 0.85rem; color: #5c8fa8; margin-bottom: 1rem; font-weight: 600;">เลือกสร้างห้องในฐานะ Host หรือเข้าร่วมห้องด้วย PIN</p>

        <div id="create-room-btn" class="dd-choice-card" tabindex="0">
          <div class="dd-choice-icon">👑</div>
          <div class="dd-choice-text">
            <div class="dd-choice-title">สร้างห้องใหม่</div>
            <div class="dd-choice-sub">เป็น Host และเชิญเพื่อนด้วย PIN</div>
          </div>
        </div>
        <div id="join-room-ui-btn" class="dd-choice-card" tabindex="0">
          <div class="dd-choice-icon">🔑</div>
          <div class="dd-choice-text">
            <div class="dd-choice-title">เข้าร่วมห้อง</div>
            <div class="dd-choice-sub">กรอก PIN 4 หลักจากเพื่อน</div>
          </div>
        </div>

        <div class="dd-back-row">
          <button id="back-to-menu-btn" class="sky-btn secondary">ย้อนกลับ</button>
        </div>
      </div>
    `;

    const createBtn = document.getElementById('create-room-btn') as HTMLElement;

    const handleCreateRoom = async () => {
      createBtn.style.opacity = '.65';
      createBtn.style.pointerEvents = 'none';
      const sub = createBtn.querySelector('.dd-choice-sub') as HTMLElement;
      const prevSub = sub.textContent;
      sub.textContent = 'กำลังสร้างห้อง...';

      const pin = await ApiService.createRoom();
      if (pin) {
        this.registry.set('isMultiplayer', true);
        this.registry.set('isHost', true);
        this.registry.set('roomPin', pin);
        this.registry.set('nickname', '__host__');

        const uiLayer = document.getElementById('ui-layer')!;
        uiLayer.classList.add('hidden');
        uiLayer.innerHTML = '';
        this.scene.start('RoomLobbyScene');
      } else {
        createBtn.style.opacity = '1';
        createBtn.style.pointerEvents = 'auto';
        sub.textContent = prevSub;
        alert('ไม่สามารถสร้างห้องได้ กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์');
      }
    };

    createBtn?.addEventListener('click', handleCreateRoom);
    createBtn?.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') handleCreateRoom(); });

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

  let selectedSkin: string =
    this.registry.get('characterSkin') || 'dog';

  uiLayer.innerHTML = `
    ${SHARED_STYLES}

    <div
      class="glass-panel dd-panel"
      style="max-width: 480px; width: 95%;"
    >

      <div
        style="font-size: 2rem; margin-bottom: 0.2rem;"
        class="dd-logo"
      >
        🔑
      </div>

      <h2
        class="title-main"
        style="font-size: 1.5rem;"
      >
        เข้าร่วมห้อง
      </h2>

      <p
        style="
          font-size: 0.82rem;
          color: #5c8fa8;
          margin-bottom: 0.9rem;
          font-weight: 600;
        "
      >
        กรอก PIN ชื่อ และเลือกตัวละคร
      </p>

      <!-- =========================
           PIN
      ========================== -->

      <div class="dd-pin-row">
        <input
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="dd-pin-box"
          id="pin-0"
        />

        <input
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="dd-pin-box"
          id="pin-1"
        />

        <input
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="dd-pin-box"
          id="pin-2"
        />

        <input
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="dd-pin-box"
          id="pin-3"
        />
      </div>

      <!-- =========================
           Nickname
      ========================== -->

      <div class="dd-field-wrap">
        <span class="dd-input-icon">🏷️</span>

        <input
          type="text"
          id="nickname-input"
          class="sky-input"
          placeholder="ชื่อผู้เล่น"
          maxlength="12"
        />

        <span
          id="char-count"
          class="dd-char-count"
        >
          0/12
        </span>
      </div>

      <div
        id="join-error"
        class="dd-error-msg hidden"
      ></div>


      <!-- =========================
           Character
      ========================== -->

      <div class="dd-section-label">
        <span class="section-label">
          ตัวละคร
        </span>
      </div>

      <div
  id="join-character-preview"
  class="dd-character-preview"
  style="
    width: 75%;
    height: 150px;
    margin: 0 auto 1rem;
  "
>

        <!-- ข้อความอยู่บนหัวตัวละคร -->
        <div
          id="join-character-preview-text"
          class="dd-character-preview-text"
        >
          กดเพื่อเลือกตัวละคร
        </div>

        <img
          id="join-character-preview-img"
          src="/assets/characters/${selectedSkin}.png"
          alt="ตัวละคร"
          style="
            width: 125px;
            height: 125px;
          "
        />

      </div>


      <!-- =========================
           Buttons
      ========================== -->

      <button
        id="join-submit-btn"
        class="sky-btn green dd-cta"
      >
        🚦 เข้าร่วม
      </button>

      <div class="dd-back-row">
        <button
          id="back-to-mp-btn"
          class="sky-btn secondary"
        >
          ย้อนกลับ
        </button>
      </div>

    </div>
  `;


  // =========================
  // Back
  // =========================

  document
    .getElementById('back-to-mp-btn')
    ?.addEventListener('click', () => {
      this.renderMultiplayerOptions();
    });


  // =========================
  // Character Preview
  // =========================

  const characterPreview =
    document.getElementById(
      'join-character-preview'
    ) as HTMLElement;

  const characterPreviewImg =
    document.getElementById(
      'join-character-preview-img'
    ) as HTMLImageElement;

  const characterPreviewText =
    document.getElementById(
      'join-character-preview-text'
    ) as HTMLElement;


  characterPreview?.addEventListener('click', () => {

    this.showCharacterPopup(
      selectedSkin,
      (id: string) => {

        selectedSkin = id;

        const skin = SKINS.find(
          s => s.id === id
        );

        if (!skin) return;

        // เปลี่ยนรูป
        characterPreviewImg.src = skin.img;
characterPreviewImg.alt = skin.label;

// แสดงตัวละครเป็นสี
characterPreview.classList.add('dd-has-character');

// สีข้อความตามตัวละคร
characterPreviewText.style.color = skin.border;

// บันทึกตัวละคร
this.registry.set(
  'characterSkin',
  selectedSkin
);

        // บันทึกตัวละคร
        this.registry.set(
          'characterSkin',
          selectedSkin
        );

      }
    );

  });


  // =========================
  // PIN
  // =========================

  const pinInputs = [0, 1, 2, 3].map(
    i =>
      document.getElementById(
        `pin-${i}`
      ) as HTMLInputElement
  );

  const getPin = () =>
    pinInputs
      .map(i => i.value)
      .join('');


  pinInputs.forEach((input, idx) => {

    input.addEventListener(
      'input',
      () => {

        input.value =
          input.value
            .replace(/\D/g, '')
            .slice(0, 1);

        if (
          input.value &&
          idx < 3
        ) {
          pinInputs[idx + 1].focus();
        }

      }
    );


    input.addEventListener(
      'keydown',
      (e) => {

        if (
          e.key === 'Backspace' &&
          !input.value &&
          idx > 0
        ) {
          pinInputs[idx - 1].focus();
        }

        if (e.key === 'Enter') {
          joinSubmitBtn?.click();
        }

      }
    );


    input.addEventListener(
      'paste',
      (e) => {

        e.preventDefault();

        const text =
          (
            e.clipboardData
              ?.getData('text') || ''
          )
            .replace(/\D/g, '')
            .slice(0, 4);

        text
          .split('')
          .forEach((ch, i) => {

            if (pinInputs[i]) {
              pinInputs[i].value = ch;
            }

          });

        const next =
          Math.min(text.length, 3);

        pinInputs[next]?.focus();

      }
    );

  });


  // =========================
  // Nickname
  // =========================

  const nickInput =
    document.getElementById(
      'nickname-input'
    ) as HTMLInputElement;

  const charCount =
    document.getElementById(
      'char-count'
    ) as HTMLElement;

  const errorEl =
    document.getElementById(
      'join-error'
    ) as HTMLElement;

  const joinSubmitBtn =
    document.getElementById(
      'join-submit-btn'
    ) as HTMLButtonElement;


  nickInput?.addEventListener(
    'input',
    () => {

      charCount.textContent =
        `${nickInput.value.length}/12`;

    }
  );


  nickInput?.addEventListener(
    'keydown',
    (e) => {

      if (e.key === 'Enter') {
        joinSubmitBtn?.click();
      }

    }
  );


  // =========================
  // Join
  // =========================

  joinSubmitBtn?.addEventListener(
    'click',
    async () => {

      const pin = getPin();

      if (pin.length !== 4) {

        this.showFieldError(
          errorEl,
          'PIN ต้องเป็นตัวเลข 4 หลัก'
        );

        pinInputs[pin.length]?.focus();

        return;
      }


      const sanitized =
        this.validateNickname(
          nickInput.value,
          errorEl
        );

      if (!sanitized) return;


      this.setBtnLoading(
        joinSubmitBtn,
        true,
        '⏳ กำลังเข้าร่วม...',
        '🚦 เข้าร่วม'
      );


      const success =
        await ApiService.joinRoom(
          pin,
          sanitized,
          selectedSkin
        );


      if (success) {

        this.registry.set(
          'isMultiplayer',
          true
        );

        this.registry.set(
          'isHost',
          false
        );

        this.registry.set(
          'roomPin',
          pin
        );

        this.registry.set(
          'nickname',
          sanitized
        );

        this.registry.set(
          'characterSkin',
          selectedSkin
        );

        uiLayer.classList.add(
          'hidden'
        );

        uiLayer.innerHTML = '';

        this.scene.start(
          'RoomLobbyScene'
        );

      } else {

        this.setBtnLoading(
          joinSubmitBtn,
          false,
          '⏳ กำลังเข้าร่วม...',
          '🚦 เข้าร่วม'
        );

        this.showFieldError(
          errorEl,
          'ไม่พบห้อง รหัสผ่านผิด หรือเกมเริ่มแล้ว'
        );

      }

    }
  );

  // เริ่มที่ช่อง PIN
  pinInputs[0]?.focus();
}
}
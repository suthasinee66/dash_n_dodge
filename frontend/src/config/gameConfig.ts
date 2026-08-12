import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.ts';
import { PreloadScene } from '../scenes/PreloadScene.ts';
import { MenuScene } from '../scenes/MenuScene.ts';
import { RoomLobbyScene } from '../scenes/RoomLobbyScene.ts';
import { GameScene } from '../scenes/GameScene.ts';
import { GameOverScene } from '../scenes/GameOverScene.ts';
import { LeaderboardScene } from '../scenes/LeaderboardScene.ts';
import { PodiumScene } from '../scenes/PodiumScene.ts';

const baseWidth = 480;
const defaultHeight = 850;
const maxHeight = 3000;

const getDynamicHeight = (): number => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  if (!windowWidth || !windowHeight) return defaultHeight;

  // Calculate height that matches the aspect ratio of the viewport, assuming width is 480
  const isMobileOrPortrait = windowWidth < 768 || windowHeight > windowWidth;
  if (!isMobileOrPortrait) {
    return defaultHeight;
  }

  const calculatedHeight = Math.round(baseWidth * (windowHeight / windowWidth));
  // Keep it within reasonable bounds (600px to 854px)
  return Math.min(Math.max(calculatedHeight, defaultHeight), maxHeight);
};

const dynamicHeight = getDynamicHeight();

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: baseWidth,
  height: dynamicHeight,
  parent: 'phaser-game',
  backgroundColor: '#0b0914',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: baseWidth,
    height: dynamicHeight,
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    RoomLobbyScene,
    GameScene,
    GameOverScene,
    LeaderboardScene,
    PodiumScene
  ]
};

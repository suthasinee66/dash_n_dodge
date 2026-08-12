import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.ts';

window.addEventListener('load', () => {
  new Phaser.Game(gameConfig);
});

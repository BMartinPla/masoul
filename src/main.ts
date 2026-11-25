import './style.css';
import { MasoulGame } from './game.ts';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root');

if (!canvas || !uiRoot) {
  throw new Error('Required DOM containers #game-canvas and #ui-root not found');
}

const game = new MasoulGame(canvas, uiRoot);
game.start();

// js/main.js - Main game logic with fixed gravity and collisions

import { Player } from './player.js';
import { Enemy } from './enemy.js';

const TILE_SIZE = 25;
const MAP_WIDTH = 32;
const MAP_HEIGHT = 32;
const DIG_COOLDOWN = 6000;

let canvas, ctx;
let gameRunning = true;
let player = null;
let enemies = [];
let map = [];
let goldCollected = 0;
let totalGold = 0;
let score = 0;
let lives = 3;
let brokenBlocks = new Map();
let gameOverFlag = false;

let goldCountElem, totalGoldElem, scoreValueElem, livesCountElem, resetBtn;
let gameOverlay, overlayMessage, overlayRestartBtn, overlayScore, overlayIcon;

// Level map
const LEVEL_ONE = [
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000000000000000000000000000B",
    "B000000L00000000000000000000000B",
    "BBBBBBBLBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000LBBBBBBBBBBBBBBBBBBBB000B",
    "B000000L00000000000000000000000B",
    "BBBBBBBL00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00BBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "BBBBBBBLBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00BBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "BBBBBBBLBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000LBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B0S0G00L000000G00000000000000E0B",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
];

/**
 * Initialize game
 */
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    goldCountElem = document.getElementById('goldCount');
    totalGoldElem = document.getElementById('totalGold');
    scoreValueElem = document.getElementById('scoreValue');
    livesCountElem = document.getElementById('livesCount');
    resetBtn = document.getElementById('resetBtn');
    gameOverlay = document.getElementById('gameOverlay');
    overlayMessage = document.getElementById('overlayMessage');
    overlayRestartBtn = document.getElementById('overlayRestartBtn');
    overlayScore = document.getElementById('overlayScore');
    overlayIcon = document.getElementById('overlayIcon');
    
    if (resetBtn) resetBtn.addEventListener('click', () => resetGame());
    if (overlayRestartBtn) overlayRestartBtn.addEventListener('click', () => resetGame());
    
    setupEventListeners();
    initMap();
    gameLoop();
}

/**
 * Setup keyboard controls
 */
function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (!gameRunning || !player || gameOverFlag) return;
        
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'a': player.moveLeft = true; e.preventDefault(); break;
            case 'd': player.moveRight = true; e.preventDefault(); break;
            case 'w': player.moveUp = true; e.preventDefault(); break;
            case 's': player.moveDown = true; e.preventDefault(); break;
            case 'o': e.preventDefault(); tryDigLeft(); break;
            case 'p': e.preventDefault(); tryDigRight(); break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (!player) return;
        
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'a': player.moveLeft = false; break;
            case 'd': player.moveRight = false; break;
            case 'w': player.moveUp = false; break;
            case 's': player.moveDown = false; break;
        }
    });
}

/**
 * Try to dig left hole
 */
function tryDigLeft() {
    if (!gameRunning || !player || gameOverFlag) return;
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    digBlockAt(px - 1, py + 1);
}

/**
 * Try to dig right hole
 */
function tryDigRight() {
    if (!gameRunning || !player || gameOverFlag) return;
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    digBlockAt(px + 1, py + 1);
}

/**
 * Initialize map from level data
 */
function initMap() {
    map = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill('0'));
    
    for (let y = 0; y < MAP_HEIGHT && y < LEVEL_ONE.length; y++) {
        const row = LEVEL_ONE[y];
        for (let x = 0; x < MAP_WIDTH && x < row.length; x++) {
            map[y][x] = row[x];
        }
    }
    
    totalGold = 0;
    goldCollected = 0;
    enemies = [];
    player = null;
    gameOverFlag = false;
    gameRunning = true;
    brokenBlocks.clear();
    
    if (gameOverlay) gameOverlay.style.display = 'none';
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            if (tile === 'G') totalGold++;
            if (tile === 'S') {
                player = new Player(x, y);
                map[y][x] = '0';
            }
            if (tile === 'M') {
                enemies.push(new Enemy(x, y));
                map[y][x] = '0';
            }
        }
    }
    
    if (!player) player = new Player(15, 29);
    if (player) {
    // Customize player gravity (optional)
    player.setGravity(0.18, 0.28, 3.0);  // normal, broken, max speed
    player.setSpeed(0.22);  // movement speed
    }
    for (let enemy of enemies) {
    // Customize enemy gravity (optional)
    enemy.setGravity(0.15, 0.25, 2.5);  // normal, broken, max speed
    enemy.setSpeed(0.12);  // movement speed
    enemy.setChaseRange(15);  // how far they can see the player
    }   
    updateUI();
}

/**
 * Dig block at position
 */
function digBlockAt(x, y) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
    if (map[y][x] === 'B') {
        map[y][x] = 'F';
        brokenBlocks.set(`${x},${y}`, {
            restoreTime: Date.now() + DIG_COOLDOWN,
            enemyCaptured: null
        });
    }
}

/**
 * Update broken blocks and restore them
 */
function updateBrokenBlocks() {
    const now = Date.now();
    const toRestore = [];
    
    for (let [key, data] of brokenBlocks.entries()) {
        if (now >= data.restoreTime) {
            const [x, y] = key.split(',').map(Number);
            
            if (data.enemyCaptured && data.enemyCaptured.isCaptured) {
                const enemy = data.enemyCaptured;
                let respawnY = y - 1;
                while (respawnY > 0 && map[respawnY][x] !== '0') {
                    respawnY--;
                }
                if (respawnY >= 0 && map[respawnY][x] === '0') {
                    enemy.x = x;
                    enemy.y = respawnY;
                    enemy.isCaptured = false;
                    enemy.capturedBlockKey = null;
                    enemy.vy = 0;
                } else {
                    const idx = enemies.indexOf(enemy);
                    if (idx > -1) enemies.splice(idx, 1);
                }
            }
            toRestore.push({ x, y, key });
        }
    }
    
    for (let { x, y, key } of toRestore) {
        if (map[y][x] === 'F') {
            map[y][x] = 'B';
        }
        brokenBlocks.delete(key);
    }
}

/**
 * Check if player is inside a block
 */
function checkPlayerCrushed() {
    if (!player || gameOverFlag) return false;
    
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    
    if (py >= 0 && py < MAP_HEIGHT && px >= 0 && px < MAP_WIDTH) {
        if (map[py][px] === 'B') {
            gameRunning = false;
            gameOverFlag = true;
            saveScore();
            showGameOverScreen('crushed');
            return true;
        }
    }
    return false;
}

/**
 * Check player-enemy collision
 */
function checkPlayerEnemyCollision() {
    if (!player || gameOverFlag) return false;
    
    for (let enemy of enemies) {
        const dx = Math.abs(player.x - enemy.x);
        const dy = Math.abs(player.y - enemy.y);
        if (dx < 0.7 && dy < 0.7 && !enemy.isCaptured && !enemy.isStuck) {
            gameRunning = false;
            gameOverFlag = true;
            saveScore();
            showGameOverScreen('caught');
            return true;
        }
    }
    return false;
}

/**
 * Update player and collect gold
 */
function updatePlayer() {
    if (!player || gameOverFlag) return;
    
    player.update(map);
    
    // Collect gold
    const gx = Math.floor(player.x);
    const gy = Math.floor(player.y);
    if (gy >= 0 && gy < MAP_HEIGHT && gx >= 0 && gx < MAP_WIDTH && map[gy][gx] === 'G') {
        map[gy][gx] = '0';
        goldCollected++;
        score = goldCollected * 100;
        updateUI();
    }
    
    // Check exit
    const ex = Math.floor(player.x);
    const ey = Math.floor(player.y);
    if (ey >= 0 && ey < MAP_HEIGHT && ex >= 0 && ex < MAP_WIDTH) {
        if (map[ey][ex] === 'E' && goldCollected === totalGold && totalGold > 0) {
            gameRunning = false;
            gameOverFlag = true;
            saveScore();
            showGameOverScreen('win');
        }
    }
}

/**
 * Update all enemies
 */
function updateEnemies() {
    if (gameOverFlag) return;
    
    for (let enemy of enemies) {
        enemy.update(map, player, brokenBlocks);
    }
}

/**
 * Save score to localStorage
 */
function saveScore() {
    const scores = JSON.parse(localStorage.getItem('lodeRunnerScores') || '[]');
    scores.push({ score: score, gold: goldCollected, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('lodeRunnerScores', JSON.stringify(scores.slice(0, 10)));
}

/**
 * Show game over screen
 */
function showGameOverScreen(type) {
    if (!gameOverlay) return;
    
    if (type === 'win') {
        overlayIcon.textContent = '🏆';
        overlayMessage.textContent = 'VICTORY!';
        overlayScore.textContent = `Score: ${score} | Gold: ${goldCollected}/${totalGold}`;
    } else if (type === 'crushed') {
        overlayIcon.textContent = '💀';
        overlayMessage.textContent = 'CRUSHED!';
        overlayScore.textContent = `You were crushed! | Score: ${score}`;
    } else {
        overlayIcon.textContent = '💀';
        overlayMessage.textContent = 'GAME OVER';
        overlayScore.textContent = `Final Score: ${score} | Gold: ${goldCollected}/${totalGold}`;
    }
    
    gameOverlay.style.display = 'flex';
}

/**
 * Render game graphics
 */
function render() {
    if (!ctx || !player) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw tiles
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            const tx = x * TILE_SIZE;
            const ty = y * TILE_SIZE;
            
            switch(tile) {
                case 'B':
                    ctx.fillStyle = '#8B5A2B';
                    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#5D3A1A';
                    ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    break;
                case 'F':
                    ctx.fillStyle = '#A0522D';
                    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#FFAA66';
                    ctx.fillRect(tx + 5, ty + 5, TILE_SIZE - 10, TILE_SIZE - 10);
                    break;
                case 'L':
                    ctx.fillStyle = '#CD853F';
                    ctx.fillRect(tx + 10, ty, 5, TILE_SIZE);
                    for (let i = 0; i < 5; i++) {
                        ctx.fillRect(tx + 5, ty + i * 6, 15, 3);
                    }
                    break;
                case 'G':
                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#B8860B';
                    ctx.beginPath();
                    ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 4, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'E':
                    ctx.fillStyle = '#2E8B57';
                    ctx.fillRect(tx + 5, ty + 5, TILE_SIZE - 10, TILE_SIZE - 10);
                    ctx.fillStyle = '#FFF';
                    ctx.font = `${TILE_SIZE - 5}px monospace`;
                    ctx.fillText('🚪', tx + 4, ty + 20);
                    break;
                default:
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    break;
            }
        }
    }
    
    // Draw enemies
    for (let enemy of enemies) {
        const ex = enemy.x * TILE_SIZE;
        const ey = enemy.y * TILE_SIZE;
        
        if (enemy.isCaptured) {
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(ex + 5, ey + 5, TILE_SIZE - 10, TILE_SIZE - 10);
        } else {
            ctx.fillStyle = '#FF4444';
            ctx.beginPath();
            ctx.arc(ex + TILE_SIZE/2, ey + TILE_SIZE/2, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ex + TILE_SIZE/2 - 3, ey + TILE_SIZE/2 - 2, 2, 0, Math.PI * 2);
            ctx.arc(ex + TILE_SIZE/2 + 3, ey + TILE_SIZE/2 - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + TILE_SIZE/2 - 4, ey + TILE_SIZE/2 + 3, 8, 2);
        }
    }
    
    // Draw player
    const px = player.x * TILE_SIZE;
    const py = player.y * TILE_SIZE;
    ctx.fillStyle = '#00AAFF';
    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px + 10, py + 12, 2, 0, Math.PI * 2);
    ctx.arc(px + 15, py + 12, 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Update UI elements
 */
function updateUI() {
    if (goldCountElem) goldCountElem.textContent = goldCollected;
    if (totalGoldElem) totalGoldElem.textContent = totalGold;
    if (scoreValueElem) scoreValueElem.textContent = score;
    if (livesCountElem) livesCountElem.textContent = lives;
}

/**
 * Reset game
 */
function resetGame() {
    gameRunning = true;
    gameOverFlag = false;
    goldCollected = 0;
    score = 0;
    lives = 3;
    brokenBlocks.clear();
    if (gameOverlay) gameOverlay.style.display = 'none';
    initMap();
    updateUI();
}

/**
 * Main game loop
 */
function gameLoop() {
    if (gameRunning && player && !gameOverFlag) {
        updateBrokenBlocks();
        updatePlayer();
        updateEnemies();
        checkPlayerCrushed();
        checkPlayerEnemyCollision();
    }
    render();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
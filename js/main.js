// js/main.js - Main game logic, map management, game loop, and scoring

import { Player } from './player.js';
import { Enemy } from './enemy.js';

const TILE_SIZE = 25;
const MAP_WIDTH = 32;
const MAP_HEIGHT = 32;
const DIG_COOLDOWN = 6000;
const ENEMY_STUCK_TIME = 5000;

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

const LEVEL_ONE = [
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000000000000000000000000000B",
    "B0G00000000000000000000000000G0B",
    "BBBBBBBLBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L000000G0000000000000000B",
    "B000000LBBBBBBBBBBBBBBBBBBBB000B",
    "B0G0000L00000000000000000000000B",
    "BBBBBBBL00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00BBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000G00B",
    "BBBBBBBLBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00BBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B0G0000L00000000000000000000000B",
    "BBBBBBBLBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000LBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000M00B",
    "B0S0000L000000G00000000000000E0B",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
];

function init() {
    console.log("Game initializing...");
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas not found!");
        return;
    }
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
    
    initMap();
    setupEventListeners();
    gameLoop();
    console.log("Game started!");
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (!gameRunning || !player || gameOverFlag) return;
        
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'a':
                player.moveLeft = true;
                e.preventDefault();
                break;
            case 'd':
                player.moveRight = true;
                e.preventDefault();
                break;
            case 'w':
                player.moveUp = true;
                e.preventDefault();
                break;
            case 's':
                player.moveDown = true;
                e.preventDefault();
                break;
            case 'o':
                e.preventDefault();
                tryDigLeft();
                break;
            case 'p':
                e.preventDefault();
                tryDigRight();
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (!player) return;
        
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'a':
                player.moveLeft = false;
                break;
            case 'd':
                player.moveRight = false;
                break;
            case 'w':
                player.moveUp = false;
                break;
            case 's':
                player.moveDown = false;
                break;
        }
    });
}

function tryDigLeft() {
    if (!gameRunning || !player || gameOverFlag) return;
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    if (py + 1 < MAP_HEIGHT) {
        digBlockAt(px - 1, py + 1);
    }
}

function tryDigRight() {
    if (!gameRunning || !player || gameOverFlag) return;
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    if (py + 1 < MAP_HEIGHT) {
        digBlockAt(px + 1, py + 1);
    }
}

function initMap() {
    console.log("Initializing map...");
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
    
    if (!player) {
        console.warn("No player found, creating at default position");
        player = new Player(15, 29);
    }
    
    updateUI();
}

function digBlockAt(x, y) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
    if (map[y][x] === 'B') {
        map[y][x] = 'F';
        brokenBlocks.set(`${x},${y}`, {
            restoreTime: Date.now() + DIG_COOLDOWN,
            enemyStuckUntil: null,
            stuckEnemyDirection: null
        });
    }
}

function updateBrokenBlocks() {
    const now = Date.now();
    const toRestore = [];
    
    for (let [key, data] of brokenBlocks.entries()) {
        const [x, y] = key.split(',').map(Number);
        
        if (now >= data.restoreTime) {
            if (data.enemyStuckUntil && now < data.enemyStuckUntil) {
                const stuckEnemy = enemies.find(e => e.isStuck && e.stuckBlockKey === key);
                if (stuckEnemy) {
                    let respawnY = y - 1;
                    while (respawnY > 0 && map[respawnY][x] !== '0') respawnY--;
                    if (respawnY >= 0 && map[respawnY][x] === '0') {
                        stuckEnemy.x = x;
                        stuckEnemy.y = respawnY;
                        stuckEnemy.isStuck = false;
                        stuckEnemy.stuckBlockKey = null;
                        stuckEnemy.stuckUntil = null;
                    } else {
                        const idx = enemies.indexOf(stuckEnemy);
                        if (idx > -1) enemies.splice(idx, 1);
                    }
                }
            }
            toRestore.push({ x, y, key });
        }
        else if (data.enemyStuckUntil && now >= data.enemyStuckUntil) {
            const stuckEnemy = enemies.find(e => e.isStuck && e.stuckBlockKey === key);
            if (stuckEnemy) {
                const dir = data.stuckEnemyDirection;
                stuckEnemy.x = dir === 'right' ? x + 1 : x - 1;
                stuckEnemy.y = y - 1;
                stuckEnemy.isStuck = false;
                stuckEnemy.stuckBlockKey = null;
                stuckEnemy.stuckUntil = null;
                data.enemyStuckUntil = null;
                data.stuckEnemyDirection = null;
            }
        }
    }
    
    for (let { x, y, key } of toRestore) {
        if (map[y][x] === 'F') map[y][x] = 'B';
        brokenBlocks.delete(key);
    }
}

function checkPlayerEnemyCollision() {
    if (!player || gameOverFlag) return false;
    for (let enemy of enemies) {
        if (Math.abs(player.x - enemy.x) < 0.8 && Math.abs(player.y - enemy.y) < 0.8) {
            if (!enemy.isStuck) {
                console.log("Player caught by enemy!");
                gameRunning = false;
                gameOverFlag = true;
                showGameOverScreen("caught");
                return true;
            }
        }
    }
    return false;
}

function updatePlayer() {
    if (!player || gameOverFlag) return;
    
    const onLadder = () => {
        const tx = Math.floor(player.x);
        const ty = Math.floor(player.y);
        return (ty >= 0 && ty < MAP_HEIGHT && tx >= 0 && tx < MAP_WIDTH && map[ty][tx] === 'L');
    };
    
    player.update(onLadder());
    
    const bx = Math.floor(player.x);
    const by = Math.floor(player.y + player.vy + 0.1);
    let onGround = false;
    
    if (by >= 0 && by < MAP_HEIGHT && bx >= 0 && bx < MAP_WIDTH) {
        const tileBelow = map[by][bx];
        if (tileBelow === 'B' || tileBelow === 'F') {
            onGround = true;
            player.vy = 0;
            player.y = Math.floor(player.y);
        }
    }
    
    if (!onGround && !onLadder()) {
        player.vy += 0.2;
        player.y += player.vy;
    } else if (onLadder()) {
        player.vy = 0;
    } else {
        player.vy = 0;
    }
    
    player.x = Math.max(0.2, Math.min(MAP_WIDTH - 0.8, player.x));
    player.y = Math.max(0, Math.min(MAP_HEIGHT - 0.8, player.y));
    
    const gx = Math.floor(player.x), gy = Math.floor(player.y);
    if (gy >= 0 && gy < MAP_HEIGHT && gx >= 0 && gx < MAP_WIDTH && map[gy][gx] === 'G') {
        map[gy][gx] = '0';
        goldCollected++;
        score = goldCollected * 100;
        updateUI();
    }
    
    const ex = Math.floor(player.x), ey = Math.floor(player.y);
    if (ey >= 0 && ey < MAP_HEIGHT && ex >= 0 && ex < MAP_WIDTH) {
        if (map[ey][ex] === 'E' && goldCollected === totalGold && totalGold > 0) {
            console.log("Level complete!");
            gameRunning = false;
            gameOverFlag = true;
            saveScore();
            showGameOverScreen("win");
        }
    }
}

function saveScore() {
    const scores = JSON.parse(localStorage.getItem('lodeRunnerScores') || '[]');
    scores.push({ score: score, gold: goldCollected, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('lodeRunnerScores', JSON.stringify(scores.slice(0, 10)));
}

function updateEnemies() {
    if (gameOverFlag) return;
    
    for (let enemy of enemies) {
        enemy.update(map, player, brokenBlocks);
        
        const tx = Math.floor(enemy.x), ty = Math.floor(enemy.y);
        if (ty >= 0 && ty < MAP_HEIGHT && tx >= 0 && tx < MAP_WIDTH && map[ty][tx] === 'F' && !enemy.isStuck) {
            const key = `${tx},${ty}`;
            const brokenData = brokenBlocks.get(key);
            if (brokenData && !brokenData.enemyStuckUntil) {
                enemy.isStuck = true;
                enemy.stuckUntil = Date.now() + ENEMY_STUCK_TIME;
                enemy.stuckBlockKey = key;
                brokenData.enemyStuckUntil = Date.now() + ENEMY_STUCK_TIME;
                brokenData.stuckEnemyDirection = enemy.lastMoveDir === 'left' ? 'left' : 'right';
                enemy.vx = 0;
                enemy.vy = 0;
            }
        }
        
        if (!enemy.isStuck) {
            const belowX = Math.floor(enemy.x);
            const belowY = Math.floor(enemy.y + 0.5);
            if (belowY >= 0 && belowY < MAP_HEIGHT && belowX >= 0 && belowX < MAP_WIDTH) {
                const tileBelow = map[belowY][belowX];
                if (tileBelow === 'F') {
                    enemy.y += 0.8;
                }
            }
        }
    }
}

function showGameOverScreen(type) {
    if (!gameOverlay) return;
    
    if (type === "win") {
        overlayIcon.textContent = "🏆";
        overlayMessage.textContent = "VICTORY!";
        overlayMessage.style.color = "#ffaa33";
        overlayScore.textContent = `Score: ${score} | Gold: ${goldCollected}/${totalGold}`;
    } else {
        overlayIcon.textContent = "💀";
        overlayMessage.textContent = "GAME OVER";
        overlayMessage.style.color = "#ff6666";
        overlayScore.textContent = `Final Score: ${score} | Gold: ${goldCollected}/${totalGold}`;
    }
    
    gameOverlay.style.display = 'flex';
}

function render() {
    if (!ctx || !player) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            const tx = x * TILE_SIZE, ty = y * TILE_SIZE;
            
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
                    for (let i = 0; i < 5; i++) ctx.fillRect(tx + 5, ty + i * 6, 15, 3);
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
            }
        }
    }
    
    for (let enemy of enemies) {
        const ex = enemy.x * TILE_SIZE, ey = enemy.y * TILE_SIZE;
        ctx.fillStyle = enemy.isStuck ? '#8B0000' : '#FF4444';
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
    
    const px = player.x * TILE_SIZE, py = player.y * TILE_SIZE;
    ctx.fillStyle = '#00AAFF';
    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px + 10, py + 12, 2, 0, Math.PI * 2);
    ctx.arc(px + 15, py + 12, 2, 0, Math.PI * 2);
    ctx.fill();
}

function updateUI() {
    if (goldCountElem) goldCountElem.textContent = goldCollected;
    if (totalGoldElem) totalGoldElem.textContent = totalGold;
    if (scoreValueElem) scoreValueElem.textContent = score;
    if (livesCountElem) livesCountElem.textContent = lives;
}

function resetGame() {
    console.log("Resetting game...");
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

function gameLoop() {
    if (gameRunning && player && !gameOverFlag) {
        updateBrokenBlocks();
        updatePlayer();
        updateEnemies();
        checkPlayerEnemyCollision();
    }
    render();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
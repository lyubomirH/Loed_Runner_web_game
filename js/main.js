// js/main.js - Updated with enemy respawn points

import { Player } from './player.js';
import { Enemy } from './enemy.js';

// ========== GAME CONSTANTS ==========
const TILE_SIZE = 25;
const MAP_WIDTH = 32;
const MAP_HEIGHT = 32;
const DIG_COOLDOWN = 6000;
const ENEMY_STUCK_DURATION = 5000;
const BLOCK_RESTORE_TIME = 6000;
const GOLD_SCORE_MULTIPLIER = 100;
const ENEMY_RESPAWN_DELAY = 3000; // 3 seconds before enemy respawns

// ========== DOM ELEMENTS ==========
let canvas, ctx;
let goldCountElem, totalGoldElem, scoreValueElem, livesCountElem;
let resetBtn, gameOverlay, overlayMessage, overlayRestartBtn, overlayScore, overlayIcon;

// ========== GAME STATE ==========
let gameRunning = true;
let gameOverFlag = false;
let player = null;
let enemies = [];
let map = [];
let brokenBlocks = new Map();
let goldCollected = 0;
let totalGold = 0;
let score = 0;
let lives = 3;
let respawnPoints = []; // Store enemy respawn positions
let pendingRespawns = []; // Track enemies waiting to respawn

// ========== LEVEL MAP ==========
// R = Enemy Respawn Point
const LEVEL_ONE = [
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000000000000000000000000000B",
    "B0G00000000000000000000000000G0B",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000000000000000000000000000B",
    "B000000L000000G0000000000000000B",
    "B000000LBBBBBBBBBBBBBBBBBBBB000B",
    "B0G0000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00BBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000G00B",
    "B000000LBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000L00BBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B0G0000L00000000000000000000000B",
    "B000000LBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000000B",
    "B000000R00000000000000000000000B",  // R = respawn point
    "B000000LBBBBBBBBBBBBBBBBBBBBBBBB",
    "B000000L00000000000000000000000B",
    "B000000L00000000000000000000M00B",
    "B0S0000L000000G00000000000000E0B",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
];

// ========== INITIALIZATION ==========
function init() {
    cacheDomElements();
    setupEventListeners();
    initMap();
    gameLoop();
}

function cacheDomElements() {
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
    
    if (resetBtn) resetBtn.addEventListener('click', resetGame);
    if (overlayRestartBtn) overlayRestartBtn.addEventListener('click', resetGame);
}

function setupEventListeners() {
    const keyHandlers = {
        'a': () => player && (player.moveLeft = true),
        'd': () => player && (player.moveRight = true),
        'w': () => player && (player.moveUp = true),
        's': () => player && (player.moveDown = true),
        'o': () => tryDigLeft(),
        'p': () => tryDigRight()
    };
    
    window.addEventListener('keydown', (e) => {
        if (!gameRunning || !player || gameOverFlag) return;
        const handler = keyHandlers[e.key.toLowerCase()];
        if (handler) {
            handler();
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (!player) return;
        const key = e.key.toLowerCase();
        if (key === 'a') player.moveLeft = false;
        if (key === 'd') player.moveRight = false;
        if (key === 'w') player.moveUp = false;
        if (key === 's') player.moveDown = false;
    });
}

// ========== GAME ACTIONS ==========
function tryDigLeft() {
    if (!gameRunning || !player || gameOverFlag) return;
    digBlockAt(Math.floor(player.x) - 1, Math.floor(player.y) + 1);
}

function tryDigRight() {
    if (!gameRunning || !player || gameOverFlag) return;
    digBlockAt(Math.floor(player.x) + 1, Math.floor(player.y) + 1);
}

function digBlockAt(x, y) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
    if (map[y][x] !== 'B') return;
    
    map[y][x] = 'F';
    brokenBlocks.set(`${x},${y}`, {
        restoreTime: Date.now() + BLOCK_RESTORE_TIME,
        enemyInside: null,
        stuckUntil: null,
        escapeDirection: null
    });
}

// ========== ENEMY RESPAWN SYSTEM ==========
function findNearestRespawnPoint(x, y) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const point of respawnPoints) {
        const dist = Math.abs(x - point.x) + Math.abs(y - point.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = point;
        }
    }
    return nearest;
}

function respawnEnemy() {
    const now = Date.now();
    const respawnList = [...pendingRespawns];
    
    for (const respawn of respawnList) {
        if (now >= respawn.respawnTime) {
            // Find the respawn point to use
            let spawnPoint = respawn.respawnPoint;
            
            // If no specific respawn point, find nearest
            if (!spawnPoint) {
                spawnPoint = findNearestRespawnPoint(respawn.originalX, respawn.originalY);
            }
            
            if (spawnPoint) {
                // Create new enemy at respawn point
                const newEnemy = new Enemy(spawnPoint.x, spawnPoint.y);
                enemies.push(newEnemy);
                
                // Remove from pending respawns
                const index = pendingRespawns.indexOf(respawn);
                if (index !== -1) {
                    pendingRespawns.splice(index, 1);
                }
            }
        }
    }
}

function scheduleEnemyRespawn(enemy) {
    // Find nearest respawn point
    const respawnPoint = findNearestRespawnPoint(enemy.x, enemy.y);
    
    if (respawnPoint) {
        pendingRespawns.push({
            respawnTime: Date.now() + ENEMY_RESPAWN_DELAY,
            respawnPoint: respawnPoint,
            originalX: enemy.x,
            originalY: enemy.y
        });
    }
}

// ========== MAP INITIALIZATION ==========
function initMap() {
    map = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill('0'));
    respawnPoints = [];
    pendingRespawns = [];
    
    for (let y = 0; y < MAP_HEIGHT && y < LEVEL_ONE.length; y++) {
        for (let x = 0; x < MAP_WIDTH && x < LEVEL_ONE[y].length; x++) {
            map[y][x] = LEVEL_ONE[y][x];
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
            if (tile === 'R') {
                respawnPoints.push({ x, y });
                map[y][x] = '0'; // Remove R from map after storing
            }
        }
    }
    
    if (!player) player = new Player(15, 29);
    updateUI();
}

// ========== BROKEN BLOCK MANAGEMENT ==========
function updateBrokenBlocks() {
    const now = Date.now();
    const toEscape = [];
    const toRestore = [];
    
    for (const [key, data] of brokenBlocks.entries()) {
        if (data.enemyInside && data.stuckUntil && now >= data.stuckUntil) {
            toEscape.push({ key, data });
        }
        if (now >= data.restoreTime) toRestore.push(key);
    }
    
    processEscapes(toEscape);
    restoreBlocks(toRestore);
}

function processEscapes(escapes) {
    for (const { key, data } of escapes) {
        const [x, y] = key.split(',').map(Number);
        const enemy = data.enemyInside;
        
        if (!enemy?.isCaptured) continue;
        
        const direction = data.escapeDirection || 'right';
        let escapeX = direction === 'right' ? x + 1 : x - 1;
        let escapeY = y - 1;
        
        const escapePos = findValidEscapePosition(escapeX, escapeY, x, y);
        
        if (escapePos.valid) {
            enemy.x = escapePos.x;
            enemy.y = escapePos.y;
            enemy.isCaptured = false;
            enemy.isAlive = true;
            enemy.vy = enemy.vx = 0;
        } else {
            // Enemy dies if no escape position, schedule respawn
            const index = enemies.indexOf(enemy);
            if (index !== -1) enemies.splice(index, 1);
            enemy.isAlive = false;
            enemy.isCaptured = false;
            scheduleEnemyRespawn(enemy);
        }
        
        data.enemyInside = null;
        data.stuckUntil = null;
        data.escapeDirection = null;
    }
}

function findValidEscapePosition(escapeX, escapeY, originalX, originalY) {
    const isValid = (x, y) => x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && map[y][x] !== 'B';
    
    if (isValid(escapeX, escapeY)) return { valid: true, x: escapeX, y: escapeY };
    
    const oppositeX = originalX * 2 - escapeX;
    if (isValid(oppositeX, escapeY)) return { valid: true, x: oppositeX, y: escapeY };
    
    if (isValid(originalX, escapeY)) return { valid: true, x: originalX, y: escapeY };
    
    return { valid: false, x: originalX, y: escapeY };
}

function restoreBlocks(blocks) {
    for (const key of blocks) {
        const [x, y] = key.split(',').map(Number);
        const data = brokenBlocks.get(key);
        
        if (data?.enemyInside?.isCaptured) {
            const enemy = data.enemyInside;
            const index = enemies.indexOf(enemy);
            if (index !== -1) enemies.splice(index, 1);
            enemy.isAlive = false;
            enemy.isCaptured = false;
            scheduleEnemyRespawn(enemy);
        }
        
        if (map[y][x] === 'F') map[y][x] = 'B';
        brokenBlocks.delete(key);
    }
}

// ========== GAME UPDATES ==========
function updatePlayer() {
    if (!player || gameOverFlag) return;
    
    player.update(map);
    collectGold();
    checkExit();
}

function collectGold() {
    const gx = Math.floor(player.x);
    const gy = Math.floor(player.y);
    
    if (gy >= 0 && gy < MAP_HEIGHT && gx >= 0 && gx < MAP_WIDTH && map[gy][gx] === 'G') {
        map[gy][gx] = '0';
        goldCollected++;
        score = goldCollected * GOLD_SCORE_MULTIPLIER;
        updateUI();
    }
}

function checkExit() {
    const ex = Math.floor(player.x);
    const ey = Math.floor(player.y);
    
    if (map[ey]?.[ex] === 'E' && goldCollected === totalGold && totalGold > 0) {
        endGame('win');
    }
}

function updateEnemies() {
    if (gameOverFlag) return;
    for (const enemy of enemies) {
        if (enemy.isAlive) enemy.update(map, player, brokenBlocks);
    }
}

function checkCollisions() {
    if (!player || gameOverFlag) return;
    
    // Check crushed by block
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    if (map[py]?.[px] === 'B') endGame('crushed');
    
    // Check enemy collision
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.isAlive || enemy.isCaptured) continue;
        if (Math.abs(player.x - enemy.x) < 0.7 && Math.abs(player.y - enemy.y) < 0.7) {
            endGame('caught');
            return;
        }
    }
}

function endGame(type) {
    gameRunning = false;
    gameOverFlag = true;
    saveScore();
    showGameOverScreen(type);
}

// ========== SCORE MANAGEMENT ==========
function saveScore() {
    const scores = JSON.parse(localStorage.getItem('lodeRunnerScores') || '[]');
    scores.push({
        score,
        gold: goldCollected,
        date: new Date().toLocaleDateString()
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('lodeRunnerScores', JSON.stringify(scores.slice(0, 10)));
}

function showGameOverScreen(type) {
    if (!gameOverlay) return;
    
    const screens = {
        win: { icon: '🏆', message: 'VICTORY!', text: `Score: ${score} | Gold: ${goldCollected}/${totalGold}` },
        crushed: { icon: '💀', message: 'CRUSHED!', text: `You were crushed! | Score: ${score}` },
        caught: { icon: '💀', message: 'GAME OVER', text: `Final Score: ${score} | Gold: ${goldCollected}/${totalGold}` }
    };
    
    const screen = screens[type] || screens.caught;
    overlayIcon.textContent = screen.icon;
    overlayMessage.textContent = screen.message;
    overlayScore.textContent = screen.text;
    gameOverlay.style.display = 'flex';
}

// ========== RENDERING ==========
function render() {
    if (!ctx || !player) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    renderMap();
    renderEnemies();
    renderPlayer();
}

function renderMap() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            if (tile === '0') continue;
            
            const tx = x * TILE_SIZE;
            const ty = y * TILE_SIZE;
            
            const renderers = {
                'B': () => renderBlock(tx, ty),
                'F': () => renderBrokenBlock(tx, ty, x, y),
                'L': () => renderLadder(tx, ty),
                'G': () => renderGold(tx, ty),
                'E': () => renderExit(tx, ty)
            };
            
            if (renderers[tile]) renderers[tile]();
            else {
                ctx.fillStyle = '#000000';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    // Draw respawn points (debug - can remove for final game)
    for (const point of respawnPoints) {
        const tx = point.x * TILE_SIZE;
        const ty = point.y * TILE_SIZE;
        ctx.fillStyle = '#FF00FF88';
        ctx.beginPath();
        ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderBlock(tx, ty) {
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#5D3A1A';
    ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
}

function renderBrokenBlock(tx, ty, x, y) {
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#FFAA66';
    ctx.fillRect(tx + 5, ty + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    
    const data = brokenBlocks.get(`${x},${y}`);
    if (data?.enemyInside && data.stuckUntil) {
        const seconds = Math.ceil(Math.max(0, data.stuckUntil - Date.now()) / 1000);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`⏱️${seconds}s`, tx + 6, ty + 18);
        
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(data.escapeDirection === 'right' ? '→' : '←', 
                    data.escapeDirection === 'right' ? tx + 16 : tx + 4, ty + 10);
    }
}

function renderLadder(tx, ty) {
    ctx.fillStyle = '#CD853F';
    ctx.fillRect(tx + 10, ty, 5, TILE_SIZE);
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(tx + 5, ty + i * 6, 15, 3);
    }
}

function renderGold(tx, ty) {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B8860B';
    ctx.beginPath();
    ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, 4, 0, Math.PI * 2);
    ctx.fill();
}

function renderExit(tx, ty) {
    ctx.fillStyle = '#2E8B57';
    ctx.fillRect(tx + 5, ty + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    ctx.fillStyle = '#FFF';
    ctx.font = `${TILE_SIZE - 5}px monospace`;
    ctx.fillText('🚪', tx + 4, ty + 20);
}

function renderEnemies() {
    for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        
        const ex = enemy.x * TILE_SIZE;
        const ey = enemy.y * TILE_SIZE;
        
        if (enemy.isCaptured) {
            renderCapturedEnemy(ex, ey, enemy);
        } else {
            renderNormalEnemy(ex, ey);
        }
    }
}

function renderCapturedEnemy(ex, ey, enemy) {
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(ex + 3, ey + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    ctx.fillStyle = '#FFFF00';
    ctx.font = 'bold 14px monospace';
    const arrow = enemy.escapeDirection === 'right' ? '→' : enemy.escapeDirection === 'left' ? '←' : '🏃';
    ctx.fillText(arrow, ex + 8, ey + 18);
}

function renderNormalEnemy(ex, ey) {
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

function renderPlayer() {
    const px = player.x * TILE_SIZE;
    const py = player.y * TILE_SIZE;
    ctx.fillStyle = '#00AAFF';
    ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px + 10, py + 12, 2, 0, Math.PI * 2);
    ctx.arc(px + 15, py + 12, 2, 0, Math.PI * 2);
    ctx.fill();
    
    if (player.isCurrentlyFalling?.()) {
        ctx.fillStyle = '#FFFFFF88';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('💨', px + 18, py + 20);
    }
}

// ========== UI HELPERS ==========
function updateUI() {
    if (goldCountElem) goldCountElem.textContent = goldCollected;
    if (totalGoldElem) totalGoldElem.textContent = totalGold;
    if (scoreValueElem) scoreValueElem.textContent = score;
    if (livesCountElem) livesCountElem.textContent = lives;
}

function resetGame() {
    gameRunning = true;
    gameOverFlag = false;
    goldCollected = 0;
    score = 0;
    lives = 3;
    brokenBlocks.clear();
    pendingRespawns = [];
    if (gameOverlay) gameOverlay.style.display = 'none';
    initMap();
    updateUI();
}

// ========== GAME LOOP ==========
function gameLoop() {
    if (gameRunning && player && !gameOverFlag) {
        respawnEnemy();  // Check for enemies to respawn
        updateBrokenBlocks();
        updatePlayer();
        updateEnemies();
        checkCollisions();
    }
    render();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
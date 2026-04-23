// js/player.js - Optimized player class

const PLAYER_GRAVITY_NORMAL = 0.12;
const PLAYER_GRAVITY_BROKEN = 0.18;
const PLAYER_MAX_FALL_SPEED = 2.5;
const PLAYER_SPEED = 0.22;
const PLAYER_AIR_CONTROL = 0.0;

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        this.onGround = false;
        this.onLadder = false;
        this.isFalling = false;
        this.fallTimer = 0;
        
        this.gravityNormal = PLAYER_GRAVITY_NORMAL;
        this.gravityBroken = PLAYER_GRAVITY_BROKEN;
        this.maxFallSpeed = PLAYER_MAX_FALL_SPEED;
        this.speed = PLAYER_SPEED;
        this.airControl = PLAYER_AIR_CONTROL;
    }
    
    isSolidBlock(tile) { return tile === 'B'; }
    isLadder(tile) { return tile === 'L'; }
    
    getTileAt(x, y, map) {
        const tx = Math.floor(x), ty = Math.floor(y);
        if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length) return null;
        return map[ty][tx];
    }
    
    collidesWithBlock(x, y, map) {
        const left = Math.floor(x - 0.4), right = Math.floor(x + 0.4);
        const top = Math.floor(y - 0.4), bottom = Math.floor(y + 0.4);
        
        for (let row = top; row <= bottom; row++) {
            if (row < 0 || row >= map.length) continue;
            for (let col = left; col <= right; col++) {
                if (col < 0 || col >= map[0].length) continue;
                if (map[row][col] === 'B') return true;
            }
        }
        return false;
    }
    
    checkGroundCollision(map) {
        const feetY = this.y + 0.5;
        const leftTile = this.getTileAt(this.x - 0.35, feetY, map);
        const rightTile = this.getTileAt(this.x + 0.35, feetY, map);
        
        if (this.isSolidBlock(leftTile) || this.isSolidBlock(rightTile)) {
            this.y = Math.floor(feetY) - 0.45;
            this.vy = 0;
            this.isFalling = false;
            this.fallTimer = 0;
            return true;
        }
        return false;
    }
    
    checkBrokenGround(map) {
        const feetY = this.y + 0.5;
        const leftTile = this.getTileAt(this.x - 0.35, feetY, map);
        const rightTile = this.getTileAt(this.x + 0.35, feetY, map);
        return leftTile === 'F' || rightTile === 'F';
    }
    
    checkLadderCollision(map) {
        const tile = this.getTileAt(Math.floor(this.x), Math.floor(this.y), map);
        return tile === 'L';
    }
    
    updateHorizontal(map) {
        if (this.isFalling && !this.onLadder) return;
        
        let dir = 0;
        if (this.moveLeft) dir = -1;
        if (this.moveRight) dir = 1;
        
        if (dir !== 0) {
            const newX = this.x + dir * this.speed;
            if (!this.collidesWithBlock(newX, this.y, map)) {
                this.x = newX;
            }
        }
    }
    
    updateVertical(map) {
        let dir = 0;
        if (this.moveUp) dir = -1;
        if (this.moveDown) dir = 1;
        
        if (dir !== 0) {
            const newY = this.y + dir * this.speed;
            const tile = this.getTileAt(Math.floor(this.x), newY, map);
            if (tile === 'L' || tile === '0' || tile === 'G' || tile === 'E') {
                this.y = newY;
                this.vy = 0;
                this.isFalling = false;
                this.fallTimer = 0;
            }
        }
    }
    
    updateGravity(map) {
        if (this.checkGroundCollision(map)) {
            this.onGround = true;
            this.isFalling = false;
            return;
        }
        
        this.onGround = false;
        const onBroken = this.checkBrokenGround(map);
        this.vy += onBroken ? this.gravityBroken : this.gravityNormal;
        
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
        if (this.vy > 0.05) {
            this.isFalling = true;
            this.fallTimer++;
        }
        
        let newY = this.y + this.vy;
        
        if (this.vy > 0) {
            const newFeetY = newY + 0.5;
            const leftTile = this.getTileAt(this.x - 0.35, newFeetY, map);
            const rightTile = this.getTileAt(this.x + 0.35, newFeetY, map);
            
            if (this.isSolidBlock(leftTile) || this.isSolidBlock(rightTile)) {
                newY = Math.floor(newFeetY) - 0.45;
                this.vy = 0;
                this.onGround = true;
                this.isFalling = false;
                this.fallTimer = 0;
            }
        }
        
        this.y = newY;
    }
    
    update(map) {
        const wasOnLadder = this.onLadder;
        this.onLadder = this.checkLadderCollision(map);
        
        this.updateHorizontal(map);
        
        if (this.onLadder) {
            this.updateVertical(map);
            this.vy = 0;
            this.isFalling = false;
            this.fallTimer = 0;
        } else {
            this.updateGravity(map);
        }
        
        this.x = Math.max(0.2, Math.min(31.8, this.x));
        this.y = Math.max(0, Math.min(31.8, this.y));
        
        if (this.y >= 31.5) {
            this.y = 31.5;
            if (this.vy > 0) {
                this.vy = 0;
                this.isFalling = false;
            }
            this.onGround = true;
        }
    }
    
    isCurrentlyFalling() { return this.isFalling; }
    getFallDistance() { return this.fallTimer * 0.1; }
    setGravity(normal, broken, maxSpeed) {
        this.gravityNormal = normal;
        this.gravityBroken = broken;
        this.maxFallSpeed = maxSpeed;
    }
    setSpeed(speed) { this.speed = speed; }
    setAirControl(control) { this.airControl = control; }
}
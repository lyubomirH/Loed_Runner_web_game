// js/player.js - Player class with movement, gravity, and collision

// ========== PLAYER GRAVITY VARIABLES ==========
const PLAYER_GRAVITY_NORMAL = 0.018;      // Normal falling speed
const PLAYER_GRAVITY_BROKEN = 0.000008;      // Falling through broken blocks (faster)
const PLAYER_MAX_FALL_SPEED = 0.000003;       // Terminal velocity
const PLAYER_SPEED = 0.22;               // Movement speed
const PLAYER_SIZE = 0.7;                 // Collision size

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
        
        // Gravity settings (can be modified per instance)
        this.gravityNormal = PLAYER_GRAVITY_NORMAL;
        this.gravityBroken = PLAYER_GRAVITY_BROKEN;
        this.maxFallSpeed = PLAYER_MAX_FALL_SPEED;
        this.speed = PLAYER_SPEED;
    }
    
    /**
     * Check collision with blocks at given position
     */
    collidesWithBlock(x, y, map) {
        const left = Math.floor(x - 0.4);
        const right = Math.floor(x + 0.4);
        const top = Math.floor(y - 0.4);
        const bottom = Math.floor(y + 0.4);
        
        for (let row = top; row <= bottom; row++) {
            if (row < 0 || row >= map.length) continue;
            for (let col = left; col <= right; col++) {
                if (col < 0 || col >= map[0].length) continue;
                if (map[row][col] === 'B') {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Check if standing on ground
     */
    checkGround(map) {
        const left = Math.floor(this.x - 0.4);
        const right = Math.floor(this.x + 0.4);
        const feet = Math.floor(this.y + 0.5);
        
        if (feet < 0 || feet >= map.length) return false;
        
        for (let col = left; col <= right; col++) {
            if (col < 0 || col >= map[0].length) continue;
            const tile = map[feet][col];
            if (tile === 'B') return true;
        }
        return false;
    }
    
    /**
     * Check if standing on broken block
     */
    checkBrokenGround(map) {
        const left = Math.floor(this.x - 0.4);
        const right = Math.floor(this.x + 0.4);
        const feet = Math.floor(this.y + 0.5);
        
        if (feet < 0 || feet >= map.length) return false;
        
        for (let col = left; col <= right; col++) {
            if (col < 0 || col >= map[0].length) continue;
            if (map[feet][col] === 'F') return true;
        }
        return false;
    }
    
    /**
     * Check if on ladder
     */
    checkLadder(map) {
        const xTile = Math.floor(this.x);
        const yTile = Math.floor(this.y);
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            return map[yTile][xTile] === 'L';
        }
        return false;
    }
    
    /**
     * Update horizontal movement
     */
    updateHorizontal(map) {
        let move = 0;
        if (this.moveLeft) move = -this.speed;
        if (this.moveRight) move = this.speed;
        
        if (move !== 0) {
            const newX = this.x + move;
            if (!this.collidesWithBlock(newX, this.y, map)) {
                this.x = newX;
            }
        }
    }
    
    /**
     * Update ladder movement
     */
    updateLadder(map) {
        let move = 0;
        if (this.moveUp) move = -this.speed;
        if (this.moveDown) move = this.speed;
        
        if (move !== 0) {
            const newY = this.y + move;
            const xTile = Math.floor(this.x);
            const yTile = Math.floor(newY);
            
            if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
                const tile = map[yTile][xTile];
                if (tile === 'L' || tile === '0' || tile === 'G' || tile === 'E') {
                    this.y = newY;
                    this.vy = 0;
                }
            }
        }
    }
    
    /**
     * Update gravity and vertical movement
     */
    updateGravity(map) {
        const onGround = this.checkGround(map);
        const onBroken = this.checkBrokenGround(map);
        
        if (onGround) {
            // Snap to ground
            const feet = Math.floor(this.y + 0.5);
            this.y = feet - 0.45;
            this.vy = 0;
            this.onGround = true;
            return;
        }
        
        this.onGround = false;
        
        // Apply gravity based on ground type
        if (onBroken) {
            this.vy += this.gravityBroken;
        } else {
            this.vy += this.gravityNormal;
        }
        
        // Apply terminal velocity limit
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
        
        // Apply vertical movement
        const newY = this.y + this.vy;
        
        // Check landing
        if (this.vy > 0) {
            const left = Math.floor(this.x - 0.4);
            const right = Math.floor(this.x + 0.4);
            const newFeet = Math.floor(newY + 0.5);
            
            for (let col = left; col <= right; col++) {
                if (newFeet >= 0 && newFeet < map.length && col >= 0 && col < map[0].length) {
                    if (map[newFeet][col] === 'B') {
                        this.y = newFeet - 0.45;
                        this.vy = 0;
                        this.onGround = true;
                        return;
                    }
                }
            }
        }
        
        this.y = newY;
    }
    
    /**
     * Set custom gravity values
     */
    setGravity(normal, broken, maxSpeed) {
        this.gravityNormal = normal;
        this.gravityBroken = broken;
        this.maxFallSpeed = maxSpeed;
    }
    
    /**
     * Set custom movement speed
     */
    setSpeed(speed) {
        this.speed = speed;
    }
    
    /**
     * Main update function
     */
    update(map) {
        // Check ladder state
        this.onLadder = this.checkLadder(map);
        
        // Horizontal movement
        this.updateHorizontal(map);
        
        // Vertical movement
        if (this.onLadder) {
            this.updateLadder(map);
            this.vy = 0;
        } else {
            this.updateGravity(map);
        }
        
        // Boundary clamping
        this.x = Math.max(0.2, Math.min(31.8, this.x));
        this.y = Math.max(0, Math.min(31.8, this.y));
    }
}
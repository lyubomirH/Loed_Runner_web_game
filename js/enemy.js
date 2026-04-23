// js/enemy.js - Enemy class with simple working movement

const ENEMY_GRAVITY_NORMAL = 0.15;
const ENEMY_GRAVITY_BROKEN = 0.25;
const ENEMY_MAX_FALL_SPEED = 2.5;
const ENEMY_SPEED = 0.12;
const ENEMY_LADDER_SPEED = 0.14;
const CHASE_RANGE = 20;
const ENEMY_STUCK_DURATION = 5000;

export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.isStuck = false;
        this.isCaptured = false;
        this.isAlive = true;
        this.stuckUntil = null;
        this.stuckBlockKey = null;
        this.capturedBlockKey = null;
        this.lastMoveDir = 'right';
        this.escapeDirection = null;
        this.onGround = false;
        this.onLadder = false;
        this.directionChangeTimer = 0;
        
        this.gravityNormal = ENEMY_GRAVITY_NORMAL;
        this.gravityBroken = ENEMY_GRAVITY_BROKEN;
        this.maxFallSpeed = ENEMY_MAX_FALL_SPEED;
        this.speed = ENEMY_SPEED;
        this.ladderSpeed = ENEMY_LADDER_SPEED;
        this.chaseRange = CHASE_RANGE;
    }
    
    /**
     * Check if enemy is on a ladder
     */
    isOnLadder(map) {
        const xTile = Math.floor(this.x);
        const yTile = Math.floor(this.y);
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            return map[yTile][xTile] === 'L';
        }
        return false;
    }
    
    /**
     * Check if there's a ladder below
     */
    isLadderBelow(map) {
        const xTile = Math.floor(this.x);
        const yTile = Math.floor(this.y + 0.6);
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            return map[yTile][xTile] === 'L';
        }
        return false;
    }
    
    /**
     * Check if there's a ladder above
     */
    isLadderAbove(map) {
        const xTile = Math.floor(this.x);
        const yTile = Math.floor(this.y - 0.6);
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            return map[yTile][xTile] === 'L';
        }
        return false;
    }
    
    /**
     * Check collision with blocks
     */
    collidesWithBlock(x, y, map) {
        const left = Math.floor(x - 0.35);
        const right = Math.floor(x + 0.35);
        const top = Math.floor(y - 0.35);
        const bottom = Math.floor(y + 0.35);
        
        for (let row = top; row <= bottom; row++) {
            if (row < 0 || row >= map.length) continue;
            for (let col = left; col <= right; col++) {
                if (col < 0 || col >= map[0].length) continue;
                if (map[row][col] === 'B') return true;
            }
        }
        return false;
    }
    
    /**
     * Check if standing on ground
     */
    checkGround(map) {
        const left = Math.floor(this.x - 0.3);
        const right = Math.floor(this.x + 0.3);
        const feet = Math.floor(this.y + 0.5);
        
        if (feet < 0 || feet >= map.length) return false;
        
        for (let col = left; col <= right; col++) {
            if (col < 0 || col >= map[0].length) continue;
            if (map[feet][col] === 'B') return true;
        }
        return false;
    }
    
    /**
     * Check if standing on broken block
     */
    checkBrokenGround(map) {
        const left = Math.floor(this.x - 0.3);
        const right = Math.floor(this.x + 0.3);
        const feet = Math.floor(this.y + 0.5);
        
        if (feet < 0 || feet >= map.length) return false;
        
        for (let col = left; col <= right; col++) {
            if (col < 0 || col >= map[0].length) continue;
            if (map[feet][col] === 'F') return true;
        }
        return false;
    }
    
    /**
     * Distance to player
     */
    distanceTo(player) {
        return Math.abs(this.x - player.x) + Math.abs(this.y - player.y);
    }
    
    /**
     * Move horizontally towards target
     */
    moveHorizontal(targetX, map) {
        const dx = targetX - this.x;
        if (Math.abs(dx) < 0.1) return;
        
        const step = (dx > 0 ? 1 : -1) * this.speed;
        const newX = this.x + step;
        
        if (!this.collidesWithBlock(newX, this.y, map)) {
            this.x = newX;
            this.lastMoveDir = step > 0 ? 'right' : 'left';
            return true;
        }
        return false;
    }
    
    /**
     * Move vertically on ladder
     */
    moveVertical(targetY, map) {
        const dy = targetY - this.y;
        if (Math.abs(dy) < 0.1) return;
        
        const step = (dy > 0 ? 1 : -1) * this.ladderSpeed;
        const newY = this.y + step;
        const xTile = Math.floor(this.x);
        const yTile = Math.floor(newY);
        
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            const tile = map[yTile][xTile];
            // Can move to ladder, empty space, gold, or exit
            if (tile === 'L' || tile === '0' || tile === 'G' || tile === 'E') {
                this.y = newY;
                return true;
            }
        }
        return false;
    }
    
    /**
     * Simple chase logic - moves towards player using ladders
     */
    simpleChase(player, map) {
        const onLadder = this.isOnLadder(map);
        const playerX = player.x;
        const playerY = player.y;
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        
        // Check if player is above or below
        const playerAbove = playerY < this.y - 0.5;
        const playerBelow = playerY > this.y + 0.5;
        
        // If on ladder, prioritize vertical movement
        if (onLadder) {
            // Climb towards player's Y position
            if (Math.abs(dy) > 0.3) {
                this.moveVertical(playerY, map);
            }
            // Then move horizontally
            if (Math.abs(dx) > 0.2) {
                this.moveHorizontal(playerX, map);
            }
        }
        // If player is above and there's a ladder above, climb up
        else if (playerAbove && this.isLadderAbove(map)) {
            this.moveVertical(playerY, map);
        }
        // If player is below and there's a ladder below, climb down
        else if (playerBelow && this.isLadderBelow(map)) {
            this.moveVertical(playerY, map);
        }
        // Otherwise move horizontally
        else {
            // Move towards player horizontally
            if (Math.abs(dx) > 0.2) {
                this.moveHorizontal(playerX, map);
            }
            
            // If we can't move horizontally, try to find a ladder
            if (Math.abs(dx) > 0.2 && this.x === this.lastX) {
                // Look for ladder to change level
                this.directionChangeTimer++;
                if (this.directionChangeTimer > 30) {
                    // Try moving in opposite direction
                    this.moveHorizontal(this.x - dx, map);
                    this.directionChangeTimer = 0;
                }
            } else {
                this.directionChangeTimer = 0;
            }
        }
        
        this.lastX = this.x;
    }
    
    /**
     * Apply gravity
     */
    applyGravity(map) {
        const onLadder = this.isOnLadder(map);
        
        if (onLadder) {
            this.vy = 0;
            this.onGround = false;
            this.onLadder = true;
            return;
        }
        
        this.onLadder = false;
        const onGround = this.checkGround(map);
        const onBroken = this.checkBrokenGround(map);
        
        if (onGround) {
            const feet = Math.floor(this.y + 0.5);
            this.y = feet - 0.4;
            this.vy = 0;
            this.onGround = true;
            return;
        }
        
        this.onGround = false;
        
        if (onBroken) {
            this.vy += this.gravityBroken;
        } else {
            this.vy += this.gravityNormal;
        }
        
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
        
        const newY = this.y + this.vy;
        
        if (this.vy > 0) {
            const left = Math.floor(this.x - 0.3);
            const right = Math.floor(this.x + 0.3);
            const newFeet = Math.floor(newY + 0.5);
            
            for (let col = left; col <= right; col++) {
                if (newFeet >= 0 && newFeet < map.length && col >= 0 && col < map[0].length) {
                    if (map[newFeet][col] === 'B') {
                        this.y = newFeet - 0.4;
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
     * Idle movement
     */
    idleMove(map) {
        const onLadder = this.isOnLadder(map);
        
        // On ladder, randomly move up/down
        if (onLadder && Math.random() < 0.05) {
            if (Math.random() < 0.5) {
                this.moveVertical(this.y - 0.3, map);
            } else {
                this.moveVertical(this.y + 0.3, map);
            }
        }
        // Random horizontal movement
        else if (Math.random() < 0.02) {
            if (Math.random() < 0.5) {
                if (!this.collidesWithBlock(this.x + 0.05, this.y, map)) {
                    this.x += 0.05;
                    this.lastMoveDir = 'right';
                }
            } else {
                if (!this.collidesWithBlock(this.x - 0.05, this.y, map)) {
                    this.x -= 0.05;
                    this.lastMoveDir = 'left';
                }
            }
        }
    }
    
    /**
     * Check if enemy falls into broken block
     */
    checkBrokenBlockCapture(map, brokenBlocks) {
        if (this.isCaptured || this.isStuck || !this.isAlive) return;
        
        const xTile = Math.floor(this.x);
        const yTile = Math.floor(this.y + 0.5);
        
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            if (map[yTile][xTile] === 'F') {
                const key = `${xTile},${yTile}`;
                const data = brokenBlocks.get(key);
                
                if (data && !data.enemyInside) {
                    let escapeDirection = 'right';
                    
                    if (this.lastMoveDir === 'left') {
                        escapeDirection = 'left';
                    } else if (this.lastMoveDir === 'right') {
                        escapeDirection = 'right';
                    } else if (this.vx < 0) {
                        escapeDirection = 'left';
                    } else if (this.vx > 0) {
                        escapeDirection = 'right';
                    }
                    
                    this.isCaptured = true;
                    this.escapeDirection = escapeDirection;
                    this.capturedBlockKey = key;
                    this.vy = 0;
                    this.vx = 0;
                    this.x = xTile;
                    this.y = yTile;
                    
                    data.enemyInside = this;
                    data.stuckUntil = Date.now() + ENEMY_STUCK_DURATION;
                    data.escapeDirection = escapeDirection;
                }
            }
        }
    }
    
    /**
     * Main update function
     */
    update(map, player, brokenBlocks) {
        if (!this.isAlive) return;
        
        // Handle stuck state
        if (this.isStuck) {
            if (Date.now() >= this.stuckUntil) {
                this.isStuck = false;
                if (this.stuckBlockKey) {
                    const [bx, by] = this.stuckBlockKey.split(',').map(Number);
                    this.x = bx;
                    this.y = by - 1;
                    this.stuckBlockKey = null;
                }
            }
            return;
        }
        
        // Handle captured state
        if (this.isCaptured) return;
        
        // Check for capture in broken block
        this.checkBrokenBlockCapture(map, brokenBlocks);
        if (this.isCaptured) return;
        
        // Chase or idle
        const dist = this.distanceTo(player);
        
        if (dist <= this.chaseRange) {
            this.simpleChase(player, map);
        } else {
            this.idleMove(map);
        }
        
        // Apply gravity
        this.applyGravity(map);
        
        // Boundary clamping
        this.x = Math.max(0.2, Math.min(31.8, this.x));
        this.y = Math.max(0, Math.min(31.8, this.y));
    }
}
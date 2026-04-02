// js/enemy.js - Enemy class with A* pathfinding and gravity
// Enemies now properly follow player on ladders

// ========== ENEMY GRAVITY VARIABLES ==========
const ENEMY_GRAVITY_NORMAL = 0.015;       // Normal falling speed
const ENEMY_GRAVITY_BROKEN = 0.025;       // Falling through broken blocks
const ENEMY_MAX_FALL_SPEED = 0.2;        // Terminal velocity
const ENEMY_SPEED = 0.12;                // Movement speed
const ENEMY_LADDER_SPEED = 0.1;          // Speed when climbing ladders
const ENEMY_SIZE = 0.6;                  // Collision size
const CHASE_RANGE = 20;                  // How far enemy can see player (increased for ladder chasing)
const PATH_UPDATE_DELAY = 8;             // Frames between path updates (more frequent for better ladder tracking)

export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.isStuck = false;
        this.isCaptured = false;
        this.stuckUntil = null;
        this.stuckBlockKey = null;
        this.capturedBlockKey = null;
        this.path = [];
        this.pathTimer = 0;
        this.onGround = false;
        this.onLadder = false;
        this.climbingDirection = 0;
        this.targetLadder = null;
        
        // Gravity settings (can be modified per instance)
        this.gravityNormal = ENEMY_GRAVITY_NORMAL;
        this.gravityBroken = ENEMY_GRAVITY_BROKEN;
        this.maxFallSpeed = ENEMY_MAX_FALL_SPEED;
        this.speed = ENEMY_SPEED;
        this.ladderSpeed = ENEMY_LADDER_SPEED;
        this.chaseRange = CHASE_RANGE;
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
     * Set custom chase range
     */
    setChaseRange(range) {
        this.chaseRange = range;
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
     * Check if player is on a ladder
     */
    isPlayerOnLadder(player, map) {
        const xTile = Math.floor(player.x);
        const yTile = Math.floor(player.y);
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            return map[yTile][xTile] === 'L';
        }
        return false;
    }
    
    /**
     * Find nearest ladder to player or enemy
     */
    findNearestLadder(map, fromX, fromY) {
        let nearest = null;
        let minDist = Infinity;
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x] === 'L') {
                    const dist = Math.abs(x - fromX) + Math.abs(y - fromY);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = { x, y };
                    }
                }
            }
        }
        
        return nearest;
    }
    
    /**
     * Check if position is walkable (not a solid block)
     * Ladders are walkable!
     */
    isWalkable(x, y, map) {
        const xTile = Math.floor(x);
        const yTile = Math.floor(y);
        
        if (yTile < 0 || yTile >= map.length || xTile < 0 || xTile >= map[0].length) {
            return false;
        }
        
        const tile = map[yTile][xTile];
        // Enemy can walk on: empty, ladder, gold, exit
        return tile === '0' || tile === 'L' || tile === 'G' || tile === 'E';
    }
    
    /**
     * Check collision with blocks at given position
     */
    collidesWithBlock(x, y, map) {
        const left = Math.floor(x - 0.3);
        const right = Math.floor(x + 0.3);
        const top = Math.floor(y - 0.3);
        const bottom = Math.floor(y + 0.3);
        
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
     * Manhattan distance to player
     */
    distanceTo(player) {
        return Math.abs(this.x - player.x) + Math.abs(this.y - player.y);
    }
    
    /**
     * Get walkable neighbors for pathfinding
     * Ladders are now considered walkable tiles!
     * Also adds extra weight to ladder tiles to encourage ladder usage
     */
    getNeighbors(tile, map) {
        const neighbors = [];
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        
        for (const [dx, dy] of dirs) {
            const nx = tile.x + dx;
            const ny = tile.y + dy;
            
            if (nx < 0 || nx >= map[0].length || ny < 0 || ny >= map.length) continue;
            
            const tileType = map[ny][nx];
            // Enemy can walk through: empty, ladder, gold, exit
            if (tileType === '0' || tileType === 'L' || tileType === 'G' || tileType === 'E') {
                neighbors.push({ x: nx, y: ny, isLadder: tileType === 'L' });
            }
        }
        
        return neighbors;
    }
    
    /**
     * A* pathfinding algorithm with ladder priority
     */
    findPath(player, map) {
        const start = { x: Math.floor(this.x), y: Math.floor(this.y) };
        const goal = { x: Math.floor(player.x), y: Math.floor(player.y) };
        
        if (start.x === goal.x && start.y === goal.y) return [];
        
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const getKey = (t) => `${t.x},${t.y}`;
        
        gScore.set(getKey(start), 0);
        fScore.set(getKey(start), this.heuristic(start, goal));
        
        while (openSet.length > 0) {
            let current = openSet[0];
            let currentIdx = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                const currKey = getKey(current);
                const nextKey = getKey(openSet[i]);
                if ((fScore.get(nextKey) || Infinity) < (fScore.get(currKey) || Infinity)) {
                    current = openSet[i];
                    currentIdx = i;
                }
            }
            
            if (current.x === goal.x && current.y === goal.y) {
                const path = [];
                let curr = current;
                while (cameFrom.has(getKey(curr))) {
                    path.unshift(curr);
                    curr = cameFrom.get(getKey(curr));
                }
                return path;
            }
            
            openSet.splice(currentIdx, 1);
            closedSet.add(getKey(current));
            
            const neighbors = this.getNeighbors(current, map);
            for (const neighbor of neighbors) {
                const neighborKey = getKey(neighbor);
                if (closedSet.has(neighborKey)) continue;
                
                // Calculate movement cost - ladders have slightly lower cost to encourage their use
                let moveCost = 1;
                if (neighbor.isLadder) moveCost = 0.8;
                
                const tentativeG = (gScore.get(getKey(current)) || Infinity) + moveCost;
                
                if (!openSet.some(t => t.x === neighbor.x && t.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeG >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }
                
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeG);
                fScore.set(neighborKey, tentativeG + this.heuristic(neighbor, goal));
            }
        }
        
        return [];
    }
    
    /**
     * Heuristic for A* (Manhattan distance)
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    /**
     * Move towards target - enhanced ladder climbing
     */
    moveTowards(targetX, targetY, map) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const onLadder = this.isOnLadder(map);
        
        // Determine movement speed (faster on ladders)
        let moveSpeed = this.speed;
        if (onLadder) moveSpeed = this.ladderSpeed;
        
        // Horizontal movement
        if (Math.abs(dx) > 0.05) {
            const step = Math.sign(dx) * moveSpeed;
            const newX = this.x + step;
            if (!this.collidesWithBlock(newX, this.y, map)) {
                this.x = newX;
            }
        }
        
        // Vertical movement - priority on ladders
        if (Math.abs(dy) > 0.05) {
            const step = Math.sign(dy) * moveSpeed;
            const newY = this.y + step;
            const xTile = Math.floor(this.x);
            const yTile = Math.floor(newY);
            
            // Check if we can move vertically
            let canMoveVertically = false;
            
            if (onLadder) {
                // On ladder - can move freely
                canMoveVertically = true;
            } else if (this.isWalkable(this.x, newY, map)) {
                // Not on ladder - check if we're moving onto a ladder or empty space
                if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
                    const targetTile = map[yTile][xTile];
                    if (targetTile === 'L' || targetTile === '0' || targetTile === 'G' || targetTile === 'E') {
                        canMoveVertically = true;
                    }
                }
            }
            
            if (canMoveVertically && yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
                const tile = map[yTile][xTile];
                if (tile !== 'B') {
                    this.y = newY;
                }
            }
        }
    }
    
    /**
     * Apply gravity - ladders disable gravity
     */
    applyGravity(map) {
        const onLadder = this.isOnLadder(map);
        
        // No gravity when on ladder
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
        
        // Apply gravity based on ground type
        if (onBroken) {
            this.vy += this.gravityBroken;
        } else {
            this.vy += this.gravityNormal;
        }
        
        // Apply terminal velocity limit
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
        
        const newY = this.y + this.vy;
        
        // Check landing
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
     * Direct ladder chasing - when player is on ladder, go directly to them
     */
    chaseOnLadder(player, map) {
        if (!this.isPlayerOnLadder(player, map)) return false;
        
        // Player is on ladder - move directly towards their position
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        
        // Prioritize vertical movement to get to the ladder
        if (Math.abs(dy) > 0.1) {
            const step = Math.sign(dy) * this.ladderSpeed;
            const newY = this.y + step;
            const xTile = Math.floor(this.x);
            const yTile = Math.floor(newY);
            
            if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
                const tile = map[yTile][xTile];
                if (tile !== 'B') {
                    this.y = newY;
                }
            }
        }
        
        // Move horizontally to align with player
        if (Math.abs(dx) > 0.1) {
            const step = Math.sign(dx) * this.speed;
            const newX = this.x + step;
            if (!this.collidesWithBlock(newX, this.y, map)) {
                this.x = newX;
            }
        }
        
        return true;
    }
    
    /**
     * Idle movement when player is far
     */
    idleMove(map) {
        if (Math.random() < 0.02) {
            const dir = Math.floor(Math.random() * 4);
            switch(dir) {
                case 0: 
                    if (!this.collidesWithBlock(this.x + 0.05, this.y, map)) this.x += 0.05;
                    break;
                case 1: 
                    if (!this.collidesWithBlock(this.x - 0.05, this.y, map)) this.x -= 0.05;
                    break;
                case 2: 
                    const newYUp = this.y - 0.05;
                    const xTileUp = Math.floor(this.x);
                    const yTileUp = Math.floor(newYUp);
                    if (yTileUp >= 0 && map[yTileUp][xTileUp] !== 'B') this.y = newYUp;
                    break;
                case 3: 
                    const newYDown = this.y + 0.05;
                    const xTileDown = Math.floor(this.x);
                    const yTileDown = Math.floor(newYDown);
                    if (yTileDown < map.length && map[yTileDown][xTileDown] !== 'B') this.y = newYDown;
                    break;
            }
        }
    }
    
    /**
     * Check if enemy falls into broken block
     */
    checkBrokenBlockCapture(map, brokenBlocks) {
        if (this.isCaptured || this.isStuck) return;
        
        const xTile = Math.floor(this.x);
        const yTile = Math.floor(this.y + 0.5);
        
        if (yTile >= 0 && yTile < map.length && xTile >= 0 && xTile < map[0].length) {
            if (map[yTile][xTile] === 'F') {
                const key = `${xTile},${yTile}`;
                const data = brokenBlocks.get(key);
                
                if (data && !data.enemyCaptured) {
                    this.isCaptured = true;
                    this.capturedBlockKey = key;
                    this.vy = 0;
                    this.vx = 0;
                    this.x = xTile;
                    this.y = yTile;
                    data.enemyCaptured = this;
                }
            }
        }
    }
    
    /**
     * Main update function - enhanced ladder following
     */
    update(map, player, brokenBlocks) {
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
        if (this.isCaptured) {
            return;
        }
        
        // Check if falls into broken block
        this.checkBrokenBlockCapture(map, brokenBlocks);
        if (this.isCaptured) return;
        
        const dist = this.distanceTo(player);
        const playerOnLadder = this.isPlayerOnLadder(player, map);
        
        // Special ladder chasing behavior when player is on ladder
        if (playerOnLadder || (dist <= this.chaseRange && this.isOnLadder(map))) {
            // Try direct ladder chasing first
            if (this.chaseOnLadder(player, map)) {
                // Successfully chasing on ladder
            } else {
                // Regular pathfinding
                this.pathTimer++;
                if (this.pathTimer >= PATH_UPDATE_DELAY || this.path.length === 0) {
                    this.pathTimer = 0;
                    this.path = this.findPath(player, map);
                }
                
                if (this.path.length > 0) {
                    const target = this.path[0];
                    this.moveTowards(target.x + 0.5, target.y + 0.5, map);
                    
                    if (Math.abs(this.x - (target.x + 0.5)) < 0.2 &&
                        Math.abs(this.y - (target.y + 0.5)) < 0.2) {
                        this.path.shift();
                    }
                } else if (dist <= this.chaseRange) {
                    // Fallback: move directly towards player
                    this.moveTowards(player.x, player.y, map);
                }
            }
        } else if (dist <= this.chaseRange) {
            // Player not on ladder - use pathfinding
            this.pathTimer++;
            if (this.pathTimer >= PATH_UPDATE_DELAY || this.path.length === 0) {
                this.pathTimer = 0;
                this.path = this.findPath(player, map);
            }
            
            if (this.path.length > 0) {
                const target = this.path[0];
                this.moveTowards(target.x + 0.5, target.y + 0.5, map);
                
                if (Math.abs(this.x - (target.x + 0.5)) < 0.2 &&
                    Math.abs(this.y - (target.y + 0.5)) < 0.2) {
                    this.path.shift();
                }
            } else {
                this.moveTowards(player.x, player.y, map);
            }
        } else {
            // Idle movement
            this.idleMove(map);
        }
        
        // Apply gravity
        this.applyGravity(map);
        
        // Boundary clamping
        this.x = Math.max(0.2, Math.min(31.8, this.x));
        this.y = Math.max(0, Math.min(31.8, this.y));
    }
}
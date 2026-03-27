// js/enemy.js - Enemy class with A* pathfinding and capture mechanics

export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0.9;
        this.isStuck = false;
        this.isCaptured = false;
        this.stuckUntil = null;
        this.stuckBlockKey = null;
        this.capturedBlockKey = null;
        this.lastMoveDir = 'right';
        this.pathIndex = 0;
        this.currentPath = [];
        this.pathUpdateCounter = 0;
        
        // CHASE RANGE VARIABLE - Distance at which enemy starts chasing player
        // Measured in Manhattan distance (tiles)
        this.chaseRange = 10000;  // Enemies will chase player when within 15 tiles
        // Set to a high number (like 50) for always chase
        // Set to a low number (like 3) for close-range chase only
    }
    
    /**
     * Calculates Manhattan distance to player
     * @param {Object} player - Player object
     * @returns {number} Manhattan distance in tiles
     */
    getDistanceToPlayer(player) {
        return Math.abs(this.x - player.x) + Math.abs(this.y - player.y);
    }
    
    /**
     * A* pathfinding algorithm to find the shortest path to the player
     * @param {Array} map - Game map matrix
     * @param {Object} target - Player object with x,y coordinates
     * @returns {Array} Path array of {x,y} nodes
     */
    findPath(map, target) {
        // Can't move if captured or stuck
        if (this.isCaptured || this.isStuck) return [];
        
        const start = { x: Math.floor(this.x), y: Math.floor(this.y) };
        const goal = { x: Math.floor(target.x), y: Math.floor(target.y) };
        
        // If already at target, no path needed
        if (start.x === goal.x && start.y === goal.y) return [];
        
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const getKey = (node) => `${node.x},${node.y}`;
        
        gScore.set(getKey(start), 0);
        fScore.set(getKey(start), this.heuristic(start, goal));
        
        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet.reduce((a, b) => 
                (fScore.get(getKey(a)) || Infinity) < (fScore.get(getKey(b)) || Infinity) ? a : b
            );
            
            // Reached goal
            if (current.x === goal.x && current.y === goal.y) {
                let path = [];
                let cur = current;
                while (cameFrom.has(getKey(cur))) {
                    path.push(cur);
                    cur = cameFrom.get(getKey(cur));
                }
                return path.reverse();
            }
            
            // Move current from openSet to closedSet
            const currentIndex = openSet.indexOf(current);
            openSet.splice(currentIndex, 1);
            closedSet.add(getKey(current));
            
            // Check all neighbors
            const neighbors = this.getNeighbors(current, map);
            for (let neighbor of neighbors) {
                const neighborKey = getKey(neighbor);
                
                // Skip if already evaluated
                if (closedSet.has(neighborKey)) continue;
                
                // Calculate tentative gScore
                const tentativeGScore = (gScore.get(getKey(current)) || Infinity) + 1;
                
                if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }
                
                // This path is the best so far
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
            }
        }
        
        // No path found
        return [];
    }
    
    /**
     * Manhattan distance heuristic for A*
     * @param {Object} a - First node
     * @param {Object} b - Second node
     * @returns {number} Manhattan distance
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    /**
     * Gets valid neighboring tiles for pathfinding
     * Valid tiles: empty (0), ladder (L), gold (G), exit (E)
     * @param {Object} node - Current node
     * @param {Array} map - Game map matrix
     * @returns {Array} Array of valid neighbor nodes
     */
    getNeighbors(node, map) {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const neighbors = [];
        
        for (let [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            
            if (nx >= 0 && nx < 32 && ny >= 0 && ny < 32) {
                const tile = map[ny][nx];
                // Enemy can move on empty spaces, ladders, gold, and exit
                if (tile === '0' || tile === 'L' || tile === 'G' || tile === 'E') {
                    neighbors.push({ x: nx, y: ny });
                }
            }
        }
        return neighbors;
    }
    
    /**
     * Updates enemy position using A* pathfinding to chase the player
     * Only chases when player is within chaseRange distance
     * @param {Array} map - Game map matrix
     * @param {Object} player - Player object
     * @param {Map} brokenBlocks - Map of broken block data
     */
    update(map, player, brokenBlocks) {
        // Handle stuck state (from falling into broken block)
        if (this.isStuck) {
            if (Date.now() >= this.stuckUntil) {
                this.isStuck = false;
                if (this.stuckBlockKey) {
                    const [bx, by] = this.stuckBlockKey.split(',').map(Number);
                    const brokenData = brokenBlocks.get(this.stuckBlockKey);
                    const direction = brokenData ? brokenData.stuckEnemyDirection : 'right';
                    this.x = direction === 'right' ? bx + 1 : bx - 1;
                    this.y = by - 1;
                    this.stuckBlockKey = null;
                }
            }
            return;
        }
        
        // If captured, don't move
        if (this.isCaptured) {
            return;
        }
        
        // Calculate distance to player
        const distanceToPlayer = this.getDistanceToPlayer(player);
        
        // Only chase if player is within chase range
        if (distanceToPlayer <= this.chaseRange) {
            // Update path every 10 frames for performance
            this.pathUpdateCounter++;
            if (this.pathUpdateCounter >= 10 || this.currentPath.length === 0) {
                this.pathUpdateCounter = 0;
                this.currentPath = this.findPath(map, player);
            }
            
            // Follow the path if one exists
            if (this.currentPath.length > 0) {
                const next = this.currentPath[0];
                const dx = next.x - this.x;
                const dy = next.y - this.y;
                
                // Move towards the next node
                if (Math.abs(dx) > 0.05) {
                    if (dx > 0) {
                        this.x += this.speed / 10;
                        this.lastMoveDir = 'right';
                    } else {
                        this.x -= this.speed / 10;
                        this.lastMoveDir = 'left';
                    }
                }
                
                if (Math.abs(dy) > 0.05) {
                    if (dy > 0) {
                        this.y += this.speed / 10;
                    } else {
                        this.y -= this.speed / 10;
                    }
                }
                
                // Check if we've reached the current target node
                if (Math.abs(this.x - next.x) < 0.2 && Math.abs(this.y - next.y) < 0.2) {
                    this.currentPath.shift();
                }
            } else {
                // No path found - try to move in the direction of the player
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0) {
                        this.x += this.speed / 10;
                        this.lastMoveDir = 'right';
                    } else {
                        this.x -= this.speed / 10;
                        this.lastMoveDir = 'left';
                    }
                } else {
                    if (dy > 0) {
                        this.y += this.speed / 10;
                    } else {
                        this.y -= this.speed / 10;
                    }
                }
            }
        } else {
            // Player is out of chase range - enemy patrols or stays idle
            // Simple random movement when not chasing
            if (Math.random() < 0.02) {
                const randomDir = Math.floor(Math.random() * 4);
                switch(randomDir) {
                    case 0: this.x += 0.2; this.lastMoveDir = 'right'; break;
                    case 1: this.x -= 0.2; this.lastMoveDir = 'left'; break;
                    case 2: this.y += 0.2; break;
                    case 3: this.y -= 0.2; break;
                }
            }
        }
        
        // Apply gravity
        const bx = Math.floor(this.x);
        const by = Math.floor(this.y + 0.2);
        let onGround = false;
        
        if (by >= 0 && by < 32 && bx >= 0 && bx < 32) {
            const tileBelow = map[by][bx];
            if (tileBelow === 'B') {
                onGround = true;
                this.vy = 0;
                this.y = Math.floor(this.y);
            } else if (tileBelow === 'F') {
                // Enemy falls through broken block
                onGround = false;
                this.vy += 0.2;
                this.y += this.vy;
            }
        }
        
        if (!onGround) {
            this.vy += 0.09;
            this.y += this.vy;
        } else {
            this.vy = 0;
        }
        
        // Boundary checks
        this.x = Math.max(0.2, Math.min(31.8, this.x));
        this.y = Math.max(0, Math.min(31.8, this.y));
    }
}
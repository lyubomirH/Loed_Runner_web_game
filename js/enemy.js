// js/enemy.js - Enemy class with A* pathfinding and stuck mechanics

export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = 1.2;
        this.isStuck = false;
        this.stuckUntil = null;
        this.stuckBlockKey = null;
        this.lastMoveDir = 'right';
        this.fallThroughTimer = 0;
    }
    
    findPath(map, target) {
        const start = { x: Math.floor(this.x), y: Math.floor(this.y) };
        const goal = { x: Math.floor(target.x), y: Math.floor(target.y) };
        if ((start.x === goal.x && start.y === goal.y) || this.isStuck) return [];
        
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        const key = (n) => `${n.x},${n.y}`;
        gScore.set(key(start), 0);
        fScore.set(key(start), this.heuristic(start, goal));
        
        while (openSet.length > 0) {
            let current = openSet.reduce((a, b) => 
                (fScore.get(key(a)) || Infinity) < (fScore.get(key(b)) || Infinity) ? a : b);
            
            if (current.x === goal.x && current.y === goal.y) {
                let path = [], cur = current;
                while (cameFrom.has(key(cur))) {
                    path.push(cur);
                    cur = cameFrom.get(key(cur));
                }
                return path.reverse();
            }
            
            openSet.splice(openSet.indexOf(current), 1);
            const neighbors = this.getNeighbors(current, map);
            for (let neighbor of neighbors) {
                const tentativeG = (gScore.get(key(current)) || Infinity) + 1;
                if (tentativeG < (gScore.get(key(neighbor)) || Infinity)) {
                    cameFrom.set(key(neighbor), current);
                    gScore.set(key(neighbor), tentativeG);
                    fScore.set(key(neighbor), tentativeG + this.heuristic(neighbor, goal));
                    if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        return [];
    }
    
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    getNeighbors(node, map) {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const neighbors = [];
        for (let [dx, dy] of dirs) {
            const nx = node.x + dx, ny = node.y + dy;
            if (nx >= 0 && nx < 32 && ny >= 0 && ny < 32) {
                const tile = map[ny][nx];
                if (tile === '0' || tile === 'L' || tile === 'G' || tile === 'F' || tile === 'E') {
                    neighbors.push({ x: nx, y: ny });
                }
            }
        }
        return neighbors;
    }
    
    update(map, player, brokenBlocks) {
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
        
        const path = this.findPath(map, player);
        if (path.length > 0) {
            const next = path[0];
            if (next.x > this.x) {
                this.x += this.speed / 10;
                this.lastMoveDir = 'right';
            } else if (next.x < this.x) {
                this.x -= this.speed / 10;
                this.lastMoveDir = 'left';
            }
            if (next.y > this.y) this.y += this.speed / 10;
            if (next.y < this.y) this.y -= this.speed / 10;
        }
        
        // Apply gravity and check for falling through broken blocks
        const bx = Math.floor(this.x);
        const by = Math.floor(this.y + 0.2);
        let tileBelow = null;
        let onGround = false;
        
        if (by >= 0 && by < 32 && bx >= 0 && bx < 32) {
            tileBelow = map[by][bx];
            if (tileBelow === 'B') {
                onGround = true;
                this.vy = 0;
                this.y = Math.floor(this.y);
            } else if (tileBelow === 'F') {
                // Enemy falls through broken block
                onGround = false;
                this.vy += 0.25;
                this.y += this.vy;
            } else {
                onGround = false;
            }
        }
        
        if (!onGround && tileBelow !== 'B') {
            this.vy += 0.15;
            this.y += this.vy;
        } else if (tileBelow === 'B') {
            this.vy = 0;
        }
        
        this.x = Math.max(0.2, Math.min(31.8, this.x));
        this.y = Math.max(0, Math.min(31.8, this.y));
    }
}
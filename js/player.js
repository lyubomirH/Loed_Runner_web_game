// js/player.js - Player class with movement and physics

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
        this.speed = 0.3;
    }
    
    update(onLadder, map) {
        // Horizontal movement
        this.vx = 0;
        if (this.moveLeft) {
            this.vx = -this.speed;
        }
        if (this.moveRight) {
            this.vx = this.speed;
        }
        
        // Check horizontal collision before moving
        let newX = this.x + this.vx;
        const playerWidth = 0.6; // Player hitbox width
        const leftEdge = newX - playerWidth/2;
        const rightEdge = newX + playerWidth/2;
        
        // Check left and right collision with blocks
        const tileX = Math.floor(newX);
        const playerY = Math.floor(this.y);
        
        // Check collision with blocks on left side
        if (this.vx < 0) { // Moving left
            const leftTileX = Math.floor(leftEdge);
            if (leftTileX >= 0 && leftTileX < 32 && playerY >= 0 && playerY < 32) {
                const leftTile = map[playerY][leftTileX];
                if (leftTile === 'B' || leftTile === 'F') {
                    // Stop movement if hitting block from left side
                    newX = leftTileX + playerWidth/2 + 0.05;
                    this.vx = 0;
                }
            }
        }
        
        // Check collision with blocks on right side
        if (this.vx > 0) { // Moving right
            const rightTileX = Math.floor(rightEdge);
            if (rightTileX >= 0 && rightTileX < 32 && playerY >= 0 && playerY < 32) {
                const rightTile = map[playerY][rightTileX];
                if (rightTile === 'B' || rightTile === 'F') {
                    // Stop movement if hitting block from right side
                    newX = rightTileX - playerWidth/2 - 0.05;
                    this.vx = 0;
                }
            }
        }
        
        this.x = newX;
        
        // Vertical movement on ladders
        if (onLadder) {
            let newY = this.y;
            if (this.moveUp) {
                newY -= this.speed;
            }
            if (this.moveDown) {
                newY += this.speed;
            }
            
            // Check vertical collision with blocks when on ladder
            const playerX = Math.floor(this.x);
            const topEdge = Math.floor(newY);
            const bottomEdge = Math.floor(newY + 0.6);
            
            if (this.moveUp && topEdge >= 0 && topEdge < 32 && playerX >= 0 && playerX < 32) {
                const topTile = map[topEdge][playerX];
                if (topTile === 'B') {
                    newY = topEdge + 0.6;
                    this.moveUp = false;
                }
            }
            
            if (this.moveDown && bottomEdge >= 0 && bottomEdge < 32 && playerX >= 0 && playerX < 32) {
                const bottomTile = map[bottomEdge][playerX];
                if (bottomTile === 'B') {
                    newY = bottomEdge - 0.6;
                    this.moveDown = false;
                }
            }
            
            this.y = newY;
        }
    }
}
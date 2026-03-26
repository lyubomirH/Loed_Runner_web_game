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
        this.speed = 0.1; // Reduced from 0.8 to 0.1 for slower movement
    }
    
    update(onLadder) {
        // Horizontal movement
        this.vx = 0;
        if (this.moveLeft) {
            this.vx = -this.speed;
        }
        if (this.moveRight) {
            this.vx = this.speed;
        }
        this.x += this.vx;
        
        // Vertical movement on ladders
        if (onLadder) {
            if (this.moveUp) {
                this.y -= this.speed;
            }
            if (this.moveDown) {
                this.y += this.speed;
            }
        }
    }
}
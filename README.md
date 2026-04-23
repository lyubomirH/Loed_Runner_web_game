================================================================================
                        LODE RUNNER NES - HOW TO PLAY
================================================================================

                            A Complete Guide

================================================================================
                              WHAT IS LODE RUNNER?
================================================================================

Lode Runner is a puzzle-platformer game where you control a runner who must 
collect all the gold nuggets scattered throughout a level while avoiding 
patrolling enemies.

You can dig holes in the ground to trap enemies or create paths to reach 
hard-to-access gold. The game ends when you either collect all gold and reach 
the exit, or get caught by an enemy.

================================================================================
                              HOW TO PLAY
================================================================================

STEP 1: START THE GAME
------------------------
When you open Index.html, you'll see a 32x32 grid map. Your character (blue 
square) starts at the S position. Enemies (red circles) patrol the map.

STEP 2: MOVE YOUR CHARACTER
------------------------
Use the WASD keys:
    W = Move UP / Climb Ladder
    A = Move LEFT
    S = Move DOWN / Climb Ladder
    D = Move RIGHT

You can only move left and right on solid ground. To go up or down, you MUST 
stand on a ladder (brown vertical bars).

STEP 3: COLLECT GOLD
------------------------
Gold nuggets appear as yellow circles on the map. Walk over them to collect 
them. Each gold piece gives you 100 points. Your score updates in real-time.

STEP 4: DIG HOLES
------------------------
Press O to dig a hole to your LEFT and down
Press P to dig a hole to your RIGHT and down

Example: If you're standing on ground and press O, you'll dig a hole one 
block left and one block down from your position.

WHAT HAPPENS WHEN YOU DIG:
    - A solid block (B) turns into a broken block (F)
    - The broken block will regenerate back to solid after 6 seconds
    - Any enemy standing on that block will fall in and get trapped
    - You can also fall through broken blocks

STEP 5: TRAP ENEMIES
------------------------
When an enemy falls into a broken block (F):
    - They get stuck for 5 seconds
    - You can see a timer counting down on the broken block
    - A green arrow shows which direction they will escape (← or →)
    - After 5 seconds, they escape either left or right

This is your main way to temporarily remove enemies from chasing you!

STEP 6: USE LADDERS
------------------------
Ladders appear as brown vertical bars (L on the map). To use a ladder:
    - Walk onto the ladder from the left or right
    - Press W to climb UP
    - Press S to climb DOWN

You cannot climb down from a ladder if there's no ladder tile below you.

STEP 7: REACH THE EXIT
------------------------
The exit is a green door (E on the map). It only works if you have collected 
ALL the gold on the level. When you have all gold, walk onto the exit to win!

STEP 8: SAVE YOUR SCORE
------------------------
When you win, your score is automatically saved to the high scores list.
Click the "SCORES" button to see the top 10 scores.

================================================================================
                              HOW THE GAME WORKS
================================================================================

1. THE MAP SYSTEM
------------------------
The game uses a 32x32 grid. Each cell contains a single character:

    CHAR | MEANING | WHAT IT DOES
    -----|---------|----------------------------------------------
    0    | Empty   | You and enemies can walk here
    B    | Block   | Solid wall - you CANNOT walk through
    L    | Ladder  | Allows vertical movement (climbing)
    G    | Gold    | Collectible - gives 100 points
    S    | Start   | Where the player begins
    E    | Exit    | Level end - only works with all gold
    F    | Broken  | Temporary hole - regenerates in 6 seconds
    M    | Enemy   | Enemy spawn point (one enemy per M)
    R    | Respawn | Where enemies reappear after death

2. PLAYER MOVEMENT
------------------------
The player has different behaviors depending on what they're standing on:

    ON GROUND (empty tile):
        - Can move LEFT and RIGHT
        - Gravity pulls them DOWN
        - Cannot change direction while falling
        - Falls through broken blocks (F) faster

    ON LADDER:
        - Can move UP and DOWN
        - No gravity effect
        - Can also move LEFT and RIGHT off the ladder

    FALLING:
        - Cannot control horizontal movement
        - Falls at slow speed (0.12 gravity)
        - Max fall speed is 2.5 tiles per second

3. ENEMY AI (ARTIFICIAL INTELLIGENCE)
------------------------
Enemies have multiple states and behaviors:

    PATROL MODE:
        When player is far away (more than 20 tiles)
        Walks left and right like a guard
        Changes direction every 90 frames
        On ladders, moves up and down randomly

    CHASE MODE:
        When player is close (20 tiles or less)
        Uses A* PATHFINDING to find the shortest route
        Considers ladders as valid paths
        Updates path every 4 frames for responsive chasing

    TRAPPED MODE:
        When enemy falls into a broken block (F)
        Stuck for 5 seconds
        Timer shows on the block
        Escapes left or right based on last movement direction

    RESPAWN MODE:
        After escaping or dying
        Waits 3 seconds
        Appears at nearest R (respawn point)
        Respawns with full health

4. A* PATHFINDING EXPLAINED
------------------------
Enemies use A* (A-Star) pathfinding to chase you. Here's how it works:

    STEP 1: Enemy looks at current position (start)
    STEP 2: Enemy looks at player position (goal)
    STEP 3: Enemy checks all 4 directions (up, down, left, right)
    STEP 4: Each tile gets a score = distance traveled + estimated distance to player
    STEP 5: Enemy follows the path with lowest score
    STEP 6: Recalculates every 4 frames to adapt to your movement

    LADDERS IN PATHFINDING:
        - Ladder tiles are considered walkable
        - Moving onto a ladder costs less (0.5 vs 1.0)
        - This makes enemies PREFER using ladders
        - Enemies can path from ladder to empty space above/below

5. DIGGING MECHANICS
------------------------
When you dig a hole, this happens:

    TIME 0 SECONDS:
        - Block B changes to broken block F
        - Enemy on top falls in
        - Enemy becomes trapped (5 second timer starts)

    TIME 1-5 SECONDS:
        - Block shows timer (⏱️5s, ⏱️4s, etc.)
        - Enemy trapped inside
        - Block shows escape direction arrow (← or →)

    TIME 5 SECONDS:
        - Enemy escapes in arrow direction
        - Enemy resumes chasing you
        - Block stays broken

    TIME 6 SECONDS:
        - Block regenerates back to B
        - If enemy still inside, they get CRUSHED
        - Crushed enemy respawns at nearest R after 3 seconds

6. COLLISION DETECTION
------------------------
The game constantly checks for collisions:

    PLAYER vs BLOCKS:
        - Cannot move through solid blocks
        - Gets pushed out if inside a block
        - Game over if crushed by regenerating block

    PLAYER vs ENEMIES:
        - If within 0.7 tiles, GAME OVER
        - Trigger death sound
        - Save score if any

    PLAYER vs GOLD:
        - Collect when walking over
        - Add 100 points
        - Remove from map

    PLAYER vs EXIT:
        - Only activates when ALL gold collected
        - Play victory sound
        - Save score to leaderboard

7. GAME LOOP (60 FPS)
------------------------
Every frame (about 60 times per second):

    1. Update BROKEN BLOCKS (check timers)
    2. Update ENEMY RESPAWNS (check if time to respawn)
    3. Update PLAYER (movement, gravity, collisions)
    4. Update ENEMIES (patrol or chase)
    5. Check COLLISIONS (player vs enemy, player vs block)
    6. RENDER GRAPHICS (draw everything on screen)
    7. Repeat

================================================================================
                              GAME TIMERS SUMMARY
================================================================================

    ACTION                          | DURATION
    ---------------------------------|----------
    Block stays broken              | 6 seconds
    Enemy trapped in broken block   | 5 seconds
    Enemy respawn delay             | 3 seconds
    Pathfinding update interval     | 4 frames (~0.07 seconds)
    Enemy direction change (patrol) | 90 frames (~1.5 seconds)
    Ladder direction change (patrol)| 60 frames (~1 second)

================================================================================
                              SCORING SYSTEM
================================================================================

    ACTION                    | SCORE
    --------------------------|----------
    Collect 1 gold            | 100 points
    Complete level            | Score saved (no bonus)
    High score entry          | Top 10 saved automatically

    Scores are stored in your browser's localStorage and persist 
    even after closing the browser.

================================================================================
                              TIPS FOR WINNING
================================================================================

1. USE LADDERS WISELY
   Enemies climb ladders slowly. You can climb up and then jump off to
   escape. Enemies will follow you up ladders, so be ready to run!

2. TRAP MULTIPLE ENEMIES
   If several enemies are chasing you, dig a hole and wait for them
   to all fall in. One hole can trap multiple enemies!

3. PLAN YOUR ROUTE
   Look at the map before moving. Some gold requires climbing ladders
   and walking across narrow platforms.

4. WATCH THE TIMERS
   Broken blocks show countdown timers. Don't stand where a block will
   regenerate, or you'll get crushed!

5. LEARN ESCAPE DIRECTIONS
   When an enemy is trapped, a green arrow shows where they'll escape.
   Stand on the opposite side to avoid them!

6. COLLECT GOLD IN ORDER
   Try to collect gold from the bottom up. This way, if you fall,
   you won't miss any gold above you.

7. USE BROKEN BLOCKS AS SHORTCUTS
   You can fall through broken blocks to reach lower levels faster.
   This is useful for escaping enemies!

================================================================================
                              COMMON SITUATIONS
================================================================================

SITUATION: Enemy is chasing me and I'm on the ground
SOLUTION:   Run to the nearest ladder and climb up. Enemies take time
            to climb, giving you a head start.

SITUATION: Enemy is above me on a ladder
SOLUTION:   Don't climb up! Find another ladder or dig a hole below
            where they'll land.

SITUATION: I'm trapped between two enemies
SOLUTION:   Dig a hole immediately. The enemies will fall in, giving
            you 5 seconds to escape.

SITUATION: Block regenerated and crushed me
SOLUTION:   Always check timers on broken blocks. Never stand on
            a broken block when its timer reaches 0.

SITUATION: I have all gold but can't find the exit
SOLUTION:   Look for a green square (E) on the map. It's usually
            at the bottom or top of the level.

================================================================================
                              TECHNICAL DETAILS
================================================================================

GRID SIZE:        32 x 32 tiles
TILE SIZE:        25 x 25 pixels
CANVAS SIZE:      800 x 800 pixels
GRAVITY NORMAL:   0.12 (slow falling)
GRAVITY BROKEN:   0.18 (faster through broken blocks)
MAX FALL SPEED:   2.5 tiles per second
PLAYER SPEED:     0.22 tiles per frame
ENEMY SPEED:      0.12 tiles per frame
LADDER SPEED:     0.14 tiles per frame

================================================================================
                              QUICK REFERENCE CARD
================================================================================

    CONTROLS:
    ┌─────────────────────────────────────────┐
    │  W = Up / Climb    │  O = Dig Left Hole │
    │  A = Left          │  P = Dig Right Hole│
    │  S = Down / Climb  │                    │
    │  D = Right         │                    │
    └─────────────────────────────────────────┘

    MAP SYMBOLS:
    ┌─────────────────────────────────────────────────┐
    │  0 = Empty    │  L = Ladder   │  M = Enemy      │
    │  B = Block    │  G = Gold     │  R = Respawn    │
    │  F = Broken   │  S = Start    │  E = Exit       │
    └─────────────────────────────────────────────────┘

    TIMERS:
    ┌─────────────────────────────────────────┐
    │  Block broken = 6 seconds               │
    │  Enemy trapped = 5 seconds              │
    │  Enemy respawn = 3 seconds              │
    └─────────────────────────────────────────┘

================================================================================
                                  GOOD LUCK!
================================================================================

    Remember: Collect all gold, avoid enemies, use ladders wisely,
    and dig holes strategically to trap your pursuers!

    The more you play, the better you'll understand enemy patterns
    and level layouts.

    HAVE FUN AND HAPPY RUNNING!

    🏆🎮💰

================================================================================
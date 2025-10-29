/*
 * js/main.js
 * This file controls the exploration map (index.html).
 * It handles player movement, the maze, and collision with
 * enemies to *start* a battle.
 */

// --- CONSTANTS ---
const TILE_SIZE = 40; // <-- 1. INCREASED PATH WIDTH
const PLAYER_SPEED = 180;
const ENEMY_SPEED = 70;

// --- MAP DATA ---
// W = Wall, . = Path, P = Player Start, E = Enemy Spawn
const LEVEL_1_MAP = [
    "WWWWWWWWWWWWWWWWW",
    "WP..........E...W",
    "W.WWWWW.WWWWW.W.W",
    "W.....W...W...W.W",
    "W.WWW.W.W.W.WWW.W",
    "W.W.E.W.W.W.W...W",
    "W.W...W.W.W.W.W.W",
    "W.W.WWWWW.W.W.W.W",
    "W.W.........W.E.W",
    "W.WWWWWWWWWWWWW.W",
    "W...............W",
    "WWWWWWWWWWWWWWWWW",
];

//==================================================================
//  PLAYER CLASS (Exploration)
//==================================================================
class Player extends Phaser.GameObjects.Container {
    
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setCollideWorldBounds(true);
        this.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        
        this.moveSpeed = PLAYER_SPEED;
        this.health = 100; // 2. Added health property

        // --- Draw visual graphic (Purple rectangle) ---
        const graphics = scene.add.graphics();
        graphics.fillStyle(0x8A2BE2, 1); // Purple
        graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        this.add(graphics);
        
        const text = scene.add.text(0, 0, 'P', { fontSize: '24px', fill: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5);
        this.add(text); // Attach text

        // Initialize keyboard controls
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('W,A,S,D');
    }

    update() {
        this.handleInput();
    }

    handleInput() {
        this.body.setVelocity(0, 0);

        if (this.keys.W.isDown || this.cursors.up.isDown) {
            this.body.setVelocityY(-this.moveSpeed);
        } else if (this.keys.S.isDown || this.cursors.down.isDown) {
            this.body.setVelocityY(this.moveSpeed);
        }

        if (this.keys.A.isDown || this.cursors.left.isDown) {
            this.body.setVelocityX(-this.moveSpeed);
        } else if (this.keys.D.isDown || this.cursors.right.isDown) {
            this.body.setVelocityX(this.moveSpeed);
        }

        this.body.velocity.normalize().scale(this.moveSpeed);
    }
}

//==================================================================
//  ENEMY CLASS (Exploration)
//==================================================================
class Enemy extends Phaser.GameObjects.Container {

    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setSize(TILE_SIZE, TILE_SIZE);
        this.body.setCollideWorldBounds(true);
        this.speed = ENEMY_SPEED;
        this.id = Phaser.Math.RND.uuid(); // 3. Give each enemy a unique ID
        
        // --- Draw visual graphic (Red rectangle) ---
        const graphics = scene.add.graphics();
        graphics.fillStyle(0xFF0000, 1); // Red
        graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        this.add(graphics);
    }

    update() {
        if (!this.scene.player) {
            this.body.setVelocity(0, 0);
            return;
        }
        // Simple AI: Move towards the player
        this.scene.physics.moveToObject(this, this.scene.player, this.speed);
    }
}

//==================================================================
//  TILEMAP MANAGER CLASS (OOP)
//==================================================================
class TilemapManager {
    constructor(scene, mapData) {
        this.scene = scene;
        this.mapData = mapData;
        this.tileSize = TILE_SIZE;

        this.walls = scene.physics.add.staticGroup();
        
        this.playerStartPosition = this.generateMap();
        this.enemySpawns = this.getEnemySpawns();
    }

    generateMap() {
        let playerStart = { x: 100, y: 100 };
        
        for (let r = 0; r < this.mapData.length; r++) {
            const row = this.mapData[r];
            for (let c = 0; c < row.length; c++) {
                const char = row[c];
                const x = c * this.tileSize + this.tileSize / 2;
                const y = r * this.tileSize + this.tileSize / 2;

                if (char === 'W') {
                    const wall = this.walls.create(x, y, null);
                    wall.setSize(this.tileSize, this.tileSize).setOffset(0,0);
                    
                    const graphics = this.scene.add.graphics({ x: x - this.tileSize / 2, y: y - this.tileSize / 2 });
                    graphics.fillStyle(0x444444, 1); // Dark grey
                    graphics.fillRect(0, 0, this.tileSize, this.tileSize);

                } else if (char === 'P') {
                    playerStart = { x, y };
                }
            }
        }
        return playerStart;
    }

    getEnemySpawns() {
        const spawns = [];
        for (let r = 0; r < this.mapData.length; r++) {
            const row = this.mapData[r];
            for (let c = 0; c < row.length; c++) {
                const char = row[c];
                if (char === 'E') {
                    const x = c * this.tileSize + this.tileSize / 2;
                    const y = r * this.tileSize + this.tileSize / 2;
                    spawns.push({ x, y });
                }
            }
        }
        return spawns;
    }
}

//==================================================================
//  MAIN GAME SCENE (Exploration)
//==================================================================
class CursedPathScene extends Phaser.Scene {
    constructor() {
        super('CursedPathScene');
        this.player = null;
        this.enemies = null;
        this.tilemapManager = null;
    }

    preload() {
        // In a real project, you'd load assets from 'assets/images/'
        // this.load.image('player_sprite', 'assets/images/player.png');
    }

    create() {
        const mapWidth = LEVEL_1_MAP[0].length * TILE_SIZE;
        const mapHeight = LEVEL_1_MAP.length * TILE_SIZE;
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

        this.tilemapManager = new TilemapManager(this, LEVEL_1_MAP);

        // 4. *** HANDLE GAME STATE ON LOAD ***
        const battleResult = localStorage.getItem('battleResult');
        let defeatedEnemies = JSON.parse(localStorage.getItem('defeatedEnemies')) || [];
        let playerHealth = 100; // Default health

        if (battleResult === 'win') {
            // A battle was won!
            const defeatedId = localStorage.getItem('enemyToFight');
            if (defeatedId && !defeatedEnemies.includes(defeatedId)) {
                defeatedEnemies.push(defeatedId);
                localStorage.setItem('defeatedEnemies', JSON.stringify(defeatedEnemies));
            }
            // Restore player health to full after win
            playerHealth = 100;

        } else if (battleResult === 'fled' || battleResult === 'lose') {
            // Player fled or lost, restore their last saved health
            playerHealth = parseInt(localStorage.getItem('playerHealthBeforeBattle')) || 100;
        }

        // Clear the flags so this only runs once
        localStorage.removeItem('battleResult');
        localStorage.removeItem('enemyToFight');
        // --- End of State Handling ---

        const playerStart = this.tilemapManager.playerStartPosition;
        this.player = new Player(this, playerStart.x, playerStart.y);
        this.player.health = playerHealth; // Set player's health

        this.enemies = this.physics.add.group();
        const enemySpawns = this.tilemapManager.enemySpawns;
        
        enemySpawns.forEach(spawn => {
            const enemy = new Enemy(this, spawn.x, spawn.y);
            
            // 5. CHECK IF ENEMY IS ALREADY DEFEATED
            if (defeatedEnemies.includes(enemy.id)) {
                enemy.destroy(); // Remove if defeated
            } else {
                this.enemies.add(enemy); // Add to group if alive
            }
        });

        // Setup Collisions
        this.physics.add.collider(this.player, this.tilemapManager.walls);
        this.physics.add.collider(this.enemies, this.tilemapManager.walls);
        this.physics.add.collider(this.enemies, this.enemies);
        
        // *** THIS IS THE LINK ***
        // When the player overlaps an enemy, call 'startBattle'
        this.physics.add.overlap(this.player, this.enemies, this.startBattle, null, this);

        // Camera setup
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    update() {
        if (this.player) {
            this.player.update();
        }
        // Check if enemies group exists before updating
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => enemy.update());
        }
    }
    
    /**
     * Called when player overlaps with an enemy.
     * This function transitions to the battle scene.
     */
    startBattle(player, enemy) {
        // Stop the player and enemy
        player.body.stop();
        enemy.body.stop();
        
        // Stop this scene's logic
        this.scene.pause();
        
        // 6. *** SAVE STATE BEFORE BATTLE ***
        localStorage.setItem('enemyToFight', enemy.id);
        localStorage.setItem('playerHealthBeforeBattle', player.health);
        
        // *** THE LINK ***
        // This line navigates the browser to the battle.html page
        window.location.href = 'battle.html';
    }
}

//==================================================================
//  PHASER GAME CONFIGURATION (Exploration)
//==================================================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#0d0d0d',
    parent: 'game-container', // Matches the div ID in index.html
    physics: {
        default: 'arcade',
        arcade: {
            debug: false 
        }
    },
    scene: [CursedPathScene]
};

// Start the game
const game = new Phaser.Game(config);



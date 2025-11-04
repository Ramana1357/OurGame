/*
 * js/main.js
 * This file controls the exploration map (index.html).
 * It handles player movement, map loading, and starting battles.
 */

// --- CONSTANTS ---
const TILE_SIZE = 40; // Increased path width
const PLAYER_SPEED = 180;
const ENEMY_SPEED = 70;

// --- MAP DATA ---
// W = Wall, . = Path, P = Player Start, E = Enemy
const LEVEL_1_MAP = [
    'WWWWWWWWWWWWWWWWWWWW',
    'WP...........W.....W',
    'W.WWWWWWWWWWW.WWWW.W',
    'W.............W....W',
    'W.WWWWWW.E.WWWWWWW.W',
    'W.W......W.......W.W',
    'W.W.WWWWWWWWWWW.W.EW',
    'W.W.W.........W.W..W',
    'W.W.W.WWWWWWWWW.WW.W',
    'W.E.W.W.......W....W',
    'W.W.W.W.WWWWWWW.WW.W',
    'W...W...W...W...W..W',
    'W.WWWWWWWWW.W.WWWW.W',
    'W.............E....W',
    'WWWWWWWWWWWWWWWWWWWW',
];

//==================================================================
//  PLAYER CLASS (Exploration)
//==================================================================
class Player extends Phaser.GameObjects.Container {
    
    constructor(scene, x, y) {
        // --- OOP: Call parent constructor ---
        super(scene, x, y);
        scene.add.existing(this); // Add container to the scene
        
        // --- OOP: Encapsulate properties ---
        this.moveSpeed = PLAYER_SPEED;
        this.health = 100; // Player health
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = {
            up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        // --- Create Physics Body ---
        scene.physics.world.enable(this);
        this.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0);

        // --- Draw visual graphic (Purple rectangle) ---
        const graphics = scene.add.graphics();
        graphics.fillStyle(0x8A2BE2, 1); // Purple
        graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        this.add(graphics); // Add graphic to this container
        
        // --- Set container size ---
        this.setSize(TILE_SIZE, TILE_SIZE);
    }

    // --- OOP: Encapsulate behavior ---
    handleInput() {
        this.body.setVelocity(0);
        let velX = 0;
        let velY = 0;

        // Check for input
        if (this.cursors.left.isDown || this.wasd.left.isDown) velX = -this.moveSpeed;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) velX = this.moveSpeed;

        if (this.cursors.up.isDown || this.wasd.up.isDown) velY = -this.moveSpeed;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) velY = this.moveSpeed;

        this.body.setVelocity(velX, velY);
        
        // Diagonal speed fix
        if (velX !== 0 && velY !== 0) {
            this.body.velocity.normalize().scale(this.moveSpeed);
        }
    }

    // --- OOP: Polymorphism (overriding parent's update) ---
    update() {
        this.handleInput();
    }
} // End of Player Class

//==================================================================
//  ENEMY CLASS (Exploration)
//==================================================================
class Enemy extends Phaser.GameObjects.Container {

    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);
        
        // --- Create Physics Body ---
        scene.physics.world.enable(this);
        this.body.setSize(TILE_SIZE, TILE_SIZE);
        this.body.setCollideWorldBounds(true);
        this.speed = ENEMY_SPEED;
        this.id = Phaser.Math.RND.uuid(); // Give each enemy a unique ID
        
        // --- Draw visual graphic (Red rectangle) ---
        const graphics = scene.add.graphics();
        graphics.fillStyle(0xff0000, 1); // Red
        graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        this.add(graphics);
        
        this.setSize(TILE_SIZE, TILE_SIZE);
    }
    
    // --- OOP: Polymorphism (overriding parent's update) ---
    update(player) {
        // Basic AI: Move towards the player
        if (player) {
            this.scene.physics.moveToObject(this, player, this.speed);
        }
    }
} // End of Enemy Class

//==================================================================
//  TILEMAP MANAGER CLASS (OOP)
//==================================================================
class TilemapManager {
    constructor(scene, mapData) {
        this.scene = scene;
        this.mapData = mapData;
        this.walls = scene.physics.add.staticGroup();
        this.playerStartPosition = { x: 0, y: 0 };
        this.enemySpawns = [];
        
        this.generateMap();
    }

    generateMap() {
        for (let y = 0; y < this.mapData.length; y++) {
            for (let x = 0; x < this.mapData[y].length; x++) {
                const tileChar = this.mapData[y][x];
                const worldX = x * TILE_SIZE + TILE_SIZE / 2;
                const worldY = y * TILE_SIZE + TILE_SIZE / 2;

                if (tileChar === 'W') {
                    // Wall
                    const wall = this.scene.add.rectangle(worldX, worldY, TILE_SIZE, TILE_SIZE, 0x666666); // Dark grey
                    this.walls.add(wall);
                } else if (tileChar === 'P') {
                    // Player Start
                    this.playerStartPosition = { x: worldX, y: worldY };
                } else if (tileChar === 'E') {
                    // Enemy Spawn
                    this.enemySpawns.push({ x: worldX, y: worldY });
                }
                // '.' is a path, so we do nothing
            }
        }
    }
} // End of TilemapManager Class

//==================================================================
//  MAIN GAME SCENE (CursedPathScene)
//==================================================================
class CursedPathScene extends Phaser.Scene {
    constructor() {
        super('CursedPathScene');
        this.player = null;
        this.enemies = null;
        this.tilemapManager = null;
    }

    preload() {
        // No assets to load, but we can show a loading text
        this.add.text(20, 20, 'Loading map...', { font: '16px Arial', fill: '#ffffff' });
    }

    create() {
        const mapWidth = LEVEL_1_MAP[0].length * TILE_SIZE;
        const mapHeight = LEVEL_1_MAP.length * TILE_SIZE;
        
        // Set camera and world bounds
        this.cameras.main.setBackgroundColor('#000000');
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

        this.tilemapManager = new TilemapManager(this, LEVEL_1_MAP);

        // *** 1. HANDLE GAME STATE ON LOAD ***
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

        // Create Player
        const playerStart = this.tilemapManager.playerStartPosition;
        this.player = new Player(this, playerStart.x, playerStart.y);
        this.player.health = playerHealth; // Set player's health
        this.cameras.main.startFollow(this.player, true, 0.2, 0.2);

        // Create Enemies
        this.enemies = this.physics.add.group();
        const enemySpawns = this.tilemapManager.enemySpawns;
        
        enemySpawns.forEach(spawn => {
            const enemy = new Enemy(this, spawn.x, spawn.y);
            
            // 2. CHECK IF ENEMY IS ALREADY DEFEATED
            if (defeatedEnemies.includes(enemy.id)) {
                enemy.destroy(); // Remove if defeated
            } else {
                this.enemies.add(enemy); // Add to group if alive
            }
        });

        // --- Setup Collisions ---
        this.physics.add.collider(this.player, this.tilemapManager.walls);
        this.physics.add.collider(this.enemies, this.tilemapManager.walls);
        this.physics.add.collider(this.enemies, this.enemies);
        
        // The collision that starts the battle
        this.physics.add.overlap(this.player, this.enemies, this.startBattle, null, this);
    }

    /**
     * This function transitions to the battle scene.
     */
    startBattle(player, enemy) {
        // Stop the player and enemy
        player.body.stop();
        enemy.body.stop();
        
        // Pause this scene
        this.scene.pause();
        
        // 3. *** SAVE STATE BEFORE BATTLE ***
        localStorage.setItem('enemyToFight', enemy.id);
        localStorage.setItem('playerHealthBeforeBattle', player.health);
        
        // *** THE LINK ***
        // Redirect to the battle page
        window.location.href = 'battle.html';
    }

    update() {
        if (this.player) {
            this.player.update();
        }
        
        // Update all enemies in the group
        this.enemies.getChildren().forEach(enemy => {
            enemy.update(this.player);
        });
    }
} // End of CursedPathScene Class

//==================================================================
//  GAME CONFIGURATION
//==================================================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Set to true to see collision boxes
        }
    },
    scene: [CursedPathScene]
};

// Start the game
const game = new Phaser.Game(config);


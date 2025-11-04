/*
 * js/main.js
 * This file controls the exploration map (index.html).
 * It handles player movement, map loading, and starting battles.
 */

// --- CONSTANTS ---
const TILE_SIZE = 40; // Increased path width for better movement
const PLAYER_SPEED = 180;
const ENEMY_SPEED = 70;

// --- MAP DATA ---
// W = Wall, . = Path, P = Player Start, E = Enemy, X = Exit
const LEVEL_1_MAP = [
    'WWWWWWWWWWWWWWWWWWWW',
    'WP...........W.....W',
    'W.WWWWWWWWWWW.WWWW.W',
    'W.............W....W',
    'W.WWWWWW.E.WWWWWWW.W',
    'W.W......W.......W.X', 
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
        super(scene, x, y);
        scene.add.existing(this);
        
        this.moveSpeed = PLAYER_SPEED;
        this.health = 100; // Default or loaded health
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = {
            up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        scene.physics.world.enable(this);
        this.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0);

        // Visual: Purple square
        const graphics = scene.add.graphics();
        graphics.fillStyle(0x8A2BE2, 1); 
        graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        this.add(graphics);
        
        this.setSize(TILE_SIZE, TILE_SIZE);
    }

    handleInput() {
        this.body.setVelocity(0);
        let velX = 0;
        let velY = 0;

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

    update() {
        this.handleInput();
    }
} // End of Player Class

//==================================================================
//  ENEMY CLASS (Exploration)
//==================================================================
class Enemy extends Phaser.GameObjects.Container {

    // MODIFICATION: The constructor now accepts a persistent ID
    constructor(scene, x, y, id) {
        super(scene, x, y);
        scene.add.existing(this);
        
        // --- Create Physics Body ---
        scene.physics.world.enable(this);
        this.body.setSize(TILE_SIZE, TILE_SIZE);
        this.body.setCollideWorldBounds(true);
        this.speed = ENEMY_SPEED;
        
        // MODIFICATION: Use the persistent ID from the map
        this.id = id; 
        
        // --- Draw visual graphic (Red rectangle) ---
        const graphics = scene.add.graphics();
        graphics.fillStyle(0xff0000, 1); // Red
        graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        this.add(graphics);
        
        this.setSize(TILE_SIZE, TILE_SIZE);
    }
    
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
        this.exitPosition = null; 
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
                    const enemyId = `enemy_${x}_${y}`; // Persistent ID
                    this.enemySpawns.push({ x: worldX, y: worldY, id: enemyId });
                } else if (tileChar === 'X') {
                    // Exit Marker
                    this.exitPosition = { x: worldX, y: worldY };
                }
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
        this.exitDoor = null; 
        this.hpText = null;
    }

    preload() {
        // Placeholder image for the player
        this.load.image('demonSlayer', 'https://placehold.co/40x40/8A2BE2/FFFFFF?text=P');
    }

    create() {
        const mapWidth = LEVEL_1_MAP[0].length * TILE_SIZE;
        const mapHeight = LEVEL_1_MAP.length * TILE_SIZE;
        
        this.cameras.main.setBackgroundColor('#000000');
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

        this.tilemapManager = new TilemapManager(this, LEVEL_1_MAP);

        // *** HANDLE GAME STATE ON LOAD ***
        const battleResult = localStorage.getItem('battleResult');
        let defeatedEnemies = JSON.parse(localStorage.getItem('defeatedEnemies')) || [];
        let playerHealth = 100;

        if (battleResult === 'win') {
            const defeatedId = localStorage.getItem('enemyToFight');
            if (defeatedId && !defeatedEnemies.includes(defeatedId)) {
                defeatedEnemies.push(defeatedId);
                localStorage.setItem('defeatedEnemies', JSON.stringify(defeatedEnemies));
            }
            playerHealth = 100; // Restore player health to full after win
        } else if (battleResult === 'fled' || battleResult === 'lose') {
            playerHealth = parseInt(localStorage.getItem('playerHealthBeforeBattle')) || 100;
        }

        // Clear the flags so this only runs once
        localStorage.removeItem('battleResult');
        localStorage.removeItem('enemyToFight');
        
        // Create Player
        const playerStart = this.tilemapManager.playerStartPosition;
        this.player = new Player(this, playerStart.x, playerStart.y);
        this.player.health = playerHealth;
        
        // --- Camera Setup ---
        this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        
        // Create Enemies
        this.enemies = this.physics.add.group();
        const enemySpawns = this.tilemapManager.enemySpawns;
        
        enemySpawns.forEach(spawn => {
            const enemy = new Enemy(this, spawn.x, spawn.y, spawn.id); 
            
            // CHECK IF ENEMY IS ALREADY DEFEATED
            if (defeatedEnemies.includes(enemy.id)) {
                enemy.destroy(); // Remove if defeated
            } else {
                this.enemies.add(enemy); // Add to group if alive
            }
        });

        // --- Create Exit Door (Visual Polish) ---
        if (this.tilemapManager.exitPosition) {
            const exitPos = this.tilemapManager.exitPosition;
            
            // 1. Create the visual frame
            this.exitDoor = this.add.rectangle(exitPos.x, exitPos.y, TILE_SIZE, TILE_SIZE, 0xFFD700); // Gold frame
            this.exitDoor.setStrokeStyle(4, 0xFFFFFF);
            
            // 2. Add text
            this.add.text(exitPos.x, exitPos.y, 'Exit', { 
                fontSize: '12px', fill: '#000000', backgroundColor: '#FFFFFF' 
            }).setOrigin(0.5);

            // 3. Enable physics for interaction
            this.physics.world.enable(this.exitDoor);
            this.exitDoor.body.setAllowGravity(false);
            this.exitDoor.body.setImmovable(true);
            this.exitDoor.setDepth(1); // Ensure it draws over path

            // Final Level Condition Check
            if (defeatedEnemies.length < enemySpawns.length) {
                // Not all enemies are defeated: Lock the door (make it solid)
                this.exitDoor.fillColor = 0xFF0000; // Red (Locked)
                this.physics.add.collider(this.player, this.exitDoor);
            } else {
                // All enemies defeated: Unlock the door (overlap to exit)
                this.exitDoor.fillColor = 0x00FF00; // Green (Unlocked)
                this.physics.add.overlap(this.player, this.exitDoor, this.completeLevel, null, this);
            }
        }
        
        // --- HP Display ---
        this.hpText = this.add.text(10, 10, `HP: ${this.player.health}`, { 
            fontSize: '16px', fill: '#00ff00', backgroundColor: '#00000099' 
        }).setScrollFactor(0); // Fixed position on the screen
        
        // --- Setup Collisions ---
        this.physics.add.collider(this.player, this.tilemapManager.walls);
        this.physics.add.collider(this.enemies, this.tilemapManager.walls);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.overlap(this.player, this.enemies, this.startBattle, null, this);
    }

    startBattle(player, enemy) {
        player.body.stop();
        enemy.body.stop();
        this.scene.pause();
        localStorage.setItem('enemyToFight', enemy.id);
        localStorage.setItem('playerHealthBeforeBattle', player.health);
        window.location.href = 'battle.html';
    }

    completeLevel() {
        // This runs when the player touches the unlocked exit door
        localStorage.clear(); // Clear all game state for the next level/reset
        alert("Level Complete! You can now proceed to the next Upper Moon.");
        window.location.href = 'index.html'; // Restart for demo purposes
    }

    update() {
        if (this.player) {
            this.player.update();
            
            // Update the HP text display
            this.hpText.setText(`HP: ${this.player.health}`);
            
            // Check if the exit needs to be unlocked during gameplay
            if (this.exitDoor && this.exitDoor.fillColor === 0xFF0000) {
                 if (this.enemies.getLength() === 0) {
                    // Unlock the door since all enemies are destroyed
                    this.exitDoor.fillColor = 0x00FF00;
                    
                    // Remove the solid collision and add the overlap
                    // This is complex, so we manually check for the specific collider to remove it
                    const existingCollider = this.physics.world.colliders.getActive().find(c => {
                        return (c.object1 === this.player && c.object2 === this.exitDoor) || 
                               (c.object2 === this.player && c.object1 === this.exitDoor);
                    });
                    
                    if (existingCollider) {
                        this.physics.world.removeCollider(existingCollider);
                        this.physics.add.overlap(this.player, this.exitDoor, this.completeLevel, null, this);
                    }
                }
            }
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
            debug: false
        }
    },
    scene: [CursedPathScene]
};

// Start the game
const game = new Phaser.Game(config);

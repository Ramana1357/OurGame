/*
 * js/battle.js
 * This file controls the turn-based battle scene (battle.html).
 * It reads state from localStorage and writes the result back.
 */

//==================================================================
//  GEMINI API CALL (Helper Function)
//==================================================================
/**
 * Calls the Gemini API to get a taunt from the villain.
 */
async function getVillainTaunt() {
    const systemPrompt = "You are Muzan Kibutsuji from Demon Slayer. A foolish demon slayer has just been defeated by one of your demons. Write a very short, one-sentence taunt to mock their weakness and failure. Be cruel and dismissive.";
    const userQuery = "Mock me for losing.";
    
    // NOTE: The API key is an empty string. Canvas will handle authentication.
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        let response;
        let delay = 1000;
        for (let i = 0; i < 5; i++) {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                break;
            } else if (response.status === 429 || response.status >= 500) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                throw new Error(`API Error: ${response.statusText}`);
            }
        }
        if (!response.ok) {
            throw new Error(`API failed after retries: ${response.statusText}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        
        if (candidate && candidate.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        } else {
            return "You are a disgrace. (API Error)";
        }
    } catch (error) {
        console.error("Gemini API call failed:", error);
        return "You are not even worth my time."; // Fallback taunt
    }
}

//==================================================================
//  BATTLE SCENE (OOP)
//==================================================================
class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        
        // 1. LOAD PLAYER HEALTH FROM LOCAL STORAGE
        this.playerHealth = parseInt(localStorage.getItem('playerHealthBeforeBattle')) || 100;
        
        this.enemyHealth = 100; // All low-level demons have 100 HP
        this.isPlayerTurn = true;
        this.isGameOver = false;

        // UI Element references
        this.playerSprite = null;
        this.enemySprite = null;
        this.playerHealthBar = null;
        this.enemyHealthBar = null;
        this.statusText = null;
        this.attackButton = null;
        this.fleeButton = null;
    }

    preload() {
        this.load.image('player_idle', 'https://placehold.co/150x200/8A2BE2/FFFFFF?text=Hero');
        this.load.image('enemy_idle', 'https://placehold.co/150x200/ff0000/FFFFFF?text=Demon');
    }

    create() {
        this.cameras.main.setBackgroundColor('#2c3e50');

        // --- Create Sprites (placeholders) ---
        this.playerSprite = this.add.sprite(200, 300, 'player_idle');
        this.enemySprite = this.add.sprite(600, 300, 'enemy_idle');

        // --- Create Health Bars and UI ---
        this.playerHealthBar = this.add.graphics();
        this.enemyHealthBar = this.add.graphics();
        this.updateHealthBars();

        this.statusText = this.add.text(400, 50, 'Player Turn!', {
            fontSize: '32px', fill: '#ffffff', fontFamily: 'Arial',
            backgroundColor: '#00000080', padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        this.createHTMLButtons();
    }

    createHTMLButtons() {
        // --- Create the HTML buttons for turn-based combat ---
        const uiContainer = document.getElementById('ui-container');
        if (!uiContainer) return;

        // Button styles
        const buttonStyle = "text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-200 ease-in-out m-2";
        const attackStyle = "bg-red-600 hover:bg-red-700";
        const fleeStyle = "bg-gray-500 hover:bg-gray-600";

        // Attack Button
        this.attackButton = document.createElement('button');
        this.attackButton.innerText = 'Attack (Water Breathing)';
        this.attackButton.className = `${buttonStyle} ${attackStyle}`;
        this.attackButton.onclick = () => this.playerAttack();
        
        // Flee Button
        this.fleeButton = document.createElement('button');
        this.fleeButton.innerText = 'Flee';
        this.fleeButton.className = `${buttonStyle} ${fleeStyle}`;
        this.fleeButton.onclick = () => this.fleeBattle();

        uiContainer.appendChild(this.attackButton);
        uiContainer.appendChild(this.fleeButton);
    }
    
    toggleButtons(isEnabled) {
        if (this.attackButton) this.attackButton.disabled = !isEnabled;
        if (this.fleeButton) this.fleeButton.disabled = !isEnabled;
        
        const opacity = isEnabled ? '1.0' : '0.5';
        if (this.attackButton) this.attackButton.style.opacity = opacity;
        if (this.fleeButton) this.fleeButton.style.opacity = opacity;
    }

    // --- Battle Logic ---

    playerAttack() {
        if (!this.isPlayerTurn || this.isGameOver) return;

        // Player attacks
        const damage = 25; // Player deals 25 damage
        this.enemyHealth -= damage;
        this.cameras.main.shake(100, 0.01); // Screen shake
        this.enemySprite.setTint(0xffffff); // Flash white
        this.time.delayedCall(100, () => this.enemySprite.clearTint());
        
        this.updateHealthBars();
        
        if (this.enemyHealth <= 0) {
            this.enemyHealth = 0;
            this.endBattle(true); // Player won
        } else {
            // It's now the enemy's turn
            this.startEnemyTurn();
        }
    }

    startEnemyTurn() {
        this.isPlayerTurn = false;
        this.statusText.setText('Demon is thinking...');
        this.toggleButtons(false);
        
        // Wait 1.5 seconds, then the enemy attacks
        this.time.delayedCall(1500, () => {
            if (this.isGameOver) return;
            
            const damage = 15; // Enemy deals 15 damage
            this.playerHealth -= damage;
            this.cameras.main.shake(100, 0.01);
            this.playerSprite.setTint(0xffffff);
            this.time.delayedCall(100, () => this.playerSprite.clearTint());
            
            this.updateHealthBars();
            
            if (this.playerHealth <= 0) {
                this.playerHealth = 0;
                this.endBattle(false); // Player lost
            } else {
                // It's the player's turn again
                this.isPlayerTurn = true;
                this.statusText.setText('Player Turn!');
                this.toggleButtons(true);
            }
        });
    }

    fleeBattle() {
        if (this.isGameOver) {
            // If game is over, the button already redirects
            window.location.href = 'index.html';
        } else {
            // *** SET BATTLE RESULT TO 'FLED' AND REMOVE ENEMY ID ***
            localStorage.setItem('battleResult', 'fled');
            localStorage.removeItem('enemyToFight'); // Crucial: don't count this enemy as defeated
            
            this.statusText.setText('You fled!');
            this.toggleButtons(false);
            
            // Redirect after 1 second
            this.time.delayedCall(1000, () => {
                window.location.href = 'index.html';
            });
        }
    }

    async endBattle(playerWon) {
        this.isGameOver = true;
        this.toggleButtons(false);

        // --- Configure the "Flee" button to be "Return to Map" ---
        if (this.fleeButton) {
            this.fleeButton.innerText = 'Return to Map';
            this.fleeButton.disabled = false;
            this.fleeButton.style.opacity = '1';
        }

        if (playerWon) {
            // *** SET BATTLE RESULT TO 'WIN' ***
            localStorage.setItem('battleResult', 'win');
            
            this.statusText.setText('You defeated the demon!');
            this.enemySprite.setAlpha(0.3); // Show enemy is defeated
        } else {
            // *** SET BATTLE RESULT TO 'LOSE' AND REMOVE ENEMY ID ***
            localStorage.setItem('battleResult', 'lose');
            localStorage.removeItem('enemyToFight'); // Crucial: don't count this enemy as defeated
            
            this.statusText.setText('You have been defeated... GAME OVER');
            this.playerSprite.setAlpha(0.3);
            
            // --- Call Gemini API for a taunt ---
            this.statusText.setText('Demon is mocking you...');
            const taunt = await getVillainTaunt();
            this.statusText.setText(`"${taunt}"`);
        }
    }

    updateHealthBars() {
        // Calculate percentages
        const playerPercent = Math.max(0, this.playerHealth / 100);
        const enemyPercent = Math.max(0, this.enemyHealth / 100);

        // Bar dimensions
        const barWidth = 200;
        const barHeight = 30;

        // Update Player Health Bar
        this.playerHealthBar.clear();
        this.playerHealthBar.fillStyle(0x333333); // Background
        this.playerHealthBar.fillRect(100, 500, barWidth, barHeight);
        this.playerHealthBar.fillStyle(0x00ff00); // Health
        this.playerHealthBar.fillRect(100, 500, barWidth * playerPercent, barHeight);
        
        // Update Enemy Health Bar
        this.enemyHealthBar.clear();
        this.enemyHealthBar.fillStyle(0x333333); // Background
        this.enemyHealthBar.fillRect(500, 500, barWidth, barHeight);
        this.enemyHealthBar.fillStyle(0xff0000); // Health
        this.enemyHealthBar.fillRect(500, 500, barWidth * enemyPercent, barHeight);
    }
} // End of BattleScene Class

//==================================================================
//  GAME CONFIGURATION
//==================================================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: [BattleScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Start the game instance
const game = new Phaser.Game(config);

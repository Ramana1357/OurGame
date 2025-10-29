/*
 * js/battle.js
 * This file controls the turn-based battle scene (battle.html).
 * It manages player/enemy health, attacks, and the Gemini API call.
 */

//==================================================================
//  GEMINI API FUNCTIONS
//==================================================================

/**
 * Calls the Gemini API to generate a taunt from the demon.
 * @param {Phaser.Scene} scene - The battle scene, to add text.
 */
async function getDemonTaunt(scene) {
    const apiKey = ""; // Leave blank, will be provided by the runtime
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const systemPrompt = "You are Muzan Kibutsuji, the main villain. The player has just been defeated by one of your demons. Write a very short, mocking, and cruel taunt (one sentence, max 15 words) to display on their 'Game Over' screen.";
    const userQuery = "The player has died. Mock them.";

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    // Add loading text
    const loadingText = scene.add.text(400, 300, 'The demon is thinking...', {
        fontSize: '20px', fill: '#FF8888', align: 'center', wordWrap: { width: 700 }
    }).setOrigin(0.5);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const taunt = candidate.content.parts[0].text;
            // Clean up the taunt (remove quotes)
            return taunt.replace(/\"/g, '');
        } else {
            return "You are weak and pathetic."; // Fallback taunt
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "You aren't even worth mocking."; // Fallback taunt on error
    } finally {
        loadingText.destroy(); // Remove loading text
    }
}

//==================================================================
//  BATTLE SCENE (Turn-Based)
//==================================================================
class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        
        // OOP: Encapsulate state
        // 1. *** LOAD PLAYER HEALTH FROM LOCAL STORAGE ***
        // Get the health saved by main.js, or default to 100
        this.playerHealth = parseInt(localStorage.getItem('playerHealthBeforeBattle')) || 100;
        
        this.enemyHealth = 100;
        this.isPlayerTurn = true;
        this.isGameOver = false;
    }

    preload() {
        // In a real project, load assets from 'assets/'
        // this.load.image('player_battle', 'assets/images/player_battle_pose.png');
        // this.load.image('enemy_battle', 'assets/images/goblin.png');
    }

    create() {
        // Create the background color
        this.cameras.main.setBackgroundColor('#3d2f2f'); // Dark, blood-red background

        // --- Create Actors ---
        // We use placeholders since assets aren't loaded
        this.playerSprite = this.add.rectangle(200, 300, 150, 200, 0x00FF00).setOrigin(0.5);
        this.add.text(200, 300, 'Player', { fill: '#fff', fontSize: '24px' }).setOrigin(0.5);
        
        this.enemySprite = this.add.rectangle(600, 300, 150, 200, 0xFF0000).setOrigin(0.5);
        this.add.text(600, 300, 'Demon', { fill: '#fff', fontSize: '24px' }).setOrigin(0.5);

        // --- Create Health Displays ---
        this.playerHealthText = this.add.text(200, 420, `HP: ${this.playerHealth}`, { fontSize: '20px', fill: '#00FF00' }).setOrigin(0.5);
        this.enemyHealthText = this.add.text(600, 420, `HP: ${this.enemyHealth}`, { fontSize: '20px', fill: '#FF0000' }).setOrigin(0.5);

        // --- Create UI ---
        this.statusText = this.add.text(400, 50, 'Your turn!', { fontSize: '28px', fill: '#fff' }).setOrigin(0.5);
        this.createBattleButtons();
    }

    createBattleButtons() {
        // Get the HTML UI container from battle.html
        const uiContainer = document.getElementById('ui-container');

        // 1. Water Breathing Button
        const attackButton = document.createElement('button');
        attackButton.className = 'battle-button';
        attackButton.innerText = 'Water Breathing (Attack)';
        attackButton.onclick = () => this.playerAttack('water');
        
        // 2. Thunder Breathing Button (Placeholder)
        const skillButton = document.createElement('button');
        skillButton.className = 'battle-button';
        skillButton.innerText = 'Thunder Breathing (Skill)';
        skillButton.onclick = () => this.playerAttack('thunder');

        // 3. Flee Button
        const fleeButton = document.createElement('button');
        fleeButton.className = 'battle-button';
        fleeButton.innerText = 'Flee';
        fleeButton.onclick = () => this.fleeBattle();

        uiContainer.appendChild(attackButton);
        uiContainer.appendChild(skillButton);
        uiContainer.appendChild(fleeButton);
    }

    playerAttack(style) {
        if (!this.isPlayerTurn || this.isGameOver) return;

        let damage = 0;
        let attackText = '';

        // This is the blueprint for different styles
        if (style === 'water') {
            damage = Phaser.Math.Between(15, 25);
            attackText = `You used Water Breathing! Dealt ${damage} damage.`;
        } else if (style === 'thunder') {
            damage = Phaser.Math.Between(5, 40); // More random
            attackText = `You used Thunder Breathing! Dealt ${damage} damage.`;
        }

        this.enemyHealth -= damage;
        this.updateHealthText();
        this.statusText.setText(attackText);

        if (this.enemyHealth <= 0) {
            this.endBattle(true); // Player wins
        } else {
            this.startEnemyTurn();
        }
    }

    startEnemyTurn() {
        this.isPlayerTurn = false;
        this.toggleButtons(false); // Disable buttons
        this.statusText.setText('Demon is attacking...');

        // Wait 1.5 seconds, then enemy attacks
        this.time.delayedCall(1500, () => {
            const damage = Phaser.Math.Between(10, 20);
            this.playerHealth -= damage;
            this.updateHealthText();
            this.statusText.setText(`Demon attacked! You took ${damage} damage.`);

            if (this.playerHealth <= 0) {
                this.endBattle(false); // Player loses
            } else {
                this.isPlayerTurn = true;
                this.toggleButtons(true); // Re-enable buttons
                this.statusText.setText('Your turn!');
            }
        });
    }

    fleeBattle() {
        if (this.isGameOver) {
            // If game is over, the button already redirects
            window.location.href = 'index.html';
        } else {
            // 2. *** SET BATTLE RESULT TO 'FLED' ***
            localStorage.setItem('battleResult', 'fled');
            
            // Flee back to the map
            this.statusText.setText('You fled!');
            this.scene.pause();
            window.location.href = 'index.html';
        }
    }

    updateHealthText() {
        this.playerHealthText.setText(`HP: ${Math.max(0, this.playerHealth)}`);
        this.enemyHealthText.setText(`HP: ${Math.max(0, this.enemyHealth)}`);
    }

    toggleButtons(isEnabled) {
        const buttons = document.querySelectorAll('.battle-button');
        buttons.forEach(button => {
            button.disabled = !isEnabled;
            button.style.opacity = isEnabled ? '1' : '0.5';
        });
    }

    async endBattle(playerWon) {
        this.isGameOver = true;
        this.toggleButtons(false); // Disable all buttons
        
        // Find and change Flee button to "Return to Map"
        const fleeButton = Array.from(document.querySelectorAll('.battle-button')).find(btn => btn.innerText === 'Flee');
        if (fleeButton) {
            fleeButton.innerText = 'Return to Map';
            fleeButton.disabled = false;
            fleeButton.style.opacity = '1';
        }

        if (playerWon) {
            // 3. *** SET BATTLE RESULT TO 'WIN' ***
            localStorage.setItem('battleResult', 'win');
            
            this.statusText.setText('You defeated the demon!');
            this.enemySprite.setAlpha(0.3); // Show enemy is defeated
        } else {
            // 4. *** SET BATTLE RESULT TO 'LOSE' ***
            localStorage.setItem('battleResult', 'lose');
            
            this.statusText.setText('You have been defeated... GAME OVER');
            this.playerSprite.setAlpha(0.3); // Show player is defeated
            
            // *** GEMINI API CALL ***
            const taunt = await getDemonTaunt(this);
            const tauntText = this.add.text(400, 350, taunt, {
                fontSize: '24px', fill: '#FF4444', fontStyle: 'italic', align: 'center', wordWrap: { width: 700 }
            }).setOrigin(0.5);
        }
    }
}

//==================================================================
//  PHASER GAME CONFIGURATION (Battle)
//==================================================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container', // Matches the div ID in battle.html
    scene: [BattleScene],
    // No physics needed for this simple turn-based scene
};

// Start the game
const game = new Phaser.Game(config);



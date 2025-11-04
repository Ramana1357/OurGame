class Hero {
  constructor(scene) {
    this.scene = scene;
    this.maxHP = 1000;
    this.hp = this.maxHP;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.scene.endGame(false); // lose
    }
    this.scene.updateHPText();
  }

  reset() {
    this.hp = this.maxHP;
    this.scene.updateHPText();
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('tile1', 'assets/tile1.png');
    this.load.spritesheet('hero_s', 'assets/hero_s.png', { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    this.tileSize = 40;
    this.rows = 10;
    this.cols = 15;
    this.hero = new Hero(this);

    // Generate random map (0=mine, 1=safe, 2=start, 3=goal)
    this.generateRandomMap();

    this.mapContainer = this.add.container(0, 0);
    this.tiles = [];

    for (let r = 0; r < this.rows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const tile = this.add.rectangle(
          c * this.tileSize, r * this.tileSize,
          this.tileSize, this.tileSize,
          this.map[r][c] === 3 ? 0x00ff00 :
          this.map[r][c] === 2 ? 0x0000ff : 0x888888
        ).setOrigin(0);
        tile.setStrokeStyle(1, 0x000000);
        this.mapContainer.add(tile);
        this.tiles[r][c] = tile;
      }
    }

    // Place hero at start
    this.startPos = this.findTile(2);
    this.goalPos = this.findTile(3);
    this.heroPos = { ...this.startPos };

    this.player = this.add.sprite(
      this.startPos.c * this.tileSize + this.tileSize / 2,
      this.startPos.r * this.tileSize + this.tileSize / 2,
      'hero_s', 0
    ).setScale(0.7);

    this.cursors = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D'
    });

    this.hpText = this.add.text(10, 10, '', {
      font: '20px monospace', color: '#ffffff'
    }).setScrollFactor(0);
    this.updateHPText();
  }

  generateRandomMap() {
    this.map = [];
    for (let r = 0; r < this.rows; r++) {
      this.map[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.map[r][c] = Math.random() < 0.2 ? 0 : 1; // 20% mines
      }
    }
    // Random start and goal tiles
    const startR = Phaser.Math.Between(0, this.rows - 1);
    const startC = 0;
    const goalR = Phaser.Math.Between(0, this.rows - 1);
    const goalC = this.cols - 1;

    this.map[startR][startC] = 2;
    this.map[goalR][goalC] = 3;
  }

  findTile(type) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.map[r][c] === type) return { r, c };
      }
    }
    return null;
  }

  updateHPText() {
    this.hpText.setText(`HP: ${this.hero.hp}`);
  }

  update() {
    if (this.gameOver) return;

    let moved = false;
    let newPos = { ...this.heroPos };

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && this.heroPos.r > 0) {
      newPos.r -= 1; moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) && this.heroPos.r < this.rows - 1) {
      newPos.r += 1; moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.left) && this.heroPos.c > 0) {
      newPos.c -= 1; moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) && this.heroPos.c < this.cols - 1) {
      newPos.c += 1; moved = true;
    }

    if (moved) {
      this.heroPos = newPos;
      this.player.x = this.heroPos.c * this.tileSize + this.tileSize / 2;
      this.player.y = this.heroPos.r * this.tileSize + this.tileSize / 2;
      this.checkTile();
    }
  }

  checkTile() {
    const tileValue = this.map[this.heroPos.r][this.heroPos.c];
    if (tileValue === 0) {
      const damage = Phaser.Math.RND.pick([100, 250, 500]);
      this.hero.takeDamage(damage);
      this.tiles[this.heroPos.r][this.heroPos.c].setFillStyle(0xff0000);
    } else if (tileValue === 3) {
      this.endGame(true);
    } else {
      // Reveal safe zone color
      this.tiles[this.heroPos.r][this.heroPos.c].setFillStyle(0xffffff);
    }
  }

  endGame(won) {
    this.gameOver = true;
    const msg = won ? '🎉 You reached the goal!\nPlay next map?' : '💀 You died!\nPlay again?';
    this.time.delayedCall(300, () => {
      if (confirm(msg)) {
        this.scene.restart();
      }
    });
  }
}

window.GameScene = GameScene;

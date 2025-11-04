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
    this.load.spritesheet('hero_w', 'assets/hero_w.png', { frameWidth: 64, frameHeight: 56 });
    this.load.spritesheet('hero_s', 'assets/hero_s.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('hero_a', 'assets/hero_a.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('hero_d', 'assets/hero_d.png', { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    this.tileSize = 32;

    // Editable map (1 = walkable, 0 = blocked)
    this.map = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    this.mapRows = this.map.length;
    this.mapCols = this.map[0].length;

    // Create tile group
    this.tiles = this.add.group();

    // Draw map (scrollable container)
    this.mapContainer = this.add.container(0, 0);

    for (let r = 0; r < this.mapRows; r++) {
      for (let c = 0; c < this.mapCols; c++) {
        const tile = this.add.image(c * this.tileSize, r * this.tileSize, 'tile1').setOrigin(0);
        tile.setTint(this.map[r][c] === 1 ? 0xffffff : 0x555555);
        tile.displayWidth = this.tileSize;
        tile.displayHeight = this.tileSize;
        this.mapContainer.add(tile);
      }
    }

    // Hero setup (fixed center)
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.player = this.add.sprite(centerX, centerY, 'hero_s', 0);
    this.player.setOrigin(0.5, 1);

    // Player position in world coords
    this.worldX = 100;
    this.worldY = 100;
    this.speed = 120;

    this.createAnimations();

    this.cursors = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D'
    });
  }

  createAnimations() {
    const dirs = ['w', 's', 'a', 'd'];
    dirs.forEach(dir => {
      this.anims.create({
        key: `walk_${dir}`,
        frames: this.anims.generateFrameNumbers(`hero_${dir}`, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    });
  }

  canOccupyAtOffset(offsetX, offsetY) {
    const nextX = this.worldX + offsetX;
    const nextY = this.worldY + offsetY;

    const playerWidth = this.player.displayWidth;
    const playerHeight = this.player.displayHeight;

    const worldLeft = nextX - playerWidth * 0.5;
    const worldRight = nextX + playerWidth * 0.5 - 1;
    const worldTop = nextY - playerHeight;
    const worldBottom = nextY - 1;

    const leftTile = Math.floor(worldLeft / this.tileSize);
    const rightTile = Math.floor(worldRight / this.tileSize);
    const topTile = Math.floor(worldTop / this.tileSize);
    const bottomTile = Math.floor(worldBottom / this.tileSize);

    if (leftTile < 0 || rightTile >= this.mapCols || topTile < 0 || bottomTile >= this.mapRows) {
      return false;
    }

    for (let r = topTile; r <= bottomTile; r++) {
      for (let c = leftTile; c <= rightTile; c++) {
        if (this.map[r][c] !== 1) return false;
      }
    }
    return true;
  }
  update(time, delta) {
    const moveDistance = (this.speed * delta) / 1000;
    let moving = false;
    let nextX = this.worldX;
    let nextY = this.worldY;

    if (this.cursors.up.isDown) {
      const candidateY = nextY - moveDistance;
      if (this.canOccupyAtOffset(0, -moveDistance)) {
        nextY = candidateY;
        this.player.anims.play('walk_w', true);
        moving = true;
      }
    } else if (this.cursors.down.isDown) {
      const candidateY = nextY + moveDistance;
      if (this.canOccupyAtOffset(0, moveDistance)) {
        nextY = candidateY;
        this.player.anims.play('walk_s', true);
        moving = true;
      }
    }

    if (this.cursors.left.isDown) {
      const candidateX = nextX - moveDistance;
      if (this.canOccupyAtOffset(-moveDistance, 0)) {
        nextX = candidateX;
        this.player.anims.play('walk_a', true);
        moving = true;
      }
    } else if (this.cursors.right.isDown) {
      const candidateX = nextX + moveDistance;
      if (this.canOccupyAtOffset(moveDistance, 0)) {
        nextX = candidateX;
        this.player.anims.play('walk_d', true);
        moving = true;
      }
    }

    if (!moving) {
      this.player.anims.stop();
      this.player.setFrame(0);
    }

    // Update world position and camera follow
    this.worldX = nextX;
    this.worldY = nextY;
    this.player.x = this.worldX;
    this.player.y = this.worldY;
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }
}

window.GameScene = GameScene;

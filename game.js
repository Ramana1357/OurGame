const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000',
  physics: { default: 'arcade' },
  scene: [GameScene]
};

new Phaser.Game(config);

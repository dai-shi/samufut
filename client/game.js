/*
  Copyright (C) 2014, Daishi Kato <daishi@axlight.com>
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
  HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/* jshint undef: true, unused: true, latedef: true */
/* jshint quotmark: single, eqeqeq: true, camelcase: true */
/* jshint browser: true */

/* global Phaser */

function createGame(clickStream) {
  var fingerKey = Math.floor(Math.random() * 256);

  var game = new Phaser.Game(window.innerWidth, window.innerHeight);

  function preload() {
    game.load.image('circle', 'assets/circle.png');
    game.load.image('finger', 'assets/finger.png');
    game.load.audio('drop', ['assets/sound/by_chance.mp3', 'assets/sound/by_chance.ogg']);
    game.load.audio('fire', ['assets/sound/launcher1.mp3', 'assets/sound/launcher1.ogg']);
  }

  var circleCollisionGroup;
  var sndDrop;
  var sndFire;

  function create() {
    game.stage.backgroundColor = '#edffec';

    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.setImpactEvents(true);
    game.physics.p2.setBounds(0, 0, game.world.width, game.world.height, true, true, false, true);
    game.physics.p2.restitution = 0.3;
    game.physics.p2.gravity.y = 800;

    circleCollisionGroup = game.physics.p2.createCollisionGroup();
    game.physics.p2.updateBoundsCollisionGroup();

    sndDrop = game.add.audio('drop');
    sndFire = game.add.audio('fire');

    game.input.onDown.add(click);
  }

  var lastRepluseTime = 0;

  function click(pointer) {
    var now = Date.now();
    if (pointer.position.y < game.world.height / 2) {
      createCircle(fingerKey, pointer.position.x);
      clickStream.emit('message', {
        action: 'create',
        x: pointer.position.x,
        key: fingerKey
      });
    } else if (lastRepluseTime + 1000 < now) {
      lastRepluseTime = now;
      repulseCircles(fingerKey, pointer.position.x);
      clickStream.emit('message', {
        action: 'repulse',
        x: pointer.position.x,
        key: fingerKey
      });
    }
  }

  clickStream.on('message', function(message) {
    if (message.action === 'create') {
      createCircle(message.key, message.x);
    } else if (message.action === 'repulse') {
      repulseCircles(message.key, message.x);
    }
  });

  var circles = [];
  var circleSize = 20 * (window.devicePixelRatio || 1);

  function createCircle(fingerKey, x) {
    if (x < circleSize) x = circleSize;
    if (x > game.world.width - circleSize) x = game.world.width - circleSize;
    var circle = game.add.sprite(x, -2 * circleSize, 'circle');
    circle.scale.set(window.devicePixelRatio || 1);
    game.physics.p2.enable(circle);
    circle.body.setCircle(circleSize);
    circle.body.setCollisionGroup(circleCollisionGroup);
    circle.body.collides(circleCollisionGroup);
    circles.push(circle);

    var finger = getFinger(fingerKey);
    finger.x = x - finger.width * 0.3;
    finger.y = 0;
    finger.bringToTop();
    sndDrop.play();
  }

  var fingers = {};

  function getFinger(key) {
    var finger = fingers[key];
    if (!finger) {
      finger = game.add.sprite(0, 0, 'finger');
      finger.scale.set(window.devicePixelRatio || 1);
      fingers[key] = finger;
    }
    return finger;
  }

  function repulseCircles(fingerKey, x) {
    if (x < 0) x = 0;
    if (x > game.world.width) x = game.world.width;
    var point = new Phaser.Point(x, game.world.height);
    circles.forEach(function(circle) {
      setVelocity(point, circle.body);
    });

    var finger = getFinger(fingerKey);
    finger.x = x - finger.width * 0.3;
    finger.y = game.world.height - finger.height * 0.5;
    finger.bringToTop();
    sndFire.play();
  }

  function setVelocity(point, body) {
    var dist = Phaser.Point.distance(point, body);
    var angl = Phaser.Point.angle(point, body);
    body.velocity.x -= 200000 * Math.cos(angl) / dist;
    body.velocity.y -= 200000 * Math.sin(angl) / dist;
  }

  function update() {
    circles.forEach(function(circle) {
      if (circle.y < -2 * circleSize) {
        var idx = circles.indexOf(circle);
        circles.splice(idx, 1);
        circle.destroy();
      }
    });
  }

  game.state.add('main', {
    preload: preload,
    create: create,
    update: update
  });
  game.state.start('main');
}

window.createGame = createGame;

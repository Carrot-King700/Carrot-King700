// import kaboom.js
console.log("here")
import kaplay from "https://unpkg.com/kaplay@3001.0.1/dist/kaplay.mjs";

kaplay({
  background: [0, 0, 0],
})

loadSprite("ship", "imgs/ship.png")
loadSprite("bullet", "imgs/bullet.png")
loadSprite("explosion", "imgs/Explode.png")
const objs = [
  "asteroid_0_1",
  "asteroid_0_2",
  "asteroid_0_3",
  "asteroid_1_1",
  "asteroid_1_2",
  "asteroid_1_3",
  "asteroid_2_1",
  "asteroid_2_2",
  "asteroid_2_3",
]
for (const obj of objs) {
  loadSprite(obj, `imgs/${obj}.png`)
}

function wrap() {
  return {
    id: "wrap",
    require: ["pos", "area"],
    update() {
      if (this.pos.x > width()) {
        this.pos.x = 0
      }
      if (this.pos.x < 0) {
        this.pos.x = width()
      }
      if (this.pos.y > height()) {
        this.pos.y = 0
      }
      if (this.pos.y < 0) {
        this.pos.y = height()
      }
    }
  }
}

const ROT_SPEED = 3
const ACC = 1
scene("game", () => {
  let paused = false
  let nAsteroids = 0
  let lives = 3
  let alive = true
  let BULLET_SPEED = 1200
  const player = add([
    sprite("ship"),
    pos(width() / 2, height() / 2),
    area({
      shape: new Rect(vec2(-16), 32, 32)
    }),
    scale(1),
    body(),
    anchor("center"),
    rotate(0),
    scale(0.1),
    wrap()
  ])

  const pauseMenu = add([
    rect(300, 200),
    color(204, 85, 0),
    anchor("center"),
    pos(center()),
    z(100),
  ])

  const resumeText = add([
    text("Press ESC to Resume", { size: 18 }),
    color(0, 0, 0),
    anchor("center"),
    pos(center().add(0, -30)),
    z(100),
  ])
  pauseMenu.hidden = true
  resumeText.hidden = true

  function togglePause() {
    paused = !paused

    pauseMenu.hidden = !paused
    resumeText.hidden = !paused
    debug.paused = paused

    if (paused) {
      console.log("Game Paused")
    } else {
      console.log("Game Resumed")
    }
  }

  onKeyPress("escape", () => {
    togglePause()
  })

  onKeyDown("left", () => {
    if(!paused) {player.angle -= ROT_SPEED}
  })
  onKeyDown("right", () => {
    if(!paused) {player.angle += ROT_SPEED}
  })
  onKeyDown("up", () => {
    if(!paused) {
    player.vel = player.vel.add(Vec2.fromAngle(player.angle).scale(ACC))
    }
  })


  player.onUpdate(() => {
    player.move(player.vel)
  })



  onKeyPress("space", () => {
    if (alive && !paused) {
      spawnBullet(player.pos)
      player.vel = player.vel.add(Vec2.fromAngle(player.angle + 180).scale(ACC * 10))
    } else {
      console.log("dead")
    }

  })


  function spawnBullet(p) {
    add([
      sprite("bullet"),
      area(),
      pos(p),
      anchor("center"),
      outline(1),
      {
        moveVec: Vec2.fromAngle(player.angle).scale(BULLET_SPEED),
      },
      offscreen({ destroy: true }),
      rotate(player.angle),
      "bullet",
      wrap()
    ])
  }
  //asteroid_1_1
  function getAsteroidObjs(size) {
    let objs = []
    for (let i = 1; i <= 3; i++) {
      let str = "asteroid_"
      str += size
      str += "_" + i
      objs.push(str)
    }
    return objs
  }

  function getRandomPos() {
    let pos = vec2()
    pos.x = rand(0, width())
    pos.y = rand(0, height())
    if (player.pos.dist(pos) < 200) return getRandomPos()
    else return pos
  }
  function spawnAsteroid(size, start) {
    nAsteroids++
    const name = choose(getAsteroidObjs(size))
    let asteroid = add([
      sprite(name),
      area(),
      pos(start.x, start.y),
      health(3),
      anchor("center"),
      "asteroid",
      "enemy",
      { speed: vec2(rand(-50, 50), rand(-50, 50)) },
      { ROT_SPEED: rand(-10, 10) },
      scale(0.2),
      wrap(),
      rotate(0),
    ])
    asteroid.size = size
  }
  onUpdate("asteroid", (r) => {
    r.move(r.speed)
    r.angle += r.ROT_SPEED 
    if (Math.abs(r.ROT_SPEED) > 1) r.ROT_SPEED *= 0.99
  })

  onUpdate("bullet", (r) => {
    if (!r.range) {
      r.range = 190
    }
    r.range--
    if (r.range === 0) destroy(r)
    r.move(r.moveVec)
    r.range--
    if (r.range === 0) destroy(r)
  })


  onCollide("asteroid", "bullet", (a, b) => {
    destroy(a)
    nAsteroids--
    console.log("SIZE: ", a.size)
    destroy(b)
    if (a.size === 0) return
    spawnAsteroid(a.size - 1, a.pos)
    spawnAsteroid(a.size - 1, a.pos)
    spawnAsteroid(a.size - 1, a.pos)
    spawnAsteroid(a.size - 1, a.pos)
    console.log("Current asteroid count: " + nAsteroids)
  })


  player.onCollide("asteroid", (a) => {
    lives--
    if (lives === 0) {
      console.log("Your Dead")  
    } else {
      setTimeout(function () {
        // respawn with Iframes
        // display the score on the screen
      }, 3000)
    }
    alive = false
    destroy(a)
    destroy(player)
    shake(120)
    if (a.size === 0) return
    spawnAsteroid(a.size - 1, a.pos)
    spawnAsteroid(a.size - 1, a.pos)
    spawnAsteroid(a.size - 1, a.pos)
    spawnAsteroid(a.size - 1, a.pos)
  })

  spawnAsteroid(2, getRandomPos())
  spawnAsteroid(2, getRandomPos())
  spawnAsteroid(2, getRandomPos())
  spawnAsteroid(2, getRandomPos())
  spawnAsteroid(2, getRandomPos())
})
go("game")
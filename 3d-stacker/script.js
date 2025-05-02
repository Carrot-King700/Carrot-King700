let olds, level, dim, t, block, speed
let shape
let fading = []
let gameOver
let scoreDiv = document.getElementById("score")
function preload() {
    shape = loadModel("rocket.obj")
}
function setup() {
    createCanvas(500,500,WEBGL).parent("game")
    fading = olds || []
    block = {
        x: 0,
        y: 0,
        z: 0,
        w: 50,
        d: 50
    }
    olds = []
    olds [0] = {
        x: 0,
        y: 10,
        z: 0,
        w: 50,
        d: 50
    }
    gameOver = false
    level = 0
    t = 0
    speed = 1.5
    dim = "x"
    colorMode(HSB, 100)
    angleMode(DEGREES)
}

function draw() {
    t+=1
    let shift = sin(t*speed)*100
    background(0,0,60)
    block[dim] = shift
    block.y = -level*10
    let camY = -200 - level * 8
    let camDist = 200 - level * 2
    let focus = -40 - level * 2
    camera(camDist, camY, camDist, 0, focus, 0)
    if(!gameOver) drawBlock(block)
    olds.forEach(drawOld)
    reverseFades()
    scoreDiv.innerText = level
}

function drawBlock(b) {
    push()
    translate(b.x, b.y, b.z)
    fill(((b.y-10)/-2)%100, 50, 100, 80)
    stroke("#c50")
    //stroke(((b.y-10)/-2)%100, 50, 80)
    box(b.w, 10, b.d)
    translate(15, -5, 10)
    rotateX(90)
    rotateZ(180)
    noStroke()
    fill("green")
    model(shape)
    pop()
}

function drawOld(b) {
    push()
    fill(((b.y-10)/-2)%100, 50, 100, 80)
    stroke("#c50")
    //stroke(((b.y-10)/-2)%100, 50, 80)
    translate(b.x, b.y, b.z)
    box(b.w, 10, b.d)
    pop()
}

function drawFading(b) {
    if(b.alpha<=0 || !b.alpha) return
    push()
    fill(((b.y-10)/-2)%100, 50, 100, 0)
    stroke(((b.y-10)/-2)%100, 50, 80, b.alpha)
    translate(b.x, b.y, b.z)
    box(b.w, 10, b.d)
    b.y -= 0.5
    b.alpha -= 0.8
    pop()
}

function mousePressed() {
    if(gameOver) return setup()
    t = 0
    let last = olds[level]
    level++
    if(level%4>=2) t+=180/speed
    olds.push(
        {
            x: block.x,
            y: block.y,
            z:block.z,
            w: block.w,
            d: block.d,
            alpha: 100
        }
    )
    fading.push(
        {
            x: block.x,
            y: block.y,
            z:block.z,
            w: block.w,
            d: block.d,
            alpha: 100
        }
    )
    let lastFall = fading[fading.length-1]
    let dist = last[dim] - block[dim]
    let dir = dist/abs(dist)
    last = olds[level]
    last[dim] += dist/2
    block[dim] = last[dim]
    if(dim === "x") {
        last.w -= abs(dist)
        block.w = last.w
        lastFall.w = abs(dist)
        lastFall.x -= block.w/2*dir
        dim="z"
    }
    else {
        last.d -= abs(dist)
        block.d = last.d
        lastFall.d = abs(dist)
        lastFall.z -= block.d/2*dir
        dim = "x"
    }
    let size = block.d * block.w
    if(size < 5) {
        olds.pop()
        fading.pop()
        gameOver = true
        level--
    }  
    speed = 1.5 + level * 0.1
}

function reverseFades(){
    for(let i = fading.length-1 ; i >= 0 ; i--) {
        drawFading(fading[i])
    }
}
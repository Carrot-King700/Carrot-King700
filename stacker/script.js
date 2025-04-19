const SPACEBAR = 32
let g = {}
function setup() {
    g.rows = 12
    g.cols = 7
    g.level = 0
    g.lives = 3
    g.moveDelay = 12
    g.oldChunks = []
    g.fallingChunks = []
    g.sq = windowHeight / (g.rows + 4)
    g.offset = 0
    g.moving = true
    g.direction = 1
    g.over = false
    g.moveFrame = null
    createCanvas((g.cols+2) * g.sq, (g.rows+2) * g.sq).parent("game")
    document.getElementById("score").innerText = 0
}

function draw() {
    background("navy")
    drawGrid()
    if(!g.over) drawCurrent()
    drawOld()
    drawFallingChunks()
}

function drawGrid() {
    fill("#c50")
    stroke("#123abc")
    for(let y = 0 ; y < g.rows ; y++) {
        for(let x = 0 ; x < g.cols ; x++) {
            let px = x * g.sq + g.sq
            let py = y * g.sq + g.sq
            rect(px, py, g.sq)
        }
    }
}

function drawCurrent() {
    if(frameCount % g.moveDelay === 0) {
        g.offset += g.direction
        if(g.offset >= g.cols -1) g.direction = -1
        if(g.offset <= -(g.lives-1)) g.direction = 1
    }
    for(let i = 0 ; i < g.lives; i++) {
        let myOffset = g.offset + i 
        let x = myOffset * g.sq + g.sq
        let y = (g.rows - g.level) * g.sq
        fill("#18bc9c")
        let onGrid = myOffset >= 0 && myOffset < g.cols
        if(onGrid) rect(x, y, g.sq)
    }
}


function keyPressed() {
    if(g.over) return setup()
    if(keyCode !== SPACEBAR) return
    let currentChunk = []
    let oldLives = g.lives
    g.lives = 0
    for(let i = 0 ; i < oldLives; i++) {
        let onGround = g.level === 0
        let myOffset = g.offset + i
        let onOld = !onGround && g.oldChunks[g.level-1].indexOf(myOffset) > -1
        if(onGround || onOld) {
            currentChunk.push(myOffset)
            g.lives++
        } else {
            let obj = {}
            obj.x = myOffset
            obj.y = g.rows - g.level - 1
            g.fallingChunks.push(obj)
        }
    }
    g.oldChunks.push(currentChunk)
    g.level++
    if(g.level%3===0) g.moveDelay-=2
    if(g.lives === 0) g.over = true
    if(g.level === g.rows) g.over = true
    if(!g.over) document.getElementById("score").innerText = g.level
}


function drawOld() {
    for(let level = 0 ; level < g.oldChunks.length ; level++) {
        let chunk = g.oldChunks[level]
        for(let i = 0 ; i < chunk.length; i++) {
            let myOffset = chunk[i]
            let x = myOffset * g.sq + g.sq
            let y = (g.rows - level) * g.sq
            fill("#11806a")
            let onGrid = myOffset >= 0 && myOffset < g.cols
            if(onGrid) rect(x, y, g.sq)
        }
    }
}

function drawFallingChunks() {
    fill("#02dcf0")
    let kept = []
    for(let i = 0 ; i < g.fallingChunks.length; i++) {
        let chunk = g.fallingChunks[i]
        let x = chunk.x * g.sq + g.sq
        let y = chunk.y * g.sq + g.sq
        if(frameCount%15===0) chunk.y++
        if(x<g.sq) continue
        if(x>=width-g.sq) continue
        rect(x, y, g.sq)
        if(chunk.y < g.rows) kept.push(chunk)
    }
    g.fallingChunks = kept
}
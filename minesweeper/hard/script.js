let g
function setup() {
    g = {}
    g.width = 30
    g.height = 30
    g.sq = 25
    g.nBombs = 225
    g.marked = 0
    g.dead = false
    g.startTime = millis()
    g.currTime = millis()
    g.started = false
    g.win = false
    g.debug = false
    createCanvas(g.width * g.sq, (g.height + 2.5) * g.sq)
    textAlign(CENTER, CENTER)
    document.addEventListener('contextmenu', event => event.preventDefault())
    background(100)
    makeCells()
}

function draw() {
    if (!g.dead && !g.win) drawCells()
    else drawEnd()
    drawFooter()
}

function drawEnd() {
    for (let key in g.cells) {
        let cell = g.cells[key]
        if (cell.bomb) {
            fill("red")
            let x = cell.x * g.sq
            let y = cell.y * g.sq
            rect(x + 1, y + 1, g.sq - 2, g.sq - 2)
        }
    }
}

function makeCells() {
    g.cells = {}
    for (let x = 0; x < g.width; x++) {
        for (let y = 0; y < g.height; y++) {
            let key = x + ":" + y
            let cell = {}
            cell.key = key
            cell.x = x
            cell.y = y
            cell.marked = false
            g.cells[key] = cell
        }
    }

}

function placeBombs(not) {
    let bombs = 0
    while (bombs < g.nBombs) {
        let x = floor(random(g.width))
        let y = floor(random(g.height))
        let key = x + ":" + y
        if (key === not) continue
        let cell = g.cells[key]
        if (!cell.bomb) {
            cell.bomb = true
            bombs++
        }
    }
}

function drawCells() {
    for (let key in g.cells) {
        drawCell(g.cells[key])
    }
}

function drawCell(cell) {
    push()
    stroke(100)
    fill('lightgreen')
    if (cell.bomb && g.debug) stroke("red")
    if (cell.marked) fill("red")
    if (cell.count > -1) fill(200)
    let x = cell.x * g.sq
    let y = cell.y * g.sq
    rect(x + 1, y + 1, g.sq - 2, g.sq - 2)
    fill("black")
    if (cell.count) text(cell.count, x + g.sq / 2, y + g.sq / 2)
    pop()
}

function mousePressed() {
    if (g.dead || g.win) return setup()
    let x = floor(mouseX / g.sq)
    let y = floor(mouseY / g.sq)
    if (mouseButton === LEFT) trigger(x, y)
    else if (mouseButton === RIGHT) mark(x, y)
    g.win = winCheck()
    if(g.win) drawCells()
}

function trigger(x, y) {
    console.log(`Trigger: ${x},${y}`)
    let key = x + ":" + y
    let cell = g.cells[key]
    if (!cell) return
    if (!g.started) {
        g.started = true
        placeBombs(key)
    }
    cell.triggered = true
    let ns = getNeighbors(x, y)
    cell.count = countBombs(ns)
    if (cell.count === 0) {
        ns.forEach(function (cell) {
            if (cell && !cell.triggered) trigger(cell.x, cell.y)
        })
    }
    if (cell.bomb) g.dead = true
}

function countBombs(ns) {
    let n = 0
    ns.forEach(function (cell) {
        if (cell && cell.bomb) n++
    })
    return n
}

function getNeighbors(x, y) {
    let ns = []
    ns.push(g.cells[(x + 1) + ":" + (y + 0)])
    ns.push(g.cells[(x - 1) + ":" + (y + 0)])
    ns.push(g.cells[(x + 1) + ":" + (y + 1)])
    ns.push(g.cells[(x - 1) + ":" + (y + 1)])
    ns.push(g.cells[(x + 1) + ":" + (y - 1)])
    ns.push(g.cells[(x - 1) + ":" + (y - 1)])
    ns.push(g.cells[(x + 0) + ":" + (y + 1)])
    ns.push(g.cells[(x + 0) + ":" + (y - 1)])
    return ns
}

function mark(x, y) {
    console.log(`Mark: ${x},${y}`)
    let key = x + ":" + y
    let cell = g.cells[key]
    if (!cell || cell.triggered) return
    if (!cell.marked) {
        cell.marked = true
        g.marked++
    } else {
        cell.marked = false
        g.marked--
    }
}

function winCheck() {
    let win = true
    for (let key in g.cells) {
        let cell = g.cells[key]
        if (!cell.triggered && !cell.bomb) win = false
    }
    return win
}

function drawFooter() {
    push()
    fill("black")
    textFont("monospace")
    textSize(g.sq*1.5)
    let sq = g.sq
    let w = sq*3
    let h = sq*2
    let top = (g.height + 0.2) * sq
    let left = 0.25*sq
    let right = (g.width-3.25) * sq
    rect(left, top, w, h,)
    rect(right, top, w, h,)
    fill("red")
    text(g.nBombs-g.marked, left + w/2, top+sq)
    if(!g.win && !g.dead) g.currTime = millis()
    let elapsed = floor((g.currTime-g.startTime)/1000)
    text(elapsed, right+w/2, top+sq)
    if (g.dead) fill("red")
    else if (!g.win) fill("yellow")
    else fill("green")
    rect(((g.width / 2 - 1) * sq), top, h, h)
    textFont("arial")
    let icon
    if (g.dead) icon = "😵"
    else if (!g.win) icon = "😐"
    else icon = "😃"
    text(icon, (g.width/2)*sq , top + sq)
    pop()
}
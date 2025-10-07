let w = null

let mapImage
let depth
let sx, sy, sw, sh
function preload() {
    mapImage = loadImage("map.jpg")
}

function setup() {
    //getWeather("Oakland, CA")
    createCanvas(500, 500).parent("weather") 
    textFont("sans-serif")
    background("black")
    sx = 0
    sy = 0
    sw = mapImage.width
    sh = mapImage.height
    depth = 0
    w = null
}

function draw() {
    if (w) renderWeather()
        else image(mapImage, 0, 0, width, height, sx, sy, sw, sh)
}

function getWeather(loc) {
    let url = "https://wttr.in/"
    url += loc
    url += "?format=j1"
    fetch(url)
        .then(r => { return r.json() })
        .then(json => {
            console.log(json)
            w = json
            resizeCanvas(420, 240)
        })
}

function renderWeather() {
    let cc = w.current_condition[0]
    let na = w.nearest_area[0]
    let area = na.areaName[0].value
    let region = na.region[0].value
    let country = na.country[0].value
    let areaStr = [area, region, country].join(", ")
    let temp = parseFloat(cc.temp_F)
    let feels = parseFloat(cc.FeelsLikeF)
    let cond = cc.weatherDesc[0].value
    let hum = cc.humidity
    let mph = parseFloat(cc.windspeedMiles)
    let deg = parseFloat(cc.winddirDegree)
    drawGradient(temp)
    //area
    textSize(14)
    text(areaStr, 12, 20)
    //big temp
    textSize(46)
    textStyle(BOLD)
    text(round(temp) + "°F", 12, 80)
    //small deets
    textStyle(NORMAL)
    textSize(20)
    let y = 120
    text(cond, 12, y)
    text("Feels Like: " + round(feels) + "°F", 12, y + 25)
    text("Humidity: " + hum + "%", 12, y + 50)
    pop()
    drawCompass(deg, mph)
}

function drawGradient(t) {
    push()
    let cA = color("#5fd6ff")
    let cB = color("#cdc528")
    let cC = color("#ffd000ff")
    let cD = color("#ff6a4d")
    let top
    let bot
    if (t < 60) {
        top = cA
        bot = cB
    } else if (t < 80) {
        top = cB
        bot = cC
    } else {
        top = cC
        bot = cD
    }
    for (let y = 0; y < height; y++) {
        let p = y / (height - 1)
        strokeWeight(2)
        stroke(lerpColor(top, bot, p))
        line(0, y, width, y)
    }
    pop()
}
function drawCompass(deg, mph) {
    let px = width - 160
    let py = 56
    let w = 130
    let h = 140
    let cx = px + w / 2
    let cy = py + h / 2
    push()
    noStroke()
    fill("skyblue")
    rect(px, py, w, h, 8)
    fill("white")
    stroke(0)
    let r = 40
    circle(cx, cy, r * 2)
    for (let d = 0; d < 360; d += 30) {
        let a = radians(d)
        let x0 = cx + cos(a) * (r - 6)
        let y0 = cy + sin(a) * (r - 6)
        let x1 = cx + cos(a) * (r)
        let y1 = cy + sin(a) * (r)
        line(x0, y0, x1, y1)
    }
    noStroke()
    fill("black")
    textSize(14)
    textAlign(CENTER, CENTER)
    text("N", cx, cy - r - 8)
    text("S", cx, cy - r + 89)
    text("E", cx + 48, cy - r + 41)
    text("W", cx - 51, cy - r + 41)
    text("Wind", px + 20, py + 20)
    let a = radians(deg - 90)
    strokeWeight(2)
    stroke(0)
    let len = map(mph, 0, 40, 10, r, true)
    let x = cx - cos(a) * len
    let y = cy - sin(a) * len
    line(cx, cy, x, y)
    translate(x, y)
    rotate(a + PI)
    noStroke()
    fill("green")
    triangle(0, 0, -6,-3, -6,3)
    pop()
    push()
    noStroke()
    textAlign(CENTER, CENTER)
    textSize(14)
    text("Speed: " + mph + " MPH", cx, py+h-10)
    pop()
}

function mousePressed() {
    if(depth < 3) {
        depth++
        zoom(mouseX, mouseY)
    } else if(!w) {
        getLatLon(mouseX, mouseY)
    } else {
        setup
    }
}

function zoom(mx, my) {
    let left = mx < width/2
    let top = my < height/2

    let halfW = sw/2
    let halfH = sh/2

    let offsetX = left ? 0 : halfW
    let offsetY = top ? 0 : halfH

    sx += offsetX
    sy += offsetY
    sw = halfW
    sh = halfH
}

function getLatLon(mx, my) {
    let xView = mx/width
    let yView = my/height

    let xImg = (sx + xView * sw) / mapImage.width
    let yImg = (sy + yView * sh) / mapImage.height

    let lon = (xImg * 360) - 180
    let y = PI * (1 - 2*yImg)
    let lat = (180 / Math.PI) * Math.atan(Math.sinh(y))
    console.log(lat, lon)
    getWeather(lat + "," + lon)
}
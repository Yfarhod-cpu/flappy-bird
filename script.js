

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreText = document.getElementById("finalScore");
const bestScoreText = document.getElementById("bestScore");
const startBestScoreText = document.getElementById("startBestScore");

const baseWidth = 400;
const baseHeight = 600;

const bgImg = new Image();
bgImg.src = "assets/background.png";

const groundImg = new Image();
groundImg.src = "assets/ground.png";

const birdSprites = {
    up: new Image(),
    mid: new Image(),
    down: new Image()
};
birdSprites.up.src = "assets/birds/upflap.png";
birdSprites.mid.src = "assets/birds/midflap.png";
birdSprites.down.src = "assets/birds/downflap.png";

const pipeUpImg = new Image();
pipeUpImg.src = "assets/pipe_up.png";

const pipeDownImg = new Image();
pipeDownImg.src = "assets/pipe_down.png";

const flapSfx = new Audio("assets/woosh.wav");
const slapSfx = new Audio("assets/slap.wav");
const scoreSfx = new Audio("assets/score.wav");

let bird = { x: 90, y: 300, width: 51 * 0.9, height: 36 * 0.9 };
let pipes = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
let velocity = 0;
const gravity = 0.25;
const gap = 220;
const pipeSpeed = 1.2;
let bgX = 0, groundX = 0;
let hasStarted = false;
let gameOver = false;
let flapTimer = 0;

function resetGame() {
    bird.y = 300;
    velocity = 0;
    pipes = [{ x: 400, y: randY(), scored: false }];
    score = 0;
    gameOver = false;
    hasStarted = false;
    flapTimer = 0;
    startOverlay.classList.remove("hidden");
    gameOverOverlay.classList.add("hidden");
    startBestScoreText.textContent = bestScore;
}

function restart() {
    resetGame();
}

function randY() {
    return Math.floor(Math.random() * (280 - 30)) + 30;
}

function jump() {
    if (!hasStarted) {
        hasStarted = true;
        startOverlay.classList.add("hidden");
    }

    if (!gameOver) {
        velocity = -6;
        flapSfx.currentTime = 0;
        flapSfx.play();
    } else {
        restart();
    }
}

function update() {
    if (!gameOver) {
        bgX = (bgX - 0.5) % baseWidth;
        groundX = (groundX - 1) % baseWidth;

        if (hasStarted) {
            velocity += gravity;
            bird.y += velocity;

            pipes.forEach(p => p.x -= pipeSpeed);

            if (pipes[pipes.length - 1].x < 200) {
                pipes.push({ x: 400, y: randY(), scored: false });
            }

            if (pipes[0].x < -80) pipes.shift();

            pipes.forEach(p => {
                if (!p.scored && p.x + 79 < bird.x) {
                    score++;
                    p.scored = true;
                    scoreSfx.play();
                }
            });

            pipes.forEach(p => {
                if (
                    collides(bird.x, bird.y, bird.width, bird.height, p.x, p.y - 360, 79, 360) ||
                    collides(bird.x, bird.y, bird.width, bird.height, p.x, p.y + gap, 79, 360)
                ) {
                    triggerGameOver();
                }
            });

            if (bird.y < -64 || bird.y > baseHeight - 64) {
                triggerGameOver();
            }
        } else {
            flapTimer += 0.1;
        }
    }

    draw();
    requestAnimationFrame(update);
}

function triggerGameOver() {
    gameOver = true;
    slapSfx.play();
    finalScoreText.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
    }
    bestScoreText.textContent = bestScore;
    gameOverOverlay.classList.remove("hidden");
}

function draw() {
    ctx.clearRect(0, 0, baseWidth, baseHeight);

    ctx.drawImage(bgImg, bgX, 0, baseWidth, baseHeight);
    ctx.drawImage(bgImg, bgX + baseWidth - 1, 0, baseWidth, baseHeight);

    pipes.forEach(p => {
        ctx.drawImage(pipeDownImg, p.x, p.y - 360, 79, 360);
        ctx.drawImage(pipeUpImg, p.x, p.y + gap, 79, 360);
    });

    ctx.drawImage(groundImg, groundX, 536, baseWidth, 64);
    ctx.drawImage(groundImg, groundX + baseWidth, 536, baseWidth, 64);

    // Bird direction & rotation
    let sprite;
    if (!hasStarted) {
        sprite = Math.floor(flapTimer) % 2 === 0 ? birdSprites.mid : birdSprites.up;
    } else if (velocity < -2) {
        sprite = birdSprites.up;
    } else if (velocity > 2) {
        sprite = birdSprites.down;
    } else {
        sprite = birdSprites.mid;
    }

    let angle = Math.max(Math.min(velocity * 3, 25), -25);
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(angle * Math.PI / 180);
    ctx.drawImage(sprite, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    ctx.restore();

    if (hasStarted && !gameOver) {
        ctx.fillStyle = "white";
        ctx.font = "60px Reg";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#000000";
        ctx.strokeText(score, baseWidth / 2 - 15, 80);
        ctx.fillText(score, baseWidth / 2 - 15, 80);
    }
}

function collides(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
        x2 < x1 + w1 &&
        y1 < y2 + h2 &&
        y2 < y1 + h1;
}

window.addEventListener("keydown", e => {
    if (e.code === "Space") jump();
});

window.addEventListener("mousedown", jump);

window.addEventListener("touchstart", (e) => {
    e.preventDefault();
    jump();
}, { passive: false });

function resizeCanvas() {
    const container = document.getElementById('container');
    const canvas = document.getElementById('board');
    const aspect = 2 / 3;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
        canvas.style.marginTop = "-50px";
        document.querySelector('footer').style.bottom = '8vh';
    }

    if (width / height > aspect) {
        width = height * aspect;
    } else {
        height = width / aspect;
    }

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
const assetsToLoad = [
    bgImg, groundImg,
    birdSprites.up, birdSprites.mid, birdSprites.down,
    pipeUpImg, pipeDownImg,
    flapSfx, slapSfx, scoreSfx
];

let assetsLoaded = 0;
const loadingOverlay = document.getElementById("loadingOverlay");

function checkAllAssetsLoaded() {
    assetsLoaded++;
    if (assetsLoaded === assetsToLoad.length) {
        // Hide loading, start game
        loadingOverlay.classList.add("hidden");
        startOverlay.classList.remove("hidden");

        resetGame();
        update();

    }
}

assetsToLoad.forEach(asset => {
    if (asset instanceof HTMLImageElement) {
        asset.onload = checkAllAssetsLoaded;
    } else if (asset instanceof HTMLAudioElement) {
        asset.oncanplaythrough = checkAllAssetsLoaded;
    }
});

///pwa
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
}

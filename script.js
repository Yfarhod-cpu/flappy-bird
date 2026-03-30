const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();

    try {
        tg.disableVerticalSwipes?.();
    } catch (e) {
        console.log("disableVerticalSwipes not available", e);
    }

    document.body.style.overscrollBehavior = "none";
}

console.log("Telegram WebApp available:", !!tg);
console.log("Telegram initData exists:", !!tg?.initData);
console.log("Telegram user:", tg?.initDataUnsafe?.user || null);

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
let bestScore = parseInt(localStorage.getItem("bestScore"), 10) || 0;
let velocity = 0;
const gravity = 0.25;
const gap = 220;
const pipeSpeed = 1.2;
let bgX = 0;
let groundX = 0;
let hasStarted = false;
let gameOver = false;
let flapTimer = 0;
let scoreSubmitted = false;

async function submitScoreToBackend(scoreValue) {
    if (!tg || !tg.initData) {
        console.log("Telegram initData not available, skip submit");
        return;
    }

    if (!Number.isInteger(scoreValue) || scoreValue < 0) {
        console.log("Invalid score, skip submit:", scoreValue);
        return;
    }

    try {
        console.log("Submitting score:", scoreValue);

        const res = await fetch("https://tel-tetris.vercel.app/api/submit-score", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                gameKey: "flappy",
                score: scoreValue,
                initData: tg.initData
            })
        });

        const data = await res.json().catch(() => ({}));
        console.log("submit-score response:", res.status, data);
    } catch (err) {
        console.error("submit-score failed:", err);
    }
}

function updateLocalBestScore(scoreValue) {
    if (scoreValue > bestScore) {
        bestScore = scoreValue;
        localStorage.setItem("bestScore", String(bestScore));
    }

    bestScoreText.textContent = bestScore;
    startBestScoreText.textContent = bestScore;
}

function resetGame() {
    bird.y = 300;
    velocity = 0;
    pipes = [{ x: 400, y: randY(), scored: false }];
    score = 0;
    gameOver = false;
    hasStarted = false;
    flapTimer = 0;
    scoreSubmitted = false;

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
        flapSfx.play().catch(() => { });
    } else {
        restart();
    }
}

function triggerGameOver() {
    if (gameOver) return;

    gameOver = true;
    slapSfx.play().catch(() => { });

    finalScoreText.textContent = score;
    updateLocalBestScore(score);
    gameOverOverlay.classList.remove("hidden");

    if (!scoreSubmitted) {
        scoreSubmitted = true;
        submitScoreToBackend(score);
    }
}

function update() {
    if (!gameOver) {
        bgX = (bgX - 0.5) % baseWidth;
        groundX = (groundX - 1) % baseWidth;

        if (hasStarted) {
            velocity += gravity;
            bird.y += velocity;

            pipes.forEach((p) => {
                p.x -= pipeSpeed;
            });

            if (pipes[pipes.length - 1].x < 200) {
                pipes.push({ x: 400, y: randY(), scored: false });
            }

            if (pipes[0].x < -80) {
                pipes.shift();
            }

            pipes.forEach((p) => {
                if (!p.scored && p.x + 79 < bird.x) {
                    score++;
                    p.scored = true;
                    scoreSfx.currentTime = 0;
                    scoreSfx.play().catch(() => { });
                }
            });

            pipes.forEach((p) => {
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

function draw() {
    ctx.clearRect(0, 0, baseWidth, baseHeight);

    ctx.drawImage(bgImg, bgX, 0, baseWidth, baseHeight);
    ctx.drawImage(bgImg, bgX + baseWidth - 1, 0, baseWidth, baseHeight);

    pipes.forEach((p) => {
        ctx.drawImage(pipeDownImg, p.x, p.y - 360, 79, 360);
        ctx.drawImage(pipeUpImg, p.x, p.y + gap, 79, 360);
    });

    ctx.drawImage(groundImg, groundX, 536, baseWidth, 64);
    ctx.drawImage(groundImg, groundX + baseWidth, 536, baseWidth, 64);

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

    const angle = Math.max(Math.min(velocity * 3, 25), -25);

    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
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
    return (
        x1 < x2 + w2 &&
        x2 < x1 + w1 &&
        y1 < y2 + h2 &&
        y2 < y1 + h1
    );
}

window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        jump();
    }
});

window.addEventListener("mousedown", jump);

window.addEventListener("touchstart", (e) => {
    e.preventDefault();
    jump();
}, { passive: false });

function resizeCanvas() {
    const board = document.getElementById("board");
    const footer = document.querySelector("footer");
    const aspect = 2 / 3;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
        board.style.marginTop = "-50px";
        if (footer) {
            footer.style.bottom = "8vh";
        }
    } else {
        board.style.marginTop = "0";
        if (footer) {
            footer.style.bottom = "";
        }
    }

    if (width / height > aspect) {
        width = height * aspect;
    } else {
        height = width / aspect;
    }

    board.style.width = width + "px";
    board.style.height = height + "px";
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const assetsToLoad = [
    bgImg,
    groundImg,
    birdSprites.up,
    birdSprites.mid,
    birdSprites.down,
    pipeUpImg,
    pipeDownImg,
    flapSfx,
    slapSfx,
    scoreSfx
];

let assetsLoaded = 0;
const loadingOverlay = document.getElementById("loadingOverlay");

function checkAllAssetsLoaded() {
    assetsLoaded++;

    if (assetsLoaded === assetsToLoad.length) {
        loadingOverlay.classList.add("hidden");
        startOverlay.classList.remove("hidden");
        resetGame();
        update();
    }
}

assetsToLoad.forEach((asset) => {
    if (asset instanceof HTMLImageElement) {
        if (asset.complete) {
            checkAllAssetsLoaded();
        } else {
            asset.onload = checkAllAssetsLoaded;
            asset.onerror = checkAllAssetsLoaded;
        }
    } else if (asset instanceof HTMLAudioElement) {
        asset.oncanplaythrough = checkAllAssetsLoaded;
        asset.onerror = checkAllAssetsLoaded;
    }
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
        .then((reg) => console.log("Service Worker registered:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
}
import * as THREE from 'three';

// --- 1. OPPSETT ---
const scene = new THREE.Scene();
const nightColor = 0x1a0b2e; 
scene.fog = new THREE.Fog(nightColor, 30, 120); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; 
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0); 
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();

// BILDER
const avatarRunTexture = textureLoader.load('assets/viking_lop.png'); 
const avatarSurfTexture = textureLoader.load('assets/vikingrygg.png'); 
const shieldTexture = textureLoader.load('assets/vikingskjold.png');
const mjodTexture = textureLoader.load('assets/mjod.png');
const bakgrunnTexture = textureLoader.load('assets/vei.png'); 
const landsbyTexture = textureLoader.load('assets/bakgrunn.png');
const skipFrontTexture = textureLoader.load('assets/skip_front.png'); 

// DEKORASJON
const treTexture = textureLoader.load('assets/tre.png');
const steinTexture = textureLoader.load('assets/stein.png');
const husTexture = textureLoader.load('assets/hus.png'); 
const tonneTexture = textureLoader.load('assets/tonne.png');
const reklameTexture = textureLoader.load('assets/reklame.png');

// UI & POWERUPS
const powerup2xTexture = textureLoader.load('assets/combo2x.png');
const powerup5xTexture = textureLoader.load('assets/combo5x.png');
const powerup10xTexture = textureLoader.load('assets/combo10x.png');

// FIX AV TEKSTURER
bakgrunnTexture.wrapS = THREE.RepeatWrapping;
bakgrunnTexture.wrapT = THREE.RepeatWrapping;
bakgrunnTexture.repeat.set(1, 40); 
bakgrunnTexture.colorSpace = THREE.SRGBColorSpace;

avatarRunTexture.colorSpace = THREE.SRGBColorSpace;
avatarSurfTexture.colorSpace = THREE.SRGBColorSpace;
shieldTexture.colorSpace = THREE.SRGBColorSpace;
mjodTexture.colorSpace = THREE.SRGBColorSpace;
treTexture.colorSpace = THREE.SRGBColorSpace;
husTexture.colorSpace = THREE.SRGBColorSpace;
reklameTexture.colorSpace = THREE.SRGBColorSpace;
powerup2xTexture.colorSpace = THREE.SRGBColorSpace;
powerup5xTexture.colorSpace = THREE.SRGBColorSpace;
powerup10xTexture.colorSpace = THREE.SRGBColorSpace;
skipFrontTexture.colorSpace = THREE.SRGBColorSpace;

// --- 2. LYS ---
const ambientLight = new THREE.AmbientLight(0xccccff, 0.4); 
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xaaccff, 0.6); 
dirLight.position.set(10, 50, 20);
dirLight.castShadow = true; 
scene.add(dirLight);

// --- 3. SPILLER ---
const playerGroup = new THREE.Group();
const playerLight = new THREE.PointLight(0xffaa00, 0.8, 20);
playerLight.position.set(0, 3, 2);
playerGroup.add(playerLight);

const vikingGeo = new THREE.PlaneGeometry(2, 2); 
const vikingMat = new THREE.MeshStandardMaterial({ 
    map: avatarRunTexture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 
}); 
const vikingMesh = new THREE.Mesh(vikingGeo, vikingMat);
vikingMesh.position.y = 0.9; 
vikingMesh.castShadow = true;
playerGroup.add(vikingMesh); 

const shieldGeo = new THREE.PlaneGeometry(1.5, 1.5); 
const shieldMat = new THREE.MeshStandardMaterial({ 
    map: shieldTexture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5
});
const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
shieldMesh.position.y = -0.1; 
shieldMesh.rotation.x = -1.5; 
shieldMesh.visible = false; 
playerGroup.add(shieldMesh); 

let currentLane = 0;
const laneWidth = 3; 
let targetX = 0; 

// BEVEGELSE
let isJumping = false;
let verticalVelocity = 0;
const gravity = 0.018;     
const jumpStrength = 0.4; 
const groundLevel = 1.5;   

const RUN_SPEED = 0.4;
const SURF_SPEED = 0.7;
let currentSpeed = RUN_SPEED;
let hasShield = false;
let shieldTimer = 0;
const SHIELD_DURATION = 7.0; 

playerGroup.position.y = groundLevel; 
scene.add(playerGroup);


// --- 4. VERDEN ---
const roadGeometry = new THREE.PlaneGeometry(12, 1000);
const roadMaterial = new THREE.MeshStandardMaterial({ map: bakgrunnTexture, roughness: 0.8 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2; 
road.position.z = -400; 
road.receiveShadow = true;
scene.add(road);

function createSnowBanks() {
    const bankGeo = new THREE.PlaneGeometry(100, 1000); 
    const bankMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 1.0 }); 
    const leftBank = new THREE.Mesh(bankGeo, bankMat);
    leftBank.rotation.x = -Math.PI / 2; leftBank.position.set(-56, -0.05, -400); leftBank.receiveShadow = true;
    scene.add(leftBank);
    const rightBank = new THREE.Mesh(bankGeo, bankMat);
    rightBank.rotation.x = -Math.PI / 2; rightBank.position.set(56, -0.05, -400); rightBank.receiveShadow = true;
    scene.add(rightBank);
}
createSnowBanks();

const seaGeometry = new THREE.PlaneGeometry(1000, 1000);
const seaMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0515 }); 
const sea = new THREE.Mesh(seaGeometry, seaMaterial);
sea.rotation.x = -Math.PI / 2; sea.position.y = -2; sea.position.z = -450;
scene.add(sea);


// --- 5. LOGIKK & UI ---
camera.position.set(0, 5, 8); 
camera.lookAt(0, 2, -10); 

let score = 0;
let gameOver = false; 
let isPaused = false; 
let gameTime = 0; 

const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time-text');
const comboContainer = document.getElementById('combo-container');
const comboImage = document.getElementById('combo-image');
const timerBarFill = document.getElementById('timer-bar-fill');
const comboTextFallback = document.getElementById('combo-text-fallback');
const pauseScreen = document.getElementById('pause-screen');

// Leaderboard elementer
const leaderboardScreen = document.getElementById('leaderboard-screen');
const leaderboardList = document.getElementById('leaderboard-list');
const finalScoreSpan = document.getElementById('final-score');
const saveContainer = document.getElementById('save-score-container');

// SKJOLD UI
const shieldContainer = document.getElementById('shield-container');
const shieldBarFill = document.getElementById('shield-bar-fill');

let currentMultiplier = 1; 
let powerupTimer = 0;
const POWERUP_DURATION = 10.0; 
const MAX_MULTIPLIER = 25; 
const clock = new THREE.Clock();

function changeLane(direction) {
    if (gameOver || isPaused) return; 
    const targetLane = currentLane + direction;
    if (targetLane >= -1 && targetLane <= 1) {
        currentLane = targetLane;
        targetX = currentLane * laneWidth;
        playerGroup.rotation.z = -direction * 0.2;
        setTimeout(() => { playerGroup.rotation.z = 0; }, 200);
    }
}

function jump() {
    if (gameOver || isPaused) return;
    if (!isJumping && playerGroup.position.y <= groundLevel + 0.1) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
}

function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.style.display = 'block';
    } else {
        pauseScreen.style.display = 'none';
        clock.getDelta(); 
    }
}

window.restartGame = function() {
    location.reload();
}

window.addEventListener('keydown', (event) => {
    if (gameOver) {
        const activeElement = document.activeElement;
        const isTyping = activeElement && activeElement.tagName === 'INPUT';
        if (!isTyping && (event.key === 'Enter' || event.key === ' ')) {
            restartGame();
        }
        return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'a') changeLane(-1);
    if (event.key === 'ArrowRight' || event.key === 'd') changeLane(1);
    if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w') jump();
    if (event.key === 'Enter' || event.key === 'p') togglePause();
});

let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    if (isPaused) togglePause();
}, false);

document.addEventListener('touchend', (e) => {
    if (gameOver || isPaused) return;
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY);
}, false);

function handleSwipe(startX, endX, startY, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;
    const threshold = 30; 
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) changeLane(1); 
            else changeLane(-1); 
        }
    } else {
        if (Math.abs(diffY) > threshold) {
            if (diffY < 0) jump(); 
        }
    }
}

// --- SKJOLD LOGIKK ---
function activateShield() {
    hasShield = true;
    shieldTimer = SHIELD_DURATION;
    shieldMesh.visible = true;
    vikingMat.map = avatarSurfTexture;
    vikingMat.map.repeat.set(1, 1); 
    vikingMat.map.offset.x = 0;
    
    currentSpeed = SURF_SPEED;
    if(shieldContainer) {
        shieldContainer.style.display = 'block';
        const img = document.getElementById('shield-ui-img');
        if(img) {
            img.style.animation = 'none';
            img.offsetHeight;
            img.style.animation = 'popIn 0.3s ease-out';
        }
    }
}

function deactivateShield() {
    hasShield = false;
    shieldMesh.visible = false;
    vikingMat.map = avatarRunTexture; 
    currentSpeed = RUN_SPEED;
    if(shieldContainer) shieldContainer.style.display = 'none';
}

// --- MULTIPLIER LOGIKK ---
function activateMultiplier(value) {
    if (currentMultiplier > 1) {
        currentMultiplier += value;
    } else {
        currentMultiplier = value;
    }
    if (currentMultiplier > MAX_MULTIPLIER) currentMultiplier = MAX_MULTIPLIER;
    powerupTimer = POWERUP_DURATION; 
    updateComboUI();
}

function updateComboUI() {
    if (comboContainer) { 
        comboContainer.style.display = 'block';
        const validImages = [2, 5, 10];
        
        if (validImages.includes(currentMultiplier)) {
            comboImage.style.display = 'block';
            if(comboTextFallback) comboTextFallback.style.display = 'none';
            comboImage.src = `assets/combo${currentMultiplier}x.png`;
            comboImage.style.animation = 'none';
            comboImage.offsetHeight; 
            comboImage.style.animation = 'popIn 0.3s ease-out';
        } else {
            comboImage.style.display = 'none';
            if(comboTextFallback) {
                comboTextFallback.style.display = 'block';
                comboTextFallback.innerText = currentMultiplier + "X";
                comboTextFallback.style.animation = 'none';
                comboTextFallback.offsetHeight; 
                comboTextFallback.style.animation = 'popIn 0.3s ease-out';
            }
        }
    }
}

function deactivateMultiplier() {
    currentMultiplier = 1;
    if (comboContainer) comboContainer.style.display = 'none';
}

function triggerGameOver() {
    if (hasShield) {
        deactivateShield();
        playerGroup.position.y = 4; 
        verticalVelocity = 0.2; 
        isJumping = true;
        return; 
    }

    gameOver = true;
    currentSpeed = 0; 
    
    if (leaderboardScreen) {
        leaderboardScreen.style.display = 'block';
        finalScoreSpan.innerText = score.toLocaleString();
        fetchLeaderboard();
    } else {
        alert("Game Over! Score: " + score);
        location.reload();
    }
}

async function fetchLeaderboard() {
    try {
        const response = await fetch('api/api.php?action=get');
        const data = await response.json();
        leaderboardList.innerHTML = ""; 
        data.forEach((entry, index) => {
            const li = document.createElement('li');
            li.style.padding = "5px 0";
            li.style.borderBottom = "1px solid #444";
            let color = "white";
            if(index === 0) color = "#ffd700"; 
            if(index === 1) color = "#c0c0c0"; 
            if(index === 2) color = "#cd7f32"; 
            let formattedScore = parseInt(entry.score).toLocaleString();
            li.innerHTML = `<span style="color:${color}; font-weight:bold;">#${index+1}</span> ${entry.name} <span style="float:right; color:#ffd700;">${formattedScore}</span>`;
            leaderboardList.appendChild(li);
        });
    } catch (error) { console.error("Klarte ikke hente toppliste:", error); }
}

window.submitScore = async function() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value;
    if (!name) { alert("Skriv inn navnet ditt!"); return; }
    try {
        await fetch('api/api.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, score: score })
        });
        saveContainer.style.display = 'none';
        fetchLeaderboard();
    } catch (error) { console.error("Feil ved lagring:", error); }
};


// --- 6. SPAWNING ---
let objects = []; 
let scenery = []; 

function spawnScenery() {
    if (gameOver || isPaused) return;
    const rand = Math.random();
    let mesh, texture, scale, yPos;

    if (rand > 0.95) {
        texture = reklameTexture; scale = 5; yPos = 3; 
    } 
    else if (rand > 0.8) { texture = husTexture; scale = 12; yPos = 6; } 
    else if (rand > 0.4) { texture = treTexture; scale = 9; yPos = 4.5; } 
    else { texture = steinTexture; scale = 4; yPos = 2; }

    const geometry = new THREE.PlaneGeometry(scale, scale);
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });
    mesh = new THREE.Mesh(geometry, material); 
    const side = Math.random() > 0.5 ? 1 : -1;
    
    let offset = 10;
    if (texture === husTexture) offset = 16;
    if (texture === reklameTexture) offset = 11;

    // NYTT: ENDA LENGER BAK (-450) SÅ DU REKKER Å SE DEM
    const randomVariation = Math.random() * 10;
    mesh.position.x = side * (offset + randomVariation);
    mesh.position.z = -450; 
    mesh.position.y = yPos;
    scene.add(mesh);
    scenery.push(mesh);
}

let lastWasObstacle = false; 
let meadStreak = 0; 
let streakLane = 0; 
let spawnsSinceLastPowerup = 0;

function spawnObject() {
    if (gameOver || isPaused) return;

    let texture, type, multiplierValue, scale = 1.0;
    let yPos = 1;
    let emissiveColor = 0x000000;
    let emissiveIntensity = 0;
    let lane = 0;

    spawnsSinceLastPowerup++;

    if (meadStreak > 0) {
        type = 'mjod'; texture = mjodTexture; scale = 1.5; emissiveColor = 0xffaa00; emissiveIntensity = 1.0;
        lane = streakLane; meadStreak--; 
    } 
    else {
        const rand = Math.random();
        let forceSafe = lastWasObstacle; 
        let forcePowerup = (spawnsSinceLastPowerup > 12); 

        if (!forcePowerup && !forceSafe && rand > 0.85) { 
            // 15% HINDRING
            if (rand < 0.92) { 
                type = 'ship_obstacle'; texture = skipFrontTexture; scale = 5.0; yPos = 2.5; lane = Math.floor(Math.random() * 3) - 1; 
            } else {
                type = 'obstacle'; texture = tonneTexture; scale = 2.5; yPos = 1.2; lane = Math.floor(Math.random() * 3) - 1; 
            }
            lastWasObstacle = true;
        } 
        else {
            lastWasObstacle = false;
            const itemRand = Math.random();
            if (forcePowerup || itemRand > 0.7) { 
                if (Math.random() > 0.9) {
                    type = 'shield_powerup'; texture = shieldTexture; scale = 1.5; emissiveColor = 0x0000ff; emissiveIntensity = 0.8;
                } else {
                    type = 'powerup';
                    const rarity = Math.random();
                    if (rarity > 0.9) { texture = powerup10xTexture; multiplierValue = 10; } 
                    else if (rarity > 0.6) { texture = powerup5xTexture; multiplierValue = 5; } 
                    else { texture = powerup2xTexture; multiplierValue = 2; }
                    scale = 2.0; emissiveColor = 0x000000; emissiveIntensity = 0;
                }
                lane = Math.floor(Math.random() * 3) - 1;
                spawnsSinceLastPowerup = 0;
            } else { 
                type = 'mjod'; texture = mjodTexture; scale = 1.5; emissiveColor = 0xffaa00; emissiveIntensity = 1.0;
                meadStreak = Math.floor(Math.random() * 6) + 3; streakLane = Math.floor(Math.random() * 3) - 1; lane = streakLane;
            }
        }
    }

    const geometry = new THREE.PlaneGeometry(scale, scale);
    const material = new THREE.MeshStandardMaterial({ 
        map: texture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5,
        emissive: emissiveColor, emissiveIntensity: emissiveIntensity
    }); 
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: type, value: multiplierValue };
    mesh.position.x = lane * laneWidth;
    mesh.position.y = yPos; 
    mesh.position.z = -150; // Start mjød/hindringer nærmere enn landskap (raskere action)
    
    let collision = false;
    for (let obj of objects) {
        if (Math.abs(obj.position.z - mesh.position.z) < 10 && obj.position.x === mesh.position.x) {
            collision = true;
        }
    }
    if (!collision) {
        scene.add(mesh);
        objects.push(mesh);
    }
}

setInterval(spawnObject, 250); 
setInterval(spawnScenery, 80); 


// --- 7. GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 

    if (gameOver || isPaused) return; 

    // TID
    gameTime += delta;
    let minutes = Math.floor(gameTime / 60);
    let seconds = Math.floor(gameTime % 60);
    timeElement.innerText = "Tid: " + 
        (minutes < 10 ? "0" : "") + minutes + ":" + 
        (seconds < 10 ? "0" : "") + seconds;

    if (hasShield) {
        shieldTimer -= delta;
        if (shieldBarFill) {
            const pct = (shieldTimer / SHIELD_DURATION) * 100;
            shieldBarFill.style.width = pct + '%';
        }
        if (shieldTimer <= 0) deactivateShield();
    }

    if (powerupTimer > 0) {
        powerupTimer -= delta;
        if (timerBarFill) {
            const percentage = (powerupTimer / POWERUP_DURATION) * 100;
            timerBarFill.style.width = percentage + '%';
        }
        if (powerupTimer <= 0) deactivateMultiplier();
    }

    bakgrunnTexture.offset.y += (currentSpeed * 0.06); 
    
    // --- ANIMASJON: LØPE-BEVEGELSE (WADDLE) ---
    if (isJumping) {
        playerGroup.position.y += verticalVelocity; 
        verticalVelocity -= gravity; 
        if (playerGroup.position.y <= groundLevel) {
            playerGroup.position.y = groundLevel; 
            isJumping = false; verticalVelocity = 0;
        }
    } else {
        if (!hasShield) {
            // LØPE: Rask, hakkete bobbing + vugging
            const runCycle = gameTime * 20; 
            playerGroup.position.y = groundLevel + Math.abs(Math.sin(runCycle)) * 0.3; // MER HOPPING!
            playerGroup.rotation.z = Math.sin(runCycle * 0.5) * 0.15; // TYDELIGERE VUGGING!
        } else {
            // SURFE: Myk glidning
            playerGroup.position.y = groundLevel + Math.sin(gameTime * 5) * 0.1;
            playerGroup.rotation.z = THREE.MathUtils.lerp(playerGroup.rotation.z, 0, 0.1);
        }
    }
    
    playerGroup.position.x = THREE.MathUtils.lerp(playerGroup.position.x, targetX, delta * 10);

    const moveTowardsCamera = (arr) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const obj = arr[i];
            
            // HER ER PARALLAX-EFFEKTEN!
            // Hvis det er dekorasjon (scenery), beveg saktere (0.9 ganger farten)
            let moveSpeed = currentSpeed * 2.0;
            if (arr === scenery) {
                moveSpeed = currentSpeed * 1.8; // Går bittelitt saktere enn bakken
            }
            
            obj.position.z += moveSpeed; 

            if (obj.userData.type === 'mjod') {
                 // Myk bølge
                 obj.position.y = 1.3 + Math.abs(Math.sin((gameTime * 3) + (obj.position.z * 0.02))) * 0.3;
                 obj.rotation.y = 0;
            }
            else if (obj.userData.type === 'powerup' || obj.userData.type === 'shield_powerup') {
                obj.rotation.y += 0.03;
            }

            if(obj.position.z > 10) { 
                scene.remove(obj);
                arr.splice(i, 1);
                continue;
            }
            
            if (arr === objects) {
                const distanceZ = Math.abs(playerGroup.position.z - obj.position.z);
                const sameLane = Math.abs(playerGroup.position.x - obj.position.x) < 1.0; 
                const notJumpingOver = playerGroup.position.y < 3.0; 

                if (distanceZ < 1.5 && sameLane) {
                    if (obj.userData.type === 'mjod') {
                        score += (10 * currentMultiplier);
                        scoreElement.innerText = score.toLocaleString();
                        scene.remove(obj);
                        arr.splice(i, 1);
                    } else if (obj.userData.type === 'powerup') {
                        activateMultiplier(obj.userData.value);
                        scene.remove(obj);
                        arr.splice(i, 1);
                    } else if (obj.userData.type === 'shield_powerup') {
                        activateShield(); 
                        scene.remove(obj);
                        arr.splice(i, 1);
                    } else if ((obj.userData.type === 'obstacle' && notJumpingOver) || obj.userData.type === 'ship_obstacle') {
                        triggerGameOver();
                    }
                }
            }
        }
    };
    moveTowardsCamera(objects);
    moveTowardsCamera(scenery);
    renderer.render(scene, camera);
}

// 8. RESIZE
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
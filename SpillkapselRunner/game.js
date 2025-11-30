import * as THREE from 'three';

// --- 1. OPPSETT ---
const scene = new THREE.Scene();

// Vi bruker en backup-farge hvis himmelen ikke laster med en gang
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.Fog(0x87CEEB, 30, 90); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; 
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();

// BILDER
const skyTexture = textureLoader.load('assets/himmel.png'); // Sjekk filnavn!
const avatarTexture = textureLoader.load('assets/vikingrygg.png'); 
const shieldTexture = textureLoader.load('assets/vikingskjold.png');
const mjodTexture = textureLoader.load('assets/mjod.png');
const bakgrunnTexture = textureLoader.load('assets/vei.png'); 

// DEKORASJON
const treTexture = textureLoader.load('assets/tre.png');
const steinTexture = textureLoader.load('assets/stein.png');
const husTexture = textureLoader.load('assets/hus.png'); 
const tonneTexture = textureLoader.load('assets/tonne.png');

// UI & POWERUPS
const powerup2xTexture = textureLoader.load('assets/combo2x.png');
const powerup5xTexture = textureLoader.load('assets/combo5x.png');
const powerup10xTexture = textureLoader.load('assets/combo10x.png');

// FIX AV TEKSTURER
bakgrunnTexture.wrapS = THREE.RepeatWrapping;
bakgrunnTexture.wrapT = THREE.RepeatWrapping;
bakgrunnTexture.repeat.set(1, 40); 
bakgrunnTexture.colorSpace = THREE.SRGBColorSpace;

avatarTexture.colorSpace = THREE.SRGBColorSpace;
shieldTexture.colorSpace = THREE.SRGBColorSpace;
mjodTexture.colorSpace = THREE.SRGBColorSpace;
treTexture.colorSpace = THREE.SRGBColorSpace;
husTexture.colorSpace = THREE.SRGBColorSpace;
powerup2xTexture.colorSpace = THREE.SRGBColorSpace;
powerup5xTexture.colorSpace = THREE.SRGBColorSpace;
powerup10xTexture.colorSpace = THREE.SRGBColorSpace;
skyTexture.colorSpace = THREE.SRGBColorSpace;

// --- 2. LYS & HIMMEL ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); 
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); 
dirLight.position.set(10, 50, 20);
dirLight.castShadow = true; 
scene.add(dirLight);

// NYTT: SKYDOME (Himmelkule)
// Vi lager en gigantisk ball rundt hele spillet og maler himmelen på innsiden
const skyGeo = new THREE.SphereGeometry(500, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({ 
    map: skyTexture, 
    side: THREE.BackSide, // Viser bildet på innsiden av kulen
    fog: false // Ignorerer tåke så himmelen er klar og tydelig
});
const skyDome = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyDome);


// --- 3. SPILLER-GRUPPEN ---
const playerGroup = new THREE.Group();

const playerLight = new THREE.PointLight(0xffaa00, 0.6, 10);
playerLight.position.set(0, 2, 1);
playerGroup.add(playerLight);

const vikingGeo = new THREE.PlaneGeometry(2, 2); 
const vikingMat = new THREE.MeshStandardMaterial({ 
    map: avatarTexture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 
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
playerGroup.add(shieldMesh); 

let currentLane = 0;
const laneWidth = 3; 
let targetX = 0; 

playerGroup.position.y = 1.5; 
scene.add(playerGroup);


// --- 4. VERDEN OG TERRENG ---

// A. Veien
const roadGeometry = new THREE.PlaneGeometry(12, 1000);
const roadMaterial = new THREE.MeshStandardMaterial({ 
    map: bakgrunnTexture,
    roughness: 0.8 
});
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2; 
road.position.z = -400; 
road.receiveShadow = true;
scene.add(road);

// B. Snøkanter
function createSnowBanks() {
    const bankGeo = new THREE.PlaneGeometry(100, 1000); 
    const bankMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 1.0 
    }); 
    
    const leftBank = new THREE.Mesh(bankGeo, bankMat);
    leftBank.rotation.x = -Math.PI / 2;
    leftBank.position.set(-56, -0.05, -400); 
    leftBank.receiveShadow = true;
    scene.add(leftBank);

    const rightBank = new THREE.Mesh(bankGeo, bankMat);
    rightBank.rotation.x = -Math.PI / 2;
    rightBank.position.set(56, -0.05, -400); 
    rightBank.receiveShadow = true;
    scene.add(rightBank);
}
createSnowBanks();

// C. Havet
const seaGeometry = new THREE.PlaneGeometry(1000, 1000);
const seaMaterial = new THREE.MeshBasicMaterial({ color: 0x1a4d8c }); 
const sea = new THREE.Mesh(seaGeometry, seaMaterial);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -2; 
sea.position.z = -450;
scene.add(sea);

// D. Vegger (Fjernet landsby-bakveggen siden vi nå har SkyDome!)


// --- 5. LOGIKK & UI ---
camera.position.set(0, 5, 8); 
camera.lookAt(0, 2, -10); 

let speed = 0.6; 
let score = 0;
let gameOver = false; 

const scoreElement = document.getElementById('score');
const comboContainer = document.getElementById('combo-container');
const comboImage = document.getElementById('combo-image');
const timerBarFill = document.getElementById('timer-bar-fill');
const gameOverScreen = document.getElementById('game-over-screen');

let currentMultiplier = 1; 
let powerupTimer = 0;
const POWERUP_DURATION = 10.0; 
const clock = new THREE.Clock();

function changeLane(direction) {
    if (gameOver) return; 

    const targetLane = currentLane + direction;
    if (targetLane >= -1 && targetLane <= 1) {
        currentLane = targetLane;
        targetX = currentLane * laneWidth;
        playerGroup.rotation.z = -direction * 0.2;
        setTimeout(() => { playerGroup.rotation.z = 0; }, 200);
    }
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a') changeLane(-1);
    if (event.key === 'ArrowRight' || event.key === 'd') changeLane(1);
});

function activateMultiplier(value) {
    currentMultiplier = value;
    powerupTimer = POWERUP_DURATION; 
    if (comboContainer) { 
        comboImage.src = `assets/combo${value}x.png`;
        comboContainer.style.display = 'block';
        comboImage.style.animation = 'none';
        comboImage.offsetHeight; 
        comboImage.style.animation = 'popIn 0.3s ease-out';
    }
}

function deactivateMultiplier() {
    currentMultiplier = 1;
    if (comboContainer) comboContainer.style.display = 'none';
}

function triggerGameOver() {
    gameOver = true;
    speed = 0; 
    gameOverScreen.style.display = 'block'; 
}


// --- 6. OBJEKTER & DEKORASJON ---
let objects = []; 
let scenery = []; 

function spawnScenery() {
    if (gameOver) return;
    
    const rand = Math.random();
    let mesh, texture, scale, yPos;

    if (rand > 0.8) { 
        texture = husTexture; scale = 12; yPos = 6; 
    } else if (rand > 0.4) { 
        texture = treTexture; scale = 9; yPos = 4.5; 
    } else { 
        texture = steinTexture; scale = 4; yPos = 2; 
    }

    const geometry = new THREE.PlaneGeometry(scale, scale);
    const material = new THREE.MeshStandardMaterial({ 
        map: texture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5
    });
    mesh = new THREE.Mesh(geometry, material); 
    
    const side = Math.random() > 0.5 ? 1 : -1;
    const offset = (texture === husTexture) ? 16 : 10; 
    const randomVariation = Math.random() * 10;
    
    mesh.position.x = side * (offset + randomVariation);
    mesh.position.z = -200; 
    mesh.position.y = yPos;
    
    scene.add(mesh);
    scenery.push(mesh);
}

// NYE VARIABLER FOR SPAWN LOGIKK
let lastWasObstacle = false; 
let meadStreak = 0; // Hvor mange mjød er igjen i rekken
let streakLane = 0; // Hvilken bane rekken er i

function spawnObject() {
    if (gameOver) return;

    let texture, type, multiplierValue, scale = 1.0;
    let yPos = 1;
    let emissiveColor = 0x000000;
    let emissiveIntensity = 0;
    let lane = 0;

    // --- NY LOGIKK FOR REKKER ---
    
    // 1. Sjekk om vi er midt i en "streak" (rekke med mjød)
    if (meadStreak > 0) {
        // Fortsett rekken!
        type = 'mjod';
        texture = mjodTexture;
        scale = 1.5;
        emissiveColor = 0xffaa00; 
        emissiveIntensity = 0.8;
        
        lane = streakLane; // Bruk samme bane som sist
        meadStreak--; // Tell ned
        
    } else {
        // 2. Hvis ingen streak, bestem hva som skal skje tilfeldig
        const rand = Math.random();
        
        // Sikkerhet: Hvis forrige var tønne, må vi ha noe trygt
        let forceSafe = lastWasObstacle; 
        
        if (!forceSafe && rand > 0.85) { 
            // HINDRING
            type = 'obstacle';
            texture = tonneTexture;
            scale = 2.5; 
            yPos = 1.2;
            lastWasObstacle = true;
            lane = Math.floor(Math.random() * 3) - 1; // Tilfeldig bane
            
        } else {
            // TRYGT (Mjød eller Powerup)
            lastWasObstacle = false;
            
            if (rand > 0.95) { 
                // POWERUP
                type = 'powerup';
                const rarity = Math.random();
                if (rarity > 0.9) { texture = powerup10xTexture; multiplierValue = 10; } 
                else if (rarity > 0.6) { texture = powerup5xTexture; multiplierValue = 5; } 
                else { texture = powerup2xTexture; multiplierValue = 2; }
                scale = 2.0; 
                lane = Math.floor(Math.random() * 3) - 1;

            } else { 
                // MJØD - START EN NY REKKE!
                type = 'mjod';
                texture = mjodTexture;
                scale = 1.5; 
                emissiveColor = 0xffaa00; 
                emissiveIntensity = 0.8;
                
                // Bestem hvor lang rekken skal være (3 til 6 stk)
                meadStreak = Math.floor(Math.random() * 4) + 2; 
                
                // Velg en tilfeldig bane for hele rekken
                streakLane = Math.floor(Math.random() * 3) - 1;
                lane = streakLane;
            }
        }
    }

    const geometry = new THREE.PlaneGeometry(scale, scale);
    const material = new THREE.MeshStandardMaterial({ 
        map: texture, 
        transparent: true, 
        side: THREE.DoubleSide, 
        alphaTest: 0.5,
        emissive: emissiveColor, 
        emissiveIntensity: emissiveIntensity
    }); 
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: type, value: multiplierValue };

    mesh.position.x = lane * laneWidth;
    mesh.position.y = yPos; 
    mesh.position.z = -150; 
    scene.add(mesh);
    objects.push(mesh);
}

// Spawner litt oftere nå som vi har rekker (ca 400ms)
setInterval(spawnObject, 400); 
setInterval(spawnScenery, 80); 


// --- 7. GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (gameOver) return; 

    const delta = clock.getDelta(); 
    const elapsedTime = clock.getElapsedTime();

    // UI
    if (powerupTimer > 0) {
        powerupTimer -= delta;
        if (timerBarFill) {
            const percentage = (powerupTimer / POWERUP_DURATION) * 100;
            timerBarFill.style.width = percentage + '%';
        }
        if (powerupTimer <= 0) deactivateMultiplier();
    }

    // ANIMASJON
    bakgrunnTexture.offset.y += (speed * 0.04); 
    
    playerGroup.position.y = 1.5 + Math.sin(elapsedTime * 6) * 0.3; 
    playerGroup.position.x = THREE.MathUtils.lerp(playerGroup.position.x, targetX, delta * 10);

    const moveTowardsCamera = (arr) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const obj = arr[i];
            obj.position.z += speed * 1.5; 

            if (obj.userData.type === 'mjod' || obj.userData.type === 'powerup') { 
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
        
                if (distanceZ < 1.0 && sameLane) {
                    if (obj.userData.type === 'mjod') {
                        score += (1 * currentMultiplier);
                        scoreElement.innerText = score;
                        scene.remove(obj);
                        arr.splice(i, 1);
                    } else if (obj.userData.type === 'powerup') {
                        activateMultiplier(obj.userData.value);
                        scene.remove(obj);
                        arr.splice(i, 1);
                    } else if (obj.userData.type === 'obstacle') {
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

animate();
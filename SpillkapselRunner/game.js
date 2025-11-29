import * as THREE from 'three';

// --- 1. OPPSETT ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.Fog(0x87CEEB, 20, 100); // Tåken litt nærmere for å skjule "popping"

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; 
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();

// BILDER
const avatarTexture = textureLoader.load('assets/vikingrygg.png'); 
const shieldTexture = textureLoader.load('assets/vikingskjold.png');
const mjodTexture = textureLoader.load('assets/mjod.png');
const bakgrunnTexture = textureLoader.load('assets/bakgrunn.png');
const treTexture = textureLoader.load('assets/tre.png');
const steinTexture = textureLoader.load('assets/stein.png');

// Powerups
const powerup2xTexture = textureLoader.load('assets/combo2x.png');
const powerup5xTexture = textureLoader.load('assets/combo5x.png');
const powerup10xTexture = textureLoader.load('assets/combo10x.png');

// --- 2. LYS ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true; 
scene.add(dirLight);

// --- 3. SPILLER-GRUPPEN ---
const playerGroup = new THREE.Group();

// Viking
const vikingGeo = new THREE.PlaneGeometry(2, 2); 
const vikingMat = new THREE.MeshStandardMaterial({ 
    map: avatarTexture,
    transparent: true, 
    side: THREE.DoubleSide,
    alphaTest: 0.5 
}); 
const vikingMesh = new THREE.Mesh(vikingGeo, vikingMat);
vikingMesh.position.y = 0.9; 
vikingMesh.castShadow = true;
playerGroup.add(vikingMesh); 

// Skjold
const shieldGeo = new THREE.PlaneGeometry(1.5, 1.5); 
const shieldMat = new THREE.MeshStandardMaterial({ 
    map: shieldTexture,
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 0.5
});
const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
shieldMesh.position.y = -0.1; 
shieldMesh.rotation.x = -1.5; 
playerGroup.add(shieldMesh); 

let currentLane = 0;
const laneWidth = 3; 
playerGroup.position.y = 1.5; 
scene.add(playerGroup);


// --- 4. VERDEN ---

// A. Veien
const roadGeometry = new THREE.PlaneGeometry(12, 1000);
bakgrunnTexture.wrapS = THREE.RepeatWrapping;
bakgrunnTexture.wrapT = THREE.RepeatWrapping;
bakgrunnTexture.repeat.set(1, 40); // 40 repetisjoner på 1000 enheter = 1 bilde per 25 enhet

const roadMaterial = new THREE.MeshStandardMaterial({ map: bakgrunnTexture });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2; 
road.position.z = -400; 
road.receiveShadow = true;
scene.add(road);

// B. Havet
const seaGeometry = new THREE.PlaneGeometry(600, 1000);
const seaMaterial = new THREE.MeshBasicMaterial({ color: 0x1a4d8c }); 
const sea = new THREE.Mesh(seaGeometry, seaMaterial);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.5; 
sea.position.z = -450;
scene.add(sea);

// C. Vegger
const wallGeometry = new THREE.PlaneGeometry(1000, 300);
const wallMaterial = new THREE.MeshBasicMaterial({ 
    map: bakgrunnTexture, 
    color: 0x888888 
});

const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
leftWall.position.set(-80, 50, -450); 
leftWall.rotation.y = 0.2; 
scene.add(leftWall);

const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
rightWall.position.set(80, 50, -450); 
rightWall.rotation.y = -0.2; 
rightWall.scale.x = -1; 
scene.add(rightWall);


// --- 5. LOGIKK ---
camera.position.set(0, 5, 9); 
camera.lookAt(0, 2, -10); 

// JUSTERT FART: Dette er basisfarten. Alt annet ganger vi med denne.
let speed = 0.5; 

let score = 0;
const scoreElement = document.getElementById('score');
const comboUiElement = document.getElementById('combo-ui');

let currentMultiplier = 1; 
let powerupTimer = 0;
const clock = new THREE.Clock();

function changeLane(direction) {
    const targetLane = currentLane + direction;
    if (targetLane >= -1 && targetLane <= 1) {
        currentLane = targetLane;
        playerGroup.position.x = currentLane * laneWidth;
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
    powerupTimer = 10.0; 
    comboUiElement.src = `assets/combo${value}x.png`;
    comboUiElement.style.display = 'block';
    comboUiElement.style.animation = 'none';
    comboUiElement.offsetHeight; 
    comboUiElement.style.animation = 'popIn 0.3s ease-out';
}

function deactivateMultiplier() {
    currentMultiplier = 1;
    comboUiElement.style.display = 'none';
}


// --- 6. OBJEKTER & DEKORASJON ---
let objects = []; 
let scenery = []; 

function spawnScenery() {
    const isTree = Math.random() > 0.5;
    let mesh;
    let texture;
    let scale;
    let yPos;

    if (isTree) {
        texture = treTexture;
        scale = 8; 
        yPos = 4; 
    } else {
        texture = steinTexture;
        scale = 3; 
        yPos = 1.5;
    }

    const geometry = new THREE.PlaneGeometry(scale, scale);
    const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.5
    });
    
    mesh = new THREE.Mesh(geometry, material);
    
    const side = Math.random() > 0.5 ? 1 : -1;
    const distance = 12 + Math.random() * 20; 
    
    mesh.position.x = side * distance;
    mesh.position.z = -150; 
    mesh.position.y = yPos;
    
    scene.add(mesh);
    scenery.push(mesh);
}

function spawnObject() {
    const isPowerup = Math.random() > 0.92; 
    let texture, type, multiplierValue, scale = 1.0;

    if (isPowerup) {
        const rarity = Math.random();
        type = 'powerup';
        if (rarity > 0.9) { texture = powerup10xTexture; multiplierValue = 10; } 
        else if (rarity > 0.6) { texture = powerup5xTexture; multiplierValue = 5; } 
        else { texture = powerup2xTexture; multiplierValue = 2; }
        scale = 1.5;
    } else {
        type = 'mjod';
        texture = mjodTexture;
        scale = 1.0;
    }

    const geometry = new THREE.PlaneGeometry(scale, scale);
    const material = new THREE.MeshStandardMaterial({ 
        map: texture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 
    }); 
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: type, value: multiplierValue };

    const randomLane = Math.floor(Math.random() * 3) - 1;
    mesh.position.x = randomLane * laneWidth;
    mesh.position.y = 1; 
    mesh.position.z = -150; 
    
    scene.add(mesh);
    objects.push(mesh);
}

setInterval(spawnObject, 600);
setInterval(spawnScenery, 150); 


// --- 7. GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 
    const elapsedTime = clock.getElapsedTime();

    if (powerupTimer > 0) {
        powerupTimer -= delta;
        if (powerupTimer <= 0) deactivateMultiplier();
    }

    // --- FIKSET FART ---
    
    // 1. Bakken beveger seg nå motsatt vei (+=) for å se riktig ut, og roligere
    bakgrunnTexture.offset.y += (speed * 0.04); 
    
    // Animasjon av viking
    playerGroup.position.y = 1.5 + Math.sin(elapsedTime * 6) * 0.3; 

    // Funksjon for å flytte ting mot kamera
    const moveTowardsCamera = (arr) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const obj = arr[i];
            
            // FIKSET: Fjernet "* 20". Nå beveger objektene seg likt som bakken føles.
            obj.position.z += speed; 

            // Roter mjød/powerups
            if (obj.geometry.type === 'PlaneGeometry' && obj.scale.x < 2) { 
                 obj.rotation.y += 0.03; 
            }

            if(obj.position.z > 10) { 
                scene.remove(obj);
                arr.splice(i, 1);
                continue;
            }
            
            // Kollisjon (kun for objects)
            if (arr === objects) {
                const distanceZ = Math.abs(playerGroup.position.z - obj.position.z);
                const sameLane = Math.abs(playerGroup.position.x - obj.position.x) < 1.0; 
        
                if (distanceZ < 1.0 && sameLane) { // Justert kollisjonsavstand litt ned
                    if (obj.userData.type === 'mjod') {
                        score += (1 * currentMultiplier);
                        scoreElement.innerText = score;
                    } else if (obj.userData.type === 'powerup') {
                        activateMultiplier(obj.userData.value);
                    }
                    scene.remove(obj);
                    arr.splice(i, 1);
                }
            }
        }
    };

    moveTowardsCamera(objects);
    moveTowardsCamera(scenery);

    renderer.render(scene, camera);
}

animate();
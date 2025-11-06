// Hent elementer fra DOM
const coinsDisplay = document.getElementById('coins');
const eggsDisplay = document.getElementById('eggs');
const petRarityDisplay = document.getElementById('pet-rarity');
const petHappinessDisplay = document.getElementById('pet-happiness');
const mineButton = document.getElementById('mine-button');
const feedButton = document.getElementById('feed-button');
const buyEggButton = document.getElementById('buy-egg-button');
const messageArea = document.getElementById('message-area');
const cooldownTimerDisplay = document.getElementById('cooldown-timer');

// Spillvariabler
let coins = 100;
let eggs = 1;
let pet = {
    rarity: 'Common',
    happiness: 50,
    maxHappiness: 100
};

// Tidshåndtering (Cooldown)
const MINE_COOLDOWN_SECONDS = 10; // Sett til 10 sekunder for testing
let lastMineTime = 0;

// --- Hjelpefunksjoner ---

function updateDisplay() {
    coinsDisplay.textContent = coins;
    eggsDisplay.textContent = eggs;
    petRarityDisplay.textContent = pet.rarity;
    petHappinessDisplay.textContent = pet.happiness;

    // Oppdater knappene basert på spilltilstand
    feedButton.disabled = coins < 10;
    buyEggButton.disabled = coins < 50;
    
    // Oppdater farge på sjeldenhet
    petRarityDisplay.style.color = getRarityColor(pet.rarity);
}

function getRarityColor(rarity) {
    switch (rarity) {
        case 'Common': return '#888';
        case 'Rare': return '#007bff';
        case 'Epic': return '#9933ff';
        case 'Legendary': return '#ffcc00';
        default: return '#000';
    }
}

function showMessage(text) {
    messageArea.textContent = text;
    // Fjerner meldingen etter 3 sekunder
    setTimeout(() => { messageArea.textContent = ''; }, 3000);
}

// --- Spillmekanikk ---

function mineCoins() {
    const currentTime = Date.now();
    const elapsedTimeSeconds = (currentTime - lastMineTime) / 1000;

    if (elapsedTimeSeconds >= MINE_COOLDOWN_SECONDS || lastMineTime === 0) {
        // Øk myntene og reduser lykken litt
        const minedAmount = 10 + Math.floor(Math.random() * 5);
        coins += minedAmount;
        pet.happiness = Math.max(0, pet.happiness - 5);
        
        lastMineTime = currentTime;
        showMessage(`Du minet ${minedAmount} mynter! Kjæledyret ditt er litt misfornøyd.`);
        updateDisplay();
    }
}

function feedPet() {
    if (coins >= 10) {
        coins -= 10;
        // Øk lykken (kan ikke overstige maxHappiness)
        pet.happiness = Math.min(pet.maxHappiness, pet.happiness + 15); 
        showMessage("Nam! Kjæledyret ditt er lykkeligere.");
        
        // Sjanse for å øke sjeldenhet når kjæledyret er matet
        if (pet.happiness >= 90 && Math.random() < 0.1) {
            upgradeRarity();
        }

        updateDisplay();
    } else {
        showMessage("Du har ikke nok mynter!");
    }
}

function buyEgg() {
    if (coins >= 50) {
        coins -= 50;
        eggs += 1;
        showMessage("Du kjøpte et egg! Du er nå ett skritt nærmere en Legend!");
        updateDisplay();
    } else {
        showMessage("Du har ikke nok mynter til et egg!");
    }
}

function upgradeRarity() {
    const rarityLevels = ['Common', 'Rare', 'Epic', 'Legendary'];
    const currentIndex = rarityLevels.indexOf(pet.rarity);

    if (currentIndex < rarityLevels.length - 1) {
        pet.rarity = rarityLevels[currentIndex + 1];
        showMessage(`GRATULERER! Kjæledyret ditt er nå ${pet.rarity}!`);
    }
}

// --- Tidsstyring (Hoved-loop) ---

function gameLoop() {
    // Cooldown-timer for mining
    const now = Date.now();
    const timePassedSeconds = (now - lastMineTime) / 1000;
    const timeLeft = MINE_COOLDOWN_SECONDS - timePassedSeconds;

    if (timeLeft <= 0) {
        mineButton.disabled = false;
        cooldownTimerDisplay.textContent = "KLAR";
    } else {
        mineButton.disabled = true;
        const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
        const seconds = String(Math.ceil(timeLeft % 60)).padStart(2, '0');
        cooldownTimerDisplay.textContent = `${minutes}:${seconds}`;
    }

    // Passivt tap av lykke (simulerer behov for stell)
    if (frameCount % 600 === 0) { // Hvert 10. sekund (60 frames/sekund * 10)
        pet.happiness = Math.max(0, pet.happiness - 1);
        updateDisplay();
    }

    frameCount++;
    requestAnimationFrame(gameLoop);
}

// --- Hendelseslyttere ---

mineButton.addEventListener('click', mineCoins);
feedButton.addEventListener('click', feedPet);
buyEggButton.addEventListener('click', buyEgg);

// Start spillet
updateDisplay();
gameLoop();
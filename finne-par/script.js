// === Hent elementer fra HTML ===
const gameContainer = document.querySelector('.memory-game');
const resetButton = document.querySelector('#reset-button');
const levelSelect = document.querySelector('#level-select');
const timerDisplay = document.querySelector('#timer');

// NYE elementer for brukernavn
const modalOverlay = document.querySelector('#username-modal-overlay');
const usernameInput = document.querySelector('#username-input');
const usernameSaveBtn = document.querySelector('#username-save-btn');
const usernameError = document.querySelector('#username-error');
const welcomeMessage = document.querySelector('#welcome-message');

// NYE elementer for highscore-lister
const highscoreList = {
    easy: document.querySelector('#highscore-list-easy'),
    medium: document.querySelector('#highscore-list-medium'),
    hard: document.querySelector('#highscore-list-hard')
};

// Nøkler for localStorage
const HIGHSCORE_KEY = 'memoryGameHighscores_v2'; // v2 for ny datastruktur
const USERNAME_KEY = 'memoryGameUsername';

// === Definer nivåer ===
// (Samme som før)
const symbolSets = {
    easy: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'], // 6 par
    medium: ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🍉'], // 8 par
    hard: ['🚗', '🚕', '🚌', '🚓', '🚑', '🚚', '🚜', '🚲', '🛴', '✈️'] // 10 par
};
const gridConfig = {
    easy: { columns: 4 },
    medium: { columns: 4 },
    hard: { columns: 5 }
};

// === Spill-tilstand ===
let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let gameStarted = false;
let startTime = 0;
let timerInterval = null;
let matchedPairs = 0;
let totalPairs = 0;

// NYE tilstandsvariabler
let currentUsername = null; // Lagrer aktivt brukernavn


// === Timer-funksjoner ===
// (Samme som før)
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        timerDisplay.textContent = `${elapsedTime.toFixed(1)}s`;
    }, 100);
}
function stopTimer() {
    clearInterval(timerInterval);
    gameStarted = false;
}
function resetTimerDisplay() {
    stopTimer();
    timerDisplay.textContent = '0.0s';
}


// === Highscore-funksjoner (HELT OMSKREVET) ===

// Henter highscores fra localStorage
function getHighscores() {
    const scoresJSON = localStorage.getItem(HIGHSCORE_KEY);
    // Returnerer lagrede poeng, eller et "tomt" objekt med tomme lister
    return scoresJSON ? JSON.parse(scoresJSON) : { easy: [], medium: [], hard: [] };
}

// Lagrer highscores til localStorage
function saveHighscores(scores) {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(scores));
}

// Viser lagrede highscores på siden
function displayHighscores() {
    const scores = getHighscores();
    
    // Gå gjennom hvert nivå ('easy', 'medium', 'hard')
    for (const level in scores) {
        const listElement = highscoreList[level]; // Hent <ol> elementet
        listElement.innerHTML = ''; // Tøm listen
        const levelScores = scores[level]; // Hent listen over poeng

        if (levelScores.length === 0) {
            // Vis "Ingen tider" hvis listen er tom
            listElement.innerHTML = '<li class="no-score">Ingen tider registrert</li>';
        } else {
            // Lag et <li> element for hver poengsum
            levelScores.forEach(score => {
                const li = document.createElement('li');
                // Legg til navn og tid
                li.innerHTML = `<span>${score.name}</span> <span>${score.time.toFixed(1)}s</span>`;
                listElement.appendChild(li);
            });
        }
    }
}

// Sjekker om en ny tid er en highscore og lagrer den
function checkAndSaveHighscore(finalTime) {
    const level = levelSelect.value;
    const scores = getHighscores();
    const levelScores = scores[level]; // Hent den spesifikke listen (f.eks. scores.easy)

    // Lag det nye poeng-objektet
    const newScore = { name: currentUsername, time: finalTime };

    // Legg til den nye tiden
    levelScores.push(newScore);

    // Sorter listen (lavest tid først)
    levelScores.sort((a, b) => a.time - b.time);

    // Kutt listen til maks 5 (Topp 5)
    scores[level] = levelScores.slice(0, 5);

    // Lagre den oppdaterte listen
    saveHighscores(scores);
    // Oppdater visningen
    displayHighscores();

    // Sjekk om den nye tiden faktisk kom med på Topp 5-listen
    const didMakeList = scores[level].some(score => score.name === newScore.name && score.time === newScore.time);

    if (didMakeList) {
        setTimeout(() => {
            alert(`Ny highscore! Du kom på Topp 5-listen for ${level}-nivået med tiden ${finalTime.toFixed(1)}s!`);
        }, 500); 
    }
}

// === Brukernavn-funksjoner (NY) ===

function checkUsername() {
    currentUsername = localStorage.getItem(USERNAME_KEY);

    if (currentUsername) {
        // Bruker funnet, vis velkomstmelding
        welcomeMessage.textContent = `Lykke til, ${currentUsername}!`;
    } else {
        // Ingen bruker funnet, vis modal
        modalOverlay.style.display = 'flex';
    }
}

function handleSaveUsername() {
    const username = usernameInput.value.trim(); // Fjern mellomrom
    if (username.length > 0 && username.length <= 15) {
        // Gyldig brukernavn
        currentUsername = username;
        localStorage.setItem(USERNAME_KEY, username);
        modalOverlay.style.display = 'none'; // Skjul modalen
        welcomeMessage.textContent = `Lykke til, ${currentUsername}!`;
        usernameError.textContent = ''; // Tøm feilmelding
    } else {
        // Ugyldig
        usernameError.textContent = 'Navn må være 1-15 tegn.';
    }
}


// === Spill-logikk (med små justeringer) ===

// 1. Funksjon for å lage spillbrettet
function createBoard() {
    gameContainer.innerHTML = ''; 
    resetBoardState();
    resetTimerDisplay(); 

    const level = levelSelect.value;
    const cardSymbols = symbolSets[level];
    const config = gridConfig[level];

    matchedPairs = 0;
    totalPairs = cardSymbols.length;

    gameContainer.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;
    let gameCards = [...cardSymbols, ...cardSymbols];
    gameCards.sort(() => 0.5 - Math.random());

    gameCards.forEach(symbol => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.symbol = symbol; 
        card.innerHTML = `
            <div class="front-face">${symbol}</div>
            <div class="back-face">?</div>
        `;
        gameContainer.appendChild(card);
        card.addEventListener('click', flipCard);
    });
}

// 2. Funksjon for å håndtere kortsnuing
function flipCard() {
    if (lockBoard) return;
    if (this === firstCard) return;

    if (!gameStarted) {
        startTimer();
        gameStarted = true;
    }

    this.classList.add('flip');

    if (!hasFlippedCard) {
        hasFlippedCard = true;
        firstCard = this;
    } else {
        secondCard = this;
        checkForMatch();
    }
}

// 3. Funksjon for å sjekke om to kort er like
function checkForMatch() {
    let isMatch = firstCard.dataset.symbol === secondCard.dataset.symbol;
    isMatch ? disableCards() : unflipCards();
}

// 4. Funksjon for å "fryse" matchede kort
function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);
    
    matchedPairs++; 

    if (matchedPairs === totalPairs) {
        stopTimer();
        const finalTime = (Date.now() - startTime) / 1000;
        // VIKTIG: Sjekk kun highscore hvis et brukernavn er satt
        if (currentUsername) {
            checkAndSaveHighscore(finalTime);
        }
    }
    resetBoardState();
}

// 5. Funksjon for å snu kortene tilbake
function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        firstCard.classList.remove('flip');
        secondCard.classList.remove('flip');
        resetBoardState();
    }, 1000); 
}

// 6. Funksjon for å nullstille tilstanden
function resetBoardState() {
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
}

// 7. Funksjon for å starte spillet på nytt
function resetGame() {
    createBoard(); 
}


// === Oppstart ===

// Samle all oppstart i én funksjon
function initializeGame() {
    // Koble knapper til funksjoner
    resetButton.addEventListener('click', resetGame);
    levelSelect.addEventListener('change', resetGame);
    usernameSaveBtn.addEventListener('click', handleSaveUsername);

    checkUsername();      // Sjekk om brukeren har et navn
    displayHighscores();  // Vis lagrede highscores
    createBoard();        // Lag det første brettet
}

// Kjør spillet!
initializeGame();
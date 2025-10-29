// Hent elementer fra HTML
const gameContainer = document.querySelector('.memory-game');
const resetButton = document.querySelector('#reset-button');
const levelSelect = document.querySelector('#level-select'); // NY

// --- NY: Definer nivåer ---
const symbolSets = {
    easy: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'], // 6 par = 12 kort
    medium: ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🍉'], // 8 par = 16 kort
    hard: ['🚗', '🚕', '🚌', '🚓', '🚑', '🚚', '🚜', '🚲', '🛴', '✈️'] // 10 par = 20 kort
};

// Definer grid-oppsett for hvert nivå
const gridConfig = {
    easy: { columns: 4 }, // 4x3
    medium: { columns: 4 }, // 4x4
    hard: { columns: 5 } // 5x4
};
// --- Slutt på NY ---

// Spill-tilstand
let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;

// 1. Funksjon for å lage spillbrettet
function createBoard() {
    gameContainer.innerHTML = ''; // Tøm brettet

    // --- OPPDATERT: Hent nivå ---
    const level = levelSelect.value;
    const cardSymbols = symbolSets[level];
    const config = gridConfig[level];

    // Sett riktig antall kolonner for brettet
    gameContainer.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;
    // --- Slutt på OPPDATERT ---

    // Doble symbolene for å lage par
    let gameCards = [...cardSymbols, ...cardSymbols];

    // Stokke kortene (dette er randomiseringen du spurte om)
    gameCards.sort(() => 0.5 - Math.random());

    // Loop gjennom de stokkede kortene og lag HTML
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

    if (isMatch) {
        disableCards();
    } else {
        unflipCards();
    }
}

// 4. Funksjon for å "fryse" matchede kort
function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);
    resetBoardState();
}

// 5. Funksjon for å snu kortene tilbake
function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        firstCard.classList.remove('flip');
        secondCard.classList.remove('flip');
        resetBoardState();
    }, 1000); // 1 sekund
}

// 6. Funksjon for å nullstille tilstanden (etter hvert trekk)
function resetBoardState() {
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
}

// 7. Funksjon for å starte spillet på nytt
function resetGame() {
    resetBoardState();
    createBoard(); // Lag brettet på nytt (stokker kortene)
}


// --- Oppstart ---

// Koble knapper til funksjoner
resetButton.addEventListener('click', resetGame);
levelSelect.addEventListener('change', resetGame); // NY: Bytt nivå = start på nytt

// Lag brettet og start spillet når siden lastes
createBoard();
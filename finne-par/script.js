// Hent spillbrettet og reset-knappen fra HTML
const gameContainer = document.querySelector('.memory-game');
const resetButton = document.querySelector('#reset-button');

// Definer kortene vi skal bruke (8 par = 16 kort)
// Emojis er enkle å bruke da vi ikke trenger bildefiler
const cardSymbols = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

// Spill-tilstand
let hasFlippedCard = false;
let lockBoard = false; // Forhindrer klikking mens kort snus tilbake
let firstCard, secondCard;

// 1. Funksjon for å lage spillbrettet
function createBoard() {
    // Tøm brettet først (hvis vi starter på nytt)
    gameContainer.innerHTML = '';

    // Doble symbolene for å lage par
    let gameCards = [...cardSymbols, ...cardSymbols];

    // Stokke kortene
    gameCards.sort(() => 0.5 - Math.random());

    // Loop gjennom de stokkede kortene og lag HTML for hvert kort
    gameCards.forEach(symbol => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        // Vi legger til 'data-symbol' for å vite hvilket kort det er
        card.dataset.symbol = symbol; 

        card.innerHTML = `
            <div class="front-face">${symbol}</div>
            <div class="back-face">?</div>
        `;

        // Legg kortet til i spillbrettet
        gameContainer.appendChild(card);

        // Legg til en 'klikk'-lytter på hvert kort
        card.addEventListener('click', flipCard);
    });
}

// 2. Funksjon for å håndtere kortsnuing
function flipCard() {
    // Hvis brettet er "låst" (to kort snus tilbake), ikke gjør noe
    if (lockBoard) return;
    // Hvis vi klikker på samme kort to ganger, ikke gjør noe
    if (this === firstCard) return;

    this.classList.add('flip');

    if (!hasFlippedCard) {
        // Første kortet som er snudd
        hasFlippedCard = true;
        firstCard = this;
    } else {
        // Andre kortet som er snudd
        secondCard = this;
        checkForMatch();
    }
}

// 3. Funksjon for å sjekke om to kort er like
function checkForMatch() {
    // Er symbolene i data-attributtet like?
    let isMatch = firstCard.dataset.symbol === secondCard.dataset.symbol;

    if (isMatch) {
        // Det er et par! Deaktiver kortene.
        disableCards();
    } else {
        // Ikke et par. Snu dem tilbake.
        unflipCards();
    }
}

// 4. Funksjon for å "fryse" matchede kort
function disableCards() {
    // Vi fjerner klikk-lytteren så de ikke kan snus igjen
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);

    resetBoardState();
}

// 5. Funksjon for å snu kortene tilbake hvis de ikke matcher
function unflipCards() {
    lockBoard = true; // Lås brettet

    // Vent 1 sekund før kortene snus tilbake
    setTimeout(() => {
        firstCard.classList.remove('flip');
        secondCard.classList.remove('flip');
        
        resetBoardState();
    }, 1000);
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

// Koble reset-knappen til resetGame-funksjonen
resetButton.addEventListener('click', resetGame);

// Lag brettet og start spillet når siden lastes
createBoard();
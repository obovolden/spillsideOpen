document.addEventListener('DOMContentLoaded', () => {
    
    // --- Konstanter ---
    const TABLEAU_STACK_OFFSET_Y = 30; // Piksler kortene stables med i Y-aksen
    const WASTE_STACK_OFFSET_X = 20; // Piksler kortene stables med i X-aksen for waste-pile

    // --- Globale variabler ---
    let deck = [];
    let gameMode = 1; // 1 eller 3
    let timerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;

    // --- DOM-elementer ---
    const timeDisplay = document.getElementById('time-display');
    const startGameBtn = document.getElementById('start-game-btn');
    const drawModeSelect = document.getElementById('draw-mode');
    const highscoreList1 = document.getElementById('highscore-list-1');
    const highscoreList3 = document.getElementById('highscore-list-3');
    
    const stockPile = document.getElementById('stock-pile');
    const wastePile = document.getElementById('waste-pile');
    const foundationSlots = document.querySelectorAll('.foundation');
    const tableauSlots = document.querySelectorAll('.tableau');

    // --- Event Listeners ---
    startGameBtn.addEventListener('click', startGame);
    stockPile.addEventListener('click', onStockPileClick);
    
    // Sett opp dra-og-slipp lyttere for alle bunker
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', onDragOver);
        slot.addEventListener('drop', onDrop);
    });

    // --- Kjernefunksjoner ---

    function startGame() {
        console.log("Starter nytt spill...");
        gameMode = parseInt(drawModeSelect.value);
        
        resetBoard();
        
        deck = createDeck();
        shuffleDeck(deck);
        
        dealFullGame(deck); 

        console.log(`Spillmodus: Trekk ${gameMode}. Stokket ${deck.length} kort.`);
        loadHighScores();
        // Timere starter ikke før første trekk
    }

    function resetBoard() {
        // Tøm alle kort fra brettet
        document.querySelectorAll('.card').forEach(card => card.remove());
        
        // Stopp og nullstill timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        timerInterval = null;
        elapsedTime = 0;
        timeDisplay.textContent = '0';
    }

    // --- Kort-oppretting og Utdeling ---

    function createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        let newDeck = [];
        for (let suit of suits) {
            for (let value of values) {
                newDeck.push({ suit, value });
            }
        }
        return newDeck;
    }

    function shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    /**
     * Lager et HTML-element for et kort
     * @param {object} cardData - { suit, value }
     * @param {boolean} isFaceUp - Om kortet skal vises med forsiden opp
     */
    function createCardElement(cardData, isFaceUp = false) {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        
        cardEl.id = `card-${cardData.suit}-${cardData.value}`;
        cardEl.dataset.value = cardData.value;
        cardEl.dataset.suit = cardData.suit;

        // --- NYTT: Legg til struktur for hjørner og midten ---
        const topInfo = document.createElement('span');
        topInfo.classList.add('card-info', 'top');
        cardEl.appendChild(topInfo);

        const middleSuit = document.createElement('span');
        middleSuit.classList.add('card-suit-middle');
        cardEl.appendChild(middleSuit);

        const bottomInfo = document.createElement('span');
        bottomInfo.classList.add('card-info', 'bottom');
        cardEl.appendChild(bottomInfo);
        // --- SLUTT NYTT ---
        
        cardEl.dataset.isFaceUp = 'false'; 

        if (isFaceUp) {
            turnCardFaceUp(cardEl); 
        } else {
            cardEl.classList.add('face-down');
            cardEl.draggable = false;
        }
        return cardEl;
    }
    

    /**
     * Deler ut hele spillet
     */
    function dealFullGame(deck) {
        let tempDeck = [...deck];

        // 1. Del ut til Tableau (spillebunkene)
        tableauSlots.forEach((slot, tableauIndex) => {
            for (let i = 0; i < tableauIndex + 1; i++) {
                const cardData = tempDeck.pop();
                const isFaceUp = (i === tableauIndex);
                const cardEl = createCardElement(cardData, isFaceUp);
                
                // --- KORREKT STABLINGSLOGIKK ---
                cardEl.style.top = (i * TABLEAU_STACK_OFFSET_Y) + 'px';
                
                slot.appendChild(cardEl);
            }
        });

        // 2. Legg resten av kortene i trekkebunken
        while (tempDeck.length > 0) {
            const cardData = tempDeck.pop();
            const cardEl = createCardElement(cardData, false);
            stockPile.appendChild(cardEl);
        }
    }

    // --- Spill-logikk (Trekkebunke) ---

    function onStockPileClick() {
        if (timerInterval === null) startTimer(); // Start timer på første trekk

        // 1. Sjekk om trekkebunken er tom
        if (stockPile.children.length === 0) {
            recycleWastePile();
            return;
        }
        
        // 2. Flytt 'numToDraw' kort fra stock til waste
        const numToDraw = gameMode;
        for (let i = 0; i < numToDraw; i++) {
            const topCard = stockPile.lastElementChild;
            if (topCard) {
                turnCardFaceUp(topCard); // Snur kortet
                topCard.style.top = '0px'; 
                topCard.style.left = '0px'; // Nullstill venstre-posisjon
                wastePile.appendChild(topCard);
            }
        }
        
        // 3. Oppdater det visuelle for waste-bunken
        updateWastePileVisuals();
    }
    
    // NY OG FORENKLET FUNKSJON
    function updateWastePileVisuals() {
        const wasteCards = Array.from(wastePile.children);
        const numCards = wasteCards.length;
        
        wasteCards.forEach((card, index) => {
            let offset = 0;
            // Viser de 3 siste kortene (eller færre) spredt ut
            if (index >= numCards - 3) { 
                offset = (index - (Math.max(0, numCards - 3))) * WASTE_STACK_OFFSET_X;
            } else if (numCards > 3) {
                 // Alle eldre kort stables på 0
                offset = 0;
            }
            
            card.style.left = offset + 'px';
            card.style.zIndex = index; // Sørg for at de øverste er synlige
        });
    }


    function recycleWastePile() {
        const wasteCards = Array.from(wastePile.children);
        while(wasteCards.length > 0) {
            const cardEl = wasteCards.pop(); 
            
            // Snu det med baksiden opp igjen
            cardEl.classList.add('face-down');
            cardEl.classList.remove('red-card');
            cardEl.dataset.isFaceUp = 'false';
            
            // --- NYTT: Tøm de nye span-elementene ---
            const topInfo = cardEl.querySelector('.card-info.top');
            const bottomInfo = cardEl.querySelector('.card-info.bottom');
            const middleSuit = cardEl.querySelector('.card-suit-middle');
            if (topInfo) topInfo.textContent = '';
            if (bottomInfo) bottomInfo.textContent = '';
            if (middleSuit) middleSuit.textContent = '';
            // --- SLUTT NYTT ---

            cardEl.draggable = false;
            cardEl.removeEventListener('dragstart', onDragStart);
            cardEl.removeEventListener('dragend', onDragEnd);
            
            // Nullstill posisjon og z-index
            cardEl.style.top = '0px';
            cardEl.style.left = '0px';
            cardEl.style.zIndex = 'auto';

            stockPile.appendChild(cardEl);
        }
    }

    /**
     * Hjelpefunksjon for å snu et kort med forsiden opp
     */
    function turnCardFaceUp(cardEl, suit, value) {
        if (!cardEl) return;
        if (cardEl.dataset.isFaceUp === 'true') return; // Allerede snudd

        const cardSuit = suit || cardEl.dataset.suit;
        const cardValue = value || cardEl.dataset.value;

        cardEl.classList.remove('face-down');
        cardEl.dataset.isFaceUp = 'true';
        
        // --- NYTT: Fyll inn de nye span-elementene ---
        const cardInfoText = `${cardValue}${cardSuit}`;
        
        const topInfo = cardEl.querySelector('.card-info.top');
        const bottomInfo = cardEl.querySelector('.card-info.bottom');
        const middleSuit = cardEl.querySelector('.card-suit-middle');

        if (topInfo) topInfo.textContent = cardInfoText;
        if (middleSuit) middleSuit.textContent = cardSuit;
        if (bottomInfo) bottomInfo.textContent = cardInfoText;
        // --- SLUTT NYTT ---
        
        if (getCardColor(cardSuit) === 'red') {
            cardEl.classList.add('red-card');
        }

        cardEl.draggable = true;
        cardEl.addEventListener('dragstart', onDragStart);
        cardEl.addEventListener('dragend', onDragEnd);
    }

    // --- Dra-og-slipp Logikk ---

    function onDragStart(e) {
        if (timerInterval === null) startTimer(); // Start timer på første trekk

        // Sjekk om vi drar fra waste-bunken
        const isFromWaste = e.target.parentElement === wastePile;
        
        // Hvis vi drar fra waste, KUN tillat å dra det øverste kortet
        if (isFromWaste && e.target !== wastePile.lastElementChild) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', e.target.id);
        e.dataTransfer.effectAllowed = 'move';
        
        // Gir en liten visuell effekt og øker z-index
        setTimeout(() => {
            let currentCard = e.target;
            let z = 100;
            while(currentCard) {
                currentCard.style.opacity = '0.7';
                currentCard.style.zIndex = z++;
                if (isFromWaste) currentCard = null; // Stopp hvis fra waste
                else currentCard = currentCard.nextElementSibling;
            }
        }, 0);
    }

    function onDragOver(e) {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    }

    function onDrop(e) {
        e.preventDefault();

        const cardId = e.dataTransfer.getData('text/plain');
        const draggedCard = document.getElementById(cardId);
        
        if (!draggedCard) return;

        let dropTarget = e.target;
        
        if (dropTarget.classList.contains('card')) {
            dropTarget = dropTarget.parentElement;
        }

        if (!dropTarget.classList.contains('card-slot')) {
             // Avbryt hvis dropp-målet er ugyldig
            return;
        }

        const originalParent = draggedCard.parentElement;

        if (isValidMove(draggedCard, dropTarget)) {
            
            // Håndter flytting av én eller flere kort
            const stackToMove = [];
            let currentCard = draggedCard;
            while(currentCard) {
                stackToMove.push(currentCard);
                // Hvis fra waste, flytt kun ett kort
                if (originalParent === wastePile) currentCard = null; 
                else currentCard = currentCard.nextElementSibling;
            }
            
            const baseIndex = dropTarget.children.length; // Start-indeks i den nye bunken

            stackToMove.forEach((card, index) => {
                // For foundation-bunker, ikke stable i høyden
                if (dropTarget.classList.contains('foundation')) {
                    card.style.top = '0px';
                } else {
                    card.style.top = (baseIndex + index) * TABLEAU_STACK_OFFSET_Y + 'px';
                }
                card.style.left = '0px'; 
                card.style.opacity = '1';
                card.style.zIndex = baseIndex + index + 1;
                
                dropTarget.appendChild(card);
            });
            
            // Snu kortet som lå under
            if (originalParent.classList.contains('tableau') && originalParent.lastElementChild) {
                turnCardFaceUp(originalParent.lastElementChild);
            }
            
            // Oppdater waste-bunken hvis vi flyttet derfra
            if (originalParent === wastePile) {
                updateWastePileVisuals();
            }

            checkWinCondition();
            
        } else {
            console.log("Ugyldig trekk!");
        }
    }

    // --- NY FUNKSJON: Kjører alltid etter en dra-operasjon ---
    function onDragEnd(e) {
        // Tilbakestill stilen på kortet (og evt. bunken)
        // uansett om flyttingen var vellykket eller ikke.
        resetCardStackStyle(e.target);
    }

    // NY Hjelpefunksjon: Tilbakestiller stil ved ugyldig dropp
    function resetCardStackStyle(topCard) {
        let currentCard = topCard;
        while(currentCard) {
            currentCard.style.opacity = '1';
            
            // Nullstill zIndex kun hvis den ikke er i en bunke
            // (La onDrop håndtere zIndex for vellykkede trekk)
            if (currentCard.parentElement.children.length > 1 && currentCard.style.zIndex >= 100) {
                 // Denne logikken er vanskelig, la oss forenkle:
                 // onDrop setter RIKTIG zIndex. Denne nullstiller bare.
                 // Vi setter den til auto, så den følger dokumentflyten
                 // ELLER, vi kan sette den basert på posisjonen i bunken
                 
                 // Enkleste: la zIndex være som den var, onDrop fikser den
                 // hvis trekket er gyldig. Hvis ikke, er det ikke så farlig.
                 // Men opacity MÅ tilbake.
            }

            currentCard = currentCard.nextElementSibling;
        }

        // Reposisjoner z-index for hele den opprinnelige bunken
        // Dette er den tryggeste måten å unngå "flytende" kort
        if (topCard && topCard.parentElement) {
            const children = Array.from(topCard.parentElement.children);
            children.forEach((child, index) => {
                if (child.classList.contains('card')) {
                    child.style.zIndex = index + 1;
                }
            });
            // Og oppdater waste-bunken visuelt hvis det var der
            if(topCard.parentElement === wastePile) {
                updateWastePileVisuals();
            }
        }
    }


    // --- Regel-validering ---
    
    const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    function getNumericValue(valueStr) {
        return CARD_VALUES.indexOf(valueStr);
    }

    function getCardColor(suit) {
        return (suit === '♥' || suit === '♦') ? 'red' : 'black';
    }

    function isValidMove(draggedCard, targetSlot) {
        const draggedSuit = draggedCard.dataset.suit;
        const draggedValue = draggedCard.dataset.value;
        const draggedColor = getCardColor(draggedSuit);
        const draggedNumericValue = getNumericValue(draggedValue);
        
        if (draggedCard.dataset.isFaceUp === 'false') return false;

        const topCard = targetSlot.lastElementChild;

        // --- REGEL 1: Flytte til MÅL-BUNKENE (Foundation) ---
        if (targetSlot.classList.contains('foundation')) {
            // Kan bare flytte ETT kort om gangen
            if (draggedCard.nextElementSibling) return false; 
            
            if (!topCard) {
                return draggedValue === 'A';
            }
            
            const topCardSuit = topCard.dataset.suit;
            const topCardNumericValue = getNumericValue(topCard.dataset.value);

            const sameSuit = (draggedSuit === topCardSuit);
            const oneValueHigher = (draggedNumericValue === topCardNumericValue + 1);
            return sameSuit && oneValueHigher;
        }

        // --- REGEL 2: Flytte til SPILLE-BUNKENE (Tableau) ---
        if (targetSlot.classList.contains('tableau')) {
            if (!topCard) {
                return draggedValue === 'K';
            }

            const topCardColor = getCardColor(topCard.dataset.suit);
            const topCardNumericValue = getNumericValue(topCard.dataset.value);
            
            if (topCard.dataset.isFaceUp === 'false') return false; 

            const oppositeColor = (draggedColor !== topCardColor);
            const oneValueLower = (draggedNumericValue === topCardNumericValue - 1);
            return oppositeColor && oneValueLower;
        }
        
        return false; // Ikke et gyldig mål
    }

    // --- Seier-sjekk ---
    function checkWinCondition() {
        if (timerInterval === null) return; 

        let totalFoundationCards = 0;
        foundationSlots.forEach(slot => {
            totalFoundationCards += slot.children.length;
        });

        if (totalFoundationCards === 52) {
            stopTimer();
            setTimeout(() => { 
                alert(`Gratulerer! Du vant på ${elapsedTime} sekunder!`);
                saveHighScore(elapsedTime, gameMode);
            }, 200);
        }
    }


    // --- Timer-logikk ---
    function startTimer() {
        if (timerInterval) return; 
        startTime = Date.now() - (elapsedTime * 1000); 
        timerInterval = setInterval(updateTimer, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimer() {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        timeDisplay.textContent = `${elapsedTime}s`;
    }

    // --- Highscore-logikk ---
    function getHighScores(mode) {
        const key = mode === 1 ? 'highscore_draw1' : 'highscore_draw3';
        const scoresJSON = localStorage.getItem(key);
        return scoresJSON ? JSON.parse(scoresJSON) : [];
    }

    function saveHighScore(time, mode) {
        const scores = getHighScores(mode);
        scores.push(time);
        scores.sort((a, b) => a - b); 
        const topScores = scores.slice(0, 5); // Lagre topp 5

        const key = mode === 1 ? 'highscore_draw1' : 'highscore_draw3';
        localStorage.setItem(key, JSON.stringify(topScores));
        
        loadHighScores();
    }

    function loadHighScores() {
        const scores1 = getHighScores(1);
        const scores3 = getHighScores(3);

        displayScores(scores1, highscoreList1);
        displayScores(scores3, highscoreList3);
    }

    function displayScores(scores, listElement) {
        listElement.innerHTML = '';
        if (scores.length === 0) {
            listElement.innerHTML = '<li>Ingen score ennå</li>';
        } else {
            scores.forEach(score => {
                const li = document.createElement('li');
                // Sikrer at denne linjen bruker backticks (`)
                li.textContent = `${score} sekunder`; 
                listElement.appendChild(li);
            });
        }
    }
    
    // --- Initialiser spillet ---
    loadHighScores();
});
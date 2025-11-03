document.addEventListener('DOMContentLoaded', () => {
    
    // --- Konstanter ---
    const TABLEAU_STACK_OFFSET_Y = 35; 
    const WASTE_STACK_OFFSET_X = 20; 

    // --- Globale variabler ---
    let deck = [];
    let gameMode = 1; // 1 eller 3
    let timerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;
    let onConfirmCallback = null; 

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

    // --- MODAL-ELEMENTER ---
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalConfirmBtn = document.getElementById('modal-confirm');
    const modalCancelBtn = document.getElementById('modal-cancel');

    // --- START PÅ NY, "SKUDDSIKKER" FIKS ---
    // Tvinger modalen til å være skjult med inline-stil,
    // uavhengig av om CSS-filen er ødelagt.
    if (modalOverlay) {
        modalOverlay.style.display = 'none'; // Bruker inline-stil
    }
    // --- SLUTT PÅ NY FIKS ---


    // --- Event Listeners ---
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (timerInterval) {
                if (modalOverlay) {
                    showConfirmModal(
                        "Starte nytt spill?", 
                        "Er du sikker på at du vil starte? All fremgang vil gå tapt.", 
                        startGame 
                    );
                } else {
                    if (confirm("Er du sikker på at du vil starte et nytt spill? Fremgangen din vil gå tapt.")) {
                        startGame();
                    }
                }
            } else {
                startGame();
            }
        });
    } else {
        console.error("Finner ikke 'start-game-btn'. Spillet kan ikke starte.");
    }

    if (stockPile) {
        stockPile.addEventListener('click', onStockPileClick);
    }
    
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', onDragOver);
        slot.addEventListener('drop', onDrop);
    });

    if (modalOverlay && modalConfirmBtn && modalCancelBtn) {
        modalConfirmBtn.addEventListener('click', () => {
            if (onConfirmCallback) {
                onConfirmCallback(); 
            }
            hideModal();
        });

        modalCancelBtn.addEventListener('click', hideModal);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
    } else {
        console.warn("Modal HTML-elementer ble ikke funnet. Spillet vil falle tilbake til 'alert' og 'confirm'.");
    }

    // --- Kjernefunksjoner ---
    function startGame() {
        console.log("Starting new game...");
        gameMode = parseInt(drawModeSelect.value);
        resetBoard();
        deck = createDeck();
        shuffleDeck(deck);
        dealFullGame(deck); 
        console.log(`Game mode: Draw ${gameMode}. Shuffled ${deck.length} cards.`);
        loadHighScores();
    }

    function resetBoard() {
        document.querySelectorAll('.card').forEach(card => card.remove());
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

    function createCardElement(cardData, isFaceUp = false) {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        cardEl.id = `card-${cardData.suit}-${cardData.value}`;
        cardEl.dataset.value = cardData.value;
        cardEl.dataset.suit = cardData.suit;
        cardEl.dataset.isFaceUp = 'false'; 
        if (isFaceUp) {
            turnCardFaceUp(cardEl); 
        } else {
            cardEl.classList.add('face-down');
            cardEl.draggable = false;
        }
        return cardEl;
    }
    
    function dealFullGame(deck) {
        let tempDeck = [...deck];
        tableauSlots.forEach((slot, tableauIndex) => {
            for (let i = 0; i < tableauIndex + 1; i++) {
                const cardData = tempDeck.pop();
                const isFaceUp = (i === tableauIndex);
                const cardEl = createCardElement(cardData, isFaceUp);
                cardEl.style.top = (i * TABLEAU_STACK_OFFSET_Y) + 'px';
                slot.appendChild(cardEl);
            }
        });
        while (tempDeck.length > 0) {
            const cardData = tempDeck.pop();
            const cardEl = createCardElement(cardData, false);
            stockPile.appendChild(cardEl);
        }
    }

    // --- Spill-logikk (Trekkebunke) ---
    function onStockPileClick() {
        if (timerInterval === null) startTimer(); 
        if (stockPile.children.length === 0) {
            recycleWastePile();
            return;
        }
        const numToDraw = gameMode;
        for (let i = 0; i < numToDraw; i++) {
            const topCard = stockPile.lastElementChild;
            if (topCard) {
                turnCardFaceUp(topCard); 
                topCard.style.top = '0px'; 
                topCard.style.left = '0px'; 
                wastePile.appendChild(topCard);
            }
        }
        updateWastePileVisuals();
    }
    
    function updateWastePileVisuals() {
        const wasteCards = Array.from(wastePile.children);
        const numCards = wasteCards.length;
        wasteCards.forEach((card, index) => {
            let offset = 0;
            if (index >= numCards - 3) { 
                offset = (index - (Math.max(0, numCards - 3))) * WASTE_STACK_OFFSET_X;
            } else if (numCards > 3) {
                offset = 0;
            }
            card.style.left = offset + 'px';
            card.style.zIndex = index; 
        });
    }

    function recycleWastePile() {
        const wasteCards = Array.from(wastePile.children);
        while(wasteCards.length > 0) {
            const cardEl = wasteCards.pop(); 
            cardEl.classList.add('face-down');
            cardEl.classList.remove('red-card');
            cardEl.dataset.isFaceUp = 'false';
            cardEl.style.backgroundImage = 'none';
            cardEl.draggable = false;
            cardEl.removeEventListener('dragstart', onDragStart);
            cardEl.removeEventListener('dragend', onDragEnd);
            cardEl.removeEventListener('dragover', onDragOver);
            cardEl.removeEventListener('drop', onDrop);
            cardEl.removeEventListener('dblclick', onCardDoubleClick);
            cardEl.style.top = '0px';
            cardEl.style.left = '0px';
            cardEl.style.zIndex = 'auto';
            stockPile.appendChild(cardEl);
        }
    }

    function getCardImageFilename(suit, value) {
        let suitLetter;
        if (suit === '♥') suitLetter = 'H';
        else if (suit === '♦') suitLetter = 'D';
        else if (suit === '♣') suitLetter = 'C';
        else if (suit === '♠') suitLetter = 'S';
        return `${value}${suitLetter}.png`;
    }

    function turnCardFaceUp(cardEl, suit, value) {
        if (!cardEl) return;
        if (cardEl.dataset.isFaceUp === 'true') return; 
        const cardSuit = suit || cardEl.dataset.suit;
        const cardValue = value || cardEl.dataset.value;
        cardEl.classList.remove('face-down');
        cardEl.dataset.isFaceUp = 'true';
        cardEl.classList.add('flipped');
        const filename = getCardImageFilename(cardSuit, cardValue);
        cardEl.style.backgroundImage = `url('img/cards/${filename}')`;
        if (getCardColor(cardSuit) === 'red') {
            cardEl.classList.add('red-card');
        } else {
            cardEl.classList.remove('red-card'); 
        }
        cardEl.draggable = true;
        cardEl.addEventListener('dragstart', onDragStart);
        cardEl.addEventListener('dragend', onDragEnd);
        cardEl.addEventListener('dragover', onDragOver);
        cardEl.addEventListener('drop', onDrop);
        cardEl.addEventListener('dblclick', onCardDoubleClick);
    }

    // --- Dra-og-slipp Logikk ---
    function onDragStart(e) {
        if (timerInterval === null) startTimer(); 
        const isFromWaste = e.target.parentElement === wastePile;
        if (isFromWaste && e.target !== wastePile.lastElementChild) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', e.target.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            let currentCard = e.target;
            let z = 100;
            while(currentCard) {
                currentCard.style.opacity = '0.7';
                currentCard.style.zIndex = z++;
                if (isFromWaste) currentCard = null; 
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
        const dropTargetElement = e.target.closest('.card, .card-slot');
        if (!dropTargetElement) {
            console.log("Slipp på ugyldig område.");
            return; 
        }
        let targetSlot;
        if (dropTargetElement.classList.contains('card')) {
            targetSlot = dropTargetElement.parentElement;
        } else {
            targetSlot = dropTargetElement;
        }
        if (!targetSlot || !targetSlot.classList.contains('card-slot')) {
            console.log("Fant ikke en gyldig bunke ('card-slot').");
            return; 
        }
        const originalParent = draggedCard.parentElement;
        if (isValidMove(draggedCard, targetSlot)) {
            const stackToMove = [];
            let currentCard = draggedCard;
            while(currentCard) {
                stackToMove.push(currentCard);
                if (originalParent === wastePile) currentCard = null; 
                else currentCard = currentCard.nextElementSibling;
            }
            const baseIndex = targetSlot.children.length; 
            stackToMove.forEach((card, index) => {
                card.style.left = '0px'; 
                card.style.opacity = '1';
                if (targetSlot.classList.contains('foundation')) {
                    card.style.top = '0px';
                    card.style.zIndex = getNumericValue(card.dataset.value) + 1;
                } else {
                    card.style.top = (baseIndex + index) * TABLEAU_STACK_OFFSET_Y + 'px';
                    card.style.zIndex = baseIndex + index + 1;
                }
                targetSlot.appendChild(card); 
            });
            if (originalParent.classList.contains('tableau') && originalParent.lastElementChild) {
                turnCardFaceUp(originalParent.lastElementChild);
            }
            if (originalParent === wastePile) {
                updateWastePileVisuals();
            }
            checkWinCondition();
        } else {
            console.log("Ugyldig trekk!");
        }
    }

    function onDragEnd(e) {
        resetCardStackStyle(e.target);
    }
    
    function onCardDoubleClick(e) {
        if (timerInterval === null) startTimer(); 
        const cardEl = e.target.closest('.card');
        if (!cardEl) return;
        const originalParent = cardEl.parentElement;
        const isTopWasteCard = (originalParent === wastePile && cardEl === wastePile.lastElementChild);
        const isBottomTableauCard = (originalParent.classList.contains('tableau') && cardEl.nextElementSibling === null);
        if (!isTopWasteCard && !isBottomTableauCard) {
            return; 
        }
        for (const slot of foundationSlots) {
            if (isValidMove(cardEl, slot)) {
                cardEl.style.top = '0px';
                cardEl.style.left = '0px';
                cardEl.style.zIndex = getNumericValue(cardEl.dataset.value) + 1;
                slot.appendChild(cardEl);
                if (isBottomTableauCard && originalParent.lastElementChild) {
                    turnCardFaceUp(originalParent.lastElementChild);
                }
                if (isTopWasteCard) {
                    updateWastePileVisuals();
                }
                checkWinCondition();
                break; 
            }
        }
    }

    function resetCardStackStyle(topCard) {
        if (!topCard) return;
        let currentCard = topCard;
        while(currentCard) {
            currentCard.style.opacity = '1';
            currentCard = currentCard.nextElementSibling;
        }
        if (topCard.parentElement && topCard.parentElement.classList.contains('tableau')) {
            const children = Array.from(topCard.parentElement.children);
            children.forEach((child, index) => {
                if (child.classList.contains('card')) {
                    child.style.zIndex = index + 1;
                }
            });
        } else if (topCard.parentElement && topCard.parentElement === wastePile) {
             updateWastePileVisuals();
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

        // REGEL 1: Flytte til MÅL-BUNKENE (Foundation)
        if (targetSlot.classList.contains('foundation')) {
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

        // REGEL 2: Flytte til SPILLE-BUNKENE (Tableau)
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
        return false; 
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
            const finalTime = elapsedTime; 
            setTimeout(() => { 
                if (modalOverlay) {
                    showAlertModal(
                        "Gratulerer!", 
                        `Du vant på ${finalTime} sekunder!`,
                        () => { saveHighScore(finalTime, gameMode); } 
                    );
                } else {
                    alert(`Gratulerer! Du vant på ${finalTime} sekunder!`);
                    saveHighScore(finalTime, gameMode);
                }
            }, 500); 
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
        const topScores = scores.slice(0, 5); 
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
                li.textContent = `${score} sekunder`; 
                listElement.appendChild(li);
            });
        }
    }

    // --- NYE MODAL-HJELPEFUNKSJONER (Bruker inline-stil) ---
    
    function showConfirmModal(title, text, callback) {
        if (!modalOverlay) return; 
        modalOverlay.classList.remove('hidden');
        modalOverlay.style.display = 'flex';
        modalTitle.textContent = title;
        modalText.textContent = text;
        modalConfirmBtn.textContent = "Ja";
        modalCancelBtn.style.display = 'inline-block';
        onConfirmCallback = callback; 
    }


    function showAlertModal(title, text, callback = null) {
        if (!modalOverlay) return; 
        modalTitle.textContent = title;
        modalText.textContent = text;
        modalConfirmBtn.textContent = "OK";
        modalCancelBtn.style.display = 'none'; // Bruker inline-stil
        modalOverlay.style.display = 'flex'; // Bruker inline-stil
        onConfirmCallback = callback; 
    }

    function hideModal() {
        if (!modalOverlay) return; 
        modalOverlay.style.display = 'none'; // Bruker inline-stil
        onConfirmCallback = null;
    }

    
    // --- Initialiser spillet ---
    loadHighScores();
});
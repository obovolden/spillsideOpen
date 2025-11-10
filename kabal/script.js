document.addEventListener('DOMContentLoaded', () => {
    
    // --- Konstanter ---
    const TABLEAU_STACK_OFFSET_Y = 25; // Endret for mobil
    
    // --- START PÅ FIKS (Mobil-offset) ---
    const WASTE_OFFSET_DESKTOP = 25; // For desktop
    const WASTE_OFFSET_MOBILE = 15; // For mobil (tettere)
    
    // Sjekker for mobil-view (matcher CSS @media query)
    const mobileMediaQuery = window.matchMedia('(max-width: 800px)');
    // --- SLUTT PÅ FIKS ---

    // --- Globale variabler ---
    let deck = [];
    let gameMode = 1; // 1 eller 3
    let timerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;
    let onConfirmCallback = null; 
    let autocompleteInterval = null;
    
    // --- NYTT: Variabler for nye funksjoner ---
    let moveHistory = []; // For Angre-funksjonen
    let moveCount = 0;
    let score = 0;
    let isAnimating = false; // For å låse input under hint/animasjoner
    
    // Ny global variabel for å håndtere "touch"-dragging
    let activeDrag = {
        card: null,
        stack: [], // Kortene som dras
        originalParent: null,
        initialX: 0,
        initialY: 0,
        offsetX: 0, 
        offsetY: 0, 
        isDragging: false,
        dragThreshold: 5 // Minste bevegelse (i px) før det telles som "drag"
    };

    // --- DOM-elementer ---
    const timeDisplay = document.getElementById('time-display');
    const startGameBtn = document.getElementById('start-game-btn');
    const drawModeSelect = document.getElementById('draw-mode');
    const themeSelect = document.getElementById('theme-select');
    const highscoreList1 = document.getElementById('highscore-list-1');
    const highscoreList3 = document.getElementById('highscore-list-3');
    const autocompleteBtn = document.getElementById('autocomplete-btn');
    
    // --- NYTT: DOM-elementer for nye funksjoner ---
    const hintBtn = document.getElementById('hint-btn');
    const undoBtn = document.getElementById('undo-btn');
    const moveDisplay = document.getElementById('move-display');
    const scoreDisplay = document.getElementById('score-display');
    
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
    // NYTT: DOM-elementer for highscore-input
    const modalInputContainer = document.getElementById('modal-input-container');
    const modalInput = document.getElementById('modal-input');


    // --- START PÅ NY, "SKUDDSKKER" FIKS ---
    if (modalOverlay) {
        modalOverlay.style.display = 'none'; // Bruker inline-stil
    }
    // --- SLUTT PÅ NY FIKS ---


    // --- Event Listeners ---
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (timerInterval) {
                
                clearAllHints(); // <-- FIKS: Fjerner hint før modal vises
                
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

    if (autocompleteBtn) {
        autocompleteBtn.addEventListener('click', onAutocompleteClick);
    }
    
    // --- NYTT: Listeners for nye knapper ---
    if (hintBtn) {
        hintBtn.addEventListener('click', onHintClick);
    }

    if (undoBtn) {
        undoBtn.addEventListener('click', onUndoClick);
    }
    // --- SLUTT PÅ NY KODE ---

    if (themeSelect) {
        themeSelect.addEventListener('change', onThemeChange);
    }

    // Globale listeners for touch-bevegelse og slipp
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.addEventListener('dragover', onDragOver);
        slot.addEventListener('drop', onDrop);
    });

    // --- START PÅ FIKS (Robust modal) ---
    // Separerte lytterne slik at om én knapp mangler, fungerer de andre.
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
    }

    // ==========================================================
    // ** STARTPUNKT FOR ENDRING 1 (MODAL-FIKS) **
    // ==========================================================
    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', () => {
            
            let keepModalOpen = false; // <-- NY LINJE
            
            if (onConfirmCallback) {
                // ENDRET: Lagre returverdien fra callbacken
                keepModalOpen = onConfirmCallback(); 
            }
            
            // ENDRET: Bare lukk modalen hvis callbacken IKKE ba om å holde den åpen
            if (keepModalOpen !== true) {
                hideModal();
            }
        });
    }
    // ==========================================================
    // ** SLUTTPUNKT FOR ENDRING 1 **
    // ==========================================================

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', hideModal);
    }
    // --- SLUTT PÅ FIKS ---

    // --- Kjernefunksjoner ---
    function startGame() {
        console.log("Starting new game...");
        gameMode = parseInt(drawModeSelect.value);
        resetBoard();
        deck = createDeck();
        shuffleDeck(deck);
        dealFullGame(deck); 
        console.log(`Game mode: Draw ${gameMode}. Shuffled ${deck.length} cards.`);
        loadHighScores(); // Laster nå fra DB
    }

    function resetBoard() {
        document.querySelectorAll('.card').forEach(card => card.remove());
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        if (autocompleteInterval) {
            clearInterval(autocompleteInterval);
        }
        timerInterval = null;
        autocompleteInterval = null;
        elapsedTime = 0;
        
        // --- NYTT: Reset av nye variabler ---
        moveCount = 0;
        score = 0;
        moveHistory = [];
        isAnimating = false;
        
        timeDisplay.textContent = '0s';
        updateScoreAndMoves(); // Oppdaterer til 0
        
        if (autocompleteBtn) autocompleteBtn.style.display = 'none';
        if (hintBtn) hintBtn.style.display = 'none'; // Gjem
        if (undoBtn) undoBtn.style.display = 'none'; // Gjem
        // --- SLUTT PÅ NY KODE ---
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
        if (isAnimating) return; // Ikke gjør noe under animasjon
        if (timerInterval === null) startTimer(); 
        
        if (stockPile.children.length === 0) {
            // --- NYTT: Lagre trekk for Angre ---
            pushToHistory({ type: 'RECYCLE', cards: Array.from(wastePile.children) });
            moveCount++;
            score -= 50; // Straff for å resirkulere
            updateScoreAndMoves();
            // --- SLUTT PÅ NY KODE ---
            
            recycleWastePile();
            checkAutocompleteCondition();
            return;
        }
        
        const numToDraw = gameMode;
        const drawnCards = []; // NYTT: For å lagre trekket
        
        for (let i = 0; i < numToDraw; i++) {
            const topCard = stockPile.lastElementChild;
            if (topCard) {
                drawnCards.push(topCard); // NYTT
                turnCardFaceUp(topCard); 
                topCard.style.top = '0px'; 
                topCard.style.left = '0px'; 
                wastePile.appendChild(topCard);
            }
        }
        
        // --- NYTT: Lagre trekk og oppdater stats ---
        pushToHistory({ type: 'DRAW', cards: drawnCards });
        moveCount++;
        updateScoreAndMoves();
        // --- SLUTT PÅ NY KODE ---
        
        updateWastePileVisuals();
        checkAutocompleteCondition();
    }
    
    function updateWastePileVisuals() {
        // --- START PÅ FIKS (Mobil-offset) ---
        // Sjekk hvilken offset vi skal bruke
        const currentWasteOffset = mobileMediaQuery.matches ? WASTE_OFFSET_MOBILE : WASTE_OFFSET_DESKTOP;
        // --- SLUTT PÅ FIKS ---
            
        const wasteCards = Array.from(wastePile.children);
        const numCards = wasteCards.length;
        wasteCards.forEach((card, index) => {
            let offset = 0;
            if (index >= numCards - 3) { 
                // --- START PÅ FIKS (Mobil-offset) ---
                // Bruk den responsive verdien
                offset = (index - (Math.max(0, numCards - 3))) * currentWasteOffset;
                // --- SLUTT PÅ FIKS ---
            } else if (numCards > 3) {
                offset = 0;
            }
            card.style.left = offset + 'px';
            card.style.zIndex = index;
            
            // --- START PÅ FIKS (Angre-bug "hengende kort") ---
            card.style.top = '0px'; 
            card.style.transform = 'none';
            // --- SLUTT PÅ FIKS ---
        });
    }

    function recycleWastePile() {
        const wasteCards = Array.from(wastePile.children);
        while(wasteCards.length > 0) {
            const cardEl = wasteCards.pop(); 
            cardEl.classList.add('face-down');
            cardEl.classList.remove('red-card');
            cardEl.dataset.isFaceUp = 'false';
            
            // --- START PÅ FIKS (Usynlig kort) ---
            cardEl.style.removeProperty('background-image'); // FIKS
            // --- SLUTT PÅ FIKS ---
            
            cardEl.draggable = false;
            cardEl.removeEventListener('dragstart', onDragStart);
            cardEl.removeEventListener('dragend', onDragEnd);
            cardEl.removeEventListener('dragover', onDragOver);
            cardEl.removeEventListener('drop', onDrop);
            cardEl.removeEventListener('touchstart', onTouchStart); 
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
        
        // Fikser "Angre"-bugen: Sjekk om kortet *allerede er* face-up
        const wasAlreadyFaceUp = cardEl.dataset.isFaceUp === 'true';

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
        
        // NY LOGIKK: Bare legg til listeners hvis kortet
        // *faktisk* ble snudd (ikke hvis det bare ble flyttet)
        if (!wasAlreadyFaceUp) {
            cardEl.addEventListener('dragstart', onDragStart);
            cardEl.addEventListener('dragend', onDragEnd);
            cardEl.addEventListener('dragover', onDragOver);
            cardEl.addEventListener('drop', onDrop);
            cardEl.addEventListener('touchstart', onTouchStart, { passive: false });
            cardEl.addEventListener('dblclick', onCardDoubleClick);
        }
    }

    // --- Touch-logikk (Mobil) ---

    // ===============================================
    // START PÅ FIKS FOR MOBIL-DRAG (VIDEO)
    // ===============================================

    function onTouchStart(e) {
        if (isAnimating) return;
        const cardEl = e.target.closest('.card');
        if (!cardEl || cardEl.dataset.isFaceUp === 'false') return;

        const isFromWaste = cardEl.parentElement === wastePile;
        if (isFromWaste && cardEl !== wastePile.lastElementChild) {
            return;
        }

        if (timerInterval === null) startTimer();
        
        e.preventDefault(); 

        const touch = e.touches[0];
        activeDrag.card = cardEl;
        activeDrag.originalParent = cardEl.parentElement;
        activeDrag.initialX = touch.clientX;
        activeDrag.initialY = touch.clientY;
        activeDrag.isDragging = false; 

        activeDrag.stack = [];
        let currentCard = cardEl;
        while (currentCard) {
            activeDrag.stack.push(currentCard);
            if (isFromWaste) currentCard = null;
            else currentCard = currentCard.nextElementSibling;
        }

        let z = 1000;
        activeDrag.stack.forEach(card => {
            card.style.opacity = '0.8';
            card.style.zIndex = z++;
        });
    }

    function onTouchMove(e) {
        if (!activeDrag.card) return;
        
        e.preventDefault(); 
        
        const touch = e.touches[0];
        const deltaY = touch.clientY - activeDrag.initialY;
        const deltaX = touch.clientX - activeDrag.initialX;

        if (!activeDrag.isDragging && (Math.abs(deltaY) > activeDrag.dragThreshold || Math.abs(deltaX) > activeDrag.dragThreshold)) {
            activeDrag.isDragging = true;
        }

        if (activeDrag.isDragging) {
            
            activeDrag.stack.forEach((card, index) => {
                let yOffset = 0;
                if (activeDrag.originalParent.classList.contains('tableau')) {
                    yOffset = index * TABLEAU_STACK_OFFSET_Y;
                }
                
                // --- FIKS: Bruker 'transform' i stedet for 'top/left' ---
                card.style.transform = `translate(${deltaX}px, ${deltaY + yOffset}px)`;
            });
        }
    }
    
    // ===============================================
    // SLUTT PÅ FIKS FOR MOBIL-DRAG
    // ===============================================


    function onTouchEnd(e) {
        if (!activeDrag.card) return;

        const touch = e.changedTouches[0];
        const draggedCard = activeDrag.card;
        const originalParent = activeDrag.originalParent;

        if (!activeDrag.isDragging) {
            // --- DETTE VAR ET "TAP" ---
            const isTopWasteCard = (originalParent === wastePile && draggedCard === wastePile.lastElementChild);
            const isBottomTableauCard = (originalParent.classList.contains('tableau') && draggedCard.nextElementSibling === null);

            if (isTopWasteCard || isBottomTableauCard) {
                for (const slot of foundationSlots) {
                    if (isValidMove(draggedCard, slot)) {
                        
                        // --- START PÅ FIKS (Angre-bug) ---
                        const flippedCard = (originalParent.classList.contains('tableau') && draggedCard.previousElementSibling)
                                            ? draggedCard.previousElementSibling
                                            : null;
                        
                        const willFlipCard = (flippedCard && flippedCard.dataset.isFaceUp === 'false');

                        pushToHistory({
                            type: 'MOVE',
                            cards: [draggedCard],
                            from: originalParent,
                            to: slot,
                            flippedCard: willFlipCard ? flippedCard : null
                        });
                        moveCount++; 
                        score += 10; // Poeng for å flytte til foundation
                        if (willFlipCard) score += 5;
                        updateScoreAndMoves();
                        // --- SLUTT PÅ FIKS ---
                        
                        draggedCard.style.top = '0px';
                        draggedCard.style.left = '0px';
                        draggedCard.style.zIndex = getNumericValue(draggedCard.dataset.value) + 1;
                        draggedCard.style.position = 'absolute'; 
                        draggedCard.style.transform = 'none';
                        
                        slot.appendChild(draggedCard);
                        
                        // --- START PÅ FIKS (Angre-bug) ---
                        if (flippedCard) {
                            turnCardFaceUp(flippedCard);
                        }
                        // --- SLUTT PÅ FIKS ---
                        
                        if (originalParent === wastePile) {
                            updateWastePileVisuals();
                        }
                        checkWinCondition();
                        checkAutocompleteCondition();
                        break;
                    }
                }
            }

        } else {
            // --- DETTE VAR ET "DRAG & DROP" ---
            activeDrag.stack.forEach(card => card.style.display = 'none');
            const dropTargetElement = document.elementFromPoint(touch.clientX, touch.clientY);
            activeDrag.stack.forEach(card => card.style.display = 'block'); 

            if (!dropTargetElement) {
                 console.log("Slipp på ugyldig område (utenfor).");
            } else {
                let targetSlot = dropTargetElement.closest('.card, .card-slot');

                if (targetSlot) {
                    if (targetSlot.classList.contains('card')) {
                        targetSlot = targetSlot.parentElement; 
                    }
                    
                    if (targetSlot.classList.contains('card-slot') && isValidMove(draggedCard, targetSlot)) {
                        // GYLDIG TREKK
                        
                        // --- START PÅ FIKS (Angre-bug) ---
                        const flippedCard = (originalParent.classList.contains('tableau') && draggedCard.previousElementSibling)
                                            ? draggedCard.previousElementSibling
                                            : null;

                        const willFlipCard = (flippedCard && flippedCard.dataset.isFaceUp === 'false');

                        pushToHistory({
                            type: 'MOVE',
                            cards: [...activeDrag.stack],
                            from: originalParent,
                            to: targetSlot,
                            flippedCard: willFlipCard ? flippedCard : null
                        });

                        moveCount++;
                        // --- START PÅ FIKS (Poeng-farming) ---
                        if (targetSlot.classList.contains('foundation')) {
                            score += 10;
                        } else if (originalParent.classList.contains('foundation')) {
                            score -= 10; // Straff for å flytte FRA mål
                        } else if (originalParent === wastePile) {
                            score += 5;
                        }
                        // --- SLUTT PÅ FIKS ---
                        if (willFlipCard) score += 5;
                        updateScoreAndMoves();
                        // --- SLUTT PÅ FIKS ---
                        
                        const baseIndex = targetSlot.children.length;
                        
                        activeDrag.stack.forEach((card, index) => {
                            card.style.left = '0px';
                            card.style.opacity = '1';
                            card.style.position = 'absolute'; 
                            card.style.transform = 'none';

                            if (targetSlot.classList.contains('foundation')) {
                                card.style.top = '0px';
                                card.style.zIndex = getNumericValue(card.dataset.value) + 1;
                            } else {
                                card.style.top = (baseIndex + index) * TABLEAU_STACK_OFFSET_Y + 'px';
                                card.style.zIndex = baseIndex + index + 1;
                            }
                            targetSlot.appendChild(card);
                        });

                        // --- START PÅ FIKS (Angre-bug) ---
                        if (flippedCard) {
                            turnCardFaceUp(flippedCard);
                        }
                        // --- SLUTT PÅ FIKS ---

                        if (originalParent === wastePile) {
                            updateWastePileVisuals();
                        }
                        checkWinCondition();
                        checkAutocompleteCondition();
                    } else {
                        console.log("Ugyldig trekk (touch)!");
                    }
                }
            }
        }

        // --- Rydd opp etter drag/tap ---
        // FIKS: Kaller resetCardStackStyle uansett om trekket var gyldig eller ikke,
        // for å nullstille 'transform'.
        resetCardStackStyle(draggedCard); 
        
        activeDrag.stack.forEach((card, index) => {
            // Denne koden trengs fortsatt for å rydde opp z-index osv.
            // hvis kortet IKKE ble flyttet.
            if (card.parentElement === originalParent) {
                if (originalParent.classList.contains('tableau')) {
                    const baseIndex = Array.from(originalParent.children).indexOf(card);
                    card.style.top = (baseIndex * TABLEAU_STACK_OFFSET_Y) + 'px';
                    card.style.left = '0px';
                } else if (originalParent === wastePile) {
                     // La updateWastePileVisuals() håndtere det
                } else {
                    card.style.top = '0px';
                    card.style.left = '0px';
                }
            }
        });

        if (originalParent === wastePile) {
            updateWastePileVisuals();
        }

        activeDrag = {
            card: null, stack: [], originalParent: null,
            initialX: 0, initialY: 0, offsetX: 0, offsetY: 0,
            isDragging: false, dragThreshold: 5
        };
    }


    // --- Dra-og-slipp Logikk (Desktop) ---
    function onDragStart(e) {
        if (isAnimating) { // NYTT
            e.preventDefault();
            return;
        }
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
        if (isAnimating) return; // NYTT
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
            
            // --- START PÅ FIKS (Angre-bug) ---
            const flippedCard = (originalParent.classList.contains('tableau') && draggedCard.previousElementSibling)
                                ? draggedCard.previousElementSibling
                                : null;
            
            const willFlipCard = (flippedCard && flippedCard.dataset.isFaceUp === 'false');

            pushToHistory({
                type: 'MOVE',
                cards: [...stackToMove],
                from: originalParent,
                to: targetSlot,
                flippedCard: willFlipCard ? flippedCard : null // Bare lagre hvis det faktisk ble snudd
            });
            
            moveCount++;
            // --- START PÅ FIKS (Poeng-farming) ---
            if (targetSlot.classList.contains('foundation')) {
                score += 10;
            } else if (originalParent.classList.contains('foundation')) {
                score -= 10; // Straff for å flytte FRA mål
            } else if (originalParent === wastePile) {
                score += 5;
            }
            // --- SLUTT PÅ FIKS ---
            if (willFlipCard) score += 5; // Poeng for å snu
            updateScoreAndMoves();
            // --- SLUTT PÅ FIKS ---
            
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

            // --- START PÅ FIKS (Angre-bug) ---
            if (flippedCard) {
                turnCardFaceUp(flippedCard);
            }
            // --- SLUTT PÅ FIKS ---

            if (originalParent === wastePile) {
                updateWastePileVisuals();
            }
            checkWinCondition();
            checkAutocompleteCondition();
        } else {
            console.log("Ugyldig trekk!");
        }
    }

    function onDragEnd(e) {
        resetCardStackStyle(e.target); // <-- Kaller FIKS for Bug 2
    }
    
    function onCardDoubleClick(e) {
        if (isAnimating) return; // NYTT
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
                
                // --- START PÅ FIKS (Angre-bug) ---
                // 'cardEl' is the 'draggedCard' in this context
                const flippedCard = (originalParent.classList.contains('tableau') && cardEl.previousElementSibling)
                                    ? cardEl.previousElementSibling
                                    : null;
                
                const willFlipCard = (flippedCard && flippedCard.dataset.isFaceUp === 'false');

                pushToHistory({
                    type: 'MOVE',
                    cards: [cardEl],
                    from: originalParent,
                    to: slot,
                    flippedCard: willFlipCard ? flippedCard : null
                });
                moveCount++;
                score += 10; // Poeng for å flytte til foundation
                if (willFlipCard) score += 5;
                updateScoreAndMoves();
                // --- SLUTT PÅ FIKS ---
                
                cardEl.style.top = '0px';
                cardEl.style.left = '0px';
                cardEl.style.zIndex = getNumericValue(cardEl.dataset.value) + 1;
                slot.appendChild(cardEl);
                
                // --- START PÅ FIKS (Angre-bug) ---
                if (flippedCard) {
                    turnCardFaceUp(flippedCard);
                }
                // --- SLUTT PÅ FIKS ---

                if (isTopWasteCard) {
                    updateWastePileVisuals();
                }
                checkWinCondition();
                checkAutocompleteCondition();
                break; 
            }
        }
    }

    // ==========================================================
    // ** FIKS FOR "HENGENDE KORT" (BUG 1) ER HER **
    // ==========================================================
    function resetCardStackStyle(topCard) {
        if (!topCard) return;
        let currentCard = topCard;
        while(currentCard) {
            currentCard.style.opacity = '1';
            currentCard.style.transform = 'none'; // <-- DENNE LINJEN FIKSER DET
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

    // --- Autofullfør-funksjoner ---
    function checkAutocompleteCondition() {
        if (!autocompleteBtn) return; // Knappen finnes ikke

        // Kan ikke autofullføre hvis det er kort i stokken eller snu-bunken
        if (stockPile.children.length > 0 || wastePile.children.length > 0) {
            autocompleteBtn.style.display = 'none';
            return false;
        }

        // Kan ikke autofullføre hvis noen kort i spillebunkene er skjult
        for (const slot of tableauSlots) {
            const cards = slot.children;
            for (const card of cards) {
                if (card.dataset.isFaceUp === 'false') {
                    autocompleteBtn.style.display = 'none';
                    return false;
                }
            }
        }

        // Alle conditions er møtt
        console.log("Autocomplete condition MET!");
        autocompleteBtn.style.display = 'inline-block';
        return true;
    }

    function onAutocompleteClick() {
        if (autocompleteInterval || isAnimating) return; // Ikke start to ganger
        
        // --- NYTT: Lås input ---
        isAnimating = true;
        if (undoBtn) undoBtn.style.display = 'none'; // Kan ikke angre autofullfør
        if (hintBtn) hintBtn.style.display = 'none';
        // --- SLUTT PÅ NY KODE ---
        
        autocompleteBtn.style.display = 'none'; // Gjem knappen
        
        autocompleteInterval = setInterval(() => {
            let cardMoved = false;
            for (const slot of tableauSlots) {
                const topCard = slot.lastElementChild;
                if (topCard) {
                    for (const foundation of foundationSlots) {
                        if (isValidMove(topCard, foundation)) {
                            
                            // --- START PÅ FIKS (Auto-poeng) ---
                            score += 10;
                            updateScoreAndMoves();
                            // --- SLUTT PÅ FIKS ---
                            
                            // Flytt kortet
                            topCard.style.top = '0px';
                            topCard.style.left = '0px';
                            topCard.style.zIndex = getNumericValue(topCard.dataset.value) + 1;
                            foundation.appendChild(topCard);
                            
                            cardMoved = true;
                            checkWinCondition(); // Sjekk for seier
                            break; // Gå ut av foundation-løkken
                        }
                    }
                }
                if (cardMoved) break; // Gå ut av tableau-løkken (kun ett kort per intervall)
            }

            if (!cardMoved) {
                // Ingen flere kort å flytte, spillet *burde* være vunnet
                clearInterval(autocompleteInterval);
                autocompleteInterval = null;
                isAnimating = false; // NYTT
                checkWinCondition(); // En siste sjekk
            }
        }, 100); // Flytt et kort hver 100ms
    }

    // --- Seier-sjekk ---
    function checkWinCondition() {
        if (timerInterval === null && autocompleteInterval === null) return; 
        
        let totalFoundationCards = 0;
        foundationSlots.forEach(slot => {
            totalFoundationCards += slot.children.length;
        });

        if (totalFoundationCards === 52) {
            // Stopp alle intervaller
            if (autocompleteInterval) {
                clearInterval(autocompleteInterval);
                autocompleteInterval = null;
            }
            stopTimer();
            
            // --- NYTT: Lås input og gjem knapper ---
            isAnimating = true; 
            if (autocompleteBtn) autocompleteBtn.style.display = 'none';
            if (hintBtn) hintBtn.style.display = 'none';
            if (undoBtn) undoBtn.style.display = 'none';
            // --- SLUTT PÅ NY KODE ---

            const finalTime = elapsedTime; 
            setTimeout(() => { 
                if (modalOverlay) {
                    // --- START PÅ FIKS (Be om brukernavn) ---
                    showAlertModal(
                        "Gratulerer!", 
                        `Du vant på ${finalTime} sekunder! Poeng: ${score}`,
                        () => { 
                            startWinAnimation(); // Start animasjonen FØRST
                            // Vis en ny modal for å be om navn
                            showPromptModal(
                                "Highscore!",
                                "Skriv inn navnet ditt for å lagre:",
                                (username) => {
                                    // 'username' kommer fra modal-callbacken
                                    saveHighScore(finalTime, gameMode, username); 
                                }
                            );
                            
                            // ==========================================================
                            // ** STARTPUNKT FOR ENDRING 2 (MODAL-FIKS) **
                            // ==========================================================
                            return true; // <-- DENNE LINJEN HINDRER MODALEN I Å LUKKE SEG
                            // ==========================================================
                            // ** SLUTTPUNKT FOR ENDRING 2 **
                            // ==========================================================
                        } 
                    );
                    // --- SLUTT PÅ FIKS ---
                } else {
                    // Fallback for eldre nettlesere (mindre pen)
                    const username = prompt(`Gratulerer! Du vant på ${finalTime} sekunder! Poeng: ${score}\n\nSkriv inn navnet ditt:`, "Gjestespiller");
                    if (username) {
                        saveHighScore(finalTime, gameMode, username);
                        startWinAnimation();
                    }
                }
            }, 500); 
        }
    }

    // --- Vinneranimasjon ---
    function startWinAnimation() {
        isAnimating = true; // Sørg for at alt er låst
        const foundationRects = Array.from(foundationSlots).map(slot => slot.getBoundingClientRect());
        // FIKS: Tvinger den til å lage et nytt, trygt stilark
        const styleSheet = document.head.appendChild(document.createElement('style')).sheet;

        for (let i = 0; i < 52; i++) {
            const winCard = document.createElement('div');
            winCard.classList.add('win-card');
            
            const startPile = foundationRects[Math.floor(Math.random() * 4)]; 
            const startX = startPile.left + window.scrollX + (Math.random() * (startPile.width - 20));
            const startY = startPile.top + window.scrollY;
            
            winCard.style.top = startY + 'px';
            winCard.style.left = startX + 'px';
            
            const randomXEnd = (Math.random() - 0.5) * 600; 
            const randomRotEnd = (Math.random() - 0.5) * 1000 + 360;
            
            const animName = `fall_${i}`;
            
            try {
                styleSheet.insertRule(`
                    @keyframes ${animName} {
                        from {
                            transform: translateY(0) rotateZ(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateY(150vh) translateX(${randomXEnd}px) rotateZ(${randomRotEnd}deg);
                            opacity: 0.5;
                        }
                    }
                `, styleSheet.cssRules.length);
            } catch (e) {
                console.error("Kunne ikke sette inn CSS-regel:", e);
            }

            winCard.style.animationName = animName;
            winCard.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
            winCard.style.animationFillMode = 'forwards';
            winCard.style.animationTimingFunction = 'ease-out';
            winCard.style.animationDelay = (i * 0.05) + 's';
            
            document.body.appendChild(winCard);

            setTimeout(() => {
                winCard.remove();
                try {
                    for(let j = 0; j < styleSheet.cssRules.length; j++) {
                        if(styleSheet.cssRules[j].name === animName) {
                            styleSheet.deleteRule(j);
                            break;
                        }
                    }
                } catch(e) {}
            }, 5000 + (i * 50));
        }
    }

    window.testWin = startWinAnimation;

    // --- Timer-logikk ---
    function startTimer() {
        if (timerInterval) return; 
        startTime = Date.now() - (elapsedTime * 1000); 
        timerInterval = setInterval(updateTimer, 1000);
        
        // --- NYTT: Vis hint-knapp ---
        if (hintBtn) hintBtn.style.display = 'inline-block';
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
    
    // --- START PÅ NY KODE: Poeng, trekk, hint, og angre ---

    /**
     * Oppdaterer HTML for poeng og antall trekk.
     * Viser/gjemmer Angre-knappen basert på historikk.
     */
    function updateScoreAndMoves() {
        if (moveDisplay) moveDisplay.textContent = moveCount;
        if (scoreDisplay) scoreDisplay.textContent = score;
        if (undoBtn) undoBtn.style.display = (moveHistory.length > 0 && !isAnimating) ? 'inline-block' : 'none';
    }

    /**
     * Legger et trekk til i angre-historikken.
     */
    function pushToHistory(moveData) {
        moveHistory.push(moveData);
        if (undoBtn) undoBtn.style.display = 'inline-block';
    }

    /**
     * Kalles når Angre-knappen trykkes.
     */
    function onUndoClick() {
        if (moveHistory.length === 0 || isAnimating) return;

        const lastMove = moveHistory.pop();
        moveCount++; // Å angre er også et "trekk"
        
        // --- START PÅ FIKS (Poeng-farming) ---
        // Reverser poengsummen for trekket som angres
        switch (lastMove.type) {
            case 'DRAW':
                // Ingen poengendring for å trekke
                undoDraw(lastMove.cards);
                break;
            case 'RECYCLE':
                score += 50; // Gi tilbake straffepoengene
                undoRecycle(lastMove.cards);
                break;
            case 'MOVE':
                // Reverser poengene som ble tjent
                if (lastMove.to.classList.contains('foundation')) {
                    score -= 10;
                } else if (lastMove.from.classList.contains('foundation')) {
                    score += 10; // Gi tilbake straffen
                }
                
                if (lastMove.flippedCard) score -= 5;
                if (lastMove.from === wastePile) score -= 5;
                
                // Legg til en liten straff for å bruke angre
                score -= 2; 

                undoMove(lastMove);
                break;
        }
        // --- SLUTT PÅ FIKS ---
        
        updateScoreAndMoves();
        checkAutocompleteCondition(); // Status kan ha endret seg
    }

    /**
     * Angrer et "Trekk"-trekk (flytter fra waste til stock).
     */
    function undoDraw(cardsToUndo) {
        for (let i = 0; i < cardsToUndo.length; i++) {
            const cardEl = wastePile.lastElementChild;
            if (cardEl) {
                cardEl.classList.add('face-down');
                cardEl.classList.remove('red-card');
                cardEl.dataset.isFaceUp = 'false';
                
                // --- START PÅ FIKS (Usynlig kort) ---
                cardEl.style.removeProperty('background-image'); // FIKS
                // --- SLUTT PÅ FIKS ---
                
                cardEl.draggable = false;
                cardEl.removeEventListener('dragstart', onDragStart);
                cardEl.removeEventListener('dragend', onDragEnd);
                cardEl.removeEventListener('dragover', onDragOver);
                cardEl.removeEventListener('drop', onDrop);
                cardEl.removeEventListener('touchstart', onTouchStart); 
                cardEl.removeEventListener('dblclick', onCardDoubleClick);
                cardEl.style.top = '0px';
                cardEl.style.left = '0px';
                cardEl.style.zIndex = 'auto';
                stockPile.appendChild(cardEl);
            }
        }
        updateWastePileVisuals();
    }

    /**
     * Angrer en "Resirkulering" (flytter fra stock til waste).
     */
    function undoRecycle(cardsToUndo) {
        // Kortene ligger i 'stock' i motsatt rekkefølge.
        // Vi må flytte dem tilbake til 'waste' i riktig rekkefølge.
        for (let i = 0; i < cardsToUndo.length; i++) {
            const cardEl = stockPile.lastElementChild;
            if (cardEl) {
                turnCardFaceUp(cardEl);
                wastePile.appendChild(cardEl);
            }
        }
        updateWastePileVisuals();
    }

    /**
     * Angrer et "Flytt"-trekk (mellom bunker).
     */
    function undoMove(moveData) {
        const { cards, from, to, flippedCard } = moveData;

        // 1. Snu tilbake kortet som ble avdekket (hvis det skjedde)
        if (flippedCard) {
            flippedCard.classList.add('face-down');
            flippedCard.classList.remove('red-card');
            flippedCard.dataset.isFaceUp = 'false';
            
            // --- START PÅ FIKS (Usynlig kort) ---
            flippedCard.style.removeProperty('background-image'); // FIKS
            // --- SLUTT PÅ FIKS ---
            
            flippedCard.draggable = false;
            flippedCard.removeEventListener('dragstart', onDragStart);
            flippedCard.removeEventListener('dragend', onDragEnd);
            flippedCard.removeEventListener('dragover', onDragOver);
            flippedCard.removeEventListener('drop', onDrop);
            flippedCard.removeEventListener('touchstart', onTouchStart); 
            flippedCard.removeEventListener('dblclick', onCardDoubleClick);
            
            // NYTT: Fjern hint-puls i tilfelle
            flippedCard.classList.remove('hint-pulse');
            flippedCard.classList.remove('hint-pulse-slot');
        }

        // 2. Flytt kortene tilbake til 'from'-bunken
        cards.forEach(card => {
            // NYTT: Fjern hint-puls FØR flytting
            card.classList.remove('hint-pulse');
            card.classList.remove('hint-pulse-slot');
            from.appendChild(card);
        });
        
        // 3. Gjenopprett stiler på 'from'-bunken
        if (from.classList.contains('tableau')) {
            Array.from(from.children).forEach((card, index) => {
                card.style.top = (index * TABLEAU_STACK_OFFSET_Y) + 'px';
                card.style.zIndex = index + 1;
                card.style.left = '0px';
            });
        } else if (from === wastePile) {
            updateWastePileVisuals();
        } else if (from.classList.contains('foundation')) {
            Array.from(from.children).forEach((card, index) => {
                card.style.top = '0px';
                card.style.left = '0px';
                card.style.zIndex = index + 1;
            });
        }

        // 4. Oppdater 'to'-bunken (hvis det var waste)
        if (to === wastePile) {
            updateWastePileVisuals();
        }
    }

    /**
     * Kalles når Hint-knappen trykkes.
     */
    function onHintClick() {
        if (isAnimating) return;
        const hint = findHint();
        if (hint) {
            showHint(hint.card, hint.target);
        } else {
            showAlertModal("Ingen trekk", "Ingen flere gyldige trekk funnet.");
        }
    }

    /**
     * Finner det første gyldige trekket.
     */
    function findHint() {
        let sourceCard = null;

        // 1. Sjekk waste -> foundations/tableaus
        sourceCard = wastePile.lastElementChild;
        if (sourceCard) {
            for (const slot of foundationSlots) {
                if (isValidMove(sourceCard, slot)) return { card: sourceCard, target: slot };
            }
            for (const slot of tableauSlots) {
                if (isValidMove(sourceCard, slot)) return { card: sourceCard, target: slot };
            }
        }

        // 2. Sjekk tableau -> foundations
        for (const slot of tableauSlots) {
            sourceCard = slot.lastElementChild;
            if (sourceCard && sourceCard.dataset.isFaceUp === 'true') {
                for (const fSlot of foundationSlots) {
                    if (isValidMove(sourceCard, fSlot)) return { card: sourceCard, target: fSlot };
                }
            }
        }

        // 3. Sjekk tableau -> tableau (den tyngste)
        for (const tSlot of tableauSlots) {
            const faceUpCards = Array.from(tSlot.children).filter(c => c.dataset.isFaceUp === 'true');
            for (const sourceCard of faceUpCards) { // Merk: 'sourceCard' gjenbrukes
                for (const targetT of tableauSlots) {
                    if (tSlot !== targetT) { // Ikke flytt til samme bunke
                        if (isValidMove(sourceCard, targetT)) return { card: sourceCard, target: targetT };
                    }
                }
            }
        }
        
        // 4. Sjekk trekk fra stock (eller recycle)
        sourceCard = stockPile.lastElementChild;
        if (sourceCard) {
            return { card: sourceCard, target: wastePile }; // Hint: Trekk kort
        }
        if (wastePile.children.length > 0 && stockPile.children.length === 0) {
            return { card: wastePile.firstElementChild, target: stockPile }; // Hint: Resirkuler
        }

        return null; // Ingen trekk funnet
    }

    /**
     * Viser hintet ved å "pulse" kortet og målet.
     */
    function showHint(card, target) {
        if (isAnimating || !card || !target) return;
        
        isAnimating = true;
        
        // Puls selve kortet (alltid trygt)
        card.classList.add('hint-pulse');
        
        let targetEl = target;
        let targetClass = 'hint-pulse'; // Standard (med z-index)
        
        // Sjekk om målet er en bunke
        if (target.classList.contains('card-slot')) {
            targetEl = target.lastElementChild; // Prøv å finne topp-kortet
            if (!targetEl) {
                // Målet er en TOM BUNKE
                targetEl = target; // Målrett selve bunken
                targetClass = 'hint-pulse-slot'; // Bruk z-index-fri klasse
            }
        }
        
        // Bruk riktig klasse (targetClass)
        targetEl.classList.add(targetClass);

        // Fjern animasjon og lås opp input etterpå
        setTimeout(() => {
            card.classList.remove('hint-pulse');
            // Fjern begge klassene for sikkerhets skyld
            targetEl.classList.remove('hint-pulse');
            targetEl.classList.remove('hint-pulse-slot'); 
            isAnimating = false;
        }, 2400); // 1.2s animasjon * 2 runder
    }
    
    /**
     * NYTT: Fjerner alle aktive hint-animasjoner fra brettet.
     */
    function clearAllHints() {
        const hintedCards = document.querySelectorAll('.hint-pulse');
        const hintedSlots = document.querySelectorAll('.hint-pulse-slot');
        
        hintedCards.forEach(el => el.classList.remove('hint-pulse'));
        hintedSlots.forEach(el => el.classList.remove('hint-pulse-slot'));
        
        // Nullstill animasjonslåsen, siden modalen tar over
        if (isAnimating) {
            isAnimating = false;
        }
    }
    
    // --- SLUTT PÅ NY KODE ---


    // --- Highscore-logikk (OMBYGGET FOR DATABASE) ---
    
    async function getHighScores(mode) {
        const modeId = mode === 1 ? 'draw_1' : 'draw_3';
        try {
            // MERK: Bruker din nye API-sti
            const response = await fetch(`api/get_solitaire_scores.php?mode=${modeId}`);
            if (!response.ok) {
                console.error("Klarte ikke hente highscores fra server.");
                return [];
            }
            const scores = await response.json();
            return scores;
        } catch (e) {
            console.error("Feil ved henting av highscores:", e);
            return [];
        }
    }

    async function saveHighScore(time, mode, username) { // <-- Mottar 'username'
        const currentScore = score;
        const modeId = mode === 1 ? 'draw_1' : 'draw_3';
        
        // Sikrer at vi har et brukernavn
        const finalUsername = username || "Gjestespiller"; 

        try {
            const response = await fetch('api/add_solitaire_score.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: finalUsername, // Bruker parameteret
                    score: currentScore,
                    time: time,
                    mode: modeId
                })
            });
            
            const result = await response.json();
            if (response.ok) {
                console.log("Score lagret til DB:", result.message);
            } else {
                console.error("Feil ved lagring til DB:", result.error);
            }

        } catch (e) {
            console.error("Nettverksfeil ved lagring av score:", e);
        }
        
        // Last highscores på nytt uansett
        loadHighScores();
    }

// NY, FORBEDRET loadHighScores-funksjon
async function loadHighScores() {
    console.log("Laster highscores..."); // Nyttig for feilsøking
    try {
        // Bruker Promise.allSettled i stedet for Promise.all
        // Dette lar én liste laste selv om den andre feiler.
        const results = await Promise.allSettled([
            getHighScores(1),
            getHighScores(3)
        ]);

        // Håndter "Trekk 1"
        if (results[0].status === 'fulfilled') {
            displayScores(results[0].value, highscoreList1);
        } else {
            console.error("Klarte ikke laste Trekk 1 highscores:", results[0].reason);
            highscoreList1.innerHTML = '<li>Kunne ikke laste</li>';
        }

        // Håndter "Trekk 3"
        if (results[1].status === 'fulfilled') {
            displayScores(results[1].value, highscoreList3);
        } else {
            console.error("Klarte ikke laste Trekk 3 highscores:", results[1].reason);
            highscoreList3.innerHTML = '<li>Kunne ikke laste</li>';
        }

    } catch (e) {
        console.error("Kritisk feil i loadHighScores:", e);
    }
}

    function displayScores(scores, listElement) {
        listElement.innerHTML = '';
        if (!scores || scores.length === 0) {
            listElement.innerHTML = '<li>Ingen score ennå</li>';
        } else {
            scores.forEach(scoreData => { 
                const li = document.createElement('li');
                // Viser brukernavn, poeng, deretter tid
                li.textContent = `${scoreData.username}: ${scoreData.score} poeng (${scoreData.time_seconds}s)`; 
                listElement.appendChild(li);
            });
        }
    }

    // --- MODAL-HJELPEFUNKSJONER ---
    
    // --- START PÅ FIKS (Robust modal) ---
    // La til 'if (element)' sjekker for å unngå feil
    function showConfirmModal(title, text, callback) {
        if (!modalOverlay) return; 
        modalOverlay.classList.remove('hidden');
        modalOverlay.style.display = 'flex';
        if (modalTitle) modalTitle.textContent = title;
        if (modalText) modalText.textContent = text;
        
        if (modalInputContainer) modalInputContainer.style.display = 'none'; // Skjul input
        
        if (modalConfirmBtn) modalConfirmBtn.textContent = "Ja";
        if (modalCancelBtn) modalCancelBtn.style.display = 'inline-block';
        onConfirmCallback = callback; 
    }


    function showAlertModal(title, text, callback = null) {
        if (!modalOverlay) return; 
        if (modalTitle) modalTitle.textContent = title;
        if (modalText) modalText.textContent = text;
        
        if (modalInputContainer) modalInputContainer.style.display = 'none'; // Skjul input
        
        if (modalConfirmBtn) modalConfirmBtn.textContent = "OK";
        if (modalCancelBtn) modalCancelBtn.style.display = 'none'; 
        modalOverlay.style.display = 'flex'; 
        onConfirmCallback = callback; 
    }
    
    // NY FUNKSJON for å be om navn
    function showPromptModal(title, text, callback) {
        if (!modalOverlay) return; 
        modalOverlay.classList.remove('hidden');
        modalOverlay.style.display = 'flex';
        if (modalTitle) modalTitle.textContent = title;
        if (modalText) modalText.textContent = text;
        
        // Vis input-feltet
        if (modalInputContainer) modalInputContainer.style.display = 'block';
        if (modalInput) {
            modalInput.value = ''; // Tøm feltet
            modalInput.focus(); // Sett fokus
        }
        
        if (modalConfirmBtn) modalConfirmBtn.textContent = "Lagre";
        if (modalCancelBtn) modalCancelBtn.style.display = 'inline-block'; // Vis Avbryt
        
        // Oppdater callback for å hente verdien fra input
        onConfirmCallback = () => {
            const username = modalInput ? modalInput.value.trim() : "Gjest";
            if (username && username.length > 0) {
                callback(username); // Send navnet til den som kalte
            } else {
                // Hvis de ikke skrev noe, lagre som "Gjest"
                callback("Gjest");
            }
        }; 
    }

    function hideModal() {
        if (!modalOverlay) return; 
        modalOverlay.style.display = 'none'; 
        onConfirmCallback = null;
        if (modalInputContainer) modalInputContainer.style.display = 'none'; // Skjul input
    }
    // --- SLUTT PÅ FIKS ---

    // --- Tema-funksjoner ---
    
    function onThemeChange(e) {
        const newTheme = e.target.value;
        setTheme(newTheme);
        try {
            localStorage.setItem('solitaireTheme', newTheme);
        } catch (e) {
            console.warn("Kunne ikke lagre tema:", e);
        }
    }

    function setTheme(themeName) {
        if (!themeName) return;
        
        document.body.classList.remove('theme-green', 'theme-burgundy', 'theme-blue', 'theme-gray', 'theme-black');
        document.body.classList.add(themeName);
        
        if (themeSelect) {
            themeSelect.value = themeName;
        }
    }

    function loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem('solitaireTheme');
            if (savedTheme) {
                setTheme(savedTheme);
            } else {
                setTheme(document.body.className || 'theme-green'); 
            }
        } catch (e) {
            console.warn("Kunne ikke hente lagret tema:", e);
        }
    }

// --- Initialiser spillet ---
    loadSavedTheme();
    loadHighScores();
});
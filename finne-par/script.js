// === Hent elementer fra HTML ===
    const gameContainer = document.querySelector('.memory-game');
    const resetButton = document.querySelector('#reset-button');
    const levelSelect = document.querySelector('#level-select');
    const timerDisplay = document.querySelector('#timer');
    const modalOverlay = document.querySelector('#username-modal-overlay');
    const usernameInput = document.querySelector('#username-input');
    const usernameSaveBtn = document.querySelector('#username-save-btn');
    const usernameError = document.querySelector('#username-error');
    const welcomeMessage = document.querySelector('#welcome-message');
    const highscoreList = {
        easy: document.querySelector('#highscore-list-easy'),
        medium: document.querySelector('#highscore-list-medium'),
        hard: document.querySelector('#highscore-list-hard')
    };
    const USERNAME_KEY = 'memoryGameUsername';

    // === Definer nivåer ===
    const symbolSets = {
        easy: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'],
        medium: ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🍉'],
        hard: ['🚗', '🚕', '🚌', '🚓', '🚑', '🚚', '🚜', '🚲', '🛴', '✈️']
    };
    const gridConfig = {
        easy: { columns: 4 },
        medium: { columns: 4 },
        hard: { columns: 5 }
    };

    // === Spill-tilstand ===
    let hasFlippedCard = false, lockBoard = false, firstCard, secondCard;
    let gameStarted = false, startTime = 0, timerInterval = null;
    let matchedPairs = 0, totalPairs = 0;
    let currentUsername = null;

    // =========================================================================
    // === NYE DATABASE-FUNKSJONER (erstatter localStorage) ===
    // =========================================================================

    // VIKTIG: Pass på at stien til PHP-filene er riktig!
    const addScoreURL = 'api/add_finne-par_score.php';
    const getScoresURL = 'api/get_finne-par_scores.php';

    async function visHighscoresFraDatabase() {
        try {
            const response = await fetch(getScoresURL);
            const scores = await response.json(); // Forventer { easy: [...], medium: [...], hard: [...] }

            for (const level in scores) {
                const listElement = highscoreList[level];
                listElement.innerHTML = '';
                const levelScores = scores[level];

                if (levelScores.length === 0) {
                    listElement.innerHTML = '<li class="no-score">Ingen tider registrert</li>';
                } else {
                    levelScores.forEach(score => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span>${score.name}</span> <span>${parseFloat(score.time).toFixed(1)}s</span>`;
                        listElement.appendChild(li);
                    });
                }
            }
        } catch (error) {
            console.error("Kunne ikke hente highscores fra databasen:", error);
        }
    }

    async function lagreScoreTilDatabase(finalTime) {
        if (!currentUsername) return; // Må ha et brukernavn
        
        const level = levelSelect.value;
        const formData = new FormData();
        formData.append('spiller_navn', currentUsername);
        formData.append('time', finalTime);
        formData.append('level', level);

        try {
            await fetch(addScoreURL, { method: 'POST', body: formData });
            console.log("Highscore sendt til databasen.");
            
            // Oppdater listene for å vise den nye tiden umiddelbart
            await visHighscoresFraDatabase();
        } catch (error) {
            console.error("Kunne ikke lagre highscore til databasen:", error);
        }
    }


    // === Timer-funksjoner ===
    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000;
            timerDisplay.textContent = `${elapsedTime.toFixed(1)}s`;
        }, 100);
    }
    function stopTimer() { clearInterval(timerInterval); gameStarted = false; }
    function resetTimerDisplay() { stopTimer(); timerDisplay.textContent = '0.0s'; }

    // === Brukernavn-funksjoner (uendret, bruker fortsatt localStorage for å huske navnet) ===
    function checkUsername() {
        currentUsername = localStorage.getItem(USERNAME_KEY);
        if (currentUsername) {
            welcomeMessage.textContent = `Lykke til, ${currentUsername}!`;
        } else {
            modalOverlay.style.display = 'flex';
        }
    }
    function handleSaveUsername() {
        const username = usernameInput.value.trim();
        if (username.length > 0 && username.length <= 15) {
            currentUsername = username;
            localStorage.setItem(USERNAME_KEY, username);
            modalOverlay.style.display = 'none';
            welcomeMessage.textContent = `Lykke til, ${currentUsername}!`;
            usernameError.textContent = '';
        } else {
            usernameError.textContent = 'Navn må være 1-15 tegn.';
        }
    }

    // === Spill-logikk (med små justeringer) ===
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
        let gameCards = [...cardSymbols, ...cardSymbols].sort(() => 0.5 - Math.random());

        gameCards.forEach(symbol => {
            const card = document.createElement('div');
            card.classList.add('memory-card');
            card.dataset.symbol = symbol; 
            card.innerHTML = `<div class="front-face">${symbol}</div><div class="back-face">?</div>`;
            gameContainer.appendChild(card);
            card.addEventListener('click', flipCard);
        });
    }

    function flipCard() {
        if (lockBoard || this === firstCard) return;

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

    function checkForMatch() {
        let isMatch = firstCard.dataset.symbol === secondCard.dataset.symbol;
        isMatch ? disableCards() : unflipCards();
    }

    // --- ENDRET `disableCards` for å bruke den nye lagringsfunksjonen ---
    function disableCards() {
        firstCard.removeEventListener('click', flipCard);
        secondCard.removeEventListener('click', flipCard);
        
        matchedPairs++; 

        if (matchedPairs === totalPairs) {
            stopTimer();
            const finalTime = (Date.now() - startTime) / 1000;
            // Kaller den nye database-funksjonen istedenfor den gamle
            lagreScoreTilDatabase(finalTime); 
        }
        resetBoardState();
    }

    function unflipCards() {
        lockBoard = true;
        setTimeout(() => {
            firstCard.classList.remove('flip');
            secondCard.classList.remove('flip');
            resetBoardState();
        }, 1000); 
    }

    function resetBoardState() {
        hasFlippedCard = false;
        lockBoard = false;
        firstCard = null;
        secondCard = null;
    }

    // === Oppstart ===
    function initializeGame() {
        resetButton.addEventListener('click', createBoard);
        levelSelect.addEventListener('change', createBoard);
        usernameSaveBtn.addEventListener('click', handleSaveUsername);

        checkUsername();
        visHighscoresFraDatabase(); // ENDRET: Laster highscores fra databasen
        createBoard();
    }

    initializeGame();
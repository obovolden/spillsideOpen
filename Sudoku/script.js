document.addEventListener('DOMContentLoaded', () => {
    
    // --- Hent elementer ---
    const grid = document.getElementById('sudoku-grid');
    const timerDisplay = document.getElementById('timer');
    const highscoreList = document.getElementById('highscore-list');
    
    // Knapper
    const themeToggleButton = document.getElementById('theme-toggle');
    const draftToggleButton = document.getElementById('btn-draft');
    const btnEasy = document.getElementById('btn-easy');
    const btnMedium = document.getElementById('btn-medium');
    const btnHard = document.getElementById('btn-hard');
    const btnRestart = document.getElementById('btn-restart'); // "Start nytt spill"
    const btnHint = document.getElementById('btn-hint');
    const btnValidate = document.getElementById('btn-validate');

    // Modal-elementer
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // --- Spill-variabler ---
    let timerInterval;
    let timerSeconds = 0;
    let currentPuzzle = [];
    let currentSolution = [];
    let currentDifficulty = 'easy';
    let isGameActive = false;
    let isDraftMode = false;
    let activeCell = null; // *** NY: Holder styr på valgt rute ***

    // --- Verifiserte brett ---
    const puzzles = {
        easy: [
            { // Brett 1
                board: [
                    [5, 3, 0, 0, 7, 0, 0, 0, 0], [6, 0, 0, 1, 9, 5, 0, 0, 0], [0, 9, 8, 0, 0, 0, 0, 6, 0],
                    [8, 0, 0, 0, 6, 0, 0, 0, 3], [4, 0, 0, 8, 0, 3, 0, 0, 1], [7, 0, 0, 0, 2, 0, 0, 0, 6],
                    [0, 6, 0, 0, 0, 0, 2, 8, 0], [0, 0, 0, 4, 1, 9, 0, 0, 5], [0, 0, 0, 0, 8, 0, 0, 7, 9]
                ],
                solution: [
                    [5, 3, 4, 6, 7, 8, 9, 1, 2], [6, 7, 2, 1, 9, 5, 3, 4, 8], [1, 9, 8, 3, 4, 2, 5, 6, 7],
                    [8, 5, 9, 7, 6, 1, 4, 2, 3], [4, 2, 6, 8, 5, 3, 7, 9, 1], [7, 1, 3, 9, 2, 4, 8, 5, 6],
                    [9, 6, 1, 5, 3, 7, 2, 8, 4], [2, 8, 7, 4, 1, 9, 6, 3, 5], [3, 4, 5, 2, 8, 6, 1, 7, 9]
                ]
            },
            { // Brett 2
                board: [
                    [1, 0, 0, 4, 8, 9, 0, 0, 6], [7, 3, 0, 0, 0, 0, 0, 4, 0], [0, 0, 0, 0, 0, 1, 2, 9, 5],
                    [0, 0, 7, 1, 2, 0, 6, 0, 0], [5, 0, 0, 7, 0, 3, 0, 0, 8], [0, 0, 6, 0, 9, 5, 7, 0, 0],
                    [4, 1, 3, 9, 0, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0, 0, 3, 7], [8, 0, 0, 5, 1, 2, 0, 0, 4]
                ],
                solution: [
                    [1, 5, 2, 4, 8, 9, 3, 7, 6], [7, 3, 9, 2, 5, 6, 8, 4, 1], [4, 6, 8, 3, 7, 1, 2, 9, 5],
                    [3, 8, 7, 1, 2, 4, 6, 5, 9], [5, 9, 1, 7, 6, 3, 4, 2, 8], [2, 4, 6, 8, 9, 5, 7, 1, 3],
                    [4, 1, 3, 9, 8, 7, 5, 6, 2], [9, 2, 5, 6, 4, 8, 1, 3, 7], [8, 7, 6, 5, 1, 2, 9, 3, 4]
                ]
            }
        ],
        medium: [
            { // Brett 1
                board: [
                    [0, 2, 0, 6, 0, 8, 0, 0, 0], [5, 8, 0, 0, 0, 9, 7, 0, 0], [0, 0, 0, 0, 4, 0, 0, 0, 0],
                    [3, 7, 0, 0, 0, 0, 5, 0, 0], [6, 0, 0, 0, 0, 0, 0, 0, 4], [0, 0, 8, 0, 0, 0, 0, 1, 3],
                    [0, 0, 0, 0, 2, 0, 0, 0, 0], [0, 0, 9, 8, 0, 0, 0, 3, 6], [0, 0, 0, 3, 0, 6, 0, 9, 0]
                ],
                solution: [
                    [1, 2, 3, 6, 7, 8, 9, 4, 5], [5, 8, 4, 2, 3, 9, 7, 6, 1], [9, 6, 7, 1, 4, 5, 3, 2, 8],
                    [3, 7, 1, 9, 8, 4, 5, 6, 2], [6, 9, 2, 5, 1, 3, 8, 7, 4], [4, 5, 8, 7, 6, 2, 9, 1, 3],
                    [8, 3, 6, 4, 2, 1, 9, 5, 7], [7, 1, 9, 8, 5, 4, 2, 3, 6], [2, 4, 5, 3, 9, 6, 1, 8, 7]
                ]
            },
            { // Brett 2
                board: [
                    [0, 0, 0, 6, 0, 0, 4, 0, 0], [7, 0, 0, 0, 0, 3, 6, 0, 0], [0, 0, 0, 0, 9, 1, 0, 8, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 5, 0, 1, 8, 0, 0, 0, 3], [0, 0, 0, 3, 0, 6, 0, 4, 5],
                    [0, 4, 0, 2, 0, 0, 0, 6, 0], [9, 0, 3, 0, 0, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0, 1, 0, 0]
                ],
                solution: [
                    [5, 8, 1, 6, 7, 2, 4, 3, 9], [7, 9, 2, 8, 4, 3, 6, 5, 1], [3, 6, 4, 5, 9, 1, 7, 8, 2],
                    [4, 3, 8, 9, 5, 7, 2, 1, 6], [2, 5, 6, 1, 8, 4, 9, 7, 3], [1, 7, 9, 3, 2, 6, 8, 4, 5],
                    [8, 4, 5, 2, 1, 9, 3, 6, 7], [9, 1, 3, 7, 6, 8, 5, 2, 4], [6, 2, 7, 4, 3, 5, 1, 9, 8]
                ]
            }
        ],
        hard: [
            { // Brett 1
                board: [
                    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 3, 0, 8, 5], [0, 0, 1, 0, 2, 0, 0, 0, 0],
                    [0, 0, 0, 5, 0, 7, 0, 0, 0], [0, 0, 4, 0, 0, 0, 1, 0, 0], [0, 9, 0, 0, 0, 0, 0, 0, 0],
                    [5, 0, 0, 0, 0, 0, 0, 7, 3], [0, 0, 2, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 4, 0, 0, 0, 9]
                ],
                solution: [
                    [9, 8, 7, 6, 5, 4, 3, 2, 1], [2, 4, 6, 1, 7, 3, 9, 8, 5], [3, 5, 1, 9, 2, 8, 7, 4, 6],
                    [1, 2, 8, 5, 3, 7, 6, 9, 4], [6, 3, 4, 8, 9, 2, 1, 5, 7], [7, 9, 5, 4, 6, 1, 8, 3, 2],
                    [5, 1, 9, 2, 8, 6, 4, 7, 3], [4, 7, 2, 3, 1, 9, 5, 6, 8], [8, 6, 3, 7, 4, 5, 2, 1, 9]
                ]
            },
            { // Brett 2
                board: [
                    [8, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 3, 6, 0, 0, 0, 0, 0], [0, 7, 0, 0, 9, 0, 2, 0, 0],
                    [0, 5, 0, 0, 0, 7, 0, 0, 0], [0, 0, 0, 0, 4, 5, 7, 0, 0], [0, 0, 0, 1, 0, 0, 0, 3, 0],
                    [0, 0, 1, 0, 0, 0, 0, 6, 8], [0, 0, 8, 5, 0, 0, 0, 1, 0], [0, 9, 0, 0, 0, 0, 4, 0, 0]
                ],
                solution: [
                    [8, 1, 2, 7, 5, 3, 6, 4, 9], [9, 4, 3, 6, 8, 2, 1, 7, 5], [6, 7, 5, 4, 9, 1, 2, 8, 3],
                    [1, 5, 4, 2, 3, 7, 8, 9, 6], [3, 6, 9, 8, 4, 5, 7, 2, 1], [2, 8, 7, 1, 6, 9, 5, 3, 4],
                    [5, 2, 1, 9, 7, 4, 3, 6, 8], [4, 3, 8, 5, 2, 6, 9, 1, 7], [7, 9, 6, 3, 1, 8, 4, 5, 2]
                ]
            }
        ]
    };

    // --- 0. Modal-funksjoner ---
    // (uendret)
    function showModal(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalOverlay.style.display = 'flex';
    }
    function hideModal() { modalOverlay.style.display = 'none'; }
    modalCloseBtn.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideModal();
    });

    // --- 1. Temabytting ---
    // (uendret)
    const currentTheme = localStorage.getItem('sudoku-theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleButton.textContent = 'Bytt til lyst modus';
    }
    themeToggleButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            themeToggleButton.textContent = 'Bytt til lyst modus';
            localStorage.setItem('sudoku-theme', 'dark');
        } else {
            themeToggleButton.textContent = 'Bytt til mørk modus';
            localStorage.setItem('sudoku-theme', 'light');
        }
    });

    // --- 2. Veksle Kladde-modus ---
    // (uendret)
    draftToggleButton.addEventListener('click', () => {
        if (!isGameActive) return; 
        
        isDraftMode = !isDraftMode;
        grid.classList.toggle('draft-mode-active', isDraftMode); 
        
        if (isDraftMode) {
            draftToggleButton.textContent = 'Kladde-modus: På';
            draftToggleButton.classList.add('active');
        } else {
            draftToggleButton.textContent = 'Kladde-modus: Av';
            draftToggleButton.classList.remove('active');
        }
        
        // Flytt fokus til riktig input-felt
        if (activeCell) {
            setActiveCell(activeCell); 
        }
    });

    // --- 3. Vanskelighetsgrad ---
    // (uendret)
    btnEasy.addEventListener('click', () => startGame('easy'));
    btnMedium.addEventListener('click', () => startGame('medium'));
    btnHard.addEventListener('click', () => startGame('hard'));

    function startGame(difficulty) {
        console.log(`Starter nytt spill: ${difficulty}`);
        currentDifficulty = difficulty;
        
        const puzzleList = puzzles[difficulty];
        const randomPuzzle = puzzleList[Math.floor(Math.random() * puzzleList.length)];
        
        currentPuzzle = randomPuzzle.board;
        currentSolution = randomPuzzle.solution;
        
        clearBoard();
        populateBoard(currentPuzzle);
        resetTimer();
        startTimer();
        isGameActive = true; 
        
        // Nullstill kladdemodus
        isDraftMode = false;
        grid.classList.remove('draft-mode-active');
        draftToggleButton.textContent = 'Kladde-modus: Av';
        draftToggleButton.classList.remove('active');
        
        clearHighlights(); // *** NYTT: Fjern uthevinger ***
        activeCell = null; // *** NYTT: Nullstill aktiv rute ***

        document.querySelector('.highscore-container h3').textContent = `Highscore (${difficulty})`;
        loadHighscores(difficulty);

        document.querySelectorAll('.difficulty-controls button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn-${difficulty}`).classList.add('active');
    }

    // --- 'clearBoard' funksjon ---
    // (uendret)
    function clearBoard() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const input = cell.querySelector('.cell-input');
            const draftInput = cell.querySelector('.draft-input');
            
            input.value = '';
            draftInput.value = '';

            input.disabled = false;
            cell.classList.remove('given', 'hinted');
            input.classList.remove('incorrect');
        });
    }

    function populateBoard(board) {
        // (uendret)
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const num = board[r][c];
                if (num !== 0) {
                    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                    if (cell) {
                        const input = cell.querySelector('.cell-input');
                        input.value = num;
                        input.disabled = true;
                        cell.classList.add('given');
                    }
                }
            }
        }
    }

    // --- 4. Timer-funksjoner ---
    // (uendret)
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerSeconds = 0;
        timerDisplay.textContent = "Tid: " + formatTime(timerSeconds);
        timerInterval = setInterval(updateTimer, 1000);
    }
    function stopTimer() { clearInterval(timerInterval); }
    function resetTimer() {
        stopTimer();
        timerSeconds = 0;
        timerDisplay.textContent = 'Tid: 00:00';
    }
    function updateTimer() {
        timerSeconds++;
        timerDisplay.textContent = "Tid: " + formatTime(timerSeconds);
    }
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    // --- 5. Handlingsknapper ---
    // (uendret)
    btnRestart.addEventListener('click', () => {
        startGame(currentDifficulty);
    });

    btnHint.addEventListener('click', () => {
        if (!isGameActive) return;

        const emptyCells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                const input = cell.querySelector('.cell-input');
                if (!cell.classList.contains('given') && input.value === '') {
                    emptyCells.push({ cell, r, c });
                }
            }
        }
        if (emptyCells.length === 0) {
            showModal("Hint", "Ingen tomme ruter igjen!");
            return;
        }
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { cell, r, c } = randomCell;
        
        if (isDraftMode) {
            draftToggleButton.click();
        }
        
        cell.querySelector('.draft-input').value = ''; 
        cell.querySelector('.cell-input').value = currentSolution[r][c];
        cell.classList.add('hinted');
        
        // Oppdater uthevinger
        if (cell === activeCell) {
            updateNumberHighlights(currentSolution[r][c]);
        }

        checkAutoWin();
    });

    btnValidate.addEventListener('click', () => {
        if (!isGameActive) return; 
        
        if (isDraftMode) {
            showModal("Oisann!", "Du kan ikke sjekke svar mens du er i kladdemodus.");
            return;
        }

        let allCorrect = true;
        let isFull = true;
        document.querySelectorAll('.cell-input').forEach(input => input.classList.remove('incorrect'));

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                const input = cell.querySelector('.cell-input');
                const userValue = parseInt(input.value, 10) || 0;
                
                if (userValue === 0) isFull = false;

                if (userValue !== 0 && userValue !== currentSolution[r][c]) {
                    allCorrect = false;
                    if (!cell.classList.contains('given')) {
                        input.classList.add('incorrect');
                    }
                }
            }
        }

        if (allCorrect && isFull) {
            stopTimer();
            const time = formatTime(timerSeconds);
            showModal("Gratulerer!", `Du klarte brettet på ${time}!`);
            saveHighscore(currentDifficulty, timerSeconds);
            loadHighscores(currentDifficulty);
            isGameActive = false;
            clearHighlights();
            activeCell = null;
        } else if (!isFull) {
             showModal("Oisann!", "Du har ikke fylt ut alle rutene ennå.");
        } else {
            showModal("Oisann!", "Noen feil ble funnet. Se etter de røde rutene.");
        }
    });

    // --- 6. Highscore ---
    // (uendret)
    function loadHighscores(difficulty) {
        const key = `sudokuHighscores-${difficulty}`;
        const scores = JSON.parse(localStorage.getItem(key)) || [];
        highscoreList.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const li = document.createElement('li');
            li.textContent = scores[i] ? formatTime(scores[i]) : '--:--';
            highscoreList.appendChild(li);
        }
    }
    function saveHighscore(difficulty, timeInSeconds) {
        const key = `sudokuHighscores-${difficulty}`;
        const scores = JSON.parse(localStorage.getItem(key)) || [];
        scores.push(timeInSeconds);
        scores.sort((a, b) => a - b);
        const top5Scores = scores.slice(0, 5);
        localStorage.setItem(key, JSON.stringify(top5Scores));
    }

    // --- 7. Input & Kladde-logikk (OPPDATERT) ---
    
    // Håndterer de store tallene
    const inputs = document.querySelectorAll('.cell-input');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            if (!isGameActive) {
                e.target.value = ''; 
                return;
            }
            e.target.classList.remove('incorrect');
            
            let val = e.target.value.replace(/[^1-9]/g, '');
            e.target.value = val.slice(0, 1);
            
            if(e.target.value !== '') {
                const parentCell = e.target.closest('.cell');
                if(parentCell) {
                    parentCell.querySelector('.draft-input').value = '';
                }
            }
            
            updateNumberHighlights(e.target.value); // *** NYTT: Oppdater tall-utheving mens du skriver ***
            checkAutoWin();
        });
    });

    // Håndterer de små kladdetallene
    const draftInputs = document.querySelectorAll('.draft-input');
    draftInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            if (!isGameActive) return; 
            
            let val = e.target.value.replace(/[^1-9]/g, '');
            let uniqueVal = [...new Set(val.split(''))].sort().join('');
            e.target.value = uniqueVal;
        });
    });

    // --- 8. Automatisk Vinner-sjekk ---
    // (uendret)
    function checkAutoWin() {
        if (!isGameActive || currentSolution.length === 0 || isDraftMode) return;

        let allCorrect = true;
        let isFull = true;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const input = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`).querySelector('.cell-input');
                const userValue = parseInt(input.value, 10) || 0;

                if (userValue === 0) {
                    isFull = false;
                    allCorrect = false;
                    break;
                }
                
                if (userValue !== currentSolution[r][c]) {
                    allCorrect = false;
                }
            }
            if (!isFull) break;
        }

        if (isFull && allCorrect) {
            stopTimer();
            const time = formatTime(timerSeconds);
            showModal("Gratulerer!", `Du klarte brettet på ${time}!`);
            saveHighscore(currentDifficulty, timerSeconds);
            loadHighscores(currentDifficulty);
            isGameActive = false;
            clearHighlights();
            activeCell = null;
        }
    }
    
    // --- 9. NYE FUNKSJONER: Utheving og Tastatur ---

    function clearHighlights() {
        document.querySelectorAll('.cell.active').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.cell.highlighted').forEach(c => c.classList.remove('highlighted'));
        document.querySelectorAll('.cell.highlighted-number').forEach(c => c.classList.remove('highlighted-number'));
    }

    function updateNumberHighlights(value) {
        document.querySelectorAll('.cell.highlighted-number').forEach(c => c.classList.remove('highlighted-number'));
        if (value && value !== '0') {
            document.querySelectorAll('.cell-input').forEach(input => {
                if (input.value === value) {
                    input.closest('.cell').classList.add('highlighted-number');
                }
            });
        }
    }

    function setActiveCell(cell) {
        if (!isGameActive) return;
        
        clearHighlights(); // Rydd opp i gamle
        
        activeCell = cell;
        cell.classList.add('active');

        // Sett fokus på riktig inputfelt
        if (isDraftMode) {
            cell.querySelector('.draft-input').focus();
        } else {
            cell.querySelector('.cell-input').focus();
        }

        const row = cell.dataset.row;
        const col = cell.dataset.col;

        // 1. Uthev Rad og Kolonne
        document.querySelectorAll(`.cell[data-row="${row}"], .cell[data-col="${col}"]`).forEach(c => {
            c.classList.add('highlighted');
        });

        // 2. Uthev Boks
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) {
                document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`).classList.add('highlighted');
            }
        }
        
        // 3. Uthev Tall
        const value = cell.querySelector('.cell-input').value;
        updateNumberHighlights(value);
    }
    
    // Legg til klikk-lytter på alle ruter
    const allCells = document.querySelectorAll('.cell');
    allCells.forEach(cell => {
        cell.addEventListener('click', () => {
            setActiveCell(cell);
        });
    });
    
    // Klikk utenfor brettet for å fjerne utheving
    document.addEventListener('click', (e) => {
        if (isGameActive && !e.target.closest('.cell') && !e.target.closest('.controls-container') && !e.target.closest('.action-controls')) {
            clearHighlights();
            activeCell = null;
        }
    });

    // Tastatur-kontroll
    document.addEventListener('keydown', (e) => {
        if (!isGameActive || !activeCell) return; // Ikke gjør noe hvis spillet er over eller ingen rute er valgt

        let row = parseInt(activeCell.dataset.row, 10);
        let col = parseInt(activeCell.dataset.col, 10);
        let newCell = null;

        switch(e.key) {
            case "ArrowUp":
                newCell = document.querySelector(`.cell[data-row="${Math.max(0, row - 1)}"][data-col="${col}"]`);
                e.preventDefault();
                break;
            case "ArrowDown":
                newCell = document.querySelector(`.cell[data-row="${Math.min(8, row + 1)}"][data-col="${col}"]`);
                e.preventDefault();
                break;
            case "ArrowLeft":
                newCell = document.querySelector(`.cell[data-row="${row}"][data-col="${Math.max(0, col - 1)}"]`);
                e.preventDefault();
                break;
            case "ArrowRight":
                newCell = document.querySelector(`.cell[data-row="${row}"][data-col="${Math.min(8, col + 1)}"]`);
                e.preventDefault();
                break;
            case "Backspace":
            case "Delete":
                if (!activeCell.classList.contains('given')) {
                    activeCell.querySelector('.cell-input').value = '';
                    activeCell.querySelector('.draft-input').value = '';
                    updateNumberHighlights('');
                }
                e.preventDefault();
                break;
            case "k":
            case "K":
                draftToggleButton.click();
                e.preventDefault();
                break;
        }
        
        if (newCell) {
            setActiveCell(newCell);
        }
    });


    // Start spillet
    startGame('easy');
});
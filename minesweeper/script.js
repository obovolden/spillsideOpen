document.addEventListener('DOMContentLoaded', () => {
    
    // --- NYTT: Lydeffekter ---
    const audio = {
        click: new Audio('sounds/click.wav'), 
        flag: new Audio('sounds/flag.wav'),   
        boom: new Audio('sounds/boom.wav'),    
        win: new Audio('sounds/win.mp3')      
    };
    Object.values(audio).forEach(a => {
        a.onerror = () => console.warn("Kunne ikke laste en lydfil. Sjekk filstien.");
        a.volume = 0.5;
    });

    // Innstillinger for vanskelighetsgrad
    const difficulties = {
        easy: { size: 9, mines: 10 },
        medium: { size: 16, mines: 40 },
        hard: { size: 20, mines: 80 }
    };
    
    let currentBoardSize = difficulties.easy.size;
    let currentMineCount = difficulties.easy.mines;
    let currentDifficultyKey = 'easy'; 

    // Hent UI-elementer
    const boardElement = document.getElementById('game-board');
    const minesCountElement = document.getElementById('mines-count');
    const resetButton = document.getElementById('reset-button');
    const btnEasy = document.getElementById('btn-easy');
    const btnMedium = document.getElementById('btn-medium');
    const btnHard = document.getElementById('btn-hard');
    const timerElement = document.getElementById('timer');
    
    // VIKTIG: Pass på at HTML-en din har ID-ene: 'hs-easy', 'hs-medium', 'hs-hard'
    const hsList = {
        easy: document.getElementById('hs-easy'),
        medium: document.getElementById('hs-medium'),
        hard: document.getElementById('hs-hard'),
    };
    
    const modeToggleButton = document.getElementById('mode-toggle');
    let flagMode = false; 

    // Spillstatus-variabler
    let board = []; 
    let minesLeft = 0;
    let gameOver = false;
    let timerInterval = null;
    let elapsedTime = 0;
    let firstClick = true; 

    // === NYE DATABASE-KONSTANTER ===
    const addScoreURL = 'api/add_minesweeper_score.php';
    const getScoresURL = 'api/get_minesweeper_scores.php';

    // --- Listeners for vanskelighetsgrad ---
    btnEasy.addEventListener('click', () => setDifficulty('easy'));
    btnMedium.addEventListener('click', () => setDifficulty('medium'));
    btnHard.addEventListener('click', () => setDifficulty('hard'));
    
    function setDifficulty(difficulty) {
        currentDifficultyKey = difficulty; // Setter 'easy', 'medium', eller 'hard'
        currentBoardSize = difficulties[difficulty].size;
        currentMineCount = difficulties[difficulty].mines;
        initGame();
    }

    modeToggleButton.addEventListener('click', () => {
        flagMode = !flagMode;
        updateModeButtonText();
    });

    function updateModeButtonText() {
        if (flagMode) {
            modeToggleButton.innerHTML = '<i class="fas fa-flag"></i> Flagg';
            modeToggleButton.classList.add('flag-mode');
        } else {
            modeToggleButton.innerHTML = '<i class="fas fa-bomb"></i> Sveip';
            modeToggleButton.classList.remove('flag-mode');
        }
    }

    // --- Spillfunksjoner ---
    function initGame() {
        gameOver = false;
        firstClick = true; 
        stopTimer();
        elapsedTime = 0;
        timerElement.textContent = 'Tid: 0s';
        flagMode = false;
        updateModeButtonText();
        board = createBoard(currentBoardSize);
        placeMines(board, currentMineCount);
        calculateNeighborCounts(board);
        minesLeft = currentMineCount;
        updateMinesCount();
        drawBoard(board, boardElement);
        
        // --- ENDRING: Event Delegation ---
        // Fjerner gamle lyttere (viktig ved reset)
        boardElement.removeEventListener('click', handleLeftClick);
        boardElement.removeEventListener('contextmenu', handleRightClick);
        
        // Legger til nye lyttere på HELE brettet
        boardElement.addEventListener('click', handleLeftClick);
        boardElement.addEventListener('contextmenu', handleRightClick);
        // --- SLUTT PÅ ENDRING ---

        visHighscoresFraDatabase(); // Laster fra database
        resetButton.removeEventListener('click', initGame);
        resetButton.addEventListener('click', initGame);
    }
    
    function createBoard(size) {
        const newBoard = [];
        for (let r = 0; r < size; r++) {
            const row = [];
            for (let c = 0; c < size; c++) {
                row.push({
                    row: r, col: c, isMine: false, isRevealed: false, isFlagged: false, neighborCount: 0
                });
            }
            newBoard.push(row);
        }
        return newBoard;
    }
    function updateMinesCount() {
        const flaggedCells = board.flat().filter(cell => cell.isFlagged).length;
        minesLeft = currentMineCount - flaggedCells; 
        minesCountElement.textContent = minesLeft;
    }
    function placeMines(board, mineCount) {
        let minesPlaced = 0;
        while (minesPlaced < mineCount) {
            const r = Math.floor(Math.random() * currentBoardSize);
            const c = Math.floor(Math.random() * currentBoardSize);
            if (!board[r][c].isMine) {
                board[r][c].isMine = true;
                minesPlaced++;
            }
        }
    }
    function calculateNeighborCounts(board) {
        for (let r = 0; r < currentBoardSize; r++) {
            for (let c = 0; c < currentBoardSize; c++) {
                if (board[r][c].isMine) continue;
                board[r][c].neighborCount = getNeighborMineCount(board, r, c);
            }
        }
    }
    function getNeighborMineCount(board, row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue; 
                const nr = row + dr; 
                const nc = col + dc; 
                if (isCellValid(nr, nc) && board[nr][nc].isMine) {
                    count++;
                }
            }
        }
        return count;
    }
    function isCellValid(row, col) {
        return row >= 0 && row < currentBoardSize && col >= 0 && col < currentBoardSize;
    }

    function drawBoard(board, element) {
        element.innerHTML = ''; 
        element.style.gridTemplateColumns = `repeat(${currentBoardSize}, 1fr)`;
        element.style.gridTemplateRows = 'auto';
        for (let r = 0; r < currentBoardSize; r++) {
            for (let c = 0; c < currentBoardSize; c++) {
                const cell = board[r][c];
                const cellElement = document.createElement('div');
                cellElement.classList.add('cell');
                cellElement.dataset.row = r;
                cellElement.dataset.col = c;
                
                // --- ENDRING: Fjernet lyttere herfra ---
                // cellElement.addEventListener('click', handleLeftClick);
                // cellElement.addEventListener('contextmenu', handleRightClick);
                
                element.appendChild(cellElement);
            }
        }
    }

    // --- Hendelseshåndtering (Event Handlers) ---
    function handleLeftClick(e) {
        if (gameOver) return;
        if (firstClick) {
            startTimer();
            firstClick = false;
        }
        
        // Finner cellen som ble klikket, selv om vi klikker på et ikon inni
        const cellElement = e.target.closest('.cell');
        if (!cellElement) return; // Klikket var utenfor en celle
        
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        
        const cell = board[row][col];
        if (flagMode) {
            toggleFlag(cell, cellElement);
        } else {
            if (cell.isFlagged) return;
            revealCell(cell);
            checkGameWin();
        }
    }

    function handleRightClick(e) {
        e.preventDefault(); 
        if (gameOver) return;
        
        // Finner cellen som ble klikket
        const cellElement = e.target.closest('.cell');
        if (!cellElement) return; 
        
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        
        const cell = board[row][col];
        toggleFlag(cell, cellElement);
    }

    function toggleFlag(cell, cellElement) {
        if (cell.isRevealed) return; 
        cell.isFlagged = !cell.isFlagged;
        if (cell.isFlagged) {
            cellElement.innerHTML = '<i class="fas fa-flag"></i>';
            audio.flag.play().catch(e => {});
        } else {
            cellElement.innerHTML = '';
        }
        updateMinesCount();
    }

    function revealCell(cell) {
        if (cell.isRevealed || cell.isFlagged) return; 
        cell.isRevealed = true;
        const cellElement = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
        cellElement.classList.add('revealed');
        if (cell.isMine) {
            cellElement.innerHTML = '<i class="fas fa-bomb"></i>';
            cellElement.classList.add('mine');
            audio.boom.play().catch(e => {}); 
            endGame(false);
            return;
        }
        if (cell.neighborCount > 0) {
            cellElement.textContent = cell.neighborCount;
            cellElement.classList.add('c' + cell.neighborCount); 
            audio.click.play().catch(e => {}); 
        } else {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = cell.row + dr;
                    const nc = cell.col + dc;
                    if (isCellValid(nr, nc)) {
                        revealCell(board[nr][nc]); 
                    }
                }
            }
        }
    }
    
    function checkGameWin() {
        let revealedNonMines = 0;
        const totalNonMines = (currentBoardSize * currentBoardSize) - currentMineCount;
        for (let r = 0; r < currentBoardSize; r++) {
            for (let c = 0; c < currentBoardSize; c++) {
                if (board[r][c].isRevealed && !board[r][c].isMine) {
                    revealedNonMines++;
                }
            }
        }
        if (revealedNonMines === totalNonMines) {
            endGame(true);
        }
    }

    async function endGame(isWin) {
        gameOver = true;
        stopTimer(); 
        board.flat().forEach(cell => {
            if (cell.isMine) {
                const cellElement = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
                if (!cell.isRevealed && !cell.isFlagged) {
                    cellElement.classList.add('revealed');
                    cellElement.innerHTML = '<i class="fas fa-bomb"></i>'; 
                } else if (cell.isFlagged && !cell.isMine) {
                    cellElement.classList.add('revealed');
                    cellElement.innerHTML = '<i class="fas fa-times"></i>';
                    cellElement.style.backgroundColor = '#ffc0c0';
                }
            }
        });

        if (isWin) {
            audio.win.play().catch(e => {}); 
            const playerName = prompt(`Gratulerer! Du vant på ${elapsedTime}s!\nSkriv inn navnet ditt:`, "Anonym");
            if (playerName !== null) {
                // Pass på at vi sender riktig nøkkel: currentDifficultyKey
                await lagreScoreTilDatabase(playerName, elapsedTime, currentDifficultyKey);
            }
        } else {
            setTimeout(() => alert("Du traff en mine! Prøv igjen."), 100);
        }
    }

    function startTimer() {
        if (timerInterval) return;
        const startTime = Date.now() - (elapsedTime * 1000); 
        timerInterval = setInterval(() => {
            elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            timerElement.textContent = `Tid: ${elapsedTime}s`;
        }, 1000); 
    }
    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // ========================================================
    // --- Highscore-logikk (HELT NY, med database) ---
    // ========================================================

    async function visHighscoresFraDatabase() {
        try {
            const response = await fetch(getScoresURL);
            const scores = await response.json(); // Forventer { easy: [...], medium: [...], hard: [...] }

            // Itererer gjennom nøklene ('easy', 'medium', 'hard')
            for (const level in scores) {
                const listElement = hsList[level]; // Finner riktig <ol> (hsList.easy, hsList.medium...)
                if (!listElement) continue; 

                listElement.innerHTML = ''; 
                const levelScores = scores[level]; // Henter den spesifikke listen

                if (levelScores.length === 0) {
                    listElement.innerHTML = '<li class="no-score">Ingen tider registrert</li>';
                } else {
                    levelScores.forEach(score => {
                        const li = document.createElement('li');
                        // Pass på at navnene her (spiller_navn, time_seconds) matcher det PHP sender
                        li.innerHTML = `<span>${score.spiller_navn}</span> <span>${score.time_seconds}s</span>`;
                        listElement.appendChild(li);
                    });
                }
            }
        } catch (error) {
            console.error("Kunne ikke hente highscores:", error);
            Object.values(hsList).forEach(list => {
                list.innerHTML = '<li class="no-score">Kunne ikke laste</li>';
            });
        }
    }

    async function lagreScoreTilDatabase(playerName, time, level) {
        const formData = new FormData();
        formData.append('spiller_navn', playerName || 'Anonym'); 
        formData.append('time_seconds', time);
        formData.append('level', level); // Sender 'easy', 'medium', eller 'hard'

        try {
            await fetch(addScoreURL, { method: 'POST', body: formData });
            console.log("Highscore lagret!");
            await visHighscoresFraDatabase(); // Oppdater listene
        } catch (error) {
            console.error("Kunne ikke lagre highscore:", error);
        }
    }

    // --- Start spillet ---
    initGame(); 

});
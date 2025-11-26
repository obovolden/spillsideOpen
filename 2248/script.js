// ===================================================================
// SEKSJON 1: KONSTANTER OG HJELPEFUNKSJONER
// ===================================================================

const COLS = 5;
const GAP = 6; 

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 10000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

document.addEventListener('DOMContentLoaded', () => {
    
    // DOM Elementer
    const gridEl = document.getElementById('grid-element');
    const scoreEl = document.getElementById('score-display');
    const bestScoreEl = document.getElementById('best-score-display');
    const canvas = document.getElementById('connector-canvas');
    const modal = document.getElementById('highscore-modal');
    const finalScoreEl = document.getElementById('final-score');
    const nameInput = document.getElementById('player-name');
    const apiStatus = document.getElementById('api-status');
    const previewContainer = document.getElementById('preview-container');
    const previewValueEl = document.getElementById('preview-value');
    const leaderboardList = document.getElementById('leaderboard-list');

    // Skjermer og Modaler
    const startScreen = document.getElementById('start-screen');
    const restartModal = document.getElementById('restart-modal');
    const resumeModal = document.getElementById('resume-modal');

    // Knapper
    const btnSaveMenu = document.getElementById('btn-save-menu');
    const btnResetCurrent = document.getElementById('btn-reset-current');
    const btnCancelRestart = document.getElementById('btn-cancel-restart');
    
    const btnResumeGame = document.getElementById('btn-resume-game');
    const btnNewGameOverride = document.getElementById('btn-new-game-override');
    const btnCancelResume = document.getElementById('btn-cancel-resume');

    let containerRect = gridEl.getBoundingClientRect();
    let currentRows = 7; 

    // ===================================================================
    // SEKSJON 2: LOGIKK KLASSE
    // ===================================================================

    class Game2248 {
        constructor() {
            this.board = []; 
            this.tileElements = {}; 
            this.nextTileId = 1; 
            this.score = 0;
            this.bestScore = parseInt(localStorage.getItem('2248_global_best')) || 0;
            this.path = [];
            this.isDragging = false;
            this.currentMode = 'medium'; 
            this.pendingMode = null; 

            document.documentElement.style.setProperty('--rows', currentRows);
            this.updateBestScoreUI();
            this.loadLeaderboard(); 
        }
        
        startGame(mode) {
            const savedJson = localStorage.getItem(`2248_save_${mode}`);
            if (savedJson) {
                this.pendingMode = mode;
                resumeModal.style.display = 'flex';
            } else {
                this.startActualGame(mode, false);
            }
        }

        startActualGame(mode, shouldLoad) {
            this.currentMode = mode;
            
            if (mode === 'easy') currentRows = 8;
            else if (mode === 'medium') currentRows = 7;
            else if (mode === 'hard') currentRows = 6;
            
            document.documentElement.style.setProperty('--rows', currentRows);
            startScreen.classList.add('start-hidden');
            
            if (shouldLoad) {
                const loaded = this.loadGame(mode);
                if (!loaded) this.initNewGame();
                else this.updateUI();
            } else {
                this.clearSave(mode);
                this.initNewGame();
            }
        }

        initNewGame() {
            this.board = Array(COLS * currentRows).fill(null);
            gridEl.innerHTML = '';
            this.tileElements = {};
            this.score = 0;
            this.nextTileId = 1;
            
            let initialValues = [];
            const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
            const totalSlots = COLS * currentRows;
            
            // Variert startoppsett
            const numHigh = randInt(2, 4); 
            const numMid = randInt(5, 8);  
            
            for(let i=0; i<numHigh; i++) initialValues.push(64); 
            for(let i=0; i<randInt(3, 5); i++) initialValues.push(32);
            for(let i=0; i<numMid; i++) initialValues.push(16);
            for(let i=0; i<numMid; i++) initialValues.push(8);

            const slotsRemaining = totalSlots - initialValues.length;
            
            for(let i=0; i<slotsRemaining; i++) {
                const r = Math.random();
                if (r < 0.30) initialValues.push(2);       
                else if (r < 0.65) initialValues.push(4);  
                else initialValues.push(8);                
            }

            for (let i = initialValues.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [initialValues[i], initialValues[j]] = [initialValues[j], initialValues[i]];
            }

            for (let i = 0; i < this.board.length; i++) {
                const val = initialValues[i] || 2;
                this.board[i] = this.createTileData(val);
            }

            this.path = [];
            this.isDragging = false;
            this.saveGame();
            this.updateUI();
        }

        requestBackToMenu() { restartModal.style.display = 'flex'; }

        goToMenu() {
            this.saveGame(); 
            restartModal.style.display = 'none';
            modal.style.display = 'none'; 
            startScreen.classList.remove('start-hidden'); 
        }

        createTileData(val) { return { id: this.nextTileId++, val: val, toRemove: false }; }
        
        saveGame() {
            const state = {
                board: this.board,
                score: this.score,
                nextTileId: this.nextTileId,
                rows: currentRows
            };
            localStorage.setItem(`2248_save_${this.currentMode}`, JSON.stringify(state));
            
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                localStorage.setItem('2248_global_best', this.bestScore);
                this.updateBestScoreUI();
            }
        }

        loadGame(mode) {
            const savedJson = localStorage.getItem(`2248_save_${mode}`);
            if (!savedJson) return false;
            try {
                const state = JSON.parse(savedJson);
                if (state.rows !== currentRows) return false;
                this.board = state.board;
                this.score = state.score;
                this.nextTileId = state.nextTileId;
                gridEl.innerHTML = '';
                this.tileElements = {};
                return true;
            } catch (e) { return false; }
        }
        
        clearSave(modeInput) {
            const mode = modeInput || this.currentMode;
            localStorage.removeItem(`2248_save_${mode}`);
        }

        // --- ENDRING: Mer aggressiv økning + bedre fordeling ---
        spawnRefillValue() {
            let maxOnBoard = 2;
            const activeTiles = this.board.filter(t => t !== null);
            if (activeTiles.length) maxOnBoard = Math.max(...activeTiles.map(t => t.val));

            let minVal = 2;
            // Øk minste verdi raskere enn før
            if (maxOnBoard >= 256) minVal = 4;
            if (maxOnBoard >= 2048) minVal = 8; 
            if (maxOnBoard >= 8192) minVal = 16;
            if (maxOnBoard >= 32768) minVal = 32;
            
            const pool = [];
            // NY FORDELING:
            // 20% sjanse for laveste verdi (F.eks 2)
            // 40% sjanse for nivå 2 (F.eks 4) - Dette øker tempoet
            // 30% sjanse for nivå 3 (F.eks 8)
            // 10% sjanse for nivå 4 (F.eks 16)
            
            for(let i=0; i<20; i++) pool.push(minVal); 
            for(let i=0; i<40; i++) pool.push(minVal * 2);
            for(let i=0; i<30; i++) pool.push(minVal * 4);
            for(let i=0; i<10; i++) pool.push(minVal * 8);

            return pool[Math.floor(Math.random() * pool.length)];
        }

        async checkAndExplodeLowNumbers(createdValue) {
            let targetToRemove = 0;
            if (createdValue === 1024) targetToRemove = 2;
            else if (createdValue === 2048) targetToRemove = 4;
            else if (createdValue === 4096) targetToRemove = 8;
            else if (createdValue >= 8192) targetToRemove = 16;

            if (targetToRemove === 0) return false;

            let tilesToRemove = [];
            this.board.forEach((tile, idx) => {
                if (tile && tile.val === targetToRemove) {
                    tilesToRemove.push({ tileObj: tile, idx: idx });
                }
            });

            if (tilesToRemove.length === 0) return false;

            tilesToRemove.forEach(item => {
                const el = this.tileElements[item.tileObj.id];
                if (el) el.classList.add('exploding');
            });

            await new Promise(resolve => setTimeout(resolve, 400));
            tilesToRemove.forEach(item => { this.board[item.idx] = null; });
            return true; 
        }

        calculateTotalSum(pathIndices) {
            if (!pathIndices || pathIndices.length === 0) return 0;
            return pathIndices.reduce((sum, idx) => sum + this.board[idx].val, 0);
        }

        isValidMove(currentIndex, nextIndex) {
            if (this.path.includes(nextIndex)) return false;

            const c1 = this.getCoords(currentIndex);
            const c2 = this.getCoords(nextIndex);
            const dx = Math.abs(c1.x - c2.x);
            const dy = Math.abs(c1.y - c2.y);
            
            if (dx > 1 || dy > 1) return false;

            const nextVal = this.board[nextIndex].val;
            const currentVal = this.board[currentIndex].val;
            
            if (nextVal === currentVal) return true;
            if (nextVal === currentVal * 2) {
                const totalSum = this.calculateTotalSum(this.path);
                if (totalSum >= nextVal) return true;
            }
            return false; 
        }

        normalizeToPowerOf2(sum) {
            if (sum < 2) return 2;
            const power = Math.ceil(Math.log2(sum));
            return Math.pow(2, power);
        }

        async finalizeMove() {
            if (this.path.length < 2) {
                this.clearPath();
                return;
            }

            const rawSum = this.calculateTotalSum(this.path);
            const finalValue = this.normalizeToPowerOf2(rawSum);

            const lastIndex = this.path[this.path.length - 1];
            const targetTile = this.board[lastIndex];

            const turnScore = finalValue;
            this.score += turnScore;
            
            this.path.forEach(idx => {
                if (idx !== lastIndex) this.board[idx] = null; 
            });

            targetTile.val = finalValue;
            this.path = [];
            this.updateUI();
            canvas.innerHTML = ''; 

            await this.checkAndExplodeLowNumbers(finalValue);
            this.applyGravityAndSpawn();
            
            this.saveGame(); 
            this.updateUI();

            setTimeout(() => {
                if (this.isGameOver()) this.showGameOver();
            }, 300);
        }

        applyGravityAndSpawn() {
            for (let x = 0; x < COLS; x++) {
                let columnTiles = [];
                for (let y = 0; y < currentRows; y++) {
                    let idx = this.getIndex(x, y);
                    if (this.board[idx] !== null) columnTiles.push(this.board[idx]);
                }
                let missingCount = currentRows - columnTiles.length;
                let newTiles = [];
                for (let i = 0; i < missingCount; i++) {
                    let newVal = this.spawnRefillValue();
                    let tileData = this.createTileData(newVal);
                    tileData.isNew = true; 
                    tileData.startOffset = missingCount - i; 
                    newTiles.push(tileData);
                }
                const newColumnStructure = [...newTiles, ...columnTiles];
                for (let y = 0; y < currentRows; y++) {
                    let idx = this.getIndex(x, y);
                    this.board[idx] = newColumnStructure[y];
                }
            }
        }
        
        getCoords(index) { return { x: index % COLS, y: Math.floor(index / COLS) }; }
        getIndex(x, y) { if (x < 0 || x >= COLS || y < 0 || y >= currentRows) return -1; return y * COLS + x; }
        
        clearPath() {
            this.path = [];
            this.renderPathLines();
            this.renderTiles();
            previewContainer.classList.add('preview-hidden');
        }

        isGameOver() {
            for (let i = 0; i < this.board.length; i++) {
                if (!this.board[i]) continue;
                const val = this.board[i].val;
                const c = this.getCoords(i);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nIdx = this.getIndex(c.x + dx, c.y + dy);
                        if (nIdx !== -1 && this.board[nIdx]) {
                            if (this.board[nIdx].val === val || this.board[nIdx].val === val * 2) return false;
                        }
                    }
                }
            }
            return true;
        }

        loadLeaderboard() {
            leaderboardList.innerHTML = '<li>Laster toppliste...</li>';
            fetch('api/get_leaderboard.php')
                .then(response => response.json())
                .then(data => {
                    leaderboardList.innerHTML = '';
                    if (!data || data.length === 0) {
                        leaderboardList.innerHTML = '<li>Ingen scores enda</li>';
                        return;
                    }
                    data.forEach(entry => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span class="name">${entry.player_name}</span> <span class="score">${formatNumber(entry.score)}</span>`;
                        leaderboardList.appendChild(li);
                    });
                })
                .catch(error => {
                    leaderboardList.innerHTML = '<li>Feil ved lasting</li>';
                });
        }

        submitHighscore() {
            const name = nameInput.value.trim();
            if (!name) return;
            apiStatus.innerText = "Sender til server...";
            const payload = { player_name: name, score: this.score };
            fetch('api/save_score.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    apiStatus.innerText = "Score lagret!";
                    apiStatus.style.color = "#50e3c2";
                    this.clearSave(); 
                    this.loadLeaderboard();
                    setTimeout(() => { this.goToMenu(); }, 1500);
                } else {
                    apiStatus.innerText = "Feil ved lagring";
                }
            })
            .catch(error => {
                apiStatus.innerText = "Nettverksfeil";
            });
        }

        updateBestScoreUI() { bestScoreEl.innerText = formatNumber(this.bestScore); }

        updateUI() {
            scoreEl.innerText = formatNumber(this.score);
            if (this.path.length > 1) {
                const rawSum = this.calculateTotalSum(this.path);
                const finalVal = this.normalizeToPowerOf2(rawSum);
                previewValueEl.innerText = formatNumber(finalVal);
                previewValueEl.style.color = this.getColorForValue(finalVal);
                previewContainer.classList.remove('preview-hidden');
            } else {
                previewContainer.classList.add('preview-hidden');
            }
            this.renderTiles();
            this.renderPathLines();
        }

        getColorForValue(val) {
            const colors = {
                2:  '#ff7675', 4:  '#74b9ff', 8:  '#ffeaa7', 
                16: '#55efc4', 32: '#a29bfe', 64: '#fd79a8', 
                128:'#fab1a0', 256:'#81ecec', 512:'#dfe6e9', 
            };
            if (colors[val]) return colors[val];
            const logVal = Math.log2(val);
            const hue = (logVal * 35) % 360; 
            return `hsl(${hue}, 60%, 75%)`; 
        }

        renderTiles() {
            const activeIds = new Set();
            const tileW = (containerRect.width - (GAP * (COLS + 1))) / COLS;
            const tileH = (containerRect.height - (GAP * (currentRows + 1))) / currentRows;

            this.board.forEach((tile, idx) => {
                if (!tile) return;
                activeIds.add(tile.id);
                let el = this.tileElements[tile.id];
                
                const coords = this.getCoords(idx);
                const x = GAP + coords.x * (tileW + GAP);
                const y = GAP + coords.y * (tileH + GAP);

                if (!el) {
                    el = document.createElement('button');
                    el.type = 'button';
                    el.className = 'tile';
                    el.dataset.id = tile.id;
                    gridEl.appendChild(el);
                    this.tileElements[tile.id] = el;
                    
                    if (tile.isNew) {
                         const startY = -tileH * (tile.startOffset || 1) - 20; 
                         el.style.width = `${tileW}px`;
                         el.style.height = `${tileH}px`;
                         el.style.transform = `translate(${x}px, ${startY}px)`; 
                         el.style.backgroundColor = this.getColorForValue(tile.val);
                         el.innerText = formatNumber(tile.val); 
                         void el.offsetWidth; 
                         tile.isNew = false; 
                    }
                }

                // --- ENDRING: Dynamisk skriftstørrelse ---
                let displayVal = formatNumber(tile.val);
                if (el.innerText != displayVal) {
                    el.innerText = displayVal;
                    el.style.backgroundColor = this.getColorForValue(tile.val);
                }

                // Sett fontstørrelse basert på verdi
                if (tile.val >= 1000 && tile.val < 10000) {
                    el.style.fontSize = '1.5rem'; // Mindre for 1024-9999
                } else if (tile.val >= 10000) {
                    el.style.fontSize = '1.3rem'; // For sikkerhets skyld på 10k+
                } else {
                    el.style.fontSize = '2rem'; // Standard
                }

                el.style.width = `${tileW}px`;
                el.style.height = `${tileH}px`;
                el.style.transform = `translate(${x}px, ${y}px)`;
                
                if (this.path.includes(idx)) {
                    el.classList.add('selected');
                    el.style.transform += ` scale(0.9)`;
                } else {
                    el.classList.remove('selected');
                }
            });

            for (const id in this.tileElements) {
                if (!activeIds.has(parseInt(id))) {
                    this.tileElements[id].remove();
                    delete this.tileElements[id];
                }
            }
        }

        renderPathLines() {
            canvas.innerHTML = '';
            if (this.path.length < 2) return;
            
            const tileW = (containerRect.width - (GAP * (COLS + 1))) / COLS;
            const tileH = (containerRect.height - (GAP * (currentRows + 1))) / currentRows;
            
            let points = "";
            this.path.forEach(idx => {
                const coords = this.getCoords(idx);
                const x = GAP + coords.x * (tileW + GAP) + tileW / 2;
                const y = GAP + coords.y * (tileH + GAP) + tileH / 2;
                points += `${x},${y} `;
            });
            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute("points", points.trim());
            polyline.setAttribute("fill", "none");
            polyline.setAttribute("stroke", "rgba(255, 255, 255, 0.8)");
            polyline.setAttribute("stroke-width", "6");
            polyline.setAttribute("stroke-linecap", "round");
            polyline.setAttribute("stroke-linejoin", "round");
            canvas.appendChild(polyline);
        }
        
        showGameOver() {
            finalScoreEl.innerText = formatNumber(this.score);
            modal.style.display = 'flex';
        }
        
        getBestCandidate(touchX, touchY, currentPathIdx) {
            const tileW = (containerRect.width - (GAP * (COLS + 1))) / COLS;
            const tileH = (containerRect.height - (GAP * (currentRows + 1))) / currentRows;
            
            // Beholder den strenge magnet-snapen (40%)
            const snapDist = Math.max(tileW, tileH) * 0.40; 

            let bestIdx = -1;
            let minDist = Infinity;

            const c = this.getCoords(currentPathIdx);
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const neighborIdx = this.getIndex(c.x + dx, c.y + dy);
                    
                    if (neighborIdx !== -1 && this.board[neighborIdx]) {
                        if (this.isValidMove(currentPathIdx, neighborIdx)) {
                            
                            const nc = this.getCoords(neighborIdx);
                            const nCenterX = containerRect.left + GAP + nc.x * (tileW + GAP) + tileW / 2;
                            const nCenterY = containerRect.top + GAP + nc.y * (tileH + GAP) + tileH / 2;
                            const dist = Math.hypot(touchX - nCenterX, touchY - nCenterY);
                            
                            if (dist < minDist && dist < snapDist) {
                                minDist = dist;
                                bestIdx = neighborIdx;
                            }
                        }
                    }
                }
            }
            return bestIdx;
        }

        getClosestTileGlobal(touchX, touchY) {
            const tileW = (containerRect.width - (GAP * (COLS + 1))) / COLS;
            const tileH = (containerRect.height - (GAP * (currentRows + 1))) / currentRows;
            let bestIdx = -1;
            let minDist = Infinity;
            const snapDist = Math.max(tileW, tileH) * 0.5;

            this.board.forEach((tile, idx) => {
                if(!tile) return;
                const c = this.getCoords(idx);
                const cx = containerRect.left + GAP + c.x * (tileW + GAP) + tileW / 2;
                const cy = containerRect.top + GAP + c.y * (tileH + GAP) + tileH / 2;
                const dist = Math.hypot(touchX - cx, touchY - cy);
                if (dist < minDist && dist < snapDist) {
                    minDist = dist;
                    bestIdx = idx;
                }
            });
            return bestIdx;
        }
    }

    // ===================================================================
    // SEKSJON 3: INPUT OG EVENT HANDLERS
    // ===================================================================
    
    const game = new Game2248();

    function getPointerPos(e) {
        if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        else if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        else return { x: e.clientX, y: e.clientY };
    }

    const handleStart = (e) => {
        if(e.cancelable && e.target.closest('#game-container')) e.preventDefault();
        
        const pos = getPointerPos(e);
        const idx = game.getClosestTileGlobal(pos.x, pos.y);
        
        if (idx !== -1 && game.board[idx]) {
            game.isDragging = true;
            game.path = [idx];
            game.updateUI();
        }
    };

    const handleMove = (e) => {
        if (!game.isDragging) return;
        if(e.cancelable) e.preventDefault();
        
        const pos = getPointerPos(e);
        const lastIdx = game.path[game.path.length - 1];

        if (game.path.length > 1) {
            const prevIdx = game.path[game.path.length - 2];
            const c = game.getCoords(prevIdx);
            const tileW = (containerRect.width - (GAP * (COLS + 1))) / COLS;
            const tileH = (containerRect.height - (GAP * (currentRows + 1))) / currentRows;
            const cx = containerRect.left + GAP + c.x * (tileW + GAP) + tileW / 2;
            const cy = containerRect.top + GAP + c.y * (tileH + GAP) + tileH / 2;
            const dist = Math.hypot(pos.x - cx, pos.y - cy);
            
            if (dist < Math.max(tileW, tileH) * 0.5) {
                game.path.pop();
                game.updateUI();
                return;
            }
        }

        const bestCandidate = game.getBestCandidate(pos.x, pos.y, lastIdx);
        
        if (bestCandidate !== -1 && bestCandidate !== lastIdx) {
            game.path.push(bestCandidate);
            game.updateUI();
        }
    };

    const handleEnd = (e) => {
        if (!game.isDragging) return;
        game.isDragging = false;
        game.finalizeMove();
    };

    gridEl.addEventListener('mousedown', handleStart);
    gridEl.addEventListener('touchstart', handleStart, {passive: false});
    window.addEventListener('mousemove', handleMove, {passive: false});
    window.addEventListener('touchmove', handleMove, {passive: false});
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    btnSaveMenu.addEventListener('click', () => { game.goToMenu(); });
    btnResetCurrent.addEventListener('click', () => {
        restartModal.style.display = 'none';
        game.clearSave(); 
        game.initNewGame(); 
    });
    btnCancelRestart.addEventListener('click', () => { restartModal.style.display = 'none'; });

    btnResumeGame.addEventListener('click', () => {
        resumeModal.style.display = 'none';
        if (game.pendingMode) game.startActualGame(game.pendingMode, true);
    });
    btnNewGameOverride.addEventListener('click', () => {
        resumeModal.style.display = 'none';
        if (game.pendingMode) game.startActualGame(game.pendingMode, false);
    });
    btnCancelResume.addEventListener('click', () => {
        resumeModal.style.display = 'none';
        game.pendingMode = null;
    });
    
    window.addEventListener('resize', () => { 
        containerRect = gridEl.getBoundingClientRect();
        game.updateUI(); 
    });
    
    window.game = game;
});
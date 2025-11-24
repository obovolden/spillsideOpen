// ===================================================================
// SEKSJON 1: KONSTANTER OG ELEMENTER
// ===================================================================

const COLS = 5;
const ROWS = 7;
const GAP = 6; 

document.addEventListener('DOMContentLoaded', () => {
    
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

    // Elementer for restart-modal
    const restartModal = document.getElementById('restart-modal');
    const btnConfirmRestart = document.getElementById('btn-confirm-restart');
    const btnCancelRestart = document.getElementById('btn-cancel-restart');
    const currentScoreWarning = document.getElementById('current-score-warning');

    let containerRect = gridEl.getBoundingClientRect();

    // ===================================================================
    // SEKSJON 2: SPILL-LOGIKK OG TILSTAND
    // ===================================================================

    class Game2248 {
        constructor() {
            this.board = []; 
            this.tileElements = {}; 
            this.nextTileId = 1; 
            this.score = 0;
            this.bestScore = parseInt(localStorage.getItem('2248_best_score')) || 0;
            this.path = [];
            this.isDragging = false;
            
            this.updateBestScoreUI();
            this.loadLeaderboard(); // Laster nå fra PHP
            this.init();
        }

        init() {
            this.board = Array(COLS * ROWS).fill(null);
            gridEl.innerHTML = '';
            this.tileElements = {};
            this.score = 0;
            
            let initialValues = [];
            const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

            const num128 = randInt(1, 3);
            const num64  = randInt(2, 5);
            const num32  = randInt(3, 8);
            const num16  = randInt(4, 10);

            for(let i=0; i<num128; i++) initialValues.push(128);
            for(let i=0; i<num64; i++)  initialValues.push(64);
            for(let i=0; i<num32; i++)  initialValues.push(32);
            for(let i=0; i<num16; i++)  initialValues.push(16);

            const slotsRemaining = (COLS * ROWS) - initialValues.length;
            for(let i=0; i<slotsRemaining; i++) {
                const r = Math.random();
                if (r < 0.45) initialValues.push(2);
                else if (r < 0.75) initialValues.push(4);
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
            this.updateUI();
        }

        // Ny restart metode som sjekker om vi trenger bekreftelse
        restart() {
            if (this.score === 0) {
                this.performRestart();
            } else {
                currentScoreWarning.innerText = this.score;
                restartModal.style.display = 'flex';
            }
        }

        // Utfører selve restartingen
        performRestart() {
            this.init();
            modal.style.display = 'none';
            restartModal.style.display = 'none';
            apiStatus.innerText = "";
            nameInput.value = "";
        }

        createTileData(val) {
            return { id: this.nextTileId++, val: val, toRemove: false };
        }

        spawnRefillValue() {
            let maxOnBoard = 2;
            const activeTiles = this.board.filter(t => t !== null);
            if (activeTiles.length) maxOnBoard = Math.max(...activeTiles.map(t => t.val));

            let minVal = 2;
            if (maxOnBoard >= 512) minVal = 4;
            if (maxOnBoard >= 2048) minVal = 8;
            if (maxOnBoard >= 8192) minVal = 16;
            if (maxOnBoard >= 32768) minVal = 32; 

            let maxSpawnCap = Math.max(minVal * 4, maxOnBoard / 64);
            const pool = [];
            
            for(let i=0; i<50; i++) pool.push(minVal); 
            for(let i=0; i<30; i++) pool.push(minVal * 2);
            for(let i=0; i<15; i++) pool.push(minVal * 4);
            for(let i=0; i<8; i++) pool.push(minVal * 8);
            for(let i=0; i<4; i++) pool.push(minVal * 16);

            if ((minVal * 32) <= Math.max(maxOnBoard, 64)) {
                for(let i=0; i<2; i++) pool.push(minVal * 32);
            }
            if ((minVal * 64) <= Math.max(maxOnBoard, 128)) {
                pool.push(minVal * 64);
            }

            return pool[Math.floor(Math.random() * pool.length)];
        }

        async checkAndExplodeLowNumbers(createdValue) {
            let targetToRemove = 0;
            if (createdValue === 1024) targetToRemove = 2;
            else if (createdValue === 4096) targetToRemove = 4;
            else if (createdValue === 16384) targetToRemove = 8;
            else if (createdValue === 65536) targetToRemove = 16;

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

            tilesToRemove.forEach(item => {
                this.board[item.idx] = null;
            });

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

        async finalizeMove() {
            if (this.path.length < 2) {
                this.clearPath();
                return;
            }

            const rawSum = this.calculateTotalSum(this.path);
            const finalValue = this.normalizeToPowerOf2(rawSum);

            const lastIndex = this.path[this.path.length - 1];
            const targetTile = this.board[lastIndex];

            const turnScore = finalValue * this.path.length;
            this.score += turnScore;
            
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                localStorage.setItem('2248_best_score', this.bestScore);
                this.updateBestScoreUI();
            }

            this.path.forEach(idx => {
                if (idx !== lastIndex) this.board[idx] = null; 
            });

            targetTile.val = finalValue;
            
            this.path = [];
            this.updateUI();
            canvas.innerHTML = ''; 

            const didExplode = await this.checkAndExplodeLowNumbers(finalValue);

            this.applyGravityAndSpawn();
            this.updateUI();

            setTimeout(() => {
                if (this.isGameOver()) this.showGameOver();
            }, 300);
        }
        
        normalizeToPowerOf2(sum) {
            if (sum < 2) return 2;
            const power = Math.floor(Math.log2(sum));
            return Math.pow(2, power);
        }

        applyGravityAndSpawn() {
            for (let x = 0; x < COLS; x++) {
                let columnTiles = [];
                for (let y = 0; y < ROWS; y++) {
                    let idx = this.getIndex(x, y);
                    if (this.board[idx] !== null) columnTiles.push(this.board[idx]);
                }
                let missingCount = ROWS - columnTiles.length;
                let newTiles = [];
                for (let i = 0; i < missingCount; i++) {
                    let newVal = this.spawnRefillValue();
                    let tileData = this.createTileData(newVal);
                    tileData.isNew = true; 
                    tileData.startOffset = missingCount - i; 
                    newTiles.push(tileData);
                }
                const newColumnStructure = [...newTiles, ...columnTiles];
                for (let y = 0; y < ROWS; y++) {
                    let idx = this.getIndex(x, y);
                    this.board[idx] = newColumnStructure[y];
                }
            }
        }
        
        getCoords(index) { return { x: index % COLS, y: Math.floor(index / COLS) }; }
        getIndex(x, y) { if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return -1; return y * COLS + x; }
        
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
                            if (this.board[nIdx].val === val) return false;
                        }
                    }
                }
            }
            return true;
        }

        // EKTE LEADERBOARD HENTING
        loadLeaderboard() {
            leaderboardList.innerHTML = '<li>Laster toppliste...</li>';

            fetch('get_leaderboard.php')
                .then(response => response.json())
                .then(data => {
                    leaderboardList.innerHTML = '';
                    if (!data || data.length === 0) {
                        leaderboardList.innerHTML = '<li>Ingen scores enda</li>';
                        return;
                    }
                    
                    data.forEach(entry => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span class="name">${entry.player_name}</span> <span class="score">${entry.score}</span>`;
                        leaderboardList.appendChild(li);
                    });
                })
                .catch(error => {
                    console.error('Feil ved lasting av leaderboard:', error);
                    leaderboardList.innerHTML = '<li>Feil ved lasting</li>';
                });
        }

        // EKTE HIGHSCORE LAGRING
        submitHighscore() {
            const name = nameInput.value.trim();
            if (!name) return;
            apiStatus.innerText = "Sender til server...";
            
            const payload = {
                player_name: name,
                score: this.score
            };

            fetch('save_score.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    apiStatus.innerText = "Score lagret!";
                    apiStatus.style.color = "#50e3c2";
                    this.loadLeaderboard();
                    setTimeout(() => { this.performRestart(); }, 1500);
                } else {
                    apiStatus.innerText = "Feil: " + (data.message || "Ukjent feil");
                    apiStatus.style.color = "#ff4757";
                }
            })
            .catch(error => {
                console.error('API error:', error);
                apiStatus.innerText = "Tilkoblingsfeil";
                apiStatus.style.color = "#ff4757";
            });
        }

        updateBestScoreUI() {
            bestScoreEl.innerText = this.bestScore;
        }

        updateUI() {
            scoreEl.innerText = this.score;
            
            if (this.path.length > 1) {
                const rawSum = this.calculateTotalSum(this.path);
                const finalVal = this.normalizeToPowerOf2(rawSum);
                
                previewValueEl.innerText = finalVal;
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
            const tileH = (containerRect.height - (GAP * (ROWS + 1))) / ROWS;

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
                         el.innerText = tile.val;
                         void el.offsetWidth; 
                         tile.isNew = false; 
                    }
                }

                if (el.innerText != tile.val) {
                    el.innerText = tile.val;
                    el.style.backgroundColor = this.getColorForValue(tile.val);
                    el.animate([
                        { transform: el.style.transform + ' scale(1)' },
                        { transform: el.style.transform + ' scale(1.2)' },
                        { transform: el.style.transform + ' scale(1)' }
                    ], { duration: 150 }); 
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
            const tileH = (containerRect.height - (GAP * (ROWS + 1))) / ROWS;
            
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
            finalScoreEl.innerText = this.score;
            modal.style.display = 'flex';
        }
        
        findBestNeighbor(currentIdx, touchX, touchY) {
            const currentCoords = this.getCoords(currentIdx);
            const tileW = (containerRect.width - (GAP * (COLS + 1))) / COLS;
            const tileH = (containerRect.height - (GAP * (ROWS + 1))) / ROWS;
            
            const centerX = containerRect.left + GAP + currentCoords.x * (tileW + GAP) + tileW / 2;
            const centerY = containerRect.top + GAP + currentCoords.y * (tileH + GAP) + tileH / 2;
            const distFromCenter = Math.hypot(touchX - centerX, touchY - centerY);
            
            if (distFromCenter < Math.min(tileW, tileH) * 0.15) {
                return -1; 
            }

            let bestIdx = -1;
            let minDistance = Infinity;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = currentCoords.x + dx;
                    const ny = currentCoords.y + dy;
                    const nIdx = this.getIndex(nx, ny);
                    
                    if (nIdx !== -1 && this.board[nIdx]) {
                        const nCenterX = containerRect.left + GAP + nx * (tileW + GAP) + tileW / 2;
                        const nCenterY = containerRect.top + GAP + ny * (tileH + GAP) + tileH / 2;
                        
                        const dist = Math.hypot(touchX - nCenterX, touchY - nCenterY);
                        
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestIdx = nIdx;
                        }
                    }
                }
            }
            return bestIdx;
        }
    }

    // ===================================================================
    // SEKSJON 3: BRUKERINTERAKSJON
    // ===================================================================
    
    const game = new Game2248();

    function getPointerPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        } else {
            return { x: e.clientX, y: e.clientY };
        }
    }

    function getIndexFromTouch(clientX, clientY) {
        if (clientX < containerRect.left || clientX > containerRect.right || 
            clientY < containerRect.top || clientY > containerRect.bottom) return -1;
        
        const tileW = (containerRect.width - (GAP * (COLS + 1))) / COLS;
        const tileH = (containerRect.height - (GAP * (ROWS + 1))) / ROWS;
        const totalCellW = tileW + GAP;
        const totalCellH = tileH + GAP;
        
        const x = Math.floor((clientX - containerRect.left - GAP) / totalCellW);
        const y = Math.floor((clientY - containerRect.top - GAP) / totalCellH);
        
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) return y * COLS + x;
        return -1;
    }

    const handleStart = (e) => {
        if(e.cancelable && e.target.closest('#game-container')) e.preventDefault();
        
        const pos = getPointerPos(e);
        const idx = getIndexFromTouch(pos.x, pos.y);
        
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

        const currentHoverIdx = getIndexFromTouch(pos.x, pos.y);
        if (game.path.length > 1 && currentHoverIdx === game.path[game.path.length - 2]) {
            game.path.pop();
            game.updateUI();
            return;
        }

        const bestNeighborIdx = game.findBestNeighbor(lastIdx, pos.x, pos.y);
        
        if (bestNeighborIdx !== -1) {
            if (game.isValidMove(lastIdx, bestNeighborIdx)) {
                game.path.push(bestNeighborIdx);
                game.updateUI();
            }
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

    // EVENT LISTENER FOR KNAPPER I RESTART MODAL
    btnConfirmRestart.addEventListener('click', () => {
        game.performRestart();
    });

    btnCancelRestart.addEventListener('click', () => {
        restartModal.style.display = 'none';
    });
    
    window.addEventListener('resize', () => { 
        containerRect = gridEl.getBoundingClientRect();
        game.updateUI(); 
    });
    
    window.game = game;
});
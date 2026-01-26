/* --- SECTION: STATE MANAGEMENT --- */
let config = {
    p1Name: "Spiller 1",
    p2Name: "Spiller 2",
    winningScore: 11,
    leagueCode: "",
    startingServer: 'p1'
};

let gameState = {
    p1Score: 0,
    p2Score: 0,
    isGameOver: false
};

// DOM Elements
const p1ScoreEl = document.getElementById('p1-score');
const p2ScoreEl = document.getElementById('p2-score');
const p1ServeEl = document.getElementById('p1-serve');
const p2ServeEl = document.getElementById('p2-serve');

/* --- SECTION: SETUP & INIT --- */

// Kjør når siden lastes
window.addEventListener('DOMContentLoaded', () => {
    // 1. Last inn historikk fra DB
    fetchHistory();

    // 2. Sjekk LocalStorage for sist brukte navn og liga
    const lastP1 = localStorage.getItem('lastP1');
    const lastP2 = localStorage.getItem('lastP2');
    const lastLeague = localStorage.getItem('lastLeague');

    if (lastP1) document.getElementById('p1-name-input').value = lastP1;
    if (lastP2) document.getElementById('p2-name-input').value = lastP2;
    if (lastLeague) document.getElementById('league-code').value = lastLeague;
});

function adjustSetting(type, val) {
    if (type === 'score') {
        const input = document.getElementById('winning-score-display');
        let current = parseInt(input.value) || 0; 
        let newVal = current + val;
        if (newVal >= 1 && newVal <= 99) {
            input.value = newVal;
        }
    }
}

/**
 * Felles funksjon for å bytte mellom "Velg fra liste" og "Skriv nytt"
 * @param {string} type - 'league', 'p1' eller 'p2'
 * @param {string} mode - 'new' (input) eller 'history' (select)
 */
function toggleMode(type, mode) {
    const selectWrapper = document.getElementById(`${type}-select-wrapper`);
    const inputWrapper = document.getElementById(`${type}-input-wrapper`);
    const backBtn = document.getElementById(`${type}-back-btn`);
    const inputEl = type === 'league' ? document.getElementById('league-code') : document.getElementById(`${type}-name-input`);
    const selectEl = document.getElementById(`${type}-select`);

    if (mode === 'new') {
        // Vis inputfelt, skjul dropdown
        selectWrapper.style.display = 'none';
        inputWrapper.style.display = 'flex';
        
        // Vis "tilbake til liste"-knapp HVIS det finnes historikk
        if (selectEl.options.length > 1) {
            backBtn.style.display = 'flex';
        }
        
        inputEl.focus();
    } else {
        // Vis dropdown, skjul inputfelt
        selectWrapper.style.display = 'flex';
        inputWrapper.style.display = 'none';
    }
}

// Koble select-valg til input-feltet automatisk
function bindSelectToInput(type) {
    const selectEl = document.getElementById(`${type}-select`);
    const inputEl = type === 'league' ? document.getElementById('league-code') : document.getElementById(`${type}-name-input`);

    selectEl.addEventListener('change', function() {
        inputEl.value = this.value;
    });
}

// Initialiser lyttere
bindSelectToInput('league');
bindSelectToInput('p1');
bindSelectToInput('p2');


document.getElementById('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    config.p1Name = document.getElementById('p1-name-input').value;
    config.p2Name = document.getElementById('p2-name-input').value;
    
    // Henter vinnerscore
    config.winningScore = parseInt(document.getElementById('winning-score-display').value);
    if(!config.winningScore || config.winningScore < 1) config.winningScore = 11;

    // Henter ligakode
    config.leagueCode = document.getElementById('league-code').value;
    config.startingServer = document.getElementById('first-server').value;

    // LAGRE TIL LOCALSTORAGE
    localStorage.setItem('lastP1', config.p1Name);
    localStorage.setItem('lastP2', config.p2Name);
    if(config.leagueCode) localStorage.setItem('lastLeague', config.leagueCode);

    document.getElementById('p1-name').innerText = config.p1Name;
    document.getElementById('p2-name').innerText = config.p2Name;

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    updateServeIndicator();
});

/* --- SECTION: POINTER EVENTS (TOUCH & MOUSE) --- */
let startY = 0;
let endY = 0;
const SWIPE_THRESHOLD = 50;
const TAP_THRESHOLD = 10;

function setupInputArea(elementId, playerKey) {
    const el = document.getElementById(elementId);
    
    el.addEventListener('pointerdown', (e) => {
        if(gameState.isGameOver) return;
        startY = e.clientY;
        el.setPointerCapture(e.pointerId);
    }, false);

    el.addEventListener('pointerup', (e) => {
        if (gameState.isGameOver) return;
        endY = e.clientY;
        el.releasePointerCapture(e.pointerId);
        handleGesture(playerKey);
    }, false);
}

function handleGesture(player) {
    const diff = startY - endY; 
    const absDiff = Math.abs(diff);

    // 1. TAP / KLIKK (Legg til poeng)
    if (absDiff < TAP_THRESHOLD) {
        addPoint(player);
    } 
    // 2. SVEIP OPP (Legg til poeng)
    else if (diff > SWIPE_THRESHOLD) {
        addPoint(player);
    } 
    // 3. SVEIP NED (Trekk fra poeng)
    else if (diff < -SWIPE_THRESHOLD) {
        removePoint(player);
    }
}

setupInputArea('p1-area', 'p1');
setupInputArea('p2-area', 'p2');

/* --- SECTION: GAME LOGIC --- */
function addPoint(player) {
    if (player === 'p1') {
        gameState.p1Score++;
        triggerPop(p1ScoreEl);
    } else {
        gameState.p2Score++;
        triggerPop(p2ScoreEl);
    }
    updateUI();
    checkWinCondition();
}

function removePoint(player) {
    if (player === 'p1' && gameState.p1Score > 0) {
        gameState.p1Score--;
        triggerPop(p1ScoreEl);
    }
    if (player === 'p2' && gameState.p2Score > 0) {
        gameState.p2Score--;
        triggerPop(p2ScoreEl);
    }
    updateUI();
}

function triggerPop(element) {
    element.classList.remove('score-pop');
    void element.offsetWidth; // Trigger reflow
    element.classList.add('score-pop');
}

function updateUI() {
    p1ScoreEl.innerText = gameState.p1Score;
    p2ScoreEl.innerText = gameState.p2Score;
    updateServeIndicator();
}

function updateServeIndicator() {
    const totalPoints = gameState.p1Score + gameState.p2Score;
    let server = '';

    if (gameState.p1Score >= config.winningScore - 1 && gameState.p2Score >= config.winningScore - 1) {
        const pointsSinceDeuce = totalPoints - ((config.winningScore - 1) * 2);
        const startToggle = config.startingServer === 'p1' ? 0 : 1;
        server = (pointsSinceDeuce + startToggle) % 2 === 0 ? 'p1' : 'p2';
    } else {
        const serveSeries = Math.floor(totalPoints / 2);
        const startToggle = config.startingServer === 'p1' ? 0 : 1;
        server = (serveSeries + startToggle) % 2 === 0 ? 'p1' : 'p2';
    }

    if (server === 'p1') {
        p1ServeEl.classList.add('active');
        p2ServeEl.classList.remove('active');
    } else {
        p1ServeEl.classList.remove('active');
        p2ServeEl.classList.add('active');
    }
}

function checkWinCondition() {
    const s1 = gameState.p1Score;
    const s2 = gameState.p2Score;
    const target = config.winningScore;

    if ((s1 >= target || s2 >= target) && Math.abs(s1 - s2) >= 2) {
        gameOver(s1 > s2 ? config.p1Name : config.p2Name);
    }
}

function gameOver(winnerName) {
    gameState.isGameOver = true;
    const modal = document.getElementById('game-over-modal');
    document.getElementById('winner-text').innerHTML = `Vinneren er <b>${winnerName}</b>!`;
    
    if (typeof modal.showModal === "function") {
        modal.showModal();
    } else {
        modal.style.display = 'block';
    }
    
    saveGameData(winnerName);
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("Nullstille kamp?")) {
        gameState.p1Score = 0;
        gameState.p2Score = 0;
        gameState.isGameOver = false;
        updateUI();
    }
});

/* --- SECTION: LEADERBOARD & API --- */

// Henter historikk for ligaer og spillere
async function fetchHistory() {
    try {
        const response = await fetch('api/get_history.php');
        const data = await response.json();

        // 1. Fyll Liga
        const leagueSelect = document.getElementById('league-select');
        fillSelect(leagueSelect, data.leagues);

        // Bestem visningsmodus for Liga basert på om det finnes historikk
        if (data.leagues && data.leagues.length > 0) {
            // Hvis det ikke er lagret en liga i localstorage, vis dropdown
            if (!localStorage.getItem('lastLeague')) {
                toggleMode('league', 'history');
            } else {
                // Hvis vi har en lagret liga, vis input-feltet (slik at man ser koden)
                // men aktiver tilbake-knappen
                document.getElementById('league-back-btn').style.display = 'flex';
            }
        } else {
            toggleMode('league', 'new');
        }

        // 2. Fyll Spillere (P1 og P2 bruker samme liste)
        const p1Select = document.getElementById('p1-select');
        const p2Select = document.getElementById('p2-select');
        fillSelect(p1Select, data.players);
        fillSelect(p2Select, data.players);

        // For spillere, la oss alltid vise input-feltet først (med "sist spilte" fylt ut),
        // men aktiver "liste-knappen" hvis det finnes spillere i historikken.
        if (data.players && data.players.length > 0) {
             document.getElementById('p1-back-btn').style.display = 'flex';
             document.getElementById('p2-back-btn').style.display = 'flex';
        }

    } catch (error) {
        console.error("Kunne ikke hente historikk:", error);
    }
}

// Hjelpefunksjon for å fylle <select>
function fillSelect(selectElement, items) {
    if (items && items.length > 0) {
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.innerText = item;
            selectElement.appendChild(opt);
        });
    }
}

async function saveGameData(winnerName) {
    const statusEl = document.getElementById('save-status');
    
    const payload = {
        p1_name: config.p1Name,
        p2_name: config.p2Name,
        p1_score: gameState.p1Score,
        p2_score: gameState.p2Score,
        winner_name: winnerName,
        league_code: config.leagueCode || 'private'
    };

    try {
        const response = await fetch('api/save_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        statusEl.innerText = result.message;
    } catch (error) {
        console.error("Feil ved lagring:", error);
        statusEl.innerText = "Kunne ikke lagre resultatet.";
    }
}

async function showLeaderboard() {
    const league = document.getElementById('league-code').value || 'private';

    try {
        const response = await fetch(`api/get_leaderboard.php?league_code=${encodeURIComponent(league)}`);
        const data = await response.json();
        renderTable(data);

        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('leaderboard-screen').classList.add('active');
    } catch (error) {
        console.error("Feil ved henting av tabell:", error);
        alert("Kunne ikke koble til databasen for å hente tabellen.");
    }
}

function renderTable(data) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = ''; 

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Ingen kamper funnet</td></tr>';
        return;
    }

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="align-left">${row.player_name}</td>
            <td>${row.kamper}</td>
            <td>${row.seiere}</td>
            <td>${row.tap}</td>
            <td>${row.diff > 0 ? '+' + row.diff : row.diff}</td>
            <td><strong>${row.poeng}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function closeLeaderboard() {
    document.getElementById('leaderboard-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('active');
}
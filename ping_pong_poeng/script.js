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

const p1ScoreEl = document.getElementById('p1-score');
const p2ScoreEl = document.getElementById('p2-score');
const p1ServeEl = document.getElementById('p1-serve');
const p2ServeEl = document.getElementById('p2-serve');

/* --- SECTION: LOCAL STORAGE & HISTORY --- */
const STORAGE_KEY_NAMES = 'pong_saved_names';
const STORAGE_KEY_LEAGUES = 'pong_league_history';

// Kjøres når siden lastes
function loadPreferences() {
    // 1. Hent navn
    const savedNames = JSON.parse(localStorage.getItem(STORAGE_KEY_NAMES));
    if (savedNames) {
        document.getElementById('p1-name-input').value = savedNames.p1;
        document.getElementById('p2-name-input').value = savedNames.p2;
    }

    // 2. Hent ligahistorikk
    const leagues = JSON.parse(localStorage.getItem(STORAGE_KEY_LEAGUES)) || [];
    const select = document.getElementById('league-select');
    
    if (leagues.length > 0) {
        // Vi har historikk -> Vis rullegardin
        select.innerHTML = '';
        leagues.forEach(code => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.innerText = code;
            select.appendChild(opt);
        });
        
        // Vis select, skjul input
        toggleLeagueMode('history');
    } else {
        // Ingen historikk -> Vis tekstfelt
        toggleLeagueMode('new');
    }
}

function savePreferences(p1, p2, league) {
    // 1. Lagre navn
    localStorage.setItem(STORAGE_KEY_NAMES, JSON.stringify({ p1, p2 }));

    // 2. Lagre liga til historikk hvis den ikke er tom
    if (league && league !== 'private') {
        let leagues = JSON.parse(localStorage.getItem(STORAGE_KEY_LEAGUES)) || [];
        
        // Fjern ligaen hvis den allerede finnes (for å legge den øverst/sist brukt)
        leagues = leagues.filter(l => l !== league);
        
        // Legg til øverst
        leagues.unshift(league);
        
        // Begrens til feks siste 5
        if (leagues.length > 5) leagues.pop();
        
        localStorage.setItem(STORAGE_KEY_LEAGUES, JSON.stringify(leagues));
    }
}

// Hjelpefunksjon for å bytte visning
window.toggleLeagueMode = function(mode) {
    const selectWrapper = document.getElementById('league-select-wrapper');
    const inputWrapper = document.getElementById('league-input-wrapper');
    const backBtn = document.getElementById('back-to-select-btn');
    const hasHistory = document.getElementById('league-select').options.length > 0;

    if (mode === 'history' && hasHistory) {
        selectWrapper.style.display = 'flex';
        inputWrapper.style.display = 'none';
    } else {
        selectWrapper.style.display = 'none';
        inputWrapper.style.display = 'flex';
        // Vis tilbake-knapp KUN hvis vi faktisk har historikk å gå tilbake til
        backBtn.style.display = hasHistory ? 'block' : 'none';
        
        // Hvis vi trykker "Ny", tøm input-feltet og sett fokus
        if(mode === 'new') {
            const input = document.getElementById('league-code');
            input.value = '';
            input.focus();
        }
    }
}

/* --- SECTION: SETUP & INIT --- */
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

document.getElementById('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    config.p1Name = document.getElementById('p1-name-input').value;
    config.p2Name = document.getElementById('p2-name-input').value;
    config.winningScore = parseInt(document.getElementById('winning-score-display').value);
    if(!config.winningScore || config.winningScore < 1) config.winningScore = 11;

    // Sjekk om vi bruker rullegardin eller input
    const isSelectMode = document.getElementById('league-select-wrapper').style.display !== 'none';
    if (isSelectMode) {
        config.leagueCode = document.getElementById('league-select').value;
        // Oppdater input-feltet (hidden) så Show Leaderboard også finner riktig kode
        document.getElementById('league-code').value = config.leagueCode;
    } else {
        config.leagueCode = document.getElementById('league-code').value;
    }

    config.startingServer = document.getElementById('first-server').value;

    // LAGRE PREFERANSER
    savePreferences(config.p1Name, config.p2Name, config.leagueCode);

    document.getElementById('p1-name').innerText = config.p1Name;
    document.getElementById('p2-name').innerText = config.p2Name;
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    updateServeIndicator();
});

// Start lasting av data
loadPreferences();

function setupInputArea(elementId, playerKey) {
    const el = document.getElementById(elementId);
    let startY = 0;
    let endY = 0;
    const TAP_THRESHOLD = 10;
    const SWIPE_THRESHOLD = 50;
    
    el.addEventListener('pointerdown', (e) => {
        if(gameState.isGameOver) return;
        startY = e.clientY;
        el.setPointerCapture(e.pointerId);
    }, false);

    el.addEventListener('pointerup', (e) => {
        if (gameState.isGameOver) return;
        endY = e.clientY;
        el.releasePointerCapture(e.pointerId);
        
        const diff = startY - endY; 
        const absDiff = Math.abs(diff);

        // 1. TAP / KLIKK (Legg til poeng)
        if (absDiff < TAP_THRESHOLD) {
            addPoint(playerKey);
        } 
        // 2. SVEIP OPP (Legg til poeng)
        else if (diff > SWIPE_THRESHOLD) {
            addPoint(playerKey);
        } 
        // 3. SVEIP NED (Trekk fra poeng)
        else if (diff < -SWIPE_THRESHOLD) {
            removePoint(playerKey);
        }
    }, false);
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
    
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.style.display = 'block';
    
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

/* --- SECTION: LEADERBOARD & BACKEND --- */
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
        const response = await fetch('save_score.php', {
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

function closeLeaderboard() {
    document.getElementById('leaderboard-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('active');
}

function renderTable(data) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Ingen kamper spilt enda</td></tr>';
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

async function showLeaderboard() {
    // Vi henter koden som står i feltet, eller bruker "private" som standard
    const league = document.getElementById('league-code').value || 'private';

    try {
        const response = await fetch(`get_leaderboard.php?league_code=${encodeURIComponent(league)}`);
        const data = await response.json();

        renderTable(data);

        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('leaderboard-screen').classList.add('active');
    } catch (error) {
        console.error("Feil ved henting av tabell:", error);
        alert("Kunne ikke koble til databasen for å hente tabellen.");
    }
}
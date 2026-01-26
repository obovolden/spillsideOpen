/* --- STATE --- */
let config = { p1Name: "Spiller 1", p2Name: "Spiller 2", winningScore: 11, leagueCode: "", startingServer: 'p1' };
let gameState = { p1Score: 0, p2Score: 0, isGameOver: false };
let currentMatchId = null; // ID på kamp hvis vi spiller fixture
let wizardPlayers = []; // Liste for ny liga opprettelse

// DOM Refs
const p1ScoreEl = document.getElementById('p1-score');
const p2ScoreEl = document.getElementById('p2-score');
const p1ServeEl = document.getElementById('p1-serve');
const p2ServeEl = document.getElementById('p2-serve');

/* --- INIT --- */
window.addEventListener('DOMContentLoaded', () => {
    fetchHistory();
    if(localStorage.getItem('lastP1')) document.getElementById('p1-name-input').value = localStorage.getItem('lastP1');
    if(localStorage.getItem('lastP2')) document.getElementById('p2-name-input').value = localStorage.getItem('lastP2');
    if(localStorage.getItem('lastLeague')) document.getElementById('league-code').value = localStorage.getItem('lastLeague');
});

/* --- WIZARD LOGIC --- */
function openLeagueWizard() {
    wizardPlayers = [];
    document.getElementById('wizard-player-list').innerHTML = '';
    document.getElementById('wizard-league-name').value = '';
    const modal = document.getElementById('league-wizard-modal');
    if(modal.showModal) modal.showModal(); else modal.style.display = 'block';
}

function addPlayerToWizard() {
    const input = document.getElementById('wizard-player-input');
    const name = input.value.trim();
    if(name && !wizardPlayers.includes(name)) {
        wizardPlayers.push(name);
        renderWizardTags();
        input.value = '';
    }
    input.focus();
}

function renderWizardTags() {
    const container = document.getElementById('wizard-player-list');
    container.innerHTML = wizardPlayers.map(p => `<span class="tag">${p}</span>`).join('');
}

async function generateLeague() {
    const name = document.getElementById('wizard-league-name').value;
    if(wizardPlayers.length < 2 || !name) return alert("Trenger navn og minst 2 spillere");

    try {
        const res = await fetch('api/create_league.php', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ league_code: name, players: wizardPlayers, rounds: 1 })
        });
        const json = await res.json();
        
        if(json.status === 'success') {
            document.getElementById('league-wizard-modal').close();
            document.getElementById('league-code').value = name;
            showLeaderboard(); // Gå rett til tabellen
        } else {
            alert(json.message);
        }
    } catch(e) { alert("Feil ved opprettelse"); }
}

/* --- SETUP FORM --- */
function toggleMode(type, mode) {
    const wrapper = type === 'league' ? document.getElementById('league-select-wrapper') : document.getElementById(`${type}-select-wrapper`);
    const inputWrap = type === 'league' ? document.getElementById('league-input-wrapper') : document.getElementById(`${type}-input-wrapper`);
    const backBtn = document.getElementById(`${type}-back-btn`);
    
    if (mode === 'new') {
        wrapper.style.display = 'none';
        inputWrap.style.display = 'flex';
        backBtn.style.display = 'flex';
    } else {
        wrapper.style.display = 'flex';
        inputWrap.style.display = 'none';
    }
}
// Koble select til input
['league', 'p1', 'p2'].forEach(t => {
    document.getElementById(`${t}-select`).addEventListener('change', function() {
        const inputId = t === 'league' ? 'league-code' : `${t}-name-input`;
        document.getElementById(inputId).value = this.value;
    });
});

document.getElementById('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    currentMatchId = null; // Reset fixture ID for quick matches
    startGame(
        document.getElementById('p1-name-input').value,
        document.getElementById('p2-name-input').value
    );
});

function startGame(p1, p2) {
    config.p1Name = p1; config.p2Name = p2;
    config.winningScore = parseInt(document.getElementById('winning-score-display').value) || 11;
    config.leagueCode = document.getElementById('league-code').value;
    config.startingServer = document.getElementById('first-server').value;

    localStorage.setItem('lastP1', p1); localStorage.setItem('lastP2', p2);
    if(config.leagueCode) localStorage.setItem('lastLeague', config.leagueCode);

    document.getElementById('p1-name').innerText = p1;
    document.getElementById('p2-name').innerText = p2;
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    gameState.p1Score = 0; gameState.p2Score = 0; gameState.isGameOver = false;
    updateUI();
}

/* --- GAME LOGIC --- */
function adjustSetting(type, val) {
    const input = document.getElementById('winning-score-display');
    let v = (parseInt(input.value) || 0) + val;
    if (v >= 1 && v <= 99) input.value = v;
}

// Touch/Click
let startY=0; const TAP_THRESH=10; const SWIPE_THRESH=50;
function setupTouch(id, player) {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => { if(!gameState.isGameOver){ startY=e.clientY; el.setPointerCapture(e.pointerId); }});
    el.addEventListener('pointerup', e => {
        if(gameState.isGameOver) return;
        el.releasePointerCapture(e.pointerId);
        const diff = startY - e.clientY;
        if(Math.abs(diff) < TAP_THRESH) addPt(player);
        else if(diff > SWIPE_THRESH) addPt(player);
        else if(diff < -SWIPE_THRESH) remPt(player);
    });
}
setupTouch('p1-area', 'p1'); setupTouch('p2-area', 'p2');

function addPt(p) {
    if(p==='p1') { gameState.p1Score++; pop(p1ScoreEl); } else { gameState.p2Score++; pop(p2ScoreEl); }
    updateUI(); checkWin();
}
function remPt(p) {
    if(p==='p1' && gameState.p1Score>0) { gameState.p1Score--; pop(p1ScoreEl); }
    if(p==='p2' && gameState.p2Score>0) { gameState.p2Score--; pop(p2ScoreEl); }
    updateUI();
}
function pop(el) { el.classList.remove('score-pop'); void el.offsetWidth; el.classList.add('score-pop'); }

function updateUI() {
    p1ScoreEl.innerText = gameState.p1Score; p2ScoreEl.innerText = gameState.p2Score;
    const total = gameState.p1Score + gameState.p2Score;
    let s = '';
    const target = config.winningScore;
    
    if (gameState.p1Score >= target-1 && gameState.p2Score >= target-1) {
        // Deuce logic
        const diff = total - ((target-1)*2);
        const toggle = config.startingServer==='p1'?0:1;
        s = (diff + toggle)%2 === 0 ? 'p1' : 'p2';
    } else {
        const toggle = config.startingServer==='p1'?0:1;
        s = (Math.floor(total/2) + toggle)%2 === 0 ? 'p1' : 'p2';
    }
    
    if(s==='p1'){ p1ServeEl.classList.add('active'); p2ServeEl.classList.remove('active'); }
    else { p1ServeEl.classList.remove('active'); p2ServeEl.classList.add('active'); }
}

function checkWin() {
    const t = config.winningScore;
    if((gameState.p1Score>=t || gameState.p2Score>=t) && Math.abs(gameState.p1Score-gameState.p2Score)>=2) {
        gameOver(gameState.p1Score > gameState.p2Score ? config.p1Name : config.p2Name);
    }
}

function gameOver(winner) {
    gameState.isGameOver = true;
    const m = document.getElementById('game-over-modal');
    document.getElementById('winner-text').innerHTML = `Vinneren er <b>${winner}</b>!`;
    if(m.showModal) m.showModal(); else m.style.display='block';
    saveGameData(winner);
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("Nullstille?")) { gameState.p1Score=0; gameState.p2Score=0; gameState.isGameOver=false; updateUI(); }
});

/* --- API & DATA --- */
async function fetchHistory() {
    try {
        const res = await fetch('api/get_history.php');
        const data = await res.json();
        fillSelect(document.getElementById('league-select'), data.leagues);
        fillSelect(document.getElementById('p1-select'), data.players);
        fillSelect(document.getElementById('p2-select'), data.players);
        
        if(!data.leagues.length) toggleMode('league', 'new');
        else if(!localStorage.getItem('lastLeague')) toggleMode('league', 'history');
        else document.getElementById('league-back-btn').style.display = 'flex';
        
        if(data.players.length) {
            document.getElementById('p1-back-btn').style.display='flex';
            document.getElementById('p2-back-btn').style.display='flex';
        }
    } catch(e) { console.error(e); }
}
function fillSelect(el, items) {
    if(items) items.forEach(i => { let o=document.createElement('option'); o.value=i; o.innerText=i; el.appendChild(o); });
}

async function saveGameData(winner) {
    try {
        await fetch('api/save_score.php', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                match_id: currentMatchId, // Sender ID hvis fixture
                p1_name: config.p1Name, p2_name: config.p2Name,
                p1_score: gameState.p1Score, p2_score: gameState.p2Score,
                winner_name: winner, league_code: config.leagueCode
            })
        });
        document.getElementById('save-status').innerText = "Lagret!";
    } catch(e) { document.getElementById('save-status').innerText = "Feil ved lagring"; }
}

async function showLeaderboard() {
    const league = document.getElementById('league-code').value || 'private';
    try {
        const res = await fetch(`api/get_leaderboard.php?league_code=${encodeURIComponent(league)}`);
        const data = await res.json();
        renderTable(data.leaderboard || []);
        renderLists(data.upcoming || [], data.history || []);
        
        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('leaderboard-screen').classList.add('active');
        document.getElementById('game-over-modal').close();
    } catch(e) { alert("Fant ingen liga med det navnet."); }
}

function renderTable(data) {
    const b = document.getElementById('leaderboard-body'); b.innerHTML = '';
    if(!data.length) { b.innerHTML='<tr><td colspan="6">Ingen fullførte kamper</td></tr>'; return; }
    data.forEach((r,i) => {
        const tr = document.createElement('tr');
        tr.innerHTML=`<td>${i+1}</td><td class="align-left">${r.player_name}</td><td>${r.kamper}</td><td>${r.seiere}</td><td>${r.tap}</td><td><strong>${r.poeng}</strong></td>`;
        b.appendChild(tr);
    });
}

function renderLists(upcoming, history) {
    // Render Upcoming
    const uList = document.getElementById('upcoming-matches-list'); uList.innerHTML = '';
    if(!upcoming.length) uList.innerHTML = '<li class="no-data">Ingen kamper planlagt</li>';
    else {
        upcoming.forEach(m => {
            const li = document.createElement('li'); li.className = 'match-item';
            li.innerHTML = `
                <div class="match-info"><span>${m.player1_name} <small>vs</small> ${m.player2_name}</span></div>
                <button class="play-btn" onclick="playFixture(${m.id}, '${m.player1_name}', '${m.player2_name}')">SPILL</button>
            `;
            uList.appendChild(li);
        });
    }

    // Render History
    const hList = document.getElementById('match-history-list'); hList.innerHTML = '';
    if(!history.length) hList.innerHTML = '<li class="no-data">Ingen historikk</li>';
    else {
        history.forEach(m => {
            const li = document.createElement('li'); li.className = 'match-item';
            const w1 = parseInt(m.player1_score) > parseInt(m.player2_score) ? 'winner' : 'loser';
            const w2 = parseInt(m.player2_score) > parseInt(m.player1_score) ? 'winner' : 'loser';
            li.innerHTML = `
                <div class="match-info">
                    <span class="${w1}">${m.player1_name}</span> <span class="score">${m.player1_score}-${m.player2_score}</span> <span class="${w2}">${m.player2_name}</span>
                </div>
                <button class="delete-btn" onclick="deleteMatch(${m.id})"><i class="material-icons">delete</i></button>
            `;
            hList.appendChild(li);
        });
    }
}

function playFixture(id, p1, p2) {
    currentMatchId = id;
    document.getElementById('leaderboard-screen').classList.remove('active');
    startGame(p1, p2);
}

function backToLeaderboard() {
    document.getElementById('game-over-modal').close();
    showLeaderboard();
}

function closeLeaderboard() {
    document.getElementById('leaderboard-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('active');
}

/* --- ADMIN --- */
function openAdminModal() { document.getElementById('admin-modal').showModal(); }
async function deleteMatch(id) {
    if(confirm("Slette kamp?")) {
        await fetch('api/admin_action.php', { method:'POST', body:JSON.stringify({action:'delete_match', id:id})});
        showLeaderboard();
    }
}
async function adminAction(act) {
    const payload = { action: act, league_code: document.getElementById('league-code').value };
    if(act === 'retire_player') payload.name = document.getElementById('admin-retire-player').value;
    if(act === 'rename_player') {
        payload.old_name = document.getElementById('admin-old-player').value;
        payload.new_name = document.getElementById('admin-new-player').value;
    }
    
    if(confirm("Er du sikker?")) {
        try {
            const r = await fetch('api/admin_action.php', { method:'POST', body:JSON.stringify(payload)});
            const j = await r.json();
            alert(j.message);
            if(j.status==='success') location.reload();
        } catch(e){alert("Feil");}
    }
}
// --- 1. HENT HTML-ELEMENTER ---
const ordInputSeksjon = document.getElementById('ord-input-seksjon');
const spillSeksjon = document.getElementById('spill-seksjon');

const spillerNavnInput = document.getElementById('spillerNavnInput');
const hemmeligOrdInput = document.getElementById('hemmeligOrdInput');
const startSpillKnapp = document.getElementById('startSpillKnapp');

const visSpillerNavn = document.getElementById('vis-spiller-navn');
const ordStreker = document.getElementById('ord-streker');
const alfabetSeksjon = document.getElementById('alfabet-seksjon');
const spillMelding = document.getElementById('spill-melding');
const nyttSpillKnapp = document.getElementById('nyttSpillKnapp');

const highscoreTbody = document.getElementById('highscore-tbody');

// ========== Hent mørk modus-knappen ==========
const themeToggle = document.getElementById('theme-toggle');
// ======================================================

// --- 2. SPILL-VARIABLER ---
let hemmeligOrd = '';
let aktivSpillerNavn = '';
let gjettedeBokstaver = [];
let feilGjett = 0;
const maksFeil = 6;
const alfabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'.split('');
const kroppsdelNavn = ['#hode', '#kropp', '#arm-v', '#arm-h', '#ben-v', '#ben-h'];
const ordListe = [
    "DATAMASKIN", "PROGRAMMERING", "NORGE", "STRAND", "SOMMERFERIE", 
    "FJELLTUR", "JAVASCRIPT", "ELBIL", "KYLLING", "UNIVERSITET",
    "SKOLEBRØD", "BRUNOST", "TASTATUR", "SNØFNUGG"
];


// =================================================================
// --- 3. DATABASE-FUNKSJONER ---
// =================================================================
const addScoreURL = 'api/add_hangman_score.php';
const getScoresURL = 'api/get_hangman_scores.php';

async function visHighscoresFraDatabase() {
    try {
        const response = await fetch(getScoresURL);
        const scores = await response.json();
        
        highscoreTbody.innerHTML = ''; // Tømmer tabellen
        
        scores.forEach((score, index) => {
            const rad = highscoreTbody.insertRow();
            rad.innerHTML = `
                <td>${index + 1}</td>
                <td>${score.spiller_navn}</td>
                <td>${score.poeng}</td>
            `;
        });
    } catch (error) {
        console.error("Klarte ikke hente highscores fra databasen:", error);
        highscoreTbody.innerHTML = '<tr><td colspan="3">Kunne ikke laste listen.</td></tr>';
    }
}

async function lagreScoreTilDatabase(navn, poeng) {
    const formData = new FormData();
    formData.append('spiller_navn', navn);
    formData.append('poeng', poeng);
    
    try {
        await fetch(addScoreURL, { method: 'POST', body: formData });
        console.log(`Lagret score for ${navn}: ${poeng} poeng.`);
        
        // La listen oppdatere seg
        await visHighscoresFraDatabase(); 

        // ========== NYTT: Finn og fremhev den nye scoren ==========
        // Fjern eventuelle gamle fremhevinger
        const alleRader = highscoreTbody.getElementsByTagName('tr');
        for (let r of alleRader) {
            r.classList.remove('ny-score');
        }

        // Finn den nye raden og legg til klassen
        for (let rad of alleRader) {
            const celler = rad.getElementsByTagName('td');
            if (celler.length >= 3) {
                const radNavn = celler[1].textContent;
                const radPoeng = parseInt(celler[2].textContent);
                
                // Sjekk om raden matcher den nye scoren
                if (radNavn === navn && radPoeng === poeng) {
                    rad.classList.add('ny-score');
                    break; // Stopp etter å ha funnet den første matchen
                }
            }
        }
        // =========================================================

    } catch (error) {
        console.error("Klarte ikke lagre highscore til databasen:", error);
    }
}

// --- 4. KJERNEFUNKSJONER ---

function startSelveSpillet() {
    aktivSpillerNavn = spillerNavnInput.value;
    
    if (hemmeligOrdInput.value.length > 0) {
        hemmeligOrd = hemmeligOrdInput.value.toUpperCase();
    } else {
        hemmeligOrd = ordListe[Math.floor(Math.random() * ordListe.length)];
    }
    
    if (aktivSpillerNavn.length === 0) {
        alert('Du må fylle ut navnet ditt!');
        return;
    }

    ordInputSeksjon.style.display = 'none';
    spillSeksjon.style.display = 'block';

    gjettedeBokstaver = [];
    feilGjett = 0;
    
    visSpillerNavn.textContent = aktivSpillerNavn;
    genererAlfabetKnapper();
    oppdaterOrdVisning();
    
    document.querySelectorAll('.kroppsdel').forEach(del => del.classList.remove('synlig'));
    
    spillMelding.textContent = '';
    spillMelding.className = '';
    nyttSpillKnapp.style.display = 'none';
}

function genererAlfabetKnapper() {
    alfabetSeksjon.innerHTML = '';
    alfabet.forEach(bokstav => {
        const knapp = document.createElement('button');
        knapp.textContent = bokstav;
        knapp.classList.add('alfabet-knapp');
        knapp.dataset.bokstav = bokstav;
        knapp.addEventListener('click', () => gjettBokstav(bokstav));
        alfabetSeksjon.appendChild(knapp);
    });
}

function gjettBokstav(bokstav) {
    const knapp = document.querySelector(`.alfabet-knapp[data-bokstav="${bokstav}"]`);
    if (knapp) knapp.disabled = true;

    if (hemmeligOrd.includes(bokstav)) {
        gjettedeBokstaver.push(bokstav);
        if (knapp) knapp.classList.add('riktig');
    } else {
        feilGjett++;
        if (knapp) knapp.classList.add('feil');
        
        const delSomSkalVises = document.querySelector(kroppsdelNavn[feilGjett - 1]);
        if (delSomSkalVises) {
            delSomSkalVises.classList.add('synlig');
        }

        spillSeksjon.classList.add('shake-animation');
        setTimeout(() => {
            spillSeksjon.classList.remove('shake-animation');
        }, 500);
    }
    
    oppdaterOrdVisning();
    sjekkSpillStatus();
}

function oppdaterOrdVisning() {
    let visning = hemmeligOrd.split('').map(bokstav => {
        if (bokstav === ' ') return ' &nbsp; ';
        return gjettedeBokstaver.includes(bokstav) ? `${bokstav}&nbsp;` : `_&nbsp;`;
    }).join('');
    ordStreker.innerHTML = visning.trim();
}

function sjekkSpillStatus() {
    if (feilGjett >= maksFeil) {
        spillMelding.textContent = `Du tapte! Ordet var: ${hemmeligOrd}`;
        spillMelding.className = 'tap';
        avsluttSpill(true);
        return;
    }

    const harVunnet = hemmeligOrd.split('').every(b => b === ' ' || gjettedeBokstaver.includes(b));
    
    if (harVunnet) {
        let poeng = maksFeil - feilGjett;
        spillMelding.textContent = `Gratulerer, du vant! Du fikk ${poeng} poeng.`;
        spillMelding.className = 'vinn';
        
        // Kall lagre-funksjonen (som nå også håndterer fremheving)
        lagreScoreTilDatabase(aktivSpillerNavn, poeng);
        
        avsluttSpill(false);
    }
}

function avsluttSpill(tapt) {
    document.querySelectorAll('.alfabet-knapp').forEach(knapp => knapp.disabled = true);
    nyttSpillKnapp.style.display = 'inline-block';
    if (tapt) {
        ordStreker.innerHTML = hemmeligOrd.split('').join(' ');
    }
}

function initNyttSpill() {
    spillSeksjon.style.display = 'none';
    ordInputSeksjon.style.display = 'block';
    hemmeligOrdInput.value = '';
    document.querySelectorAll('.kroppsdel').forEach(del => del.classList.remove('synlig'));
}

function handleTastetrykk(event) {
    if (spillSeksjon.style.display !== 'block') return;
    const tast = event.key.toUpperCase();
    const knapp = document.querySelector(`.alfabet-knapp[data-bokstav="${tast}"]`);
    if (knapp && !knapp.disabled) knapp.click();
}


// ========== FUNKSJON FOR Å BYTTE TEMA ==========
function toggleTheme() {
    if (themeToggle.checked) {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark'); // Lagre valget
    } else {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light'); // Lagre valget
    }
}

// ========== FUNKSJON FOR Å INITIALISERE APPEN ==========
function initApp() {
    // Sjekk om et tema er lagret i localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.checked = true; // Synkroniser bryteren
    } else {
        // Standard er lys modus
        document.body.removeAttribute('data-theme');
        themeToggle.checked = false;
    }

    // Last inn highscores
    visHighscoresFraDatabase();
}

// --- 5. KOBLE HENDELSER OG START ---

startSpillKnapp.addEventListener('click', startSelveSpillet);
nyttSpillKnapp.addEventListener('click', initNyttSpill);
document.addEventListener('keydown', handleTastetrykk);

// ========== Koble hendelse til mørk modus-knappen ==========
themeToggle.addEventListener('change', toggleTheme);

hemmeligOrdInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') startSelveSpillet();
});
spillerNavnInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') startSelveSpillet();
});

// ========== Kall initApp() ved oppstart ==========
initApp();
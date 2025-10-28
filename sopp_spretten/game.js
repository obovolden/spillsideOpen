// 1. Sett opp Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // 'ctx' er vårt tegneverktøy

const BREDDE = canvas.width;
const HOYDE = canvas.height;

// --- Farger ---
const FARG_SPILLER = '#3498db';
const FARG_JAGER = '#2c3e50';
const FARG_HINDRING = '#c0392b';
const FARG_SOPP = '#f1c40f';
const FARG_BAKKE = '#27ae60';
const FARG_TEKST = '#000000';

// --- Spill-variabler ---
let poeng = 0;
let gameOver = false;
const bakkeNiva = HOYDE - 50;
let scrollHastighet = 0; // <-- NY: Hvor fort verden scroller

// --- Spiller (Kula) ---
let spiller = {
    x: BREDDE / 4, // Spillerens faste x-posisjon
    y: bakkeNiva - 20,
    radius: 20,
    dy: 0,
    hoppStyrke: -17,
    gravitasjon: 0.8,
    erILuften: false,
    hastighet: 5 // <-- NY: Hvor fort spilleren "løper" (hvor fort verden scroller)
};

// --- Jageren (Fienden) ---
let jager = {
    x: -40, // Starter utenfor skjermen
    bredde: 40,
    hastighet: 1.2 // <-- NY: Dette er "ta deg igjen"-hastigheten
};

// --- Hindring ---
let hindring = {
    x: BREDDE - 200, // Starter nærmere
    y: bakkeNiva - 40,
    bredde: 50,
    hoyde: 40
    // Hastighet er fjernet, styres nå av 'scrollHastighet'
};

// --- Sopp ---
let sopp = {
    x: BREDDE - 50, // Starter nærmere
    y: bakkeNiva - 80,
    radius: 10,
    samlet: false
    // Hastighet er fjernet, styres nå av 'scrollHastighet'
};

// --- Input-kontroll ---
let keys = { // <-- NY: Objekt for å holde styr på tastetrykk
    ArrowRight: false,
    Space: false
};

// 2. Håndter Input (Tastetrykk)
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && !spiller.erILuften && !gameOver) {
        spiller.dy = spiller.hoppStyrke;
        spiller.erILuften = true;
    }
    if (e.code === 'ArrowRight') { // <-- NY: Hør etter Pil Høyre
        keys.ArrowRight = true;
    }
    if (e.code === 'KeyR' && gameOver) {
        startPåNytt();
    }
});

document.addEventListener('keyup', function(e) { // <-- NY: Hør etter når knappen slippes
    if (e.code === 'ArrowRight') {
        keys.ArrowRight = false;
    }
});


// 3. Spillets Hoved-funksjoner

function oppdaterLogikk() {
    if (gameOver) return;

    // --- NY: Sett scroll-hastighet ---
    // Hvis spilleren holder "Pil Høyre", sett scroll-hastigheten
    if (keys.ArrowRight) {
        scrollHastighet = spiller.hastighet;
    } else {
        scrollHastighet = 0; // Stå stille
    }

    // --- Spillerlogikk (Hopp og Gravitasjon) ---
    spiller.y += spiller.dy;
    spiller.dy += spiller.gravitasjon;

    if (spiller.y + spiller.radius > bakkeNiva) {
        spiller.y = bakkeNiva - spiller.radius;
        spiller.dy = 0;
        spiller.erILuften = false;
    }

    // --- Jager-logikk (DEN VIKTIGE ENDRINGEN) ---
    // 1. Jageren scroller med verden (flytter seg til venstre)
    jager.x -= scrollHastighet; 
    // 2. Jageren beveger seg ALLTID sakte mot høyre for å ta deg igjen
    jager.x += jager.hastighet; 

    /*
     * Resultat:
     * - Hvis du løper (scrollHastighet = 5): jager.x endres med (-5 + 0.8) = -4.2. Jageren flytter seg BORT.
     * - Hvis du står stille (scrollHastighet = 0): jager.x endres med (0 + 0.8) = +0.8. Jageren tar deg IGJEN!
     */

    // --- Objekt-logikk (flytt dem basert på scroll) ---
    hindring.x -= scrollHastighet;
    if (hindring.x + hindring.bredde < 0) {
        hindring.x = BREDDE + Math.random() * 200;
        hindring.hoyde = Math.random() * 50 + 20;
        hindring.y = bakkeNiva - hindring.hoyde;
    }

    if (!sopp.samlet) {
        sopp.x -= scrollHastighet;
        if (sopp.x + sopp.radius < 0) {
            sopp.x = BREDDE + Math.random() * 300;
            sopp.y = bakkeNiva - 50 - Math.random() * 100;
        }
    } else {
        sopp.samlet = false;
        sopp.x = BREDDE + Math.random() * 300;
        sopp.y = bakkeNiva - 50 - Math.random() * 100;
    }

    // --- Kollisjonsdeteksjon ---

    // A: Spiller mot Jager
    if (spiller.x + spiller.radius > jager.x && spiller.x - spiller.radius < jager.x + jager.bredde) {
        gameOver = true;
    }

    // B: Spiller mot Hindring
    if (spiller.x + spiller.radius > hindring.x &&
        spiller.x - spiller.radius < hindring.x + hindring.bredde &&
        spiller.y + spiller.radius > hindring.y) {
        
        // --- NY Kollisjon: Stopp spilleren ---
        // I stedet for game over, la oss bare stoppe spilleren fra å gå gjennom
        // Dette er litt juks, men effektivt. 
        // Vi dytter spilleren til venstre for hinderet.
        // En bedre løsning ville vært å stoppe scrollingen, men la oss holde det enkelt.
        gameOver = true; // Vi beholder game over for nå.
    }
    
    // C: Spiller mot Sopp
    let avstandX = spiller.x - sopp.x;
    let avstandY = spiller.y - sopp.y;
    let totalAvstand = Math.sqrt(avstandX * avstandX + avstandY * avstandY);

    if (totalAvstand < spiller.radius + sopp.radius) {
        if (!sopp.samlet) {
            poeng += 1;
            sopp.samlet = true;
        }
    }
}

function tegnSpill() {
    // Tøm hele skjermen
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, BREDDE, HOYDE);

    // Tegn bakken
    ctx.fillStyle = FARG_BAKKE;
    ctx.fillRect(0, bakkeNiva, BREDDE, 50);

    // Tegn Jageren
    ctx.fillStyle = FARG_JAGER;
    ctx.fillRect(jager.x, 0, jager.bredde, HOYDE);

    // Tegn Hindring
    ctx.fillStyle = FARG_HINDRING;
    ctx.fillRect(hindring.x, hindring.y, hindring.bredde, hindring.hoyde);

    // Tegn Sopp
    if (!sopp.samlet) {
        ctx.beginPath();
        ctx.arc(sopp.x, sopp.y, sopp.radius, 0, Math.PI * 2);
        ctx.fillStyle = FARG_SOPP;
        ctx.fill();
        ctx.closePath();
    }
    
    // Tegn Spilleren
    ctx.beginPath();
    ctx.arc(spiller.x, spiller.y, spiller.radius, 0, Math.PI * 2);
    ctx.fillStyle = FARG_SPILLER;
    ctx.fill();
    ctx.closePath();

    // Tegn Poeng
    ctx.fillStyle = FARG_TEKST;
    ctx.font = '30px Arial';
    ctx.fillText(`Poeng: ${poeng}`, 20, 40);

    // Tegn Game Over-skjerm
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, BREDDE, HOYDE);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '70px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', BREDDE / 2, HOYDE / 2 - 30);
        
        ctx.font = '30px Arial';
        ctx.fillText(`Poeng: ${poeng}`, BREDDE / 2, HOYDE / 2 + 20);

        ctx.font = '25px Arial';
        ctx.fillText("Trykk 'R' for å starte på nytt", BREDDE / 2, HOYDE / 2 + 70);
        ctx.textAlign = 'left';
    }
}

function startPåNytt() {
    poeng = 0;
    gameOver = false;
    keys.ArrowRight = false; // Sørg for at vi ikke løper
    
    spiller.y = bakkeNiva - 20;
    spiller.dy = 0;
    
    jager.x = -40; // Tilbakestill jager
    
    hindring.x = BREDDE - 200;
    sopp.x = BREDDE - 50;
    sopp.samlet = false;

    gameLoop();
}

// 4. Hoved Spill-løkke (Game Loop)
function gameLoop() {
    oppdaterLogikk();
    tegnSpill();

    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// 5. Start spillet!
gameLoop();
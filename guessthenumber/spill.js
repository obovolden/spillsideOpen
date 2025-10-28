// 1. Initialisere spillet
// Velger et tilfeldig tall mellom 1 og 100
let hemmeligTall = Math.floor(Math.random() * 100) + 1;

let antallForsøk = 0;

// 2. Hente HTML-elementer vi trenger
const gjetteFelt = document.getElementById('gjetteFelt');
const gjetteKnapp = document.getElementById('gjetteKnapp');
const tilbakemelding = document.getElementById('tilbakemelding');

// 3. Sette opp en hendelseslytter for knappen
// Denne funksjonen kjører HVER GANG knappen klikkes
gjetteKnapp.addEventListener('click', sjekkGjett);

function sjekkGjett() {
    // Henter verdien fra input-feltet og gjør den om til et tall
    let spillerensGjett = parseInt(gjetteFelt.value);

    // Validering (sjekker om det er et gyldig tall)
    if (isNaN(spillerensGjett) || spillerensGjett < 1 || spillerensGjett > 100) {
        tilbakemelding.textContent = 'Vennligst skriv inn et tall mellom 1 og 100.';
        tilbakemelding.style.color = 'red';
        return; // Stopper funksjonen her
    }

    // Øker antall forsøk
    antallForsøk++;

    // 4. Selve spill-logikken
    if (spillerensGjett === hemmeligTall) {
        // Riktig!
        tilbakemelding.textContent = `Gratulerer! Du gjettet riktig tall (${hemmeligTall}) på ${antallForsøk} forsøk.`;
        tilbakemelding.style.color = 'green';
        
        // Avslutt spillet (valgfritt: deaktiver knapp og felt)
        gjetteKnapp.disabled = true;
        gjetteFelt.disabled = true;

    } else if (spillerensGjett < hemmeligTall) {
        // For lavt
        tilbakemelding.textContent = 'For lavt! Prøv igjen.';
        tilbakemelding.style.color = '#555';

    } else {
        // For høyt
        tilbakemelding.textContent = 'For høyt! Prøv igjen.';
        tilbakemelding.style.color = '#555';
    }

    // Tøm input-feltet for neste gjett
    gjetteFelt.value = '';
    // Sett fokus tilbake på feltet
    gjetteFelt.focus();
}
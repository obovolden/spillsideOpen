// Vent til alt innholdet på siden er lastet
document.addEventListener('DOMContentLoaded', () => {

    // Finn hamburger-knappen og menyen i HTML-en
    const hamburgerButton = document.getElementById('hamburger-button');
    const navMenu = document.getElementById('nav-menu');

    // Legg til en 'klikk'-lytter på knappen
    hamburgerButton.addEventListener('click', () => {
        // Veksle 'open'-klassen på BÅDE knappen (for X-animasjon)
        // og menyen (for å vise/skjule den)
        hamburgerButton.classList.toggle('open');
        navMenu.classList.toggle('open');
    });

});
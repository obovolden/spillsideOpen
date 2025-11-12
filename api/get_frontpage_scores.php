<?php
// ---- Bytt ut med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// ---------------------------------------------

// Sett header til å returnere JSON
header('Content-Type: application/json');

// 1. Koble til databasen
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    echo json_encode(['error' => 'Database-tilkobling feilet']);
    exit;
}

// 2. Bygg en UNION-spørring for å hente #1-spilleren fra hver spilltabell
//
// VIKTIG: Jeg antar tabellnavnene her. Endre "pong_scores", "gulljakten_scores" osv.
// hvis tabellene dine heter noe annet!
//
$sql = "
    (SELECT username, score, 'Pong' AS game_name FROM pong_scores ORDER BY score DESC, time_seconds ASC LIMIT 1)
    UNION
    (SELECT username, score, 'Kabal' AS game_name FROM kabal_scores ORDER BY score DESC, time_seconds ASC LIMIT 1)
    UNION
    (SELECT username, score, 'Gulljakten' AS game_name FROM gulljakten_scores ORDER BY score DESC, time_seconds ASC LIMIT 1)
    UNION
    (SELECT username, score, 'Hangman' AS game_name FROM hangman_scores ORDER BY score DESC, time_seconds ASC LIMIT 1)
    UNION
    (SELECT username, score, 'Soppspretten' AS game_name FROM soppspretten_scores ORDER BY score DESC, time_seconds ASC LIMIT 1)
    
    ORDER BY score DESC
    LIMIT 5
";
// --- Slutt på antagelser ---

// 3. Kjør spørring og hent resultater
$result = $conn->query($sql);
$scores = [];

if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $scores[] = $row; // Legg til rad i arrayet
    }
} else if (!$result) {
    // Hvis spørringen feilet (f.eks. et tabellnavn er feil), send feilmelding
    echo json_encode(['error' => 'Feil i SQL-spørring: ' . $conn->error]);
    $conn->close();
    exit;
}

// 4. Lukk tilkobling og send JSON-svar
$conn->close();
echo json_encode($scores); // Send tilbake highscore-listen
?>
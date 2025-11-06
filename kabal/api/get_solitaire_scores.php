<?php
// ---- Bytt ut med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// ---------------------------------------------

// Sett header til å returnere JSON
header('Content-Type: application/json');

// Hent game_mode fra URL (?mode=draw_1)
$game_mode = isset($_GET['mode']) ? $_GET['mode'] : 'draw_1';

// Valider input
if ($game_mode !== 'draw_1' && $game_mode !== 'draw_3') {
    echo json_encode(['error' => 'Ugyldig modus']);
    exit;
}

// 1. Koble til databasen
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    echo json_encode(['error' => 'Database-tilkobling feilet']);
    exit;
}

// 2. Forbered en SIKKER spørring (Prepared Statement)
$stmt = $conn->prepare(
    "SELECT username, score, time_seconds FROM kabal_scores 
     WHERE game_mode = ? 
     ORDER BY score DESC, time_seconds ASC 
     LIMIT 5"
);
$stmt->bind_param("s", $game_mode);

// 3. Kjør spørring og hent resultater
$stmt->execute();
$result = $stmt->get_result();

$scores = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $scores[] = $row; // Legg til rad i arrayet
    }
}

// 4. Lukk tilkoblinger og send JSON-svar
$stmt->close();
$conn->close();

echo json_encode($scores); // Send tilbake highscore-listen
?>
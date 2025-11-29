<?php
// --- 1. Konfigurasjon ---
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
$tablename = "Endless_Knight_score"; // OPPDATERT TABELLNAVN

// --- 2. Sett header ---
header('Content-Type: application/json');

// --- 3. Koble til databasen ---
$conn = new mysqli($servername, $username, $password, $dbname);

// Sjekk for tilkoblingsfeil
if ($conn->connect_error) {
    http_response_code(500); // Intern serverfeil
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- 4. Hent Highscores ---
$sql = "SELECT name, score FROM $tablename ORDER BY score DESC LIMIT 10";
$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed: ' . $conn->error]);
    $conn->close();
    exit();
}

// --- 5. Bygg en array og send som JSON ---
$scores = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $row['score'] = (int)$row['score'];
        $scores[] = $row;
    }
}

echo json_encode($scores);

// --- 6. Lukk tilkoblingen ---
$conn->close();
?>
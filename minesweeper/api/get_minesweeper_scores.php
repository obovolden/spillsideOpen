<?php
// ---- Bytt ut med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// ---------------------------------------------

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) { die("Tilkobling feilet: " . $conn->connect_error); }

$output = [
    'easy' => [],
    'medium' => [],
    'hard' => []
];
$levels = ['easy', 'medium', 'hard'];

foreach ($levels as $level) {
    // Henter Topp 5 for hvert nivå
    $sql = "SELECT spiller_navn, time_seconds FROM minesweeper_scores WHERE level = ? ORDER BY time_seconds ASC LIMIT 5";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $level);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while($row = $result->fetch_assoc()) {
        // === HER VAR FEILEN ===
        // Den korrigerte linjen under bruker [$level] (som kan være 'easy', 'medium', 'hard')
        // Den gamle, feilaktige koden kan ha sagt $output['easy'][] = $row;
        $output[$level][] = $row;
    }
    $stmt->close();
}

header('Content-Type: application/json');
echo json_encode($output);
$conn->close();
?>
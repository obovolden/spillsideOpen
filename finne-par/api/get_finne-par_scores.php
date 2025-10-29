<?php
// ---- Viktig: Bytt ut disse med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// -------------------------------------------------------------

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) { die("Tilkobling feilet: " . $conn->connect_error); }

$levels = ['easy', 'medium', 'hard'];
$all_scores = [];

foreach ($levels as $level) {
    // Hent Topp 5 for hvert nivå, sortert etter tid (lavest først: ASC)
    $sql = "SELECT spiller_navn as name, time_seconds as time FROM memory_scores WHERE level = ? ORDER BY time_seconds ASC LIMIT 5";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $level);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $level_scores = [];
    while($row = $result->fetch_assoc()) {
        $level_scores[] = $row;
    }
    $all_scores[$level] = $level_scores;
    $stmt->close();
}

header('Content-Type: application/json');
echo json_encode($all_scores);

$conn->close();
?>
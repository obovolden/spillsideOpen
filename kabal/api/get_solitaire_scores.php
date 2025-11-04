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
    'draw1' => [],
    'draw3' => []
];

// Hent Topp 5 for Tegn 1 (sortert etter tid, lavest først)
$sql1 = "SELECT spiller_navn, time_seconds FROM solitaire_scores WHERE game_mode = 1 ORDER BY time_seconds ASC LIMIT 5";
$result1 = $conn->query($sql1);
while($row = $result1->fetch_assoc()) {
    $output['draw1'][] = $row;
}

// Hent Topp 5 for Tegn 3 (sortert etter tid, lavest først)
$sql3 = "SELECT spiller_navn, time_seconds FROM solitaire_scores WHERE game_mode = 3 ORDER BY time_seconds ASC LIMIT 5";
$result3 = $conn->query($sql3);
while($row = $result3->fetch_assoc()) {
    $output['draw3'][] = $row;
}

header('Content-Type: application/json');
echo json_encode($output);
$conn->close();
?>
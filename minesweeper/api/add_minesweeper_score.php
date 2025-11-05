<?php
// ---- Bytt ut med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// ---------------------------------------------

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) { die("Tilkobling feilet: " . $conn->connect_error); }

// Hent data fra JavaScript
$spiller_navn = $_POST['spiller_navn'];
$time_seconds = $_POST['time_seconds'];
$level = $_POST['level']; // Pass på at denne variabelen brukes

// Bruk den nye tabellen 'minesweeper_scores'
$stmt = $conn->prepare("INSERT INTO minesweeper_scores (spiller_navn, time_seconds, level) VALUES (?, ?, ?)");
// 'sis' = string, integer, string
$stmt->bind_param("sis", $spiller_navn, $time_seconds, $level); // Pass på at $level brukes her

if ($stmt->execute()) {
  echo json_encode(["status" => "success", "message" => "Highscore lagret!"]);
} else {
  echo json_encode(["status" => "error", "message" => "Noe gikk galt."]);
}
$stmt->close();
$conn->close();
?>
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
$game_mode = $_POST['game_mode'];

// Bruk den nye tabellen 'solitaire_scores'
$stmt = $conn->prepare("INSERT INTO solitaire_scores (spiller_navn, time_seconds, game_mode) VALUES (?, ?, ?)");
// 'sii' = string, integer, integer
$stmt->bind_param("sii", $spiller_navn, $time_seconds, $game_mode);

if ($stmt->execute()) {
  echo json_encode(["status" => "success", "message" => "Highscore lagret!"]);
} else {
  echo json_encode(["status" => "error", "message" => "Noe gikk galt."]);
}
$stmt->close();
$conn->close();
?>
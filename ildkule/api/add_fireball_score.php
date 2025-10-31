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
$poeng = $_POST['poeng'];

// Bruk den nye tabellen 'fireball_scores'
$stmt = $conn->prepare("INSERT INTO fireball_scores (spiller_navn, poeng) VALUES (?, ?)");
$stmt->bind_param("si", $spiller_navn, $poeng);

if ($stmt->execute()) {
  echo json_encode(["status" => "success", "message" => "Highscore lagret!"]);
} else {
  echo json_encode(["status" => "error", "message" => "Noe gikk galt."]);
}
$stmt->close();
$conn->close();
?>
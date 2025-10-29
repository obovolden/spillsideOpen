<?php
// ---- Viktig: Bytt ut disse med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// -------------------------------------------------------------

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) { die("Tilkobling feilet: " . $conn->connect_error); }

// Hent data fra JavaScript
$spiller_navn = $_POST['spiller_navn'];
$time_seconds = $_POST['time'];
$level = $_POST['level'];

// Bruk den nye tabellen 'memory_scores'
$stmt = $conn->prepare("INSERT INTO memory_scores (spiller_navn, time_seconds, level) VALUES (?, ?, ?)");
$stmt->bind_param("sds", $spiller_navn, $time_seconds, $level); // "d" for double/float

if ($stmt->execute()) {
  echo json_encode(["status" => "success", "message" => "Highscore lagret!"]);
} else {
  echo json_encode(["status" => "error", "message" => "Noe gikk galt."]);
}
$stmt->close();
$conn->close();
?>
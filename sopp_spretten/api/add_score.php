<?php
// ---- Viktig: Bytt ut disse med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// -------------------------------------------------------------

// Oppretter en tilkobling
$conn = new mysqli($servername, $username, $password, $dbname);

// Sjekker for tilkoblingsfeil
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

// Henter data sendt fra JavaScript (pass på å validere dette i et ekte spill)
$spiller_navn = $_POST['spiller_navn'];
$poeng = $_POST['poeng'];

// Bruker "prepared statements" for å forhindre SQL injection (Veldig viktig!)
$stmt = $conn->prepare("INSERT INTO highscores (spiller_navn, poeng) VALUES (?, ?)");
$stmt->bind_param("si", $spiller_navn, $poeng); // "s" for string, "i" for integer

// Utfører kommandoen og sender svar tilbake
if ($stmt->execute()) {
  echo json_encode(["status" => "success", "message" => "Highscore lagret!"]);
} else {
  echo json_encode(["status" => "error", "message" => "Noe gikk galt."]);
}

$stmt->close();
$conn->close();
?>
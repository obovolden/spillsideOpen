<?php
// ---- Viktig: Bytt ut disse med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// -------------------------------------------------------------

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

// Henter de 10 beste, sortert etter poeng (høyest først)
$sql = "SELECT spiller_navn, poeng FROM highscores ORDER BY poeng DESC LIMIT 10";
$result = $conn->query($sql);

$highscores = array();

if ($result->num_rows > 0) {
  while($row = $result->fetch_assoc()) {
    $highscores[] = $row;
  }
}

// Setter header til å fortelle nettleseren at dette er JSON
header('Content-Type: application/json');
echo json_encode($highscores);

$conn->close();
?>
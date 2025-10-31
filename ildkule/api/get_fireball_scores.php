<?php
// ---- Bytt ut med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// ---------------------------------------------

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) { die("Tilkobling feilet: " . $conn->connect_error); }

// Hent Topp 5 fra den nye tabellen, sortert etter poeng (høyest først)
$sql = "SELECT spiller_navn as name, poeng as score FROM fireball_scores ORDER BY poeng DESC LIMIT 5";
$result = $conn->query($sql);

$highscores = array();
if ($result->num_rows > 0) {
  while($row = $result->fetch_assoc()) {
    $highscores[] = $row;
  }
}

header('Content-Type: application/json');
echo json_encode($highscores);
$conn->close();
?>
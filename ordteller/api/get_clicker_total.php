<?php
// ---- Bytt ut med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// ---------------------------------------------

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Tilkobling feilet: " . $conn->connect_error);
}

// SQL-spørring for å summere alle poeng i 'poeng'-kolonnen
$sql = "SELECT SUM(poeng) as total_klikk FROM clicker_scores";
$result = $conn->query($sql);

$total_klikk = 0;
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    // Hvis tabellen er tom, vil SUM() returnere NULL, så vi sjekker for det.
    $total_klikk = $row['total_klikk'] ? (int)$row['total_klikk'] : 0;
}

header('Content-Type: application/json');
echo json_encode(['total_klikk' => $total_klikk]);

$conn->close();
?>
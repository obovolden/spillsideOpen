<?php
// ---- Bytt ut med DINE database-detaljer ----
$servername = "localhost";
$username = "gzaemhva_spillbr";
$password = "W0XG7txn2uy6";
$dbname = "gzaemhva_highscore";
// ---------------------------------------------

// Motta JSON-data sendt fra spillet
$data = json_decode(file_get_contents('php://input'));

// Valider at vi har mottatt all nødvendig data
if (!isset($data->username) || !isset($data->score) || !isset($data->time) || !isset($data->mode)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Mangler data']);
    exit;
}

// 1. Koble til databasen
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500); // Server Error
    echo json_encode(['error' => 'Database-tilkobling feilet']);
    exit;
}

// 2. Forbered en SIKKER spørring
$stmt = $conn->prepare(
    "INSERT INTO kabal_scores (username, score, time_seconds, game_mode) 
     VALUES (?, ?, ?, ?)"
);
$stmt->bind_param("siis", $data->username, $data->score, $data->time, $data->mode);

// 3. Kjør spørring
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Score lagret!']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Klarte ikke å lagre score']);
}

// 4. Lukk tilkoblinger
$stmt->close();
$conn->close();
?>
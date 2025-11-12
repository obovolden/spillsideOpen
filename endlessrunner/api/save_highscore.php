<?php
// --- 1. Konfigurasjon ---
$servername = "localhost";
$username = "din_database_bruker";
$password = "ditt_database_passord";
$dbname = "din_database_navn";
$tablename = "Endless_Knight_score"; // OPPDATERT TABELLNAVN

// --- 2. Sjekk at vi mottar data med POST ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit();
}

// --- 3. Les JSON-data fra JavaScript ---
$input = json_decode(file_get_contents('php://input'), true);

// Sjekk om dataene er gyldige
if (json_last_error() !== JSON_ERROR_NONE || !isset($input['name']) || !isset($input['score'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Invalid JSON input']);
    exit();
}

$name = $input['name'];
$score = (int)$input['score'];

// --- 4. Koble til databasen ---
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// --- 5. Lagre data (Sikkert med Prepared Statement) ---
$sql = "INSERT INTO $tablename (name, score) VALUES (?, ?)";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Statement preparation failed: ' . $conn->error]);
    $conn->close();
    exit();
}

// "si" betyr at vi binder én String (s) og én Integer (i)
$stmt->bind_param("si", $name, $score);

// --- 6. Utfør og send svar ---
if ($stmt->execute()) {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Score saved!']);
} else {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
}

// --- 7. Lukk ---
$stmt->close();
$conn->close();
?>
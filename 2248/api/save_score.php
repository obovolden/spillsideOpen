<?php
// save_score.php
header('Content-Type: application/json');
require 'db.php';

// Hent data fra JSON-body (siden vi bruker fetch i JS)
$input = json_decode(file_get_contents('php://input'), true);

if (isset($input['player_name']) && isset($input['score'])) {
    $name = trim($input['player_name']);
    $score = (int)$input['score'];

    // Enkel validering
    if (empty($name) || $score < 0) {
        echo json_encode(['success' => false, 'message' => 'Ugyldig data']);
        exit;
    }

    // Sikre mot XSS ved å fjerne farlige tegn fra navnet
    $name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');

    try {
        $stmt = $pdo->prepare("INSERT INTO `2248_highscores` (player_name, score) VALUES (?, ?)");
        $stmt->execute([$name, $score]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Databasefeil']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Manglende data']);
}
?>
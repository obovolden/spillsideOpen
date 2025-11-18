<?php
header('Content-Type: application/json');
require 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

if (isset($input['name']) && isset($input['score'])) {
    $name = substr(strip_tags($input['name']), 0, 50);
    $score = (int)$input['score'];

    try {
        // Sett inn i den nye tabellen 'breakout_highscores'
        $stmt = $pdo->prepare("INSERT INTO breakout_highscores (player_name, score) VALUES (?, ?)");
        $stmt->execute([$name, $score]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Ugyldig data']);
}
?>
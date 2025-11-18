<?php
header('Content-Type: application/json');
require 'db_connect.php';

try {
    // Hent topp 10 fra den nye tabellen 'breakout_highscores'
    $stmt = $pdo->query("SELECT player_name, score FROM breakout_highscores ORDER BY score DESC LIMIT 10");
    $scores = $stmt->fetchAll();
    echo json_encode($scores);
} catch (Exception $e) {
    echo json_encode(['error' => 'Kunne ikke hente scores']);
}
?>
<?php
// get_leaderboard.php
header('Content-Type: application/json');
require 'db.php';

try {
    // Hent topp 10 scores
    $stmt = $pdo->query("SELECT player_name, score FROM `2248_highscores` ORDER BY score DESC LIMIT 10");
    $scores = $stmt->fetchAll();
    
    echo json_encode($scores);
} catch (Exception $e) {
    echo json_encode(['error' => 'Klarte ikke laste topplisten']);
}
?>
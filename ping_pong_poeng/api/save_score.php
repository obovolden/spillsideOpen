<?php
header('Content-Type: application/json');
require 'db.php';

// Hent raw JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['status' => 'error', 'message' => 'Ingen data mottatt']);
    exit;
}

// Hvis ingen ligakode er satt, bruk "private" som standard
$league_code = !empty($input['league_code']) ? $input['league_code'] : 'private';

try {
    $stmt = $pdo->prepare("INSERT INTO ping_highscore 
        (league_code, player1_name, player2_name, player1_score, player2_score, winner_name) 
        VALUES (?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $league_code,
        $input['p1_name'],
        $input['p2_name'],
        $input['p1_score'],
        $input['p2_score'],
        $input['winner_name']
    ]);

    echo json_encode(['status' => 'success', 'message' => 'Resultat lagret i liga: ' . $league_code]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Databasefeil: ' . $e->getMessage()]);
}
?>
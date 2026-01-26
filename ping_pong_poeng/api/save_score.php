<?php
header('Content-Type: application/json');
require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['status' => 'error', 'message' => 'Ingen data']);
    exit;
}

$league_code = !empty($input['league_code']) ? $input['league_code'] : 'private';

try {
    // SCENARIO 1: Oppdatering av en eksisterende kamp (fra Terminliste eller Edit)
    if (isset($input['match_id']) && !empty($input['match_id'])) {
        $stmt = $pdo->prepare("UPDATE ping_highscore SET 
            player1_score = ?, 
            player2_score = ?, 
            winner_name = ? 
            WHERE id = ?");
        
        $stmt->execute([
            $input['p1_score'],
            $input['p2_score'],
            $input['winner_name'],
            $input['match_id']
        ]);
        $msg = "Resultat oppdatert!";
    } 
    // SCENARIO 2: Helt ny kamp (Quick Match uten terminliste)
    else {
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
        $msg = "Ny kamp lagret!";
    }

    echo json_encode(['status' => 'success', 'message' => $msg]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Databasefeil: ' . $e->getMessage()]);
}
?>
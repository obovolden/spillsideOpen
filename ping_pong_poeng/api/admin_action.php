<?php
header('Content-Type: application/json');
require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$action = isset($input['action']) ? $input['action'] : '';

try {
    if ($action === 'delete_match') {
        $stmt = $pdo->prepare("DELETE FROM ping_highscore WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['status' => 'success', 'message' => 'Kamp slettet.']);

    } elseif ($action === 'rename_player') {
        $old = $input['old_name'];
        $new = $input['new_name'];
        
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE ping_highscore SET player1_name = ? WHERE player1_name = ?")->execute([$new, $old]);
        $pdo->prepare("UPDATE ping_highscore SET player2_name = ? WHERE player2_name = ?")->execute([$new, $old]);
        $pdo->prepare("UPDATE ping_highscore SET winner_name = ? WHERE winner_name = ?")->execute([$new, $old]);
        $pdo->commit();

        echo json_encode(['status' => 'success', 'message' => "Endret navn til $new."]);

    } elseif ($action === 'rename_league') {
        $stmt = $pdo->prepare("UPDATE ping_highscore SET league_code = ? WHERE league_code = ?");
        $stmt->execute([$input['new_code'], $input['old_code']]);
        echo json_encode(['status' => 'success', 'message' => "Liga omdøpt."]);

    } elseif ($action === 'retire_player') {
        // "SOFT DELETE": Fjerner spilleren fra KOMMENDE kamper, men beholder historikk.
        $name = $input['name'];
        $league = $input['league_code'];

        // Slett fixtures hvor denne spilleren er med (winner_name IS NULL)
        $stmt = $pdo->prepare("DELETE FROM ping_highscore 
            WHERE league_code = ? 
            AND winner_name IS NULL 
            AND (player1_name = ? OR player2_name = ?)");
        
        $stmt->execute([$league, $name, $name]);

        echo json_encode(['status' => 'success', 'message' => "$name er fjernet fra terminlisten."]);

    } else {
        throw new Exception("Ukjent handling.");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
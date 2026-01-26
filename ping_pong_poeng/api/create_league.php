<?php
header('Content-Type: application/json');
require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$league_code = isset($input['league_code']) ? $input['league_code'] : '';
$players = isset($input['players']) ? $input['players'] : [];
$rounds = isset($input['rounds']) ? intval($input['rounds']) : 1; 

if (!$league_code || count($players) < 2) {
    echo json_encode(['status' => 'error', 'message' => 'Mangler ligakode eller nok spillere (min 2).']);
    exit;
}

try {
    $pdo->beginTransaction();

    $count = count($players);

    // ROUND ROBIN ALGORITME (Alle mot Alle)
    for ($r = 0; $r < $rounds; $r++) {
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                
                $p1 = $players[$i];
                $p2 = $players[$j];

                // Bytt hjemme/borte annenhver runde for variasjon
                if ($r % 2 != 0) {
                    $temp = $p1;
                    $p1 = $p2;
                    $p2 = $temp;
                }

                // HER ER FIXEN: Endret NULL til '' (to apostrofer)
                $stmt = $pdo->prepare("INSERT INTO ping_highscore 
                    (league_code, player1_name, player2_name, player1_score, player2_score, winner_name) 
                    VALUES (?, ?, ?, 0, 0, '')");
                
                $stmt->execute([$league_code, $p1, $p2]);
            }
        }
    }

    $pdo->commit();
    echo json_encode(['status' => 'success', 'message' => 'Liga opprettet med terminliste!']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
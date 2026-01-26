<?php
header('Content-Type: application/json');
require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$league_code = $input['league_code'];
$players = $input['players']; // Array av navn ["Per", "Pål", ...]
$rounds = isset($input['rounds']) ? $input['rounds'] : 1; // 1 = enkel, 2 = dobbel

if (!$league_code || count($players) < 2) {
    echo json_encode(['status' => 'error', 'message' => 'Mangler liga eller nok spillere']);
    exit;
}

try {
    $pdo->beginTransaction();

    $fixtures = [];
    $count = count($players);

    // Round Robin Algoritme
    for ($r = 0; $r < $rounds; $r++) {
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                // Legg til kamp (p1 vs p2)
                $p1 = $players[$i];
                $p2 = $players[$j];
                
                // Hvis runde 2, bytt hjemme/borte (valgfritt)
                if ($r % 2 != 0) { $temp = $p1; $p1 = $p2; $p2 = $temp; }

                // ENDRING HER: Endret NULL til '' (tom streng) for winner_name
                $stmt = $pdo->prepare("INSERT INTO ping_highscore 
                    (league_code, player1_name, player2_name, player1_score, player2_score, winner_name) 
                    VALUES (?, ?, ?, 0, 0, '')");
                
                $stmt->execute([$league_code, $p1, $p2]);
            }
        }
    }

    $pdo->commit();
    echo json_encode(['status' => 'success', 'message' => 'Liga og terminliste opprettet!']);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
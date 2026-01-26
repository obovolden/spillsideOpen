<?php
header('Content-Type: application/json');
require 'db.php';

try {
    // 1. Hent unike ligakoder (ekskluder 'private' hvis du vil, eller behold den)
    // Sorterer synkende på ID for å få de nyeste først (antar at tabellen har en ID-kolonne)
    $stmtLeague = $pdo->query("SELECT DISTINCT league_code FROM ping_highscore WHERE league_code != '' ORDER BY id DESC LIMIT 50");
    $leagues = $stmtLeague->fetchAll(PDO::FETCH_COLUMN);

    // 2. Hent unike spillernavn (både fra spiller 1 og spiller 2 kolonnen)
    $stmtPlayers = $pdo->query("
        SELECT DISTINCT name FROM (
            SELECT player1_name as name FROM ping_highscore
            UNION
            SELECT player2_name as name FROM ping_highscore
        ) as all_players 
        WHERE name != '' 
        ORDER BY name ASC
    ");
    $players = $stmtPlayers->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'leagues' => $leagues,
        'players' => $players
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
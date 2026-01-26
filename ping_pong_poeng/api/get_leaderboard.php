<?php
header('Content-Type: application/json');
require 'db.php';

$league_code = isset($_GET['league_code']) ? $_GET['league_code'] : '';

if (empty($league_code)) {
    echo json_encode(['leaderboard' => [], 'history' => [], 'upcoming' => []]);
    exit;
}

try {
    // 1. LEADERBOARD (Kun ferdige kamper: winner_name IS NOT NULL)
    $sqlLeaderboard = "
    SELECT 
        player_name,
        COUNT(*) as kamper,
        SUM(is_win) as seiere,
        SUM(is_loss) as tap,
        (SUM(points_for) - SUM(points_against)) as diff,
        (SUM(is_win) * 2) as poeng
    FROM (
        SELECT 
            player1_name as player_name,
            IF(winner_name = player1_name, 1, 0) as is_win,
            IF(winner_name != player1_name, 1, 0) as is_loss,
            player1_score as points_for,
            player2_score as points_against
        FROM ping_highscore 
        WHERE league_code = ? AND winner_name IS NOT NULL AND winner_name != ''
        UNION ALL
        SELECT 
            player2_name as player_name,
            IF(winner_name = player2_name, 1, 0) as is_win,
            IF(winner_name != player2_name, 1, 0) as is_loss,
            player2_score as points_for,
            player1_score as points_against
        FROM ping_highscore 
        WHERE league_code = ? AND winner_name IS NOT NULL AND winner_name != ''
    ) as combined_stats
    GROUP BY player_name
    ORDER BY poeng DESC, diff DESC, kamper ASC
    ";

    $stmt = $pdo->prepare($sqlLeaderboard);
    $stmt->execute([$league_code, $league_code]);
    $leaderboard = $stmt->fetchAll();

    // 2. ALLE KAMPER (Henter alt, sorterer i PHP)
    $sqlMatches = "SELECT id, player1_name, player2_name, player1_score, player2_score, winner_name, created_at 
                   FROM ping_highscore 
                   WHERE league_code = ? 
                   ORDER BY id DESC"; // Nyeste først (for historikk)
    
    $stmtM = $pdo->prepare($sqlMatches);
    $stmtM->execute([$league_code]);
    $allMatches = $stmtM->fetchAll();

    $history = [];
    $upcoming = [];

    foreach ($allMatches as $match) {
        if ($match['winner_name'] && $match['winner_name'] !== '') {
            $history[] = $match;
        } else {
            // Kommende kamper vil vi gjerne ha sortert med ELDST først (neste kamp)
            // Men siden SQL sorterer DESC, legger vi dem inn og snur arrayet etterpå eller bruker array_unshift
            $upcoming[] = $match; 
        }
    }
    
    // Snu upcoming slik at den eldste (første i terminlisten) kommer øverst
    $upcoming = array_reverse($upcoming);

    echo json_encode([
        'leaderboard' => $leaderboard,
        'history' => $history,
        'upcoming' => $upcoming
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
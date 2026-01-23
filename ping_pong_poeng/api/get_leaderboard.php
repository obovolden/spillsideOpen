<?php
header('Content-Type: application/json');
require 'db.php';

$league_code = isset($_GET['league_code']) ? $_GET['league_code'] : '';

if (empty($league_code)) {
    echo json_encode([]);
    exit;
}

try {
    $sql = "
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
        FROM ping_highscore WHERE league_code = ?
        UNION ALL
        SELECT 
            player2_name as player_name,
            IF(winner_name = player2_name, 1, 0) as is_win,
            IF(winner_name != player2_name, 1, 0) as is_loss,
            player2_score as points_for,
            player1_score as points_against
        FROM ping_highscore WHERE league_code = ?
    ) as combined_stats
    GROUP BY player_name
    ORDER BY poeng DESC, diff DESC, kamper ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$league_code, $league_code]);
    echo json_encode($stmt->fetchAll());

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

require 'db_connect.php';

// ENDRET HER: Bytter ut 'scores' med 'tetris_scores'
$sql = "SELECT name, score FROM tetris_scores ORDER BY score DESC LIMIT 10";
$result = $conn->query($sql);

$scores = array();

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $scores[] = $row;
    }
}

echo json_encode($scores);

$conn->close();
?>
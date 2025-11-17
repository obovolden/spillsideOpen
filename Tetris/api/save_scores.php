<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

require 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->name) && isset($data->score)) {
    $name = $data->name;
    $score = $data->score;

    // ENDRET HER: Bytter ut 'scores' med 'tetris_scores'
    $stmt = $conn->prepare("INSERT INTO tetris_scores (name, score) VALUES (?, ?)");
    $stmt->bind_param("si", $name, $score);

    if ($stmt->execute()) {
        echo json_encode(["message" => "Score lagret suksessfullt"]);
    } else {
        echo json_encode(["message" => "Feil ved lagring: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["message" => "Manglende data"]);
}

$conn->close();
?>
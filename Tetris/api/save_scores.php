<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

require 'db_connect.php';

// Hent JSON-data fra spillet
$data = json_decode(file_get_contents("php://input"));

if (isset($data->name) && isset($data->score)) {
    $name = $data->name;
    $score = $data->score;

    // Bruk "Prepared Statements" for å hindre SQL-injection (sikkerhet)
    $stmt = $conn->prepare("INSERT INTO scores (name, score) VALUES (?, ?)");
    $stmt->bind_param("si", $name, $score); // "s" betyr string, "i" betyr integer

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
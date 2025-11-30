<?php
// Hent tilkoblingen fra den andre filen
require 'db.php'; 

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Hent data fra spillet
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

// --- 1. LAGRE POENG ---
if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = strip_tags($input['name']); 
    $score = (int)$input['score'];

    if ($name && $score > 0) {
        // Vi bruker $pdo som ble laget i db.php
        $stmt = $pdo->prepare("INSERT INTO leaderboard (name, score) VALUES (:name, :score)");
        $stmt->execute(['name' => $name, 'score' => $score]);
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Ugyldig data"]);
    }
    exit;
}

// --- 2. HENT TOPPLISTE ---
if ($action === 'get') {
    // Vi bruker $pdo som ble laget i db.php
    $stmt = $pdo->query("SELECT name, score FROM leaderboard ORDER BY score DESC LIMIT 10");
    $results = $stmt->fetchAll();
    
    echo json_encode($results);
    exit;
}
?>
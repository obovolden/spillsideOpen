<?php
$host = 'localhost';
$db   = 'ditt_database_navn'; // HUSK Å ENDRE DENNE
$user = 'ditt_brukernavn';    // HUSK Å ENDRE DENNE
$pass = 'ditt_passord';       // HUSK Å ENDRE DENNE
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    echo json_encode(['error' => 'Databasefeil']);
    exit;
}
?>
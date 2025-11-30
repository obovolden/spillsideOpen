<?php
// db.php
$host = "localhost";
$db   = "gzaemhva_highscore"; // Databasen din
$user = "gzaemhva_spillbr";   // Brukernavnet ditt
$pass = "W0XG7txn2uy6";       // Passordet ditt
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
    // I et ekte spill ville vi kanskje logget dette til en fil i stedet for å vise det
    die("Database-feil: " . $e->getMessage());
}
?>
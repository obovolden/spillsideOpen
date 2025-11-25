<?php
// db.php
$host = "localhost";      // Din database-host (ofte localhost)
$db   = "gzaemhva_highscore"; // Navnet på databasen din
$user = "gzaemhva_spillbr"; // Ditt database-brukernavn
$pass = "W0XG7txn2uy6";    // Ditt database-passord
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
    // I produksjon bør du ikke vise denne feilen direkte til brukeren
    die("Database-feil: " . $e->getMessage());
}
?>



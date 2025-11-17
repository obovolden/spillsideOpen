<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); // Tillat tilgang (kan fjernes hvis filene ligger på samme domene)

require 'db_connect.php';

// SQL for å hente topp 10 sortert etter score (høyest først)
$sql = "SELECT name, score FROM scores ORDER BY score DESC LIMIT 10";
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
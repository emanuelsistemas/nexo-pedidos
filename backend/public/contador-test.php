<?php
header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'message' => 'Endpoint funcionando',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>

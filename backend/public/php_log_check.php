<?php
header('Content-Type: text/plain');

echo "PHP Error Logging Configuration:\n";
echo "================================\n\n";

echo "error_reporting: " . ini_get('error_reporting') . " (" . error_reporting() . ")\n";
echo "display_errors: " . ini_get('display_errors') . "\n";
echo "log_errors: " . ini_get('log_errors') . "\n";
echo "error_log: " . ini_get('error_log') . "\n\n";

$error_log_path = ini_get('error_log');
if ($error_log_path) {
    echo "Attempting to write a test message to: " . $error_log_path . "\n";
    $timestamp = date('Y-m-d H:i:s');
    $test_message = "[{$timestamp}] TEST LOG MESSAGE from php_log_check.php - Nexo Pedidos Debug\n";
    $result = error_log($test_message);
    if ($result) {
        echo "Test message written successfully (according to error_log function).\n";
        echo "Please check the content of '{$error_log_path}'.\n";
        if (is_writable($error_log_path) || (file_exists($error_log_path) && is_writable(dirname($error_log_path)))) {
            echo "PHP *should* have permission to write to this file/directory.\n";
        } else {
            echo "WARNING: PHP might NOT have permission to write to '{$error_log_path}'. Check file/directory permissions.\n";
        }
    } else {
        echo "Failed to write test message using error_log().\n";
    }
} else {
    echo "error_log path is not set. Errors might be going to syslog or stderr of the web server process.\n";
}

echo "\nDone.\n";
?>

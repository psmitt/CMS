<?php // ŰTF-8 without BOM

require_once 'Dispatcher.php';
if ($_SESSION['role'] != 'Admin'
and $_SESSION['role'] != 'Agent')
    header('Location: /EUP');

$settings = json_decode(file_get_contents("$profile/Settings.json"), true);
$test     = strtolower($_SERVER['HTTP_HOST']) == 'cms4test' ? ' TEST' : '';

echo str_replace(['href="Font/Barlow.css"',
                  '<script src="Electron.js"></script>'],
                 ['href="https://fonts.googleapis.com/css?family=Barlow+Semi+Condensed"',
                  '<script src="IIS.js"></script>'],
                 file_get_contents('index.html'));
?>

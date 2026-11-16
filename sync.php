<?php
// Riffbook — library sync through the website (no Google account needed).
// Every device that uses the same "sync code" shares the same library.
// Data is stored in ./sync-data/<hash of the code>/ and is not reachable directly from the web.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$MAX_FILE = 25 * 1024 * 1024;   // 25 MB per file
$MAX_LIB  = 10 * 1024 * 1024;   // 10 MB library index

function fail($code, $msg) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }

$a = isset($_GET['a']) ? $_GET['a'] : '';
if ($a === 'ping') { echo json_encode(['ok' => true, 'app' => 'riffbook', 'v' => 1]); exit; }

$key = isset($_SERVER['HTTP_X_RIFFBOOK_KEY']) ? $_SERVER['HTTP_X_RIFFBOOK_KEY'] : '';
if ($key === '' && isset($_GET['k'])) $key = $_GET['k'];
if (strlen($key) < 6 || strlen($key) > 200) fail(401, 'Sync code missing or shorter than 6 characters');

$base = __DIR__ . '/sync-data';
if (!is_dir($base)) {
  if (!@mkdir($base, 0755, true)) fail(500, 'The server does not allow creating the sync-data folder');
  @file_put_contents($base . '/.htaccess',
    "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
  @file_put_contents($base . '/index.html', '');
}
$dir = $base . '/' . hash('sha256', 'riffbook:' . $key);
if (!is_dir($dir . '/files') && !@mkdir($dir . '/files', 0755, true)) fail(500, 'Could not create the library folder');

$id = isset($_GET['id']) ? preg_replace('/[^A-Za-z0-9_-]/', '', $_GET['id']) : '';
$post = $_SERVER['REQUEST_METHOD'] === 'POST';

switch ($a) {
  case 'lib':
    $f = $dir . '/library.json';
    if ($post) {
      $body = file_get_contents('php://input');
      if (strlen($body) > $MAX_LIB) fail(413, 'Library index too large');
      if (json_decode($body) === null) fail(400, 'Invalid library data');
      if (@file_put_contents($f . '.tmp', $body) === false) fail(500, 'Could not save (disk full or no permission?)');
      @rename($f . '.tmp', $f);
      echo json_encode(['ok' => true]);
    } else {
      echo is_file($f) ? file_get_contents($f) : 'null';
    }
    break;

  case 'file':
    if ($id === '') fail(400, 'Missing file id');
    $f = $dir . '/files/' . $id . '.bin';
    if ($post) {
      $body = file_get_contents('php://input');
      if (strlen($body) > $MAX_FILE) fail(413, 'File too large');
      if (@file_put_contents($f, $body) === false) fail(500, 'Could not save the file');
      echo json_encode(['ok' => true]);
    } else {
      if (!is_file($f)) fail(404, 'File not found on the server');
      header('Content-Type: application/octet-stream');
      header('Content-Length: ' . filesize($f));
      readfile($f);
    }
    break;

  case 'del':
    if ($id !== '') @unlink($dir . '/files/' . $id . '.bin');
    echo json_encode(['ok' => true]);
    break;

  default:
    fail(400, 'Unknown action');
}

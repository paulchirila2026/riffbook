# Riffbook local server (Windows, no install needed).
# Serves this folder at http://localhost:8780 and opens the browser.
# Browsers block apps like this when index.html is opened directly as a file.

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$port = 8780

$listener = $null
foreach ($p in @(8780, 8781, 8782, 8783)) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start()
    $listener = $l; $port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host 'Could not start the server (ports 8780-8783 are busy).'; Read-Host 'Press Enter to close'; exit 1 }

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.htm' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json'; '.txt' = 'text/plain; charset=utf-8'
  '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
  '.woff2' = 'font/woff2'; '.woff' = 'font/woff'; '.otf' = 'font/otf'
  '.sf2' = 'application/octet-stream'; '.sf3' = 'application/octet-stream'
}

Write-Host ''
Write-Host "  Riffbook is running at  http://localhost:$port"
Write-Host '  Keep this window open while using the app. Close it to stop.'
Write-Host ''
try { Start-Process "http://localhost:$port/" } catch { Write-Host "  Open http://localhost:$port in the browser." }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel = $rel + 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-cache')
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
    }
  } catch {
    try { $res.StatusCode = 500 } catch { }
  } finally {
    try { $res.Close() } catch { }
  }
}

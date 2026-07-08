$root = "C:\Users\ELITEBOOK\Documents\GitHub\github pharmacie dafeanne"
$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serveur demarré sur http://localhost:$port" -ForegroundColor Green
Write-Host "Root: $root" -ForegroundColor Cyan
Write-Host "Appuyez Ctrl+C pour arreter" -ForegroundColor Yellow

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css'
  '.js'   = 'application/javascript'
  '.json' = 'application/json'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $urlPath = $req.Url.LocalPath
    if ($urlPath -eq '/') { $urlPath = '/index.html' }

    $filePath = Join-Path $root $urlPath.TrimStart('/')

    # DÉSACTIVER LE CACHE - FICHIERS FRAIS À CHAQUE REQUÊTE
    $res.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
    $res.AddHeader("Pragma", "no-cache")
    $res.AddHeader("Expires", "0")

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath)
      $mime = if ($mimeTypes[$ext]) { $mimeTypes[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)

      # DEBUG: Log pour vérifier le chemin et la taille
      if ($urlPath -like "*/app.js") {
        Write-Host "📄 Serving app.js from: $filePath ($(($bytes | Measure-Object -Property Length).Sum) bytes)" -ForegroundColor Cyan
      }

      $res.ContentType = $mime
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.OutputStream.Close()
  } catch {}
}

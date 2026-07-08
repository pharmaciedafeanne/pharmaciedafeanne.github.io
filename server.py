#!/usr/bin/env python3
import http.server
import socketserver
import os
from pathlib import Path

PORT = 3000
ROOT = Path(__file__).parent

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

os.chdir(ROOT)
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serveur démarré sur http://localhost:{PORT}")
    print(f"Root: {ROOT}")
    httpd.serve_forever()

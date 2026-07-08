#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = str(Path(__file__).parent)

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable all caching
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def translate_path(self, path):
        # Serve from ROOT directory
        path = super().translate_path(path)
        relpath = os.path.relpath(path, os.getcwd())
        return os.path.join(ROOT, relpath)

os.chdir(ROOT)

with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    print(f"✅ Serveur démarré sur http://localhost:{PORT}")
    print(f"📁 Root: {ROOT}")
    print("🚫 Cache DÉSACTIVÉ - fichiers frais à chaque requête!")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Serveur arrêté")

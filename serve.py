"""Serve only the game file for local testing. Use --lan only on trusted Wi-Fi."""
from __future__ import annotations
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--lan', action='store_true', help='Listen on the local network, not only this computer.')
    parser.add_argument('--file', type=Path, default=Path(__file__).resolve().parent / 'index.html')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error('--port must be between 0 and 65535.')
    try:
        payload = args.file.read_bytes()
    except OSError as error:
        parser.exit(1, f'Cannot read the game: {error}\n')

    class GameHandler(BaseHTTPRequestHandler):
        def respond(self, body: bool) -> None:
            path = urlsplit(self.path).path
            if path == '/favicon.ico':
                self.send_response(204)
                self.end_headers()
                return
            if path not in ('/', '/index.html'):
                self.send_error(404, 'Only the game is served.')
                return
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            if body:
                try:
                    self.wfile.write(payload)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        def do_GET(self) -> None:
            self.respond(True)

        def do_HEAD(self) -> None:
            self.respond(False)

    address = '0.0.0.0' if args.lan else '127.0.0.1'
    try:
        server = ThreadingHTTPServer((address, args.port), GameHandler)
    except OSError as error:
        parser.exit(1, f'Cannot start the server: {error}\n')
    actual_port = server.server_port
    print(f'Computer: http://127.0.0.1:{actual_port}', flush=True)
    if args.lan:
        print(f'Phone on the same trusted Wi-Fi: http://YOUR-COMPUTER-LAN-IP:{actual_port}', flush=True)
        print('Local-network access is enabled. This is not a public or production server.', flush=True)
    print('Stop with Ctrl+C.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()

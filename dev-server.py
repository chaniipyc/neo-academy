import http.server
import socketserver

PORT = 5500


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with ReusableTCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    httpd.serve_forever()

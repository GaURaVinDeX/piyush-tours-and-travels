const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const apiHandler = require('./api/index.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Route API requests to the shared serverless API handler
  if (pathname.startsWith('/api')) {
    return apiHandler(req, res);
  }

  // --- STATIC FILE SERVING ---
  let filePath = '';
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (pathname === '/admin' || pathname === '/admin.html') {
    filePath = path.join(PUBLIC_DIR, 'admin.html');
  } else {
    // Sanitize path to prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>404 Not Found - Piyush Tours and Travels</title>
        <style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8f9fa;color:#333;}</style>
        </head>
        <body>
          <h2>404 - Page Not Found</h2>
          <p>The requested page does not exist.</p>
          <a href="/" style="color:#d97706;font-weight:bold;text-decoration:none;">← Return to Home</a>
        </body>
        </html>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚕 Piyush Tours and Travels Server Running!`);
  console.log(`📍 Website URL:     http://localhost:${PORT}`);
  console.log(`🔐 Admin Panel URL: http://localhost:${PORT}/admin`);
  console.log(`🔑 Default Admin Password: admin`);
  if (process.env.DATABASE_URL) {
    console.log(`⚡ Connected to Neon Database (Serverless Postgres)`);
  } else {
    console.log(`📁 Using local data/database.json storage`);
  }
  console.log(`====================================================`);
});

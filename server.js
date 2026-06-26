require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildSystemPrompt, callOpenAI } = require('./lib/chat-core');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.md':   'text/markdown; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  // ── /api/chat ──────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);
        const systemPrompt = buildSystemPrompt();
        const reply = await callOpenAI(systemPrompt, messages);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ reply }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '서버 오류가 발생했습니다.' }));
      }
    });
    return;
  }

  // ── 정적 파일 서빙 ──────────────────────────────────────
  let filePath = req.url === '/' ? '/index.html' : req.url;
  // URL decode for filenames with spaces
  filePath = decodeURIComponent(filePath);
  const absPath = path.join(__dirname, filePath);

  fs.readFile(absPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(absPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`merm VENTURES server running → http://localhost:${PORT}`);
});

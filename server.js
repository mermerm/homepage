require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { callOpenAI }  = require('./lib/chat-core');
const { getSupabase } = require('./lib/supabase');

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // ── POST /api/chat ─────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const { messages } = await readBody(req);
      if (!Array.isArray(messages)) return json(res, 400, { error: 'messages 배열 필요' });
      const reply = await callOpenAI(messages);
      json(res, 200, { reply });
    } catch (err) {
      console.error(err);
      json(res, 500, { error: '서버 오류가 발생했습니다.' });
    }
    return;
  }

  // ── POST /api/lead ──────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/lead') {
    try {
      const { name, email, phone, message } = await readBody(req);
      if (!name || !email) return json(res, 400, { error: '이름과 이메일은 필수입니다.' });

      const supabase = getSupabase();
      if (!supabase) return json(res, 503, { error: 'DB 미설정' });

      const { error } = await supabase.from('leads').insert({ name, email, phone: phone || null, message: message || null });
      if (error) throw error;
      json(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      json(res, 500, { error: '저장 중 오류가 발생했습니다.' });
    }
    return;
  }

  // ── 정적 파일 서빙 ──────────────────────────────────────
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = decodeURIComponent(filePath.split('?')[0]);
  const absPath = path.join(__dirname, filePath);

  fs.readFile(absPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(absPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`merm VENTURES server running → http://localhost:${PORT}`);
});

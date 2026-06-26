const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getSupabase() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  // Node 24(Vercel)는 native WebSocket 지원, Node 20(로컬)은 ws 패키지 필요
  const options = { auth: { persistSession: false } };
  if (!globalThis.WebSocket) {
    try { options.realtime = { transport: require('ws') }; } catch {}
  }

  _client = createClient(url, key, options);
  return _client;
}

module.exports = { getSupabase };

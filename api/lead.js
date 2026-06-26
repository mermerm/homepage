// Vercel Serverless Function — 상담 리드 저장
const { getSupabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, email, phone, message } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: '이름과 이메일은 필수입니다.' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: 'DB 미설정 — 관리자에게 문의하세요.' });
  }

  const { error } = await supabase
    .from('leads')
    .insert({ name, email, phone: phone || null, message: message || null });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: '저장 중 오류가 발생했습니다.' });
  }

  return res.status(200).json({ ok: true });
};

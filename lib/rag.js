const OpenAI = require('openai');
const { getSupabase } = require('./supabase');

const CHUNK_SIZE    = 600;   // 청크당 최대 문자 수
const CHUNK_OVERLAP = 80;    // 청크 간 겹침
const TOP_K         = 5;     // 유사도 검색 결과 수
const EMBED_MODEL   = 'text-embedding-3-small';

// ── 텍스트 청킹 ──────────────────────────────────────────────
function chunkText(text) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + '\n\n' + trimmed).length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      // 겹침: 현재 청크 끝부분 재사용
      current = current.slice(-CHUNK_OVERLAP) + '\n\n' + trimmed;
    } else {
      current = current ? current + '\n\n' + trimmed : trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

// ── 임베딩 생성 ──────────────────────────────────────────────
async function embed(texts) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.embeddings.create({
    model: EMBED_MODEL,
    input: texts,
  });
  return res.data.map(d => d.embedding);
}

// ── RAG 검색: 질문 → 유사 청크 top-K ────────────────────────
async function retrieveContext(query) {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const [queryEmbedding] = await embed([query]);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: TOP_K,
    });

    if (error || !data || data.length === 0) return null;

    return data.map(d => d.content).join('\n\n---\n\n');
  } catch {
    return null;
  }
}

module.exports = { chunkText, embed, retrieveContext };

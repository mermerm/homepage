/**
 * 실행: node scripts/ingest.js
 * uploads/*.md 를 청크·임베딩해 Supabase documents 테이블에 적재합니다.
 * 중복 방지: 실행 전 기존 rows를 source 기준으로 삭제 후 재삽입.
 */
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { getSupabase }      = require('../lib/supabase');
const { chunkText, embed } = require('../lib/rag');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const BATCH_SIZE  = 20; // 임베딩 API 한 번에 보낼 청크 수

async function ingest() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인하세요.');
    process.exit(1);
  }

  const mdFiles = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    console.log('업로드 폴더에 .md 파일이 없습니다.');
    return;
  }

  for (const file of mdFiles) {
    console.log(`\n📄  처리 중: ${file}`);
    const text   = fs.readFileSync(path.join(UPLOADS_DIR, file), 'utf-8');
    const chunks = chunkText(text);
    console.log(`   → ${chunks.length}개 청크 생성`);

    // 기존 데이터 삭제
    await supabase.from('documents').delete().eq('source', file);

    // 배치 임베딩 & 삽입
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch     = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embed(batch);

      const rows = batch.map((content, j) => ({
        source:    file,
        chunk_idx: i + j,
        content,
        embedding: embeddings[j],
      }));

      const { error } = await supabase.from('documents').insert(rows);
      if (error) {
        console.error(`   ❌ 삽입 오류 (배치 ${i}):`, error.message);
      } else {
        console.log(`   ✅ ${i + batch.length}/${chunks.length} 청크 저장`);
      }
    }
  }

  console.log('\n🎉  모든 문서 적재 완료!');
}

ingest().catch(err => {
  console.error(err);
  process.exit(1);
});

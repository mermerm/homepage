const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { retrieveContext } = require('./rag');
const { getSupabase }     = require('./supabase');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// 전체 문서 읽기 (폴백용)
function loadAllDocs() {
  return fs
    .readdirSync(UPLOADS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(UPLOADS_DIR, f), 'utf-8');
      return `\n\n===== ${f} =====\n${content}`;
    })
    .join('');
}

function buildSystemPrompt(context) {
  return `당신은 merm벤처스(merm VENTURES)의 공식 AI 상담 어시스턴트입니다.
이름은 "머미(Mermy)"이며, 브랜딩·디자인 서비스에 대해 안내하는 역할입니다.

[답변 규칙]
1. 자기소개·대화형 질문("이름이 뭐야", "누구야" 등): 이름과 역할을 자연스럽고 친근하게 소개하세요.
2. 서비스·정책 관련 질문: 아래 지식베이스 내용만 사용하여 답하세요. 내용에 없으면 "정확한 안내를 위해 무료 상담을 신청해 주세요. 📩 hello@mermventures.co.kr"로 안내하세요.
3. 서비스와 무관한 질문(날씨, 일반 상식 등): "저는 merm벤처스 서비스 관련 질문만 답할 수 있어요. 브랜딩이나 디자인에 대해 궁금한 점이 있으신가요? 😊"라고 안내하세요.
4. 문서에 없는 정보는 절대 창작하거나 추측하지 마세요.
5. 답변은 친근하고 전문적인 톤으로, 한국어로 작성하세요. 이모지를 적절히 활용하세요.

[지식베이스]
${context}`;
}

// 대화 로그 저장 (best-effort)
async function logChat(userMsg, botReply) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('chat_logs').insert({ user_msg: userMsg, bot_reply: botReply });
  } catch { /* 실패해도 무시 */ }
}

async function callOpenAI(messages) {
  // 마지막 사용자 메시지로 RAG 검색
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  // RAG 시도 → 실패 시 전체 문서 폴백
  let context = await retrieveContext(lastUserMsg);
  if (!context) {
    context = loadAllDocs();
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const trimmed = messages.slice(-10);

  const completion = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: buildSystemPrompt(context) },
      ...trimmed,
    ],
    max_completion_tokens: 600,
    temperature: 0.4,
  });

  const reply = completion.choices[0].message.content;

  // 대화 로그 비동기 저장 (응답에 영향 없음)
  logChat(lastUserMsg, reply);

  return reply;
}

module.exports = { callOpenAI };

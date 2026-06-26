const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function buildSystemPrompt() {
  const docs = fs
    .readdirSync(UPLOADS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(UPLOADS_DIR, f), 'utf-8');
      return `\n\n===== ${f} =====\n${content}`;
    })
    .join('');

  return `당신은 merm벤처스(merm VENTURES)의 공식 AI 상담 어시스턴트입니다.
이름은 "머미(Mermy)"이며, 브랜딩·디자인 서비스에 대해 안내하는 역할입니다.

[답변 규칙]
1. 자기소개·대화형 질문("이름이 뭐야", "누구야" 등): 이름과 역할을 자연스럽고 친근하게 소개하세요.
2. 서비스·정책 관련 질문: 아래 지식베이스 문서 내용만 사용하여 답하세요. 문서에 없는 내용은 "정확한 안내를 위해 무료 상담을 신청해 주세요. 📩 hello@mermventures.co.kr"로 안내하세요.
3. 서비스와 무관한 질문(날씨, 일반 상식 등): "저는 merm벤처스 서비스 관련 질문만 답할 수 있어요. 브랜딩이나 디자인에 대해 궁금한 점이 있으신가요? 😊"라고 안내하세요.
4. 문서에 없는 정보는 절대 창작하거나 추측하지 마세요.
5. 답변은 친근하고 전문적인 톤으로, 한국어로 작성하세요. 이모지를 적절히 활용하세요.

[지식베이스]${docs}`;
}

async function callOpenAI(systemPrompt, messages) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 최근 10개 메시지(5턴)만 유지
  const trimmed = messages.slice(-10);

  const completion = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...trimmed,
    ],
    max_completion_tokens: 600,
    temperature: 0.4,
  });

  return completion.choices[0].message.content;
}

module.exports = { buildSystemPrompt, callOpenAI };

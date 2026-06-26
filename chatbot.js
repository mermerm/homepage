(function () {
  'use strict';

  // ── 상수 ────────────────────────────────────────────────
  const ACCENT   = '#C8963E';
  const NAVY     = '#13213B';
  const CREAM    = '#F8F6F1';
  const WELCOME  = '안녕하세요! 저는 merm벤처스 AI 상담 어시스턴트 **머미(Mermy)**예요 😊\n브랜딩·디자인 서비스에 대해 궁금한 점을 편하게 물어보세요!';
  const API_URL  = '/api/chat';
  const MAX_HIST = 10; // 최근 10개 메시지

  let history = [];   // {role, content}[]
  let isOpen  = false;
  let isLoading = false;

  // ── 스타일 주입 ─────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #mb-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 9000;
      width: 60px; height: 60px; border-radius: 50%;
      background: ${ACCENT}; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(200,150,62,.45);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #mb-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(200,150,62,.55); }
    #mb-fab svg { width: 28px; height: 28px; }

    #mb-window {
      position: fixed; bottom: 100px; right: 28px; z-index: 8999;
      width: 380px; max-width: calc(100vw - 40px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 12px 48px rgba(19,33,59,.18);
      display: flex; flex-direction: column; overflow: hidden;
      font-family: Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
      transform: translateY(18px) scale(.97); opacity: 0;
      pointer-events: none;
      transition: transform .28s cubic-bezier(.34,1.56,.64,1), opacity .22s ease;
    }
    #mb-window.open {
      transform: translateY(0) scale(1); opacity: 1;
      pointer-events: auto;
    }

    #mb-header {
      background: ${NAVY}; color: ${CREAM};
      padding: 16px 20px; display: flex; align-items: center; gap: 12px;
    }
    #mb-header-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: ${ACCENT}; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 15px; color: ${NAVY}; flex-shrink: 0;
    }
    #mb-header-info { flex: 1; }
    #mb-header-name { font-weight: 700; font-size: 15px; }
    #mb-header-sub  { font-size: 11px; color: rgba(248,246,241,.6); margin-top: 1px; }
    #mb-close {
      background: none; border: none; cursor: pointer;
      color: rgba(248,246,241,.6); padding: 4px;
      display: flex; align-items: center; transition: color .15s;
    }
    #mb-close:hover { color: ${CREAM}; }
    #mb-close svg { width: 18px; height: 18px; }

    #mb-messages {
      flex: 1; overflow-y: auto; padding: 20px 16px;
      display: flex; flex-direction: column; gap: 12px;
      min-height: 300px; max-height: 400px;
      background: #FAFAF8;
    }
    #mb-messages::-webkit-scrollbar { width: 4px; }
    #mb-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

    .mb-bubble {
      max-width: 82%; padding: 11px 14px;
      border-radius: 14px; font-size: 14px; line-height: 1.65;
      word-break: break-word; animation: mb-pop .18s ease;
    }
    .mb-bubble strong { font-weight: 700; }
    .mb-bubble br { display: block; content: ''; margin-top: 4px; }
    @keyframes mb-pop { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }

    .mb-bot  { background: #fff; color: #1B2D4F; border: 1px solid #EDEAE4; align-self: flex-start; border-bottom-left-radius: 4px; }
    .mb-user { background: ${ACCENT}; color: ${NAVY}; align-self: flex-end; border-bottom-right-radius: 4px; font-weight: 500; }
    .mb-err  { background: #FEF2F2; color: #B91C1C; border: 1px solid #FCA5A5; align-self: flex-start; font-size: 13px; }

    .mb-dots { display: inline-flex; gap: 4px; align-items: center; padding: 4px 0; }
    .mb-dots span {
      width: 7px; height: 7px; border-radius: 50%;
      background: ${ACCENT}; display: inline-block;
      animation: mb-bounce .9s infinite ease-in-out;
    }
    .mb-dots span:nth-child(2) { animation-delay: .18s; }
    .mb-dots span:nth-child(3) { animation-delay: .36s; }
    @keyframes mb-bounce {
      0%,80%,100% { transform: translateY(0); opacity:.5; }
      40%          { transform: translateY(-6px); opacity:1; }
    }

    #mb-input-row {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 12px 14px; border-top: 1px solid #EDEAE4; background: #fff;
    }
    #mb-input {
      flex: 1; border: 1px solid #E5E7EB; border-radius: 10px;
      padding: 10px 14px; font-size: 14px; font-family: inherit;
      resize: none; outline: none; line-height: 1.5;
      max-height: 120px; overflow-y: auto; color: #1B2D4F;
      transition: border-color .15s;
    }
    #mb-input:focus { border-color: ${ACCENT}; }
    #mb-input::placeholder { color: #9CA3AF; }
    #mb-send {
      flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px;
      background: ${ACCENT}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, transform .1s;
    }
    #mb-send:hover  { background: #b3842f; }
    #mb-send:active { transform: scale(.93); }
    #mb-send:disabled { background: #D1D5DB; cursor: not-allowed; }
    #mb-send svg { width: 18px; height: 18px; }
  `;
  document.head.appendChild(style);

  // ── HTML 구조 ────────────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `
    <!-- Chatbot FAB -->
    <button id="mb-fab" aria-label="채팅 상담 열기">
      <svg viewBox="0 0 24 24" fill="none" stroke="${NAVY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>

    <!-- Chat Window -->
    <div id="mb-window" role="dialog" aria-label="merm벤처스 AI 채팅 상담">
      <div id="mb-header">
        <div id="mb-header-avatar">M</div>
        <div id="mb-header-info">
          <div id="mb-header-name">머미 (Mermy)</div>
          <div id="mb-header-sub">merm벤처스 AI 상담 어시스턴트</div>
        </div>
        <button id="mb-close" aria-label="채팅 닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="mb-messages"></div>
      <div id="mb-input-row">
        <textarea id="mb-input" placeholder="질문을 입력하세요..." rows="1"></textarea>
        <button id="mb-send" aria-label="전송">
          <svg viewBox="0 0 24 24" fill="none" stroke="${NAVY}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `);

  // ── 요소 참조 ────────────────────────────────────────────
  const fab      = document.getElementById('mb-fab');
  const win      = document.getElementById('mb-window');
  const closeBtn = document.getElementById('mb-close');
  const messages = document.getElementById('mb-messages');
  const input    = document.getElementById('mb-input');
  const sendBtn  = document.getElementById('mb-send');

  // ── 유틸 ─────────────────────────────────────────────────
  function mdToHtml(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function addBubble(role, text) {
    const div = document.createElement('div');
    div.className = 'mb-bubble ' + (role === 'user' ? 'mb-user' : role === 'error' ? 'mb-err' : 'mb-bot');
    div.innerHTML = role === 'user' ? escHtml(text) : mdToHtml(text);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function addLoading() {
    const div = document.createElement('div');
    div.className = 'mb-bubble mb-bot';
    div.innerHTML = '<div class="mb-dots"><span></span><span></span><span></span></div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  // ── 채팅 열기/닫기 ──────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    fab.setAttribute('aria-label', '채팅 상담 닫기');
    input.focus();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    fab.setAttribute('aria-label', '채팅 상담 열기');
  }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── 메시지 전송 ──────────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    input.value = '';
    autoResize();

    addBubble('user', text);
    history.push({ role: 'user', content: text });
    if (history.length > MAX_HIST) history = history.slice(-MAX_HIST);

    const loader = addLoading();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      loader.remove();

      if (!res.ok || data.error) throw new Error(data.error || '오류');

      addBubble('assistant', data.reply);
      history.push({ role: 'assistant', content: data.reply });
      if (history.length > MAX_HIST) history = history.slice(-MAX_HIST);

    } catch (e) {
      loader.remove();
      addBubble('error', '⚠️ 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  input.addEventListener('input', autoResize);

  // ── 환영 메시지 (1초 후) ────────────────────────────────
  setTimeout(() => {
    addBubble('assistant', WELCOME);
    openChat();
  }, 1000);

})();

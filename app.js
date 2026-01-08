// ===== DOM Elements =====
const chatMessages = document.getElementById('chat-messages');
const welcomeMessage = document.getElementById('welcome-message');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const modelSelect = document.getElementById('model-select');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const cancelSettings = document.getElementById('cancel-settings');
const saveSettings = document.getElementById('save-settings');
const apiKeyInput = document.getElementById('api-key');
const toggleApiKey = document.getElementById('toggle-api-key');
const systemPromptInput = document.getElementById('system-prompt');
const temperatureInput = document.getElementById('temperature');
const tempValue = document.getElementById('temp-value');
const quickPrompts = document.querySelectorAll('.quick-prompt');
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
const scrollToBottomBtn = document.getElementById('scroll-to-bottom-btn');

// ===== State =====
let conversationHistory = [];
let isLoading = false;
let currentChatId = null;
let allChats = [];

// ===== History Management =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadChats() {
    allChats = JSON.parse(localStorage.getItem('gemini-chats') || '[]');
    renderHistory();
}

function saveChats() {
    localStorage.setItem('gemini-chats', JSON.stringify(allChats));
}

function createNewChat() {
    currentChatId = generateId();
    conversationHistory = [];
    chatMessages.innerHTML = '';
    chatMessages.appendChild(welcomeMessage);
    welcomeMessage.style.display = 'flex';
    messageInput.value = '';
    sendBtn.disabled = true;
    updateActiveChat();
}

function saveCurrentChat() {
    if (!currentChatId || conversationHistory.length === 0) return;

    const title = conversationHistory[0]?.parts[0]?.text?.slice(0, 40) || 'Nueva conversación';
    const existingIndex = allChats.findIndex(c => c.id === currentChatId);

    const chatData = {
        id: currentChatId,
        title: title + (title.length >= 40 ? '...' : ''),
        messages: conversationHistory,
        timestamp: existingIndex >= 0 ? allChats[existingIndex].timestamp : Date.now(),
        updatedAt: Date.now()
    };

    if (existingIndex >= 0) {
        allChats[existingIndex] = chatData;
    } else {
        allChats.unshift(chatData);
    }

    saveChats();
    renderHistory();
}

function loadChat(chatId) {
    const chat = allChats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    conversationHistory = chat.messages || [];

    chatMessages.innerHTML = '';
    welcomeMessage.style.display = 'none';

    conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'user' : 'assistant';
        const el = createMessageElement(role, msg.parts[0].text);
        chatMessages.appendChild(el);
    });

    updateActiveChat();
    scrollToBottom();

    if (window.innerWidth < 1024) sidebar.classList.remove('active');
}

function deleteChat(chatId, event) {
    event.stopPropagation();
    allChats = allChats.filter(c => c.id !== chatId);
    saveChats();
    renderHistory();
    if (currentChatId === chatId) createNewChat();
}

function updateActiveChat() {
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === currentChatId);
    });
}

function renderHistory() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 86400000);
    const weekAgo = new Date(today - 7 * 86400000);

    const sections = { today: [], yesterday: [], week: [], month: [] };

    allChats.forEach(chat => {
        const date = new Date(chat.timestamp);
        if (date >= today) sections.today.push(chat);
        else if (date >= yesterday) sections.yesterday.push(chat);
        else if (date >= weekAgo) sections.week.push(chat);
        else sections.month.push(chat);
    });

    ['today', 'yesterday', 'week', 'month'].forEach(key => {
        const section = document.getElementById(`${key}-section`);
        const list = document.getElementById(`${key}-list`);
        list.innerHTML = '';

        if (sections[key].length > 0) {
            section.style.display = 'block';
            sections[key].forEach(chat => {
                list.innerHTML += `
                    <button class="history-item ${chat.id === currentChatId ? 'active' : ''}" data-id="${chat.id}" onclick="loadChat('${chat.id}')">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2"/></svg>
                        <span class="history-item-text">${chat.title}</span>
                        <div class="history-item-actions">
                            <button class="history-action-btn delete" onclick="deleteChat('${chat.id}', event)">
                                <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2"/></svg>
                            </button>
                        </div>
                    </button>`;
            });
        } else {
            section.style.display = 'none';
        }
    });
}

// ===== Settings =====
function loadSettings() {
    const s = JSON.parse(localStorage.getItem('gemini-settings') || '{}');
    if (s.apiKey) apiKeyInput.value = s.apiKey;
    if (s.systemPrompt) systemPromptInput.value = s.systemPrompt;
    if (s.temperature !== undefined) {
        temperatureInput.value = s.temperature;
        tempValue.textContent = s.temperature;
    }
    if (s.model) modelSelect.value = s.model;
}

function saveSettingsToStorage() {
    localStorage.setItem('gemini-settings', JSON.stringify({
        apiKey: apiKeyInput.value,
        systemPrompt: systemPromptInput.value,
        temperature: temperatureInput.value,
        model: modelSelect.value
    }));
}

// ===== Modal =====
function openModal() { settingsModal.classList.add('active'); }
function closeModal() { settingsModal.classList.remove('active'); }

settingsBtn.addEventListener('click', openModal);
closeSettings.addEventListener('click', closeModal);
cancelSettings.addEventListener('click', () => { loadSettings(); closeModal(); });
saveSettings.addEventListener('click', () => { saveSettingsToStorage(); closeModal(); showToast('Configuración guardada'); });
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeModal(); });

toggleApiKey.addEventListener('click', () => { apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password'; });
temperatureInput.addEventListener('input', () => { tempValue.textContent = temperatureInput.value; });
modelSelect.addEventListener('change', saveSettingsToStorage);

// ===== Sidebar =====
toggleSidebar.addEventListener('click', () => {
    if (window.innerWidth < 1024) sidebar.classList.toggle('active');
    else sidebar.classList.toggle('collapsed');
});

newChatBtn.addEventListener('click', createNewChat);

// ===== Input =====
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    sendBtn.disabled = !messageInput.value.trim();
});

// ===== Messages =====
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

function formatMessage(text) {
    // Procesar bloques de código primero (para no procesarlos como markdown)
    const codeBlocks = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
        return placeholder;
    });

    // Procesar línea por línea
    const lines = text.split('\n');
    const processed = [];
    let inList = false;
    let listType = null;
    let listItems = [];

    const finishList = () => {
        if (inList && listItems.length > 0) {
            const tag = listType === 'ul' ? 'ul' : 'ol';
            processed.push(`<${tag}>${listItems.join('')}</${tag}>`);
            listItems = [];
            inList = false;
            listType = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Líneas horizontales
        if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
            finishList();
            processed.push('<hr>');
            continue;
        }

        // Encabezados
        const h3Match = line.match(/^###\s+(.+)$/);
        const h2Match = line.match(/^##\s+(.+)$/);
        const h1Match = line.match(/^#\s+(.+)$/);

        if (h3Match) {
            finishList();
            processed.push(`<h3>${h3Match[1]}</h3>`);
            continue;
        } else if (h2Match) {
            finishList();
            processed.push(`<h2>${h2Match[1]}</h2>`);
            continue;
        } else if (h1Match) {
            finishList();
            processed.push(`<h1>${h1Match[1]}</h1>`);
            continue;
        }

        // Listas desordenadas
        const ulMatch = line.match(/^[-*]\s+(.+)$/);
        if (ulMatch) {
            if (!inList || listType !== 'ul') {
                finishList();
                inList = true;
                listType = 'ul';
            }
            listItems.push(`<li>${ulMatch[1]}</li>`);
            continue;
        }

        // Listas ordenadas
        const olMatch = line.match(/^\d+\.\s+(.+)$/);
        if (olMatch) {
            if (!inList || listType !== 'ol') {
                finishList();
                inList = true;
                listType = 'ol';
            }
            listItems.push(`<li>${olMatch[1]}</li>`);
            continue;
        }

        // Si llegamos aquí y estábamos en una lista, terminarla
        if (inList && line.trim() !== '') {
            finishList();
        }

        // Línea vacía
        if (line.trim() === '') {
            finishList();
            if (processed.length > 0 && processed[processed.length - 1] !== '<br>') {
                processed.push('<br>');
            }
            continue;
        }

        // Línea normal
        processed.push(line);
    }

    // Terminar lista si quedó abierta
    finishList();

    // Unir todo
    text = processed.join('\n');

    // Restaurar bloques de código
    codeBlocks.forEach((block, i) => {
        text = text.replace(`__CODE_BLOCK_${i}__`, block);
    });

    // Procesar inline code, negritas y cursivas
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convertir saltos de línea simples
    text = text.replace(/\n/g, '<br>');

    return text;
}

function createMessageElement(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const svg = role === 'user'
        ? '<svg viewBox="0 0 24 24" fill="none"><path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/></svg>';
    div.innerHTML = `<div class="message-avatar">${svg}</div><div class="message-content">${formatMessage(content)}</div>`;
    return div;
}

function createTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="message-avatar"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/></svg></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    return div;
}

function showError(msg) {
    const div = document.createElement('div');
    div.className = 'error-message';
    div.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>${msg}</span>`;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// ===== API =====
async function sendMessage(userMessage) {
    if (isLoading || !userMessage.trim()) return;

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) { showError('Configura tu API Key en la configuración.'); openModal(); return; }

    if (!currentChatId) currentChatId = generateId();
    if (welcomeMessage) welcomeMessage.style.display = 'none';

    chatMessages.appendChild(createMessageElement('user', userMessage));
    scrollToBottom();

    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    isLoading = true;
    const typing = createTypingIndicator();
    chatMessages.appendChild(typing);
    scrollToBottom();

    try {
        const body = { contents: conversationHistory, generationConfig: { temperature: parseFloat(temperatureInput.value), topP: 0.95, topK: 40, maxOutputTokens: 8192 } };
        const sp = systemPromptInput.value.trim();
        if (sp) body.systemInstruction = { parts: [{ text: sp }] };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelSelect.value}:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });

        typing.remove();

        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `Error ${res.status}`); }

        const data = await res.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            conversationHistory.push({ role: 'model', parts: [{ text }] });
            chatMessages.appendChild(createMessageElement('assistant', text));
            scrollToBottom();
            saveCurrentChat();
        } else if (data.candidates?.[0]?.finishReason === 'SAFETY') {
            showError('Mensaje bloqueado por filtros de seguridad.');
        } else {
            throw new Error('Respuesta inesperada');
        }
    } catch (e) {
        typing.remove();
        showError(`Error: ${e.message}`);
        conversationHistory.pop();
    } finally {
        isLoading = false;
    }
}

// ===== Events =====
sendBtn.addEventListener('click', () => sendMessage(messageInput.value));
messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(messageInput.value); } });
quickPrompts.forEach(btn => btn.addEventListener('click', () => { const p = btn.dataset.prompt; messageInput.value = p; sendBtn.disabled = false; sendMessage(p); }));

// ===== Scroll to Bottom Button =====
function checkScrollPosition() {
    const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
    if (isNearBottom) {
        scrollToBottomBtn.classList.remove('show');
    } else {
        scrollToBottomBtn.classList.add('show');
    }
}

chatMessages.addEventListener('scroll', checkScrollPosition);
scrollToBottomBtn.addEventListener('click', scrollToBottom);

// ===== Init =====
loadSettings();
loadChats();
if (!apiKeyInput.value.trim()) setTimeout(() => showToast('Configura tu API Key'), 1000);

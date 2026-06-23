(function() {
    const chatWindow = document.getElementById('chatWindow');
    const chatInput = document.getElementById('guruInput');
    const sendBtn = document.getElementById('guruSendBtn');
    const profileWarning = document.getElementById('profileWarning');
    let chatHistory = [];
    let isGenerating = false;

    // We need AstroProfiles which is exposed globally via js/profiles.js
    function getGuruProfile() {
      return window.AstroProfiles ? AstroProfiles.getActiveProfile() : null;
    }

    // Ensure the profile warning is shown if no profile exists
    document.addEventListener('DOMContentLoaded', () => {
        checkProfile();
        renderQuickQuestions();
        checkDashboardContext();
    });
    
    function checkDashboardContext() {
        const ctx = sessionStorage.getItem('guru_dashboard_context');
        if (ctx) {
            sessionStorage.removeItem('guru_dashboard_context');
            setTimeout(() => {
                window.guruQuickAsk(ctx);
            }, 500);
        }
    }

    document.addEventListener('profileChanged', checkProfile);
    document.addEventListener('langChanged', renderQuickQuestions);

    function renderQuickQuestions() {
        const container = document.getElementById('quickQsContainer');
        if(!container) return;
        
        const lang = localStorage.getItem('astro_lang_preference') || 'en';
        if(!window.translations || !window.translations[lang]) return;
        
        const t = window.translations[lang];
        container.innerHTML = '';
        
        for(let i=1; i<=6; i++) {
            const labelKey = `guru_q${i}_label`;
            const textKey = `guru_q${i}_text`;
            if(t[labelKey] && t[textKey]) {
                const btn = document.createElement('button');
                btn.className = 'quick-q';
                btn.textContent = t[labelKey];
                btn.onclick = () => window.guruQuickAsk(t[textKey]);
                container.appendChild(btn);
            }
        }
    }

    function checkProfile() {
        if(!profileWarning) return; // Wait for DOM if needed
        const prof = getGuruProfile();
        if (!prof) {
            profileWarning.style.display = 'block';
            chatInput.disabled = true;
            sendBtn.disabled = true;
        } else {
            profileWarning.style.display = 'none';
            chatInput.disabled = false;
            sendBtn.disabled = false;
        }
    }

    window.guruQuickAsk = function(question) {
      if(isGenerating) return;
      chatInput.value = question;
      window.submitGuruChat();
    }

    function appendMessage(role, content) {
        const msgDiv = document.createElement('div');
        msgDiv.className = role === 'user' ? 'chat-msg user-msg' : 'chat-msg';
        
        const avatar = document.createElement('div');
        avatar.className = role === 'user' ? 'chat-avatar user' : 'chat-avatar guru';
        avatar.textContent = role === 'user' ? '🙏' : '🕉️';
        
        const bubble = document.createElement('div');
        bubble.className = role === 'user' ? 'chat-bubble user-b' : 'chat-bubble';
        bubble.textContent = content;
        
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        chatWindow.appendChild(msgDiv);
        
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return bubble;
    }

    function showTypingIndicator() {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg typing-indicator-msg';
        msgDiv.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar guru';
        avatar.textContent = '🕉️';
        
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble typing-indicator';
        bubble.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function hideTypingIndicator() {
        const el = document.getElementById('typingIndicator');
        if(el) el.remove();
    }

    window.submitGuruChat = async function() {
        if(isGenerating) return;
        
        const text = chatInput.value.trim();
        if(!text) return;
        
        const profile = getGuruProfile();
        if(!profile) {
            alert("Please select a profile first!");
            return;
        }
        
        chatInput.value = '';
        appendMessage('user', text);
        
        isGenerating = true;
        chatInput.disabled = true;
        sendBtn.disabled = true;
        showTypingIndicator();
        
        // The history payload should NOT include the current message since the backend appends it.
        // So we slice before pushing the new message.
        const historyPayload = chatHistory.slice(-10);
        
        // Add user message to local UI history
        const userMsg = { role: 'user', content: text };
        chatHistory.push(userMsg);
        
        try {
            const lang = localStorage.getItem('astro_lang') || 'en';
            
            const payload = {
                name: profile.name,
                dob: profile.dob,
                lang: lang,
                mood: "General Inquiry",
                message: text,
                history: historyPayload
            };
            
            // Use window.location.hostname so it works on mobile devices testing on local network
            const API_URL = `http://${window.location.hostname}:8000`;
            
            const response = await fetch(`${API_URL}/guru/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            hideTypingIndicator();
            
            if(!response.ok) throw new Error("Network response was not ok");
            if(!response.body) throw new Error("No response body");
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            
            const assistantBubble = appendMessage('assistant', '');
            let assistantContent = "";
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                assistantContent += chunk;
                assistantBubble.textContent = assistantContent;
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
            
            // Add assistant message to history
            chatHistory.push({ role: 'assistant', content: assistantContent });
            
        } catch (err) {
            console.error("Guru error:", err);
            hideTypingIndicator();
            appendMessage('assistant', "I apologize, the cosmic connection was interrupted. Please try again.");
        } finally {
            isGenerating = false;
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    }
})();

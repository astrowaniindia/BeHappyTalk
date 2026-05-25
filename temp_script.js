
    let socket;
    let provider = null;
    let users = [];
    let activeUserId = null;
    let currentSessionId = null;
    let timeRemaining = 0;
    let timerInt = null;

    // Local Persistence
    const saved = localStorage.getItem('bt_provider');
    if (saved) {
      provider = JSON.parse(saved);
      initApp();
    }

    // Date
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' });

    // Login
    document.getElementById('login-btn').onclick = async () => {
      const phone = document.getElementById('login-phone').value;
      const pwd = document.getElementById('login-pwd').value;
      const res = await fetch('/api/provider/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: pwd })
      });
      const data = await res.json();
      if (res.ok) {
        provider = data;
        localStorage.setItem('bt_provider', JSON.stringify(provider));
        initApp();
      } else {
        document.getElementById('error-msg').innerText = data.error;
      }
    };

    function initApp() {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-container').style.display = 'flex';
      document.getElementById('p-name-card').innerText = provider.name || provider.phone;
      document.getElementById('avatar-letter').innerText = (provider.name || 'P').charAt(0).toUpperCase();

      socket = io();
      socket.emit('provider_online', { providerId: provider.id });

      // Views Swapping
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
          const viewId = 'view-' + btn.dataset.view;
          document.getElementById(viewId).classList.add('active');
          document.getElementById('view-title').innerText = btn.querySelector('span').innerText;
          if (btn.dataset.view === 'inbox') fetchInbox();
          if (btn.dataset.view === 'earnings') fetchHistory();
        };
      });

      // Stats Fetch
      fetchStats();
      socket.on('wallet_update', fetchStats);

      // Session UI Logic
      socket.on('incoming_request', (req) => {
        const modal = document.getElementById('incoming-modal');
        document.getElementById('incoming-msg-text').innerText = `${req.userName} is requesting a ${req.type} for ${req.duration} minutes.`;
        modal.style.display = 'flex';
        
        document.getElementById('m-btn-acc').onclick = () => {
          socket.emit('accept_interaction', { ...req, providerId: provider.id });
          modal.style.display = 'none';
          document.querySelector('[data-view="inbox"]').click(); // Jump to inbox
          const u = { id: req.userId, name: req.userName };
          if (!users.find(x => x.id === u.id)) users.unshift(u);
          activeUserId = u.id; // SET ACTIVE USER IMMEDIATELY
          openChat(u);
        };
        
        document.getElementById('m-btn-rej').onclick = () => {
           socket.emit('reject_interaction', { userId: req.userId, providerId: provider.id });
           modal.style.display = 'none';
        }
      });

      socket.on('request_cancelled', () => {
        document.getElementById('incoming-modal').style.display = 'none';
      });

      socket.on('session_started', ({ sessionId, type, duration }) => {
        currentSessionId = sessionId;
        timeRemaining = duration * 60;
        document.getElementById('chat-timer').style.display = 'block';
        updateTimer();
        if (timerInt) clearInterval(timerInt);
        timerInt = setInterval(() => {
          timeRemaining--;
          updateTimer();
          if (timeRemaining <= 0) clearInterval(timerInt);
        }, 1000);

        if (type !== 'Chat') startMedia(type);
      });

      socket.on('session_ended', () => {
        clearInterval(timerInt);
        currentSessionId = null; // Clear session reference
        document.getElementById('chat-timer').style.display = 'none';
        document.getElementById('chat-input-row').style.display = 'none';
        stopMedia();
        fetchStats();
        fetchHistory(); // Refresh history real-time
      });

      socket.on('receive_message', (msg) => {
        if (activeUserId === msg.userId) renderMsg(msg);
        fetchInbox();
      });

      // Logout
      document.getElementById('logout-trigger').onclick = () => {
        localStorage.removeItem('bt_provider');
        window.location.reload();
      };
      // Add WebRTC and message DOM events
      socket.on('webrtc_signal', async ({ signal }) => {
         console.log('[WebRTC] Signal Received:', signal.type);
         if (!pc) createPeerConnection();
         
         try {
           if (signal.type==='offer') { 
             if (pc.signalingState !== 'stable') return console.log('[WebRTC] Offer ignored: state is', pc.signalingState);
             await pc.setRemoteDescription(new RTCSessionDescription(signal)); 
             const ans = await pc.createAnswer(); 
             await pc.setLocalDescription(ans); 
             socket.emit('webrtc_signal', {to:`chat_${activeUserId}_${provider.id}`, signal: pc.localDescription}); 
           }
           else if (signal.type==='answer') { 
             if (pc.signalingState !== 'have-local-offer') return console.log('[WebRTC] Answer ignored: state is', pc.signalingState);
             await pc.setRemoteDescription(new RTCSessionDescription(signal)); 
           }
           else if (signal.type==='candidate') { 
             await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); 
           }
         } catch (e) {
           console.error('[WebRTC] Signaling Error:', e, 'at state:', pc.signalingState);
         }
      });

      document.getElementById('call-end').onclick = () => socket.emit('end_interaction', { sessionId: currentSessionId });
      
      document.getElementById('msg-send').onclick = () => {
         const input = document.getElementById('msg-input');
         if (!input.value.trim()) return;
         console.log('[Chat] Sending message to:', activeUserId);
         socket.emit('send_message', { userId: activeUserId, providerId: provider.id, senderId: provider.id, text: input.value });
         input.value = '';
      }

      document.getElementById('msg-input').addEventListener('keydown', (e) => {
         if (e.key === 'Enter') document.getElementById('msg-send').click();
      });

    } // end initApp()

    // Global Functions
    async function fetchStats() {
      const res = await fetch(`/api/provider/${provider.id}`);
      const data = await res.json();
      document.getElementById('stat-balance').innerText = `₹${data.walletBalance.toFixed(2)}`;
      document.getElementById('stat-today').innerText = `₹${(data.walletBalance % 500).toFixed(2)}`;
    }

    async function fetchHistory() {
      const res = await fetch(`/api/provider/history/${provider.id}`);
      const sessions = await res.json();
      renderHistory(sessions);
    }

    function renderHistory(sessions) {
      const list = document.getElementById('history-target');
      list.innerHTML = sessions.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-dim);">No sessions recorded yet</td></tr>' : '';
      sessions.forEach(s => {
        const date = new Date(s.startTime).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        const typeClass = `type-${s.type.toLowerCase()}`;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="font-weight: 500;">${date}</td>
          <td>${s.userName}</td>
          <td><span class="type-badge ${typeClass}">${s.type}</span></td>
          <td style="font-family: monospace;">${s.duration} min</td>
          <td style="color: var(--success); font-weight: bold;">+ ₹${s.cost.toFixed(2)}</td>
        `;
        list.appendChild(row);
      });
    }

    async function fetchInbox() {
      const res = await fetch(`/api/provider/inbox/${provider.id}`);
      users = await res.json();
      renderUsers();
    }

    function renderUsers() {
      const list = document.getElementById('user-list-target');
      list.innerHTML = users.length === 0 ? '<div style="padding: 24px; color: var(--text-dim); font-size: 13px;">No active conversations</div>' : '';
      users.forEach(u => {
        const div = document.createElement('div');
        div.className = `user-item ${activeUserId === u.id ? 'active' : ''}`;
        div.innerHTML = `
          <div class="u-avatar">${u.name.charAt(0)}</div>
          <div class="u-info">
            <span class="u-name">${u.name}</span>
            <span class="u-last">Click to view chat history</span>
          </div>
        `;
        div.onclick = () => openChat(u);
        list.appendChild(div);
      });
    }

    async function openChat(u) {
      activeUserId = u.id;
      document.getElementById('chat-header-meta').style.display = 'flex';
      document.getElementById('active-chat-name').innerText = u.name;
      
      document.getElementById('chat-input-row').style.display = (currentSessionId && activeUserId === u.id) ? 'flex' : 'none';
      
      renderUsers();
      socket.emit('join_chat', { userId: u.id, providerId: provider.id });
      
      const res = await fetch(`/api/chat/${u.id}/${provider.id}`);
      const history = await res.json();
      const c = document.getElementById('messages');
      c.innerHTML = '';
      history.forEach(renderMsg);
      c.scrollTop = c.scrollHeight;
    }

    function renderMsg(msg) {
      const container = document.getElementById('messages');
      const wrap = document.createElement('div');
      wrap.className = `msg-wrap ${msg.senderId === provider.id ? 'me' : 'them'}`;
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      wrap.innerHTML = `<div class="msg">${msg.text}</div><span class="msg-time">${time}</span>`;
      container.appendChild(wrap);
      container.scrollTop = container.scrollHeight;
    }

    function updateTimer() {
      const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
      const s = (timeRemaining % 60).toString().padStart(2, '0');
      document.getElementById('chat-timer').innerText = `${m}:${s}`;
      document.getElementById('stat-time').innerText = `${m}:${s}`;
    }

    // WebRTC helpers (global, no socket dependency)
    let pc, localStream;
    async function startMedia(type) {
       document.getElementById('media-overlay').style.display = 'flex';
       document.getElementById('media-name').innerText = document.getElementById('active-chat-name').innerText;
       document.getElementById('media-desc').innerText = `${type} Call in progress...`;
       document.getElementById('call-cam').style.display = type === 'Video' ? 'flex' : 'none';
       document.getElementById('local-video').style.display = type === 'Video' ? 'block' : 'none';

       try {
          console.log('[Media] Acquiring devices for type:', type);
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'Video' });
          document.getElementById('local-video').srcObject = localStream;
          
          if (!pc) createPeerConnection();
          
          localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
          
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: type === 'Video'
          });
          await pc.setLocalDescription(offer);
          console.log('[WebRTC] Sending Offer');
          socket.emit('webrtc_signal', { to: `chat_${activeUserId}_${provider.id}`, signal: {type:'offer', sdp:pc.localDescription}});
       } catch (e) { console.error('Media Start Error:', e); }
    }

    function createPeerConnection() {
      console.log('[WebRTC] Creating RTCPeerConnection');
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      
      pc.onicecandidate = e => { 
        if(e.candidate) {
          socket.emit('webrtc_signal', { to: `chat_${activeUserId}_${provider.id}`, signal: {type:'candidate', candidate:e.candidate}}); 
        }
      };
      
      pc.ontrack = e => { 
        console.log('[WebRTC] Received remote track:', e.track.kind);
        const stream = e.streams[0] || new MediaStream([e.track]);
        if (e.track.kind === 'video') {
         document.getElementById('remote-video').srcObject = stream;
        } else {
         document.getElementById('remote-audio').srcObject = stream;
        }
      };
      
      pc.oniceconnectionstatechange = () => console.log('[WebRTC] ICE State:', pc.iceConnectionState);
    }

    function stopMedia() {
       if (localStream) localStream.getTracks().forEach(t => t.stop());
       if (pc) pc.close();
       pc = null;
       document.getElementById('media-overlay').style.display = 'none';
    }
  

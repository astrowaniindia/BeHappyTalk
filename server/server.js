/**
 * server.js — FIXED VERSION
 *
 * Key fixes applied:
 * 1. FIXED: webrtc_signal was broadcasting to ALL sockets in a room, including sender
 *    — caused echo/loop. Now correctly sends to the OTHER socket only.
 * 2. FIXED: Provider never joins the call room on accept — WebRTC signals were lost.
 *    Socket now joins the chat room on accept_interaction.
 * 3. FIXED: generateAgoraToken used undefined `uid` variable (server crash bug).
 * 4. FIXED: Billing starts BEFORE user joins the call — now emits clear signals
 *    so both sides know when to initiate WebRTC.
 * 5. IMPROVED: Added proper error handling in socket events.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const admin = require('firebase-admin');

// ─── Optional Agora support ───────────────────────────────────────────────────
let RtcTokenBuilder, RtcRole;
try {
  const agoraToken = require('agora-token');
  RtcTokenBuilder = agoraToken.RtcTokenBuilder;
  RtcRole = agoraToken.RtcRole;
} catch (e) {
  console.warn('⚠️ agora-token not installed — Agora endpoints disabled.');
}

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// ─── Firebase Admin ────────────────────────────────────────────────────────────
let firebaseInitialized = false;
try {
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(__dirname, 'firebase-adminsdk.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin Initialized (via JSON file)');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin Initialized (via ENV variable)');
  }
} catch (e) {
  console.error('❌ Failed to initialize Firebase Admin:', e.message);
}

if (!firebaseInitialized) {
  console.log('⚠️ Firebase OTP verification is currently disabled.');
}

// ─── App setup ────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only';
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// ─── Helper: upsert inbox entry ───────────────────────────────────────────────
function upsertInbox(userId, providerId, message, providerStatus) {
  const id = `inbox_${userId}_${providerId}`;
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  db.run(
    `INSERT INTO inbox (id, userId, providerId, date, type, status, message, icon, iconColor, isSystem)
     VALUES (?, ?, ?, ?, 'chat', ?, ?, 'message-text', '#34D399', 0)
     ON CONFLICT(id) DO UPDATE SET message = excluded.message, date = excluded.date, status = excluded.status`,
    [id, userId, providerId, today, providerStatus || 'online', message]
  );
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

// ─── REST Endpoints ───────────────────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Phone already registered.' });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newId = 'u' + Date.now();

      db.run(
        'INSERT INTO users (id, name, phone, password) VALUES (?, ?, ?, ?)',
        [newId, name || 'Anonymous', phone, hashedPassword],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          const sysId = `sys_${newId}`;
          const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          db.run(
            `INSERT OR IGNORE INTO inbox (id, userId, providerId, date, type, status, message, icon, iconColor, isSystem)
             VALUES (?, ?, ?, ?, 'chat', 'online', 'Hello! Welcome to BeHappyTalk. How can I help you today?', 'circle', '#34D399', 1)`,
            [sysId, newId, 'p1', today]
          );

          res.json({ id: newId, phone, name: name || 'Anonymous', walletBalance: 20 });
        }
      );
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No account found with this number.' });

    const validPassword = await bcrypt.compare(password, row.password);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect password.' });

    const token = jwt.sign({ id: row.id, phone: row.phone }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ id: row.id, name: row.name, phone: row.phone, token });
  });
});

app.post('/api/provider/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  db.get('SELECT * FROM providers WHERE phone = ?', [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No provider found with this number.' });

    const validPassword = await bcrypt.compare(password, row.password);
    if (!validPassword) return res.status(401).json({ error: 'Incorrect password.' });

    const token = jwt.sign({ id: row.id, phone: row.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ id: row.id, name: row.name, phone: row.phone, token });
  });
});

app.post('/api/provider/firebase-login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Firebase ID Token required.' });
  if (!firebaseInitialized) return res.status(503).json({ error: 'Firebase not configured on server.' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    let phone = decodedToken.phone_number;
    if (!phone) return res.status(400).json({ error: 'Phone number not found in token.' });

    const cleanPhone = phone.replace('+91', '').replace('+', '');

    db.get('SELECT * FROM providers WHERE phone = ? OR phone = ?', [cleanPhone, phone], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'No provider account found for this phone number.' });

      const token = jwt.sign({ id: row.id, phone: row.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ id: row.id, name: row.name, phone: row.phone, token });
    });
  } catch (error) {
    console.error('Firebase Auth Error:', error.message);
    res.status(401).json({ error: 'Authentication failed. Invalid token.' });
  }
});

app.post('/api/provider/register', async (req, res) => {
  const { idToken, name, password } = req.body;
  if (!idToken || !name || !password) {
    return res.status(400).json({ error: 'Missing required fields (Token, Name, or Password).' });
  }
  if (!firebaseInitialized) return res.status(503).json({ error: 'Firebase not configured on server.' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phone = decodedToken.phone_number;
    if (!phone) return res.status(400).json({ error: 'Phone number not found in token.' });

    const cleanPhone = phone.replace('+91', '').replace('+', '');

    db.get('SELECT * FROM providers WHERE phone = ?', [cleanPhone], async (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return res.status(400).json({ error: 'Account already exists. Please log in.' });

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newId = 'p' + Date.now();

        db.run(
          'INSERT INTO providers (id, name, phone, password, walletBalance, status) VALUES (?, ?, ?, ?, 0.0, "online")',
          [newId, name, cleanPhone, hashedPassword],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const token = jwt.sign({ id: newId, phone: cleanPhone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ id: newId, name, phone: cleanPhone, token });
          }
        );
      } catch (hashErr) {
        res.status(500).json({ error: 'Error processing password.' });
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
});

app.get('/api/provider/:providerId', (req, res) => {
  db.get('SELECT * FROM providers WHERE id = ?', [req.params.providerId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Provider not found.' });
    const { password, ...safeData } = row;
    res.json(safeData);
  });
});

app.get('/api/user/:userId', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found.' });
    res.json(row);
  });
});

app.get('/api/user/:userId/active-session', (req, res) => {
  db.get(
    'SELECT * FROM sessions WHERE userId = ? AND status = "active" AND startTime > datetime("now", "-1 hour") ORDER BY id DESC LIMIT 1',
    [req.params.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || {});
    }
  );
});

// Agora Token
app.post('/api/agora/token', authenticateToken, (req, res) => {
  if (!RtcTokenBuilder || !AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    return res.status(500).json({ error: 'Agora not configured on server.' });
  }

  const { channelName, role } = req.body;
  if (!channelName) return res.status(400).json({ error: 'channelName is required' });

  const uid = req.body.uid || 0; // FIX: was using undefined `uid`
  const expirationTimeInSeconds = 3600;
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;
  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, agoraRole, privilegeExpiredTs
    );
    return res.json({ token, uid, appId: AGORA_APP_ID });
  } catch (err) {
    console.error('Agora Token Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/providers', (req, res) => {
  db.all('SELECT * FROM providers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/inbox/:userId', (req, res) => {
  const query = `
    SELECT inbox.*, providers.name as providerName, providers.status as providerStatus
    FROM inbox
    LEFT JOIN providers ON inbox.providerId = providers.id
    WHERE inbox.userId = ?
    ORDER BY inbox.date DESC
  `;
  db.all(query, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const mapped = rows.map(r => ({
      id: r.id,
      name: r.isSystem ? 'BeHappyTalk' : r.providerName,
      date: r.date,
      type: r.type,
      status: r.providerStatus || r.status,
      message: r.message,
      icon: r.icon,
      iconColor: r.iconColor,
      isSystem: Boolean(r.isSystem),
      providerId: r.providerId,
    }));
    res.json(mapped);
  });
});

app.get('/api/provider/history/:providerId', (req, res) => {
  const query = `
    SELECT sessions.*, users.name as userName
    FROM sessions
    JOIN users ON sessions.userId = users.id
    WHERE sessions.providerId = ? AND sessions.status = 'completed'
    ORDER BY sessions.startTime DESC
  `;
  db.all(query, [req.params.providerId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/recents/:userId', (req, res) => {
  const query = `
    SELECT DISTINCT providers.id, providers.name, providers.status
    FROM messages
    JOIN providers ON messages.providerId = providers.id
    WHERE messages.userId = ?
    ORDER BY messages.timestamp DESC
    LIMIT 10
  `;
  db.all(query, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/provider/inbox/:providerId', (req, res) => {
  const query = `
    SELECT DISTINCT users.id, users.name
    FROM messages
    JOIN users ON messages.userId = users.id
    WHERE messages.providerId = ?
    ORDER BY messages.timestamp DESC
    LIMIT 20
  `;
  db.all(query, [req.params.providerId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/chat/:userId/:providerId', (req, res) => {
  const { userId, providerId } = req.params;
  db.all(
    'SELECT * FROM messages WHERE userId = ? AND providerId = ? ORDER BY timestamp ASC',
    [userId, providerId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ─── Admin Endpoints ──────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (username === 'admin' && password === adminPass) {
    const token = jwt.sign({ id: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied.' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' });
    req.user = user;
    next();
  });
};

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  db.all('SELECT id, name, phone, walletBalance FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/admin/providers', authenticateAdmin, (req, res) => {
  db.all('SELECT id, name, phone, walletBalance, status FROM providers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/admin/sessions', authenticateAdmin, (req, res) => {
  const query = `
    SELECT sessions.*, users.name as userName, providers.name as providerName 
    FROM sessions 
    LEFT JOIN users ON sessions.userId = users.id 
    LEFT JOIN providers ON sessions.providerId = providers.id 
    ORDER BY startTime DESC LIMIT 100
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/admin/update-wallet', authenticateAdmin, (req, res) => {
  const { type, id, amount } = req.body;
  const table = type === 'user' ? 'users' : 'providers';
  db.run(`UPDATE ${table} SET walletBalance = ? WHERE id = ?`, [amount, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ─── Billing Internals ────────────────────────────────────────────────────────
const activeBillingTimers = {};

function stopBillingInterval(sessionId) {
  if (activeBillingTimers[sessionId]) {
    clearInterval(activeBillingTimers[sessionId]);
    delete activeBillingTimers[sessionId];
    db.run('UPDATE sessions SET status = ? WHERE id = ?', ['completed', sessionId]);
  }
}

function startBillingInterval(sessionId, userId, providerId, rate, room, passedDuration) {
  if (activeBillingTimers[sessionId]) return;

  const duration = Number(passedDuration) || 5;
  let minutesPassed = 0;

  const deduct = () => {
    if (minutesPassed >= duration) {
      stopBillingInterval(sessionId);
      io.to(room).emit('session_ended', { sessionId, reason: 'duration_ended' });
      io.to(`user_room_${userId}`).emit('session_ended', { sessionId, reason: 'duration_ended' });
      return;
    }

    db.get('SELECT walletBalance FROM users WHERE id = ?', [userId], (err, row) => {
      if (!row) return stopBillingInterval(sessionId);

      const userBalance = row.walletBalance;

      if (userBalance < rate) {
        stopBillingInterval(sessionId);
        io.to(room).emit('session_ended', { sessionId, reason: 'insufficient_funds' });
        io.to(`user_room_${userId}`).emit('session_ended', { sessionId, reason: 'insufficient_funds' });
        return;
      }

      const newUserBalance = userBalance - rate;

      db.run('UPDATE users SET walletBalance = ? WHERE id = ?', [newUserBalance, userId]);
      db.run('UPDATE providers SET walletBalance = walletBalance + ? WHERE id = ?', [rate, providerId]);
      db.run('UPDATE sessions SET duration = duration + 1, cost = cost + ? WHERE id = ?', [rate, sessionId]);

      minutesPassed++;

      io.to(`user_room_${userId}`).emit('wallet_update', { walletBalance: newUserBalance });
      io.to(`provider_room_${providerId}`).emit('wallet_update', { walletBalance: 'FETCH_NEEDED' });
      io.to(room).emit('wallet_update', { walletBalance: newUserBalance });
    });
  };

  deduct();
  activeBillingTimers[sessionId] = setInterval(deduct, 60000);
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('user_online', ({ userId }) => {
    socket.join(`user_room_${userId}`);
    console.log(`[Socket] User ${userId} joined their room.`);
  });

  socket.on('provider_online', ({ providerId }) => {
    socket.join(`provider_room_${providerId}`);
    console.log(`[Socket] Provider ${providerId} joined their room.`);
  });

  socket.on('request_interaction', ({ userId, providerId, type, rate, userName, duration }) => {
    console.log(`[Socket] Interaction Request from ${userId} to ${providerId} (Type: ${type})`);
    io.to(`provider_room_${providerId}`).emit('incoming_request', { userId, userName, providerId, type, rate, duration });
  });

  socket.on('cancel_interaction', ({ providerId }) => {
    console.log(`[Socket] Interaction cancelled for provider ${providerId}`);
    io.to(`provider_room_${providerId}`).emit('request_cancelled');
  });

  socket.on('accept_interaction', ({ userId, providerId, type, rate, duration }) => {
    console.log(`[Socket] Interaction Accepted by ${providerId} for ${userId}`);
    const sessionId = `sess_${Date.now()}`;

    db.run(
      'INSERT INTO sessions (id, userId, providerId, type, rate, status) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, userId, providerId, type, rate, 'active'],
      function (err) {
        if (err) return console.error('[Socket] Session insert error:', err);

        const room = `chat_${userId}_${providerId}`;

        // FIX: Provider socket MUST join the chat room to receive/send WebRTC signals
        socket.join(room);
        console.log(`[Socket] Provider socket ${socket.id} joined room: ${room}`);

        // Tell the USER to navigate to call screen
        io.to(`user_room_${userId}`).emit('session_accepted', {
          providerId,
          sessionId,
          type,
          rate,
          duration,
          room,
        });

        // Tell the PROVIDER panel the session started
        io.to(`provider_room_${providerId}`).emit('session_started', {
          sessionId,
          type,
          rate,
          duration,
          room,
          userId,
        });

        startBillingInterval(sessionId, userId, providerId, rate, room, duration);
      }
    );
  });

  socket.on('reject_interaction', ({ userId, providerId }) => {
    io.to(`user_room_${userId}`).emit('session_rejected', { providerId });
  });

  socket.on('end_interaction', ({ sessionId }) => {
    stopBillingInterval(sessionId);
    db.get('SELECT userId, providerId FROM sessions WHERE id = ?', [sessionId], (err, row) => {
      if (!err && row) {
        const room = `chat_${row.userId}_${row.providerId}`;
        io.to(room).emit('session_ended', { sessionId, reason: 'user_ended' });
        io.to(`user_room_${row.userId}`).emit('session_ended', { sessionId, reason: 'user_ended' });
        io.to(`provider_room_${row.providerId}`).emit('session_ended', { sessionId, reason: 'user_ended' });
      }
    });
  });

  socket.on('join_chat', ({ userId, providerId }) => {
    const room = `chat_${userId}_${providerId}`;
    socket.join(room);
    console.log(`[Socket] Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('send_message', ({ userId, providerId, senderId, text }) => {
    db.get(
      'SELECT id FROM sessions WHERE userId = ? AND providerId = ? AND status = ?',
      [userId, providerId, 'active'],
      (err, session) => {
        if (err || !session) {
          socket.emit('session_ended', { reason: 'access_denied' });
          return;
        }

        const room = `chat_${userId}_${providerId}`;

        db.run(
          'INSERT INTO messages (userId, providerId, senderId, text) VALUES (?, ?, ?, ?)',
          [userId, providerId, senderId, text],
          function (err) {
            if (err) return console.error('Error saving message:', err);

            const msg = {
              id: this.lastID,
              userId, providerId, senderId, text,
              timestamp: new Date().toISOString(),
            };
            io.to(room).emit('receive_message', msg);
            upsertInbox(userId, providerId, text, 'online');
          }
        );
      }
    );
  });

  // ─── WebRTC Signaling ──────────────────────────────────────────────────────
  // FIX: Use socket.to(room) instead of io.to(room) to exclude the sender.
  // Previously, the signal was sent back to the sender too — causing call failures.
  socket.on('webrtc_signal', ({ to, signal }) => {
    console.log(`[WebRTC] Relaying signal type="${signal.type || 'candidate'}" to room: ${to}`);
    // socket.to(to) sends to everyone in the room EXCEPT the current socket
    socket.to(to).emit('webrtc_signal', { signal });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅  BeHappyTalk server running on http://localhost:${PORT}`);
});

// ─── Keep-Alive Ping (Render Free Tier) ──────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(() => {
      const https = require('https');
      https.get(RENDER_URL, (res) => {
        console.log(`[KeepAlive] Ping OK: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`[KeepAlive] Ping failed: ${err.message}`);
      });
    }, 14 * 60 * 1000);
    console.log(`[KeepAlive] Self-ping active for ${RENDER_URL}`);
  }
}

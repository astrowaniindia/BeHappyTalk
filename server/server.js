/**
 * server.js â€” SUPABASE EDITION
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./db');
const admin = require('firebase-admin');

// â”€â”€â”€ Optional Agora support â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let RtcTokenBuilder, RtcRole;
try {
  const agoraToken = require('agora-token');
  RtcTokenBuilder = agoraToken.RtcTokenBuilder;
  RtcRole = agoraToken.RtcRole;
} catch (e) {
  console.warn('âš ï¸ agora-token not installed â€” Agora endpoints disabled.');
}

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// â”€â”€â”€ Firebase Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let firebaseInitialized = false;
try {
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(__dirname, 'firebase-adminsdk.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
    console.log('âœ… Firebase Admin Initialized (via JSON file)');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
    console.log('âœ… Firebase Admin Initialized (via ENV variable)');
  }
} catch (e) {
  console.error('âŒ Failed to initialize Firebase Admin:', e.message);
}

if (!firebaseInitialized) {
  console.log('âš ï¸ Firebase OTP verification is currently disabled.');
}

// â”€â”€â”€ Provider State Tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const providerStates = {};
const pendingRequests = {}; // userId -> { providerId, userName, type, rate, duration }

// â”€â”€â”€ OTP store (in-memory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const otpStore = {}; // phone -> { otp, expiresAt }
const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// â”€â”€â”€ EnableX SMS (OTP delivery) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Uses the "OTP Atrowani" EnableX project's BeHappyTalk-branded campaign,
// template, and sender ID (BHPYTK) — not the Astrowani ones under the same project.
const ENABLEX_APP_ID = process.env.ENABLEX_APP_ID;
const ENABLEX_APP_KEY = process.env.ENABLEX_APP_KEY;
const ENABLEX_CAMPAIGN_ID = process.env.ENABLEX_CAMPAIGN_ID;
const ENABLEX_TEMPLATE_ID = process.env.ENABLEX_TEMPLATE_ID;
const ENABLEX_SENDER_ID = process.env.ENABLEX_SENDER_ID;
const enablexConfigured = !!(ENABLEX_APP_ID && ENABLEX_APP_KEY && ENABLEX_CAMPAIGN_ID && ENABLEX_TEMPLATE_ID);

if (!enablexConfigured) {
  console.log('âš ï¸ EnableX not configured â€” OTPs will be echoed in the API response instead of sent via SMS.');
}

// Sends the OTP via EnableX SMS. Returns true if the SMS was handed off successfully.
// If EnableX isn't configured or the send fails, the caller falls back to echoing
// the OTP in the API response so local dev/testing keeps working without real SMS.
async function sendSmsOtp(phone, otp) {
  if (!enablexConfigured) return false;
  try {
    await axios.post('https://api.enablex.io/sms/v1/messages/', {
      from: ENABLEX_SENDER_ID,
      to: [`+91${phone}`],
      data: { var1: otp },
      type: 'sms',
      campaign_id: ENABLEX_CAMPAIGN_ID,
      template_id: ENABLEX_TEMPLATE_ID,
      data_coding: 'plain',
    }, {
      auth: { username: ENABLEX_APP_ID, password: ENABLEX_APP_KEY },
    });
    return true;
  } catch (e) {
    console.error('[EnableX] SMS send failed:', e.response?.data || e.message);
    return false;
  }
}

// â”€â”€â”€ App setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// â”€â”€â”€ Frontend Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const path = require('path');
app.get('/manu', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manu.html')));
app.get('/admin', (req, res) => res.redirect('/manu'));

// â”€â”€â”€ Helper: upsert inbox entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function upsertInbox(userId, providerId, message, providerStatus) {
  const id = `inbox_${userId}_${providerId}`;
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const { error } = await db.from('inbox').upsert({
    id, userId, providerId, date: today, type: 'chat', status: providerStatus || 'online', 
    message, icon: 'message-text', iconColor: '#34D399', isSystem: false, updated_at: new Date().toISOString()
  });
  if (error) console.error('[DB] upsertInbox error:', error.message);
}

// â”€â”€â”€ Auth Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ REST Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.post('/api/register', async (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  const { data: existing } = await db.from('users').select('id').eq('phone', phone).maybeSingle();
  if (existing) return res.status(400).json({ error: 'Phone already registered.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = 'u' + Date.now();

    const { error } = await db.from('users').insert({
      id: newId, name: name || 'Anonymous', phone, password: hashedPassword, walletBalance: 20
    });
    if (error) throw error;

    const sysId = `sys_${newId}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    await db.from('inbox').upsert({
      id: sysId, userId: newId, providerId: 'p1', date: today, type: 'chat', status: 'online', 
      message: 'Hello! Welcome to BeHappyTalk. How can I help you today?', icon: 'circle', iconColor: '#34D399', isSystem: true
    });

    res.json({ id: newId, phone, name: name || 'Anonymous', walletBalance: 20 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  const { data: row, error } = await db.from('users').select('*').eq('phone', phone).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'No account found with this number.' });

  const validPassword = await bcrypt.compare(password, row.password);
  if (!validPassword) return res.status(401).json({ error: 'Incorrect password.' });

  const token = jwt.sign({ id: row.id, phone: row.phone }, JWT_SECRET, { expiresIn: '30d' });
  const { password: _, ...safeData } = row;
  safeData.token = token;
  res.json(safeData);
});

// â”€â”€â”€ OTP-based login / signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/otp/send', async (req, res) => {
  const { phone } = req.body;
  const cleanPhone = (phone || '').replace('+91', '').replace(/\D/g, '');
  if (cleanPhone.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });

  const otp = generateOtp();
  otpStore[cleanPhone] = { otp, expiresAt: Date.now() + OTP_TTL_MS };
  const sent = await sendSmsOtp(cleanPhone, otp);
  console.log(`[OTP] ${cleanPhone} -> ${otp} (expires in 5 min)${sent ? ' [sent via EnableX]' : ' [SMS not sent]'}`);

  // `otp` is only echoed back when SMS delivery isn't configured or failed,
  // so local dev/testing still works without a real SMS provider.
  res.json({ success: true, otp: sent ? undefined : otp });
});

app.post('/api/otp/verify', async (req, res) => {
  const { phone, otp } = req.body;
  const cleanPhone = (phone || '').replace('+91', '').replace(/\D/g, '');
  const entry = otpStore[cleanPhone];

  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  if (entry.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

  const { data: row, error } = await db.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  if (!row) {
    // New number — keep the OTP entry alive so /api/otp/signup can finish the flow.
    return res.json({ isNewUser: true, phone: cleanPhone });
  }

  delete otpStore[cleanPhone];
  const token = jwt.sign({ id: row.id, phone: row.phone }, JWT_SECRET, { expiresIn: '30d' });
  const { password: _, ...safeData } = row;
  safeData.token = token;
  res.json({ isNewUser: false, ...safeData });
});

app.post('/api/otp/signup', async (req, res) => {
  const { phone, otp, name } = req.body;
  const cleanPhone = (phone || '').replace('+91', '').replace(/\D/g, '');
  if (!name || !name.trim()) return res.status(400).json({ error: 'Please enter your name.' });

  const entry = otpStore[cleanPhone];
  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  if (entry.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

  const { data: existing } = await db.from('users').select('id').eq('phone', cleanPhone).maybeSingle();
  if (existing) return res.status(400).json({ error: 'Phone already registered. Please log in.' });

  try {
    // `users.password` is NOT NULL in the schema; OTP accounts never use it, so store a random hash.
    const randomPassword = await bcrypt.hash(cleanPhone + Date.now() + Math.random(), 10);
    const newId = 'u' + Date.now();

    const { error } = await db.from('users').insert({
      id: newId, name: name.trim(), phone: cleanPhone, password: randomPassword, walletBalance: 20
    });
    if (error) throw error;

    const sysId = `sys_${newId}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    await db.from('inbox').upsert({
      id: sysId, userId: newId, providerId: 'p1', date: today, type: 'chat', status: 'online',
      message: 'Hello! Welcome to BeHappyTalk. How can I help you today?', icon: 'circle', iconColor: '#34D399', isSystem: true
    });

    delete otpStore[cleanPhone];
    const token = jwt.sign({ id: newId, phone: cleanPhone }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ id: newId, phone: cleanPhone, name: name.trim(), walletBalance: 20, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/provider/signup', async (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password || !name) return res.status(400).json({ error: 'Name, phone, and password required.' });
  const { data: existing } = await db.from('providers').select('id').eq('phone', phone).maybeSingle();
  if (existing) return res.status(400).json({ error: 'Phone already registered.' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = 'p_' + Date.now();
  const { data, error } = await db.from('providers').insert([{ id, name, phone, password: hashedPassword, status: 'offline', verified: false, priceChat: 10, priceCall: 20, priceVideo: 30 }]).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  const token = jwt.sign({ id: data.id, phone: data.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
  const { password: _, ...safeData } = data;
  safeData.token = token;
  res.json(safeData);
});

app.post('/api/provider/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required.' });

  const { data: row, error } = await db.from('providers').select('*').eq('phone', phone).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'No provider found with this number.' });

  const validPassword = await bcrypt.compare(password, row.password);
  if (!validPassword) return res.status(401).json({ error: 'Incorrect password.' });

  const token = jwt.sign({ id: row.id, phone: row.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
  const { password: _, ...safeData } = row;
  safeData.token = token;
  res.json(safeData);
});

// ─── OTP-based provider login / signup ─────────────────────────────────────
app.post('/api/provider/otp/send', async (req, res) => {
  const { phone } = req.body;
  const cleanPhone = (phone || '').replace('+91', '').replace(/\D/g, '');
  if (cleanPhone.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });

  const otp = generateOtp();
  otpStore[cleanPhone] = { otp, expiresAt: Date.now() + OTP_TTL_MS };
  const sent = await sendSmsOtp(cleanPhone, otp);
  console.log(`[Provider OTP] ${cleanPhone} -> ${otp} (expires in 5 min)${sent ? ' [sent via EnableX]' : ' [SMS not sent]'}`);

  // `otp` is only echoed back when SMS delivery isn't configured or failed,
  // so local dev/testing still works without a real SMS provider.
  res.json({ success: true, otp: sent ? undefined : otp });
});

app.post('/api/provider/otp/verify', async (req, res) => {
  const { phone, otp } = req.body;
  const cleanPhone = (phone || '').replace('+91', '').replace(/\D/g, '');
  const entry = otpStore[cleanPhone];

  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  if (entry.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

  const { data: row, error } = await db.from('providers').select('*').eq('phone', cleanPhone).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  if (!row) {
    // New number — keep the OTP entry alive so /api/provider/otp/signup can finish the flow.
    return res.json({ isNewUser: true, phone: cleanPhone });
  }

  delete otpStore[cleanPhone];
  const token = jwt.sign({ id: row.id, phone: row.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
  const { password: _, ...safeData } = row;
  safeData.token = token;
  res.json({ isNewUser: false, ...safeData });
});

app.post('/api/provider/otp/signup', async (req, res) => {
  const { phone, otp, name } = req.body;
  const cleanPhone = (phone || '').replace('+91', '').replace(/\D/g, '');
  if (!name || !name.trim()) return res.status(400).json({ error: 'Please enter your name.' });

  const entry = otpStore[cleanPhone];
  if (!entry || entry.expiresAt < Date.now()) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  if (entry.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

  const { data: existing } = await db.from('providers').select('id').eq('phone', cleanPhone).maybeSingle();
  if (existing) return res.status(400).json({ error: 'Phone already registered. Please log in.' });

  try {
    // `providers.password` is NOT NULL in the schema; OTP accounts never use it, so store a random hash.
    const randomPassword = await bcrypt.hash(cleanPhone + Date.now() + Math.random(), 10);
    const id = 'p_' + Date.now();

    const { data, error } = await db.from('providers').insert([{
      id, name: name.trim(), phone: cleanPhone, password: randomPassword,
      status: 'offline', verified: false, priceChat: 10, priceCall: 20, priceVideo: 30
    }]).select('*').single();
    if (error) throw error;

    delete otpStore[cleanPhone];
    const token = jwt.sign({ id: data.id, phone: data.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeData } = data;
    safeData.token = token;
    res.json(safeData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

    const { data: row, error } = await db.from('providers').select('*').or(`phone.eq.${cleanPhone},phone.eq.${phone}`).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: 'No provider account found for this phone number.' });

    const token = jwt.sign({ id: row.id, phone: row.phone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeData } = row;
    safeData.token = token;
    res.json(safeData);
  } catch (error) {
    console.error('Firebase Auth Error:', error.message);
    res.status(401).json({ error: 'Authentication failed. Invalid token.' });
  }
});

app.post('/api/provider/register', async (req, res) => {
  const { phone, name, email, password } = req.body;
  if (!phone || !name || !password) return res.status(400).json({ error: 'Missing required fields.' });

  try {
    const cleanPhone = phone.replace('+91', '').replace('+', '');

    const { data: existing } = await db.from('providers').select('id').eq('phone', cleanPhone).maybeSingle();
    if (existing) return res.status(400).json({ error: 'Account already exists. Please log in.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = 'p' + Date.now();

    const { error } = await db.from('providers').insert({
      id: newId, name, phone: cleanPhone, password: hashedPassword, walletBalance: 0.0, status: 'online'
      // Email is captured in the UI but omitted from DB insert until added to the Supabase schema
    });
    
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create provider account.' });
    }
    
    const token = jwt.sign({ id: newId, phone: cleanPhone, role: 'provider' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ id: newId, name, phone: cleanPhone, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.get('/api/provider/:providerId', async (req, res) => {
  const { data: row, error } = await db.from('providers').select('*').eq('id', req.params.providerId).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'Provider not found.' });
  const { password, ...safeData } = row;
  const memState = providerStates[req.params.providerId];
  if (memState) {
    safeData.isOnline = memState.isOnline;
    safeData.status = memState.isOnline ? (memState.isTalking ? 'busy' : 'online') : 'offline';
    safeData.busyUntil = memState.busyUntil;
  }
  res.json(safeData);
});

app.post('/api/provider/update-profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Forbidden' });

  const { name, tagline, bio, langs, exp, demographic, priceChat, priceCall, priceVideo } = req.body;
  const providerId = req.user.id;

  const { data, error } = await db.from('providers').update({
    name, tagline, bio, langs, exp, demographic, priceChat, priceCall, priceVideo, verified: true
  }).eq('id', providerId).select('*').single();

  if (error) return res.status(500).json({ error: error.message });
  const { password, ...safeData } = data;
  res.json({ success: true, message: 'Profile updated successfully!', ...safeData });
});

// NEW: Get user profile endpoint (as requested)
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// NEW: Update user profile endpoint (as requested)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bio, languages, experience, pricing, demographic, profileImage, isPartner } = req.body;
    
    // Convert arrays/objects to JSON for Supabase JSONB fields
    const langJson = Array.isArray(languages) ? JSON.stringify(languages) : languages;
    const pricingJson = typeof pricing === 'object' ? JSON.stringify(pricing) : pricing;
    const demoJson = typeof demographic === 'object' ? JSON.stringify(demographic) : demographic;

    const { data, error } = await db.from('users')
      .update({
        bio,
        languages: langJson,
        experience,
        pricing: pricingJson,
        demographic: demoJson,
        profileImage,
        isPartner
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, user: data[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/provider/upload-image', authenticateToken, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Forbidden' });
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ error: 'No image provided' });

  try {
    const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return res.status(400).json({ error: 'Invalid base64 format' });

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `provider_${req.user.id}_${Date.now()}.${type}`;

    const { error } = await db.storage.from('profiles').upload(fileName, buffer, {
      contentType: `image/${type}`,
      upsert: true
    });

    if (error) throw error;

    const { data: publicUrlData } = db.storage.from('profiles').getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    await db.from('providers').update({ imagePath: publicUrl }).eq('id', req.user.id);

    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/provider/remove-image', authenticateToken, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Forbidden' });
  try {
    await db.from('providers').update({ imagePath: null }).eq('id', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// For chat images (can be used by both users and providers)
app.post('/api/chat/upload-image', async (req, res) => {
  const { base64Image, senderId } = req.body;
  if (!base64Image || !senderId) return res.status(400).json({ error: 'Missing image or senderId' });

  try {
    const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return res.status(400).json({ error: 'Invalid base64 format' });

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `chat_${senderId}_${Date.now()}.${type}`;

    const { error } = await db.storage.from('chat-media').upload(fileName, buffer, {
      contentType: `image/${type}`,
      upsert: true
    });

    if (error) throw error;

    const { data: publicUrlData } = db.storage.from('chat-media').getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Chat image upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:userId', async (req, res) => {
  const { data: row, error } = await db.from('users').select('*').eq('id', req.params.userId).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json(row);
});

app.post('/api/user/upload-image', authenticateToken, async (req, res) => {
  if (req.user.role === 'provider') return res.status(403).json({ error: 'Forbidden' });
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ error: 'No image provided' });

  try {
    const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return res.status(400).json({ error: 'Invalid base64 format' });

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `user_${req.user.id}_${Date.now()}.${type}`;

    const { error } = await db.storage.from('profiles').upload(fileName, buffer, {
      contentType: `image/${type}`,
      upsert: true
    });
    if (error) throw error;

    const { data: publicUrlData } = db.storage.from('profiles').getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    await db.from('users').update({ profileImage: publicUrl }).eq('id', req.user.id);
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/update-profile', authenticateToken, async (req, res) => {
  if (req.user.role === 'provider') return res.status(403).json({ error: 'Forbidden' });
  const { profileImage, name } = req.body;
  if (!profileImage && !name) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    const updates = {};
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (name !== undefined) updates.name = name;

    await db.from('users').update(updates).eq('id', req.user.id);
    res.json({ success: true, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/me', authenticateToken, async (req, res) => {
  if (req.user.role === 'provider') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { error } = await db.from('users').delete().eq('id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Requires a `provider_ratings` table — see server/supabase_schema.sql for the CREATE TABLE statement.
app.post('/api/providers/:id/rating', authenticateToken, async (req, res) => {
  const { stars } = req.body;
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'stars must be an integer between 1 and 5.' });

  try {
    const { error } = await db.from('provider_ratings').insert({
      providerId: req.params.id, userId: req.user.id, stars
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:userId/active-session', async (req, res) => {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: row, error } = await db.from('sessions')
    .select('*')
    .eq('userId', req.params.userId)
    .eq('status', 'active')
    .gt('startTime', oneHourAgo)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(row || {});
});

app.post('/api/agora/token', authenticateToken, (req, res) => {
  if (!RtcTokenBuilder || !AGORA_APP_ID || !AGORA_APP_CERTIFICATE) return res.status(500).json({ error: 'Agora not configured on server.' });
  const { channelName, role } = req.body;
  if (!channelName) return res.status(400).json({ error: 'channelName is required' });
  const uid = req.body.uid || 0;
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;
  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  try {
    const token = RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, agoraRole, privilegeExpiredTs);
    return res.json({ token, uid, appId: AGORA_APP_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/turn-credentials', authenticateToken, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const response = await fetch(
      `https://${process.env.METERED_APP_SUBDOMAIN}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
    );
    if (!response.ok) throw new Error('Failed to fetch TURN credentials');
    const iceServers = await response.json();
    res.json({ iceServers });
  } catch (err) {
    console.error('[TURN] Credential fetch failed:', err.message);
    // Fallback to Google STUN only
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
  }
});

app.get('/api/providers', async (req, res) => {
  const { data: rows, error } = await db.from('providers').select('*');
  if (error) return res.status(500).json({ error: error.message });
  const mappedRows = rows.map(r => {
    const memState = providerStates[r.id];
    if (memState) {
      r.isOnline = memState.isOnline;
      r.status = memState.isOnline ? (memState.isTalking ? 'busy' : 'online') : 'offline';
      r.busyUntil = memState.busyUntil;
    }
    return r;
  });
  res.json(mappedRows);
});

app.get('/api/inbox/:userId', async (req, res) => {
  const { data, error } = await db.from('inbox').select('*, providers(name, status, imagePath)').eq('userId', req.params.userId).order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const mapped = data.map(r => ({
    id: r.id, name: r.isSystem ? 'BeHappyTalk' : r.providers?.name, date: r.date, type: r.type, status: r.providers?.status || r.status,
    message: r.message, icon: r.icon, iconColor: r.iconColor, isSystem: Boolean(r.isSystem), providerId: r.providerId,
    provider: r.providers
  }));
  res.json(mapped);
});

app.get('/api/provider/history/:providerId', async (req, res) => {
  const { data, error } = await db.from('sessions').select('*, users(name)').eq('providerId', req.params.providerId).eq('status', 'completed').order('startTime', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const mapped = data.map(r => ({ ...r, userName: r.users?.name }));
  res.json(mapped);
});

app.get('/api/recents/:userId', async (req, res) => {
  const { data, error } = await db.from('messages').select('providers(id, name, status, imagePath, demographic)').eq('userId', req.params.userId).order('timestamp', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  
  // Extract unique providers
  const uniqueProviders = [];
  const ids = new Set();
  data.forEach(r => {
    if (r.providers && !ids.has(r.providers.id)) {
      ids.add(r.providers.id);
      uniqueProviders.push(r.providers);
    }
  });
  res.json(uniqueProviders.slice(0, 10));
});

app.get('/api/provider/inbox/:providerId', async (req, res) => {
  const { data, error } = await db.from('messages').select('users(id, name)').eq('providerId', req.params.providerId).order('timestamp', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });

  const uniqueUsers = [];
  const ids = new Set();
  data.forEach(r => {
    if (r.users && !ids.has(r.users.id)) {
      ids.add(r.users.id);
      uniqueUsers.push(r.users);
    }
  });
  res.json(uniqueUsers.slice(0, 20));
});

app.get('/api/chat/:userId/:providerId', async (req, res) => {
  const { userId, providerId } = req.params;
  const { data, error } = await db.from('messages').select('*').eq('userId', userId).eq('providerId', providerId).order('timestamp', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// â”€â”€â”€ Admin Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  const { data, error } = await db.from('users').select('id, name, phone, walletBalance');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/providers', authenticateAdmin, async (req, res) => {
  const { data, error } = await db.from('providers').select('id, name, phone, walletBalance, status');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/sessions', authenticateAdmin, async (req, res) => {
  const { data, error } = await db.from('sessions').select('*, users(name), providers(name)').order('startTime', { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: error.message });
  const mapped = data.map(r => ({ ...r, userName: r.users?.name, providerName: r.providers?.name }));
  res.json(mapped);
});

app.post('/api/admin/update-wallet', authenticateAdmin, async (req, res) => {
  const { type, id, amount, reason } = req.body;
  const table = type === 'user' ? 'users' : 'providers';
  
  // 1. Fetch old balance to calculate difference
  const { data: oldData, error: fetchErr } = await db.from(table).select('walletBalance').eq('id', id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  
  const oldBalance = oldData.walletBalance || 0;
  const difference = Number(amount) - Number(oldBalance);

  // 2. Update the wallet balance
  const { error } = await db.from(table).update({ walletBalance: amount }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  
  // 3. Log the transaction securely
  if (difference !== 0) {
    await db.from('wallet_transactions').insert({
      userId: type === 'user' ? id : null,
      providerId: type === 'provider' ? id : null,
      amount: difference,
      type: difference > 0 ? 'admin_manual_credit' : 'admin_manual_debit',
      // We log the admin ID and reason if provided in a real app, but for now we rely on the type.
    });
  }

  res.json({ success: true });
});

app.post('/api/admin/delete-user', authenticateAdmin, async (req, res) => {
  // Cascading deletes are handled by Supabase foreign keys!
  const { error } = await db.from('users').delete().eq('id', req.body.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/admin/delete-provider', authenticateAdmin, async (req, res) => {
  const { error } = await db.from('providers').delete().eq('id', req.body.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/admin/verify-provider', authenticateAdmin, async (req, res) => {
  const { id, verified } = req.body;
  const { error } = await db.from('providers').update({ verified }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Get User's Session History
app.get('/api/user/sessions/:userId', async (req, res) => {
  const { data, error } = await db.from('sessions')
    .select('*, providers(name)')
    .eq('userId', req.params.userId)
    .eq('status', 'completed')
    .order('startTime', { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    res.json(data);
  }
});

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const { count: users } = await db.from('users').select('*', { count: 'exact', head: true });
    const { count: providers } = await db.from('providers').select('*', { count: 'exact', head: true });
    const { data: sessData } = await db.from('sessions').select('cost, adminEarnings');
    const { data: wData } = await db.from('admin_withdrawals').select('amount');
    
    let revenue = 0, adminEarnings = 0, totalWithdrawn = 0;
    if (sessData) sessData.forEach(s => { revenue += (s.cost || 0); adminEarnings += (s.adminEarnings || 0); });
    if (wData) wData.forEach(w => { totalWithdrawn += (w.amount || 0); });
    
    res.json({ users, providers, sessions: sessData ? sessData.length : 0, revenue, adminEarnings: adminEarnings - totalWithdrawn, totalWithdrawn });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/withdraw', authenticateAdmin, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const { error } = await db.from('admin_withdrawals').insert({ amount });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/admin/withdrawals', authenticateAdmin, async (req, res) => {
  const { data, error } = await db.from('admin_withdrawals').select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/provider/withdraw', async (req, res) => {
  const { providerId, amount } = req.body;
  if (!providerId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid payout' });
  
  const { data: row } = await db.from('providers').select('walletBalance').eq('id', providerId).maybeSingle();
  if (!row || row.walletBalance < amount) return res.status(400).json({ error: 'Insufficient funds' });
  if (amount > (row.walletBalance / 2) + 0.1) return res.status(400).json({ error: "According to company's policy you can cash out only 50% of your total earning" });
  
  const { error: updErr } = await db.from('providers').update({ walletBalance: row.walletBalance - amount }).eq('id', providerId);
  if (updErr) return res.status(500).json({ error: updErr.message });
  
  await db.from('provider_withdrawals').insert({ providerId, amount });
  res.json({ success: true });
});

app.get('/api/provider/withdrawals/:providerId', async (req, res) => {
  const { data } = await db.from('provider_withdrawals').select('*').eq('providerId', req.params.providerId).order('date', { ascending: false });
  res.json(data || []);
});

// â”€â”€â”€ Billing Internals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const activeBillingTimers = {};

async function stopBillingInterval(sessionId) {
  if (activeBillingTimers[sessionId]) {
    clearInterval(activeBillingTimers[sessionId]);
    delete activeBillingTimers[sessionId];
  }
  await db.from('sessions').update({ status: 'completed' }).eq('id', sessionId);
}

function startBillingInterval(sessionId, userId, providerId, rate, room, passedDuration) {
  if (activeBillingTimers[sessionId]) return;
  const duration = passedDuration === 'unlimited' ? Infinity : (Number(passedDuration) || 5);
  let minutesPassed = 0;

  const deduct = async () => {
    if (minutesPassed >= duration) {
      stopBillingInterval(sessionId);
      if (providerStates[providerId]) {
        providerStates[providerId].isTalking = false;
        providerStates[providerId].busyUntil = null;
        io.emit('provider_status_changed', { providerId, state: providerStates[providerId] });
      }
      io.to(room).emit('session_ended', { sessionId, reason: 'duration_ended' });
      io.to(`user_room_${userId}`).emit('session_ended', { sessionId, reason: 'duration_ended' });
      return;
    }

    // Call Supabase RPC for atomic billing!
    const { data: success, error } = await db.rpc('process_billing_minute', {
      p_session_id: sessionId, p_user_id: userId, p_provider_id: providerId, p_rate: rate
    });

    if (error || !success) {
      stopBillingInterval(sessionId);
      if (providerStates[providerId]) {
        providerStates[providerId].isTalking = false;
        providerStates[providerId].busyUntil = null;
        io.emit('provider_status_changed', { providerId, state: providerStates[providerId] });
      }
      io.to(room).emit('session_ended', { sessionId, reason: 'insufficient_funds' });
      io.to(`user_room_${userId}`).emit('session_ended', { sessionId, reason: 'insufficient_funds' });
      return;
    }

    minutesPassed++;
    
    // Fetch new balance to broadcast
    const { data: uData } = await db.from('users').select('walletBalance').eq('id', userId).maybeSingle();
    if (uData) {
      io.to(`user_room_${userId}`).emit('wallet_update', { walletBalance: uData.walletBalance });
      io.to(room).emit('wallet_update', { walletBalance: uData.walletBalance });
    }
    io.to(`provider_room_${providerId}`).emit('wallet_update', { walletBalance: 'FETCH_NEEDED' });
  };

  deduct();
  activeBillingTimers[sessionId] = setInterval(deduct, 60000);
}

// â”€â”€â”€ Socket.IO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const waitlists = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('user_online', ({ userId }) => {
    socket.userId = userId;
    socket.join(`user_room_${userId}`);
    console.log(`[Socket] User ${userId} joined their room.`);
  });

  socket.on('update_provider_status', async ({ providerId, isOnline, isTalking, settings }) => {
    if (!providerStates[providerId]) providerStates[providerId] = { isOnline: true, isTalking: false, settings: { chat: true, audio: true, video: true } };
    if (isOnline !== undefined) {
      providerStates[providerId].isOnline = isOnline;
      await db.from('providers').update({ status: isOnline ? 'online' : 'offline' }).eq('id', providerId);
    }
    if (isTalking !== undefined) providerStates[providerId].isTalking = isTalking;
    if (settings !== undefined) providerStates[providerId].settings = { ...providerStates[providerId].settings, ...settings };
    io.emit('provider_status_changed', { providerId, state: providerStates[providerId] });
  });

  socket.on('get_all_provider_statuses', (data, callback) => {
    if (typeof callback === 'function') callback(providerStates);
  });

  socket.on('provider_connected', async ({ providerId }) => {
    socket.providerId = providerId;
    console.log(`[Socket] Provider ${providerId} connected on socket ${socket.id}`);
    
    // Fetch real status from DB instead of forcing online
    const { data } = await db.from('providers').select('status').eq('id', providerId).maybeSingle();
    const isOnline = data ? (data.status === 'online' || data.status === 'busy') : true;

    if (!providerStates[providerId]) providerStates[providerId] = { isOnline, isTalking: false, settings: { chat: true, audio: true, video: true } };
    else providerStates[providerId].isOnline = isOnline;
    
    io.emit('provider_status_changed', { providerId, state: providerStates[providerId] });
    socket.join(`provider_room_${providerId}`);
    
    // Resend any pending requests to the provider in case they refreshed
    for (const [userId, req] of Object.entries(pendingRequests)) {
      if (req.providerId === providerId) {
        socket.emit('incoming_request', { 
          userId, 
          userName: req.userName, 
          providerId, 
          type: req.type, 
          rate: req.rate, 
          duration: req.duration 
        });
      }
    }
  });

  socket.on('provider_offline', async ({ providerId }) => {
    if (providerStates[providerId]) providerStates[providerId].isOnline = false;
    else providerStates[providerId] = { isOnline: false, isTalking: false, settings: { chat: true, audio: true, video: true } };
    await db.from('providers').update({ status: 'offline' }).eq('id', providerId);
    io.emit('provider_status_changed', { providerId, state: providerStates[providerId] });
    socket.leave(`provider_room_${providerId}`);
  });

  socket.on('request_interaction', ({ userId, providerId, type, rate, userName, duration }) => {
    console.log(`[Socket] request_interaction: user=${userId} provider=${providerId} type=${type}`);
    socket.userId = userId;
    if (pendingRequests[userId] && pendingRequests[userId].providerId !== providerId) {
      io.to(`provider_room_${pendingRequests[userId].providerId}`).emit('request_cancelled');
    }
    pendingRequests[userId] = { providerId, userName, type, rate, duration };
    console.log(`[Socket] Emitting incoming_request to provider_room_${providerId}`);
    io.to(`provider_room_${providerId}`).emit('incoming_request', { userId, userName, providerId, type, rate, duration });
  });

  socket.on('cancel_interaction', ({ providerId }) => {
    if (socket.userId && pendingRequests[socket.userId] && pendingRequests[socket.userId].providerId === providerId) delete pendingRequests[socket.userId];
    io.to(`provider_room_${providerId}`).emit('request_cancelled');
  });

  socket.on('join_waitlist', ({ providerId, userId, userName, type, rate, duration }) => {
    if (!waitlists[providerId]) waitlists[providerId] = [];
    waitlists[providerId] = waitlists[providerId].filter(u => u.userId !== userId);
    waitlists[providerId].push({ userId, userName, type, rate, duration, joinedAt: Date.now() });
    io.to(`provider_room_${providerId}`).emit('waitlist_updated', waitlists[providerId]);
  });

  socket.on('leave_waitlist', ({ providerId, userId }) => {
    if (waitlists[providerId]) {
      waitlists[providerId] = waitlists[providerId].filter(u => u.userId !== userId);
      io.to(`provider_room_${providerId}`).emit('waitlist_updated', waitlists[providerId]);
    }
  });

  socket.on('accept_waitlist_user', async ({ providerId, userId }) => {
    const userReq = waitlists[providerId]?.find(u => u.userId === userId);
    if (!userReq) return;
    
    // Remove from waitlist
    waitlists[providerId] = waitlists[providerId].filter(u => u.userId !== userId);
    io.to(`provider_room_${providerId}`).emit('waitlist_updated', waitlists[providerId]);
    
    const { type, rate, duration } = userReq;
    
    const sessionId = `sess_${Date.now()}`;
    const { error } = await db.from('sessions').insert({
      id: sessionId, userId, providerId, type, rate, status: 'active', cost: 0, adminEarnings: 0
    });
    if (error) return console.error('[Socket] Waitlist session insert error:', error.message);
    const room = `chat_${userId}_${providerId}`;
    socket.join(room);
    
    // Simulate interaction accepted so app transitions automatically
    io.to(`user_room_${userId}`).emit('session_accepted', { providerId, sessionId, type, rate, duration, room });
    io.to(`provider_room_${providerId}`).emit('session_started', { sessionId, type, rate, duration, room, userId });
    
    if (!providerStates[providerId]) providerStates[providerId] = { isOnline: true, isTalking: false, settings: {} };
    providerStates[providerId].isTalking = true;
    providerStates[providerId].busyUntil = Date.now() + (duration * 60 * 1000);
    io.emit('provider_status_changed', { providerId, state: providerStates[providerId] });
    
    startBillingInterval(sessionId, userId, providerId, rate, room, duration);
  });

  socket.on('accept_interaction', async ({ userId, providerId, type, rate, duration }) => {
    console.log(`[Socket] accept_interaction: user=${userId} provider=${providerId} type=${type}`);
    if (pendingRequests[userId] && pendingRequests[userId].providerId === providerId) delete pendingRequests[userId];
    const sessionId = `sess_${Date.now()}`;

    const { error } = await db.from('sessions').insert({
      id: sessionId, userId, providerId, type, rate, status: 'active', cost: 0, adminEarnings: 0
    });

    if (error) return console.error('[Socket] Session insert error:', error.message);

    const room = `chat_${userId}_${providerId}`;
    socket.join(room);

    console.log(`[Socket] Emitting session_accepted to user_room_${userId}`);
    io.to(`user_room_${userId}`).emit('session_accepted', { providerId, sessionId, type, rate, duration, room });
    console.log(`[Socket] Emitting session_started to provider_room_${providerId}`);
    io.to(`provider_room_${providerId}`).emit('session_started', { sessionId, type, rate, duration, room, userId });

    if (!providerStates[providerId]) providerStates[providerId] = { isOnline: true, isTalking: false, settings: {} };
    providerStates[providerId].isTalking = true;
    providerStates[providerId].busyUntil = Date.now() + (duration * 60 * 1000);
    io.emit('provider_status_changed', { providerId, state: providerStates[providerId] });

    startBillingInterval(sessionId, userId, providerId, rate, room, duration);
  });

  socket.on('reject_interaction', ({ userId, providerId }) => {
    io.to(`user_room_${userId}`).emit('session_rejected', { providerId });
  });

  socket.on('end_interaction', async ({ sessionId }) => {
    stopBillingInterval(sessionId);
    const { data: row } = await db.from('sessions').select('userId, providerId').eq('id', sessionId).maybeSingle();
    if (row) {
      if (providerStates[row.providerId]) {
        providerStates[row.providerId].isTalking = false;
        providerStates[row.providerId].busyUntil = null;
        io.emit('provider_status_changed', { providerId: row.providerId, state: providerStates[row.providerId] });
      }
      const room = `chat_${row.userId}_${row.providerId}`;
      io.to(room).emit('session_ended', { sessionId, reason: 'user_ended' });
      io.to(`user_room_${row.userId}`).emit('session_ended', { sessionId, reason: 'user_ended' });
      io.to(`provider_room_${row.providerId}`).emit('session_ended', { sessionId, reason: 'user_ended' });
    }
  });

  socket.on('join_chat', ({ userId, providerId }) => {
    const room = `chat_${userId}_${providerId}`;
    socket.join(room);
  });

  socket.on('send_message', async ({ userId, providerId, senderId, text }) => {
    if (pendingRequests[userId] && senderId === userId) {
      io.to(`provider_room_${pendingRequests[userId].providerId}`).emit('request_cancelled');
      delete pendingRequests[userId];
    }

    // Enforce active session for messaging
    const { data: sessions } = await db.from('sessions').select('id').eq('userId', userId).eq('providerId', providerId).eq('status', 'active').limit(1);
    if (!sessions || sessions.length === 0) {
      socket.emit('session_ended', { reason: 'access_denied' });
      return;
    }

    const room = `chat_${userId}_${providerId}`;
    const { data: inserted, error } = await db.from('messages').insert({
      userId, providerId, senderId, text
    }).select().single();

    if (error) return console.error('Error saving message:', error.message);

    io.to(room).emit('receive_message', inserted);
    upsertInbox(userId, providerId, text, 'online');
  });

  socket.on('webrtc_signal', ({ to, signal }) => {
    // Log signal routing so we can verify room IDs match between mobile and portal
    console.log(`[WebRTC Signal] socket=${socket.id} â†’ room="${to}" type=${signal?.type || 'candidate'}`);
    socket.to(to).emit('webrtc_signal', { signal });
  });

  socket.on('typing', ({ to, from }) => {
    socket.to(`user_room_${to}`).emit('typing', { from });
    socket.to(`provider_room_${to}`).emit('typing', { from });
  });

  socket.on('disconnect', () => {
    if (socket.userId && pendingRequests[socket.userId]) {
       const pId = pendingRequests[socket.userId].providerId;
       io.to(`provider_room_${pId}`).emit('request_cancelled');
       delete pendingRequests[socket.userId];
    }

    // Attempt to clear provider isTalking state if this was a provider socket
    // We search through providerStates to see if this socket was a provider
    for (const [pId, state] of Object.entries(providerStates)) {
      if (state.isTalking) {
        // We can't be 100% sure this socket is the provider without tracking socket.providerId
        // but we'll leave it to the explicit end_interaction for now, except if we know
      }
    }
    
    if (socket.providerId && providerStates[socket.providerId]) {
      providerStates[socket.providerId].isTalking = false;
      io.emit('provider_status_changed', { providerId: socket.providerId, state: providerStates[socket.providerId] });
    }
  });
});

// â”€â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`âœ…  BeHappyTalk server (Supabase Edition) running on http://localhost:${PORT}`);
  
  // Cleanup any stale active sessions from previous crashes
  try {
    const { data, error } = await db.from('sessions').update({ status: 'completed' }).eq('status', 'active');
    if (!error) {
      console.log(`ðŸ§¹  Cleaned up stale active sessions on startup.`);
    }
  } catch (err) {
    console.error('Failed to cleanup stale sessions:', err);
  }
});

// â”€â”€â”€ Keep-Alive Ping (Render Free Tier) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


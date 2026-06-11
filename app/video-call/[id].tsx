/**
 * app/video-call/[id].tsx
 * Dedicated Video Call Screen for Main App.
 * Completely self-contained: owns its own socket, WebRTC, and UI.
 * Main App is always the CALLER (sends offer, receives answer).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Platform, StatusBar as RNStatusBar, BackHandler, TouchableOpacity, PermissionsAndroid,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { useAuth } from '../../hooks/useAuth';
import { API_URL, SOCKET_URL, secureFetch } from '../../constants/ServerConfig';

export default function VideoCallScreen() {
  const router = useRouter();
  const { id: providerId, sessionId, type, duration } = useLocalSearchParams<{
    id: string; sessionId?: string; type?: string; duration?: string;
  }>();
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [providerName, setProviderName] = useState('Provider');
  const [wallet, setWallet] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────
  const socketRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const remoteDescReady = useRef(false);
  const callStarted = useRef(false);
  const cleanedUp = useRef(false);
  const disconnectTimer = useRef<any>(null);
  const socketInitialized = useRef(false);

  const userId = user?.id;
  const roomId = `chat_${userId}_${providerId}`;

  // ── Helpers ────────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Cleanup ────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (cleanedUp.current) return;
    cleanedUp.current = true;
    console.log('[VideoCall] cleanup');

    if (disconnectTimer.current) {
      clearTimeout(disconnectTimer.current);
      disconnectTimer.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    try { InCallManager.stop(); } catch (_) {}
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    callStarted.current = false;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // ── End session ────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    console.log('[VideoCall] endSession');
    if (socketRef.current && sessionId) {
      socketRef.current.emit('end_interaction', { sessionId });
    }
    cleanup();
    router.replace(`/post-call?providerId=${providerId}&type=${type}&reason=user_ended`);
  }, [sessionId, providerId, type, cleanup, router]);

  // ── Start call (CALLER side) ───────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (callStarted.current) return;
    callStarted.current = true;
    console.log('[VideoCall] startCall');

    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
      }
      
      // 1. Camera + mic
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Audio routing
      InCallManager.start({ media: 'video' });

      // 3. TURN
      let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      try {
        const res = await secureFetch(`${API_URL}/turn-credentials`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.iceServers) iceServers = data.iceServers;
        }
      } catch (e) {
        console.warn('[VideoCall] TURN failed, STUN only');
      }

      // 4. PeerConnection
      const conn = new RTCPeerConnection({ iceServers } as any);
      pcRef.current = conn;
      remoteDescReady.current = false;

      // 5. Add tracks
      stream.getTracks().forEach(track => conn.addTrack(track, stream));

      // 6. ICE → socket
      conn.addEventListener('icecandidate', (event: any) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc_signal', {
            to: roomId,
            signal: { type: 'candidate', candidate: event.candidate },
          });
        }
      });

      // 7. ICE state
      conn.addEventListener('iceconnectionstatechange', () => {
        const state = conn.iceConnectionState;
        console.log('[VideoCall] ICE:', state);
        if (state === 'connected' || state === 'completed') {
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
          setIsConnected(true);
        } else if (state === 'disconnected') {
          disconnectTimer.current = setTimeout(() => {
            if (pcRef.current?.iceConnectionState === 'disconnected') {
              setIsConnected(false);
            }
          }, 8000);
        } else if (state === 'failed' || state === 'closed') {
          if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
          setIsConnected(false);
        }
      });

      // 8. Remote track
      conn.addEventListener('track', (event: any) => {
        console.log('[VideoCall] Remote track:', event.track?.kind);
        if (event.streams?.[0]) {
          setRemoteStream(event.streams[0]);
        }
      });

      // 9. Create & send offer
      const offer = await conn.createOffer({});
      await conn.setLocalDescription(offer);

      socketRef.current?.emit('webrtc_signal', {
        to: roomId,
        signal: { type: offer.type, sdp: offer.sdp },
      });
      console.log('[VideoCall] Offer sent!');

    } catch (err) {
      console.error('[VideoCall] startCall error:', err);
      callStarted.current = false;
    }
  }, [roomId, user]);

  // ── Handle incoming signal (ANSWER + candidates) ───────────────────────
  const handleSignal = useCallback(async (payload: { signal: any }) => {
    const { signal } = payload;
    const conn = pcRef.current;
    if (!signal) return;

    // Main App is always the CALLER — ignore offers (these are our own offers echoed back)
    if (signal.type === 'offer') {
      console.log('[VideoCall] Ignoring offer signal (we are the caller)');
      return;
    }

    console.log('[VideoCall] signal:', signal.type || 'candidate');

    try {
      if (signal.type === 'answer') {
        if (!conn || conn.signalingState !== 'have-local-offer') return;
        await conn.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescReady.current = true;
        for (const c of pendingCandidates.current) {
          try { await conn.addIceCandidate(c); } catch (_) {}
        }
        pendingCandidates.current = [];
        console.log('[VideoCall] Answer set, candidates drained');
      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (conn && remoteDescReady.current) {
          try { await conn.addIceCandidate(candidate); } catch (_) {}
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
    } catch (err) {
      console.error('[VideoCall] handleSignal error:', err);
    }
  }, []);

  const handleSignalRef = useRef(handleSignal);
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (duration === 'unlimited') setTimeLeft(0);
    else if (duration) setTimeLeft(parseInt(duration, 10) * 60);
  }, [duration]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || timeLeft === null || duration === 'unlimited') return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(t);
          endSession();
          return 0;
        }
        return prev !== null ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isConnected, timeLeft, duration]);

  // ── Main setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !providerId) return;
    // Prevent double-initialization from React StrictMode or hot-reload
    if (socketInitialized.current) return;
    socketInitialized.current = true;
    cleanedUp.current = false;

    // Fetch provider name
    secureFetch(`${API_URL}/providers`)
      .then(r => r.json())
      .then((list: any[]) => {
        const p = list.find(x => x.id === providerId);
        if (p) setProviderName(p.name);
      })
      .catch(() => {});

    // Fetch wallet
    secureFetch(`${API_URL}/user/${userId}`)
      .then(r => r.json())
      .then(d => setWallet(d.walletBalance ?? null))
      .catch(() => {});

    // Socket
    const sock = io(SOCKET_URL, { transports: ['websocket'], reconnection: false });
    socketRef.current = sock;

    sock.on('connect', () => {
      console.log('[VideoCall] Socket connected:', sock.id);
      sock.emit('join_chat', { userId, providerId });
      console.log('[VideoCall] Joined room:', roomId);

      // Give the provider time to navigate to their session screen and join the room
      if (!callStarted.current) {
        setTimeout(() => startCall(), 2000);
      }
    });

    sock.on('webrtc_signal', (data: any) => {
      handleSignalRef.current(data);
    });

    sock.on('session_ended', ({ reason }: any) => {
      cleanup();
      router.replace(`/post-call?providerId=${providerId}&type=${type}&reason=${reason}`);
    });

    sock.on('wallet_update', ({ walletBalance }: any) => {
      if (typeof walletBalance === 'number') setWallet(walletBalance);
    });

    const bh = BackHandler.addEventListener('hardwareBackPress', () => {
      endSession();
      return true;
    });

    return () => {
      bh.remove();
      cleanup();
    };
  }, [userId, providerId]);

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="light" />
      <View style={st.fill}>
        {/* Remote Video (full screen) */}
        {isConnected && remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            objectFit="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Local Video (PiP) */}
        {localStream ? (
          <View style={st.localPip}>
            <RTCView
              streamURL={localStream.toURL()}
              objectFit="cover"
              zOrder={1}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        ) : null}

        {/* Top Bar */}
        <View style={st.topBar}>
          <View style={st.durationBadge}>
            <View style={[st.dot, isConnected && { backgroundColor: '#10B981' }]} />
            <Text style={st.durationText}>
              {isConnected ? formatTime(callDuration) : 'Connecting...'}
            </Text>
          </View>
          {wallet !== null && (
            <View style={st.walletBadge}>
              <Text style={st.walletText}>₹{wallet}</Text>
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={st.controls}>
          <TouchableOpacity style={st.controlBtn}>
            <Ionicons name="mic-off" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[st.controlBtn, st.endBtn]} onPress={endSession}>
            <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={st.controlBtn}>
            <Ionicons name="camera-reverse" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Connecting overlay */}
        {!isConnected && (
          <View style={st.overlay}>
            <View style={st.avatarRing}>
              <Text style={st.avatarLetter}>
                {providerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={st.overlayName}>{providerName}</Text>
            <Text style={st.overlayStatus}>Connecting video call...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  fill: { flex: 1, backgroundColor: '#000' },
  localPip: {
    position: 'absolute', bottom: 120, right: 20,
    width: 110, height: 160,
    backgroundColor: '#374151', borderRadius: 12,
    overflow: 'hidden', elevation: 10, zIndex: 10,
    borderWidth: 2, borderColor: '#4B5563',
  },
  topBar: {
    position: 'absolute', top: 20, left: 20, right: 20, zIndex: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 },
  durationText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  walletBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    marginLeft: 12,
  },
  walletText: { color: '#FACC15', fontWeight: 'bold', fontSize: 13 },
  controls: {
    position: 'absolute', bottom: 30, left: 0, right: 0, zIndex: 15,
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  endBtn: { backgroundColor: '#EF4444', width: 64, height: 64, borderRadius: 32 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060810',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 20,
  },
  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#FACC15',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  avatarLetter: { fontSize: 44, fontWeight: '700', color: '#000' },
  overlayName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  overlayStatus: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
});

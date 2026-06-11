/**
 * provider-app/app/video-session.tsx
 * Dedicated Video Call Session Screen for Provider App.
 * Completely self-contained: owns its own socket, WebRTC, and UI.
 * Provider is the CALLEE (receives offer, sends answer).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, BackHandler, PermissionsAndroid, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SOCKET_URL = 'http://192.168.29.168:3000';
const API_URL = 'http://192.168.29.168:3000/api';

export default function VideoSessionScreen() {
  const router = useRouter();
  const { roomId, sessionId, userId } = useLocalSearchParams<{
    roomId: string; sessionId: string; userId: string;
  }>();

  // ── State ──────────────────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // ── Refs (avoid stale closures) ────────────────────────────────────────
  const socketRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const remoteDescReady = useRef(false);
  const cleanedUp = useRef(false);
  const socketInitialized = useRef(false);
  const offerProcessed = useRef(false);

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
    console.log('[ProviderVideo] cleanup');

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

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // ── End call (user-initiated) ──────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log('[ProviderVideo] endCall');
    if (socketRef.current && sessionId) {
      socketRef.current.emit('end_interaction', { sessionId });
    }
    cleanup();
    router.back();
  }, [sessionId, cleanup, router]);

  // ── Handle WebRTC signal ───────────────────────────────────────────────
  const handleSignal = useCallback(async (payload: { signal: any }) => {
    const { signal } = payload;
    if (!signal || !roomId) return;
    console.log('[ProviderVideo] signal:', signal.type || 'candidate');

    try {
      if (signal.type === 'offer') {
        // Only process the FIRST offer — ignore duplicates from double-socket
        if (offerProcessed.current) {
          console.log('[ProviderVideo] Ignoring duplicate offer');
          return;
        }
        offerProcessed.current = true;

        // 1. Get camera + mic FIRST
        let stream = localStreamRef.current;
        if (!stream) {
          console.log('[ProviderVideo] Requesting permissions...');
          if (Platform.OS === 'android') {
            await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.CAMERA,
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ]);
          }

          console.log('[ProviderVideo] Getting camera...');
          stream = await mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode: 'user' },
          });
          localStreamRef.current = stream;
          setLocalStream(stream);

          // Force loud speakerphone
          InCallManager.start({ media: 'video' });
        }

        // 2. TURN credentials (optional, fallback to STUN)
        let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        try {
          const dataStr = await AsyncStorage.getItem('providerData');
          const token = dataStr ? JSON.parse(dataStr).token : '';
          const res = await axios.get(`${API_URL}/turn-credentials`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.iceServers) iceServers = res.data.iceServers;
        } catch (e) {
          console.warn('[ProviderVideo] TURN failed, STUN only');
        }

        // 3. Create PeerConnection
        const conn = new RTCPeerConnection({ iceServers } as any);
        pcRef.current = conn;
        remoteDescReady.current = false;

        // 4. Add local tracks
        if (stream) {
          stream.getTracks().forEach(track => conn.addTrack(track, stream!));
        }

        // 5. ICE candidates → socket
        conn.addEventListener('icecandidate', (event: any) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('webrtc_signal', {
              to: roomId,
              signal: { type: 'candidate', candidate: event.candidate },
            });
          }
        });

        // 6. ICE connection state
        conn.addEventListener('iceconnectionstatechange', () => {
          const state = conn.iceConnectionState;
          console.log('[ProviderVideo] ICE:', state);
          if (state === 'connected' || state === 'completed') {
            setIsConnected(true);
          } else if (state === 'failed' || state === 'closed') {
            setIsConnected(false);
          }
        });

        // 7. Remote track
        conn.addEventListener('track', (event: any) => {
          console.log('[ProviderVideo] Remote track:', event.track?.kind);
          if (event.streams?.[0]) {
            setRemoteStream(event.streams[0]);
          }
        });

        // 8. Set remote description (the offer)
        await conn.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescReady.current = true;

        // 9. Drain queued candidates
        for (const c of pendingCandidates.current) {
          try { await conn.addIceCandidate(c); } catch (_) {}
        }
        pendingCandidates.current = [];

        // 10. Create and send answer
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);

        socketRef.current?.emit('webrtc_signal', {
          to: roomId,
          signal: { type: answer.type, sdp: answer.sdp },
        });
        console.log('[ProviderVideo] Answer sent!');

      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (pcRef.current && remoteDescReady.current) {
          try { await pcRef.current.addIceCandidate(candidate); } catch (_) {}
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
    } catch (err) {
      console.error('[ProviderVideo] handleSignal error:', err);
    }
  }, [roomId]);

  // Keep handleSignal ref fresh for socket listener
  const handleSignalRef = useRef(handleSignal);
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // ── Socket + Room join ─────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !userId) return;
    // Prevent double-initialization
    if (socketInitialized.current) return;
    socketInitialized.current = true;
    cleanedUp.current = false;

    // Parse providerId from roomId: "chat_<userId>_<providerId>"
    const parts = roomId.split('_');
    const parsedUserId = parts[1];
    const parsedProviderId = parts[2];

    console.log('[ProviderVideo] Connecting socket, room:', roomId);
    const sock = io(SOCKET_URL, { transports: ['websocket'], reconnection: false });
    socketRef.current = sock;

    sock.on('connect', () => {
      console.log('[ProviderVideo] Socket connected:', sock.id);
      // Join the chat room so we can receive WebRTC signals
      sock.emit('join_chat', { userId: parsedUserId, providerId: parsedProviderId });
      console.log('[ProviderVideo] Joined room:', roomId);
    });

    sock.on('webrtc_signal', (data: any) => {
      handleSignalRef.current(data);
    });

    sock.on('session_ended', () => {
      console.log('[ProviderVideo] Session ended by other side');
      cleanup();
      router.back();
    });

    // Back button
    const bh = BackHandler.addEventListener('hardwareBackPress', () => {
      endCall();
      return true;
    });

    return () => {
      bh.remove();
      cleanup();
    };
  }, [roomId, userId]);

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Remote Video */}
      <View style={styles.remoteVideo}>
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            objectFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <>
            <Ionicons name="person" size={80} color="rgba(255,255,255,0.15)" />
            <Text style={styles.connectingText}>
              {isConnected ? 'Connected' : 'Connecting to Client...'}
            </Text>
          </>
        )}
      </View>

      {/* Local Video (PiP) */}
      <View style={styles.localVideo}>
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            objectFit="cover"
            zOrder={1}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={styles.localVideoText}>Your Camera</Text>
        )}
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.durationBadge}>
          <View style={[styles.dot, isConnected && { backgroundColor: '#10B981' }]} />
          <Text style={styles.durationText}>{formatTime(callDuration)}</Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn}>
          <Ionicons name="mic-off" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, styles.endBtn]}
          onPress={endCall}
        >
          <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn}>
          <Ionicons name="camera-reverse" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  remoteVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  connectingText: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 16 },
  localVideo: {
    position: 'absolute', bottom: 120, right: 20,
    width: 110, height: 160,
    backgroundColor: '#374151', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#4B5563',
    overflow: 'hidden', elevation: 10,
  },
  localVideoText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  topBar: {
    position: 'absolute', top: 50, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'center',
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 },
  durationText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  controls: {
    position: 'absolute', bottom: 30, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  endBtn: { backgroundColor: '#EF4444', width: 64, height: 64, borderRadius: 32 },
});

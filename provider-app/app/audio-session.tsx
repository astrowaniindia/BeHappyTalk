/**
 * provider-app/app/audio-session.tsx
 * Dedicated Audio Call Session Screen for Provider App.
 * Completely self-contained: owns its own socket, WebRTC, and UI.
 * Provider is the CALLEE (receives offer, sends answer).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, BackHandler, PermissionsAndroid, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import io from 'socket.io-client';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SOCKET_URL = 'http://192.168.29.168:3000';
const API_URL = 'http://192.168.29.168:3000/api';

export default function AudioSessionScreen() {
  const router = useRouter();
  const { roomId, sessionId, userId } = useLocalSearchParams<{
    roomId: string; sessionId: string; userId: string;
  }>();

  // ── State ──────────────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────
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
    console.log('[ProviderAudio] cleanup');

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    try { InCallManager.stop(); } catch (_) {}
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setIsConnected(false);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // ── End call ───────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log('[ProviderAudio] endCall');
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
    console.log('[ProviderAudio] signal:', signal.type || 'candidate');

    try {
      if (signal.type === 'offer') {
        // Only process the FIRST offer
        if (offerProcessed.current) {
          console.log('[ProviderAudio] Ignoring duplicate offer');
          return;
        }
        offerProcessed.current = true;

        // 1. Get microphone
        let stream = localStreamRef.current;
        if (!stream) {
          console.log('[ProviderAudio] Requesting permissions...');
          if (Platform.OS === 'android') {
            await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ]);
          }

          console.log('[ProviderAudio] Getting mic...');
          stream = await mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = stream;

          // Force loud speakerphone
          InCallManager.start({ media: 'audio' });
        }

        // 2. TURN credentials
        let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        try {
          const dataStr = await AsyncStorage.getItem('providerData');
          const token = dataStr ? JSON.parse(dataStr).token : '';
          const res = await axios.get(`${API_URL}/turn-credentials`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.iceServers) iceServers = res.data.iceServers;
        } catch (e) {
          console.warn('[ProviderAudio] TURN failed, STUN only');
        }

        // 3. Create PeerConnection
        const conn = new RTCPeerConnection({ iceServers } as any);
        pcRef.current = conn;
        remoteDescReady.current = false;

        // 4. Add mic track
        if (stream) {
          stream.getTracks().forEach(track => conn.addTrack(track, stream!));
        }

        // 5. ICE → socket
        conn.addEventListener('icecandidate', (event: any) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('webrtc_signal', {
              to: roomId,
              signal: { type: 'candidate', candidate: event.candidate },
            });
          }
        });

        // 6. ICE state
        conn.addEventListener('iceconnectionstatechange', () => {
          const state = conn.iceConnectionState;
          console.log('[ProviderAudio] ICE:', state);
          if (state === 'connected' || state === 'completed') {
            setIsConnected(true);
          } else if (state === 'failed' || state === 'closed') {
            setIsConnected(false);
          }
        });

        // 7. Remote track (audio only)
        conn.addEventListener('track', (event: any) => {
          console.log('[ProviderAudio] Remote track:', event.track?.kind);
        });

        // 8. Set remote description
        await conn.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescReady.current = true;

        // 9. Drain candidates
        for (const c of pendingCandidates.current) {
          try { await conn.addIceCandidate(c); } catch (_) {}
        }
        pendingCandidates.current = [];

        // 10. Answer
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);

        socketRef.current?.emit('webrtc_signal', {
          to: roomId,
          signal: { type: answer.type, sdp: answer.sdp },
        });
        console.log('[ProviderAudio] Answer sent!');

      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (pcRef.current && remoteDescReady.current) {
          try { await pcRef.current.addIceCandidate(candidate); } catch (_) {}
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
    } catch (err) {
      console.error('[ProviderAudio] handleSignal error:', err);
    }
  }, [roomId]);

  const handleSignalRef = useRef(handleSignal);
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // ── Socket + Room ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !userId) return;
    // Prevent double-initialization
    if (socketInitialized.current) return;
    socketInitialized.current = true;
    cleanedUp.current = false;

    // Parse providerId safely
    const parsedUserId = Array.isArray(userId) ? userId[0] : userId;
    const rId = Array.isArray(roomId) ? roomId[0] : roomId;
    const parsedProviderId = rId.replace(`chat_${parsedUserId}_`, '');

    console.log('[ProviderAudio] Connecting socket, room:', roomId);
    const sock = io(SOCKET_URL, { transports: ['websocket'], reconnection: false });
    socketRef.current = sock;

    sock.on('connect', () => {
      console.log('[ProviderAudio] Socket connected:', sock.id);
      sock.emit('join_chat', { userId: parsedUserId, providerId: parsedProviderId });
    });

    sock.on('webrtc_signal', (data: any) => {
      handleSignalRef.current(data);
    });

    sock.on('session_ended', () => {
      cleanup();
      router.back();
    });

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
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarRing, isConnected && styles.avatarRingActive]}>
            <Ionicons name="person" size={80} color="#FFF" />
          </View>
          <Text style={styles.callerName}>Client</Text>
          <Text style={styles.statusText}>
            {isConnected ? formatTime(callDuration) : 'Connecting...'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn}>
            <Ionicons name="mic-off" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, styles.endBtn]}
            onPress={endCall}
          >
            <MaterialIcons name="call-end" size={36} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn}>
            <Ionicons name="volume-high" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  content: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: 100, paddingBottom: 60 },
  avatarContainer: { alignItems: 'center' },
  avatarRing: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#1B76FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, elevation: 10,
  },
  avatarRingActive: { borderWidth: 4, borderColor: '#10B981', backgroundColor: '#104d9c' },
  callerName: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  statusText: { fontSize: 18, color: 'rgba(255,255,255,0.6)' },
  controls: {
    flexDirection: 'row', justifyContent: 'space-evenly',
    alignItems: 'center', width: '100%', paddingHorizontal: 40,
  },
  controlBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  endBtn: { backgroundColor: '#EF4444', width: 72, height: 72, borderRadius: 36 },
});

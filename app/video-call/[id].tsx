/**
 * app/video-call/[id].tsx
 * Dedicated Video Call Screen — clean rebuild.
 * Connects socket, starts WebRTC, displays VideoCallView.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Platform, StatusBar as RNStatusBar, BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { API_URL, SOCKET_URL, secureFetch } from '../../constants/ServerConfig';
import { useVideoWebRTC } from '../../hooks/useVideoWebRTC';
import VideoCallView from '../../components/VideoCallView';

export default function VideoCallScreen() {
  const router = useRouter();
  const { id: providerId, sessionId, type, duration } = useLocalSearchParams<{
    id: string; sessionId?: string; type?: string; duration?: string;
  }>();
  const { user } = useAuth();

  const [providerName, setProviderName] = useState('Provider');
  const [wallet, setWallet] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const socketRef = useRef<any>(null);
  const socketStartedRef = useRef(false);
  const handleSignalRef = useRef<((p: any) => void) | null>(null);

  const userId = user?.id;
  const roomId = `chat_${userId}_${providerId}`;

  const { localStream, remoteStream, isConnected, startCall, handleSignal, endCall } =
    useVideoWebRTC(socketRef, roomId);

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (duration === 'unlimited') setTimeLeft(0);
    else if (duration) setTimeLeft(parseInt(duration, 10) * 60);
  }, [duration]);

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

  // ── End session ─────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    endCall();
    socketRef.current?.emit('end_interaction', { sessionId });
    router.replace(`/post-call?providerId=${providerId}&type=${type}&reason=user_ended`);
  }, [endCall, sessionId, providerId, type]);

  // ── Main setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !providerId) return;

    // Fetch provider name + wallet
    secureFetch(`${API_URL}/providers`)
      .then(r => r.json())
      .then((list: any[]) => {
        const p = list.find(x => x.id === providerId);
        if (p) setProviderName(p.name);
      })
      .catch(() => {});

    secureFetch(`${API_URL}/user/${userId}`)
      .then(r => r.json())
      .then(d => setWallet(d.walletBalance ?? null))
      .catch(() => {});

    // Socket
    const sock = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: false,   // no reconnect — prevents double call
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      console.log('[VideoCall] socket connected:', sock.id);
      // Join the room FIRST so we can receive the answer from the portal
      sock.emit('join_chat', { userId, providerId });
      console.log('[VideoCall] Joined room:', roomId);

      if (!socketStartedRef.current) {
        socketStartedRef.current = true;
        // Small delay to ensure portal has time to process join before offer arrives
        setTimeout(() => startCall(), 800);
      }
    });

    sock.on('webrtc_signal', (payload: any) => {
      handleSignalRef.current?.(payload);
    });

    sock.on('session_ended', ({ reason }: any) => {
      endCall();
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
      sock.disconnect();
      socketRef.current = null;
    };
  }, [userId, providerId]);

  // Keep signal handler fresh
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="light" />
      <View style={st.fill}>
        <VideoCallView
          localStream={localStream}
          remoteStream={remoteStream}
          isConnected={isConnected}
          callerName={providerName}
          timeLeft={timeLeft}
          isUnlimited={duration === 'unlimited'}
          walletBalance={wallet}
          onEnd={endSession}
        />

        {/* Connecting overlay — shown until ICE is connected */}
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

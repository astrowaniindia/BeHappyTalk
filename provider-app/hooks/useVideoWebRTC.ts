/**
 * provider-app/hooks/useVideoWebRTC.ts
 * Provider is the CALLEE (receives offer, sends answer).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Get API URL from constants or use default
const API_URL = 'https://provider.behappytalk.com/api';

export function useVideoWebRTC(socket: any, roomId: string | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const remoteDescReady = useRef(false);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log('[Provider Video] endCall');

    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }

    setLocalStream(prev => {
      prev?.getTracks().forEach(t => t.stop());
      return null;
    });
    setRemoteStream(null);
    setIsConnected(false);

    remoteDescReady.current = false;
    pendingCandidates.current = [];
  }, []);

  // ── Start call (callee side — provider) ───────────────────────────────────
  const startLocalStream = useCallback(async () => {
    console.log('[Provider Video] startLocalStream');
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' },
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[Provider Video] Error getting user media:', err);
      return null;
    }
  }, []);

  // ── Handle incoming signals ──────────────────────────────────────────────
  const handleSignal = useCallback(async (payload: { signal: any }) => {
    if (!roomId || !socket) return;
    const { signal } = payload;
    console.log('[Provider Video] signal received:', signal?.type || 'candidate');

    try {
      if (signal.type === 'offer') {
        // 1. Fetch TURN credentials (optional)
        let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        try {
          const providerDataStr = await AsyncStorage.getItem('providerData');
          const token = providerDataStr ? JSON.parse(providerDataStr).token : '';
          const res = await axios.get(`${API_URL}/turn-credentials`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.iceServers) {
            iceServers = res.data.iceServers;
          }
        } catch (e) {
          console.warn('[Provider Video] TURN fetch failed, using STUN only');
        }

        // 2. Build PeerConnection
        const conn = new RTCPeerConnection({ iceServers } as any);
        pc.current = conn;
        remoteDescReady.current = false;

        // 3. Add local tracks
        let currentStream = localStream;
        if (!currentStream) {
           console.log('[Provider Video] Waiting for camera before answering...');
           currentStream = await startLocalStream();
        }
        if (currentStream) {
          currentStream.getTracks().forEach(track => conn.addTrack(track, currentStream));
        }

        // 4. ICE → socket
        conn.addEventListener('icecandidate', (event: any) => {
          if (event.candidate) {
            socket.emit('webrtc_signal', {
              to: roomId,
              signal: { type: 'candidate', candidate: event.candidate },
            });
          }
        });

        conn.addEventListener('iceconnectionstatechange', () => {
          console.log('[Provider Video] ICE state:', conn.iceConnectionState);
          if (conn.iceConnectionState === 'connected' || conn.iceConnectionState === 'completed') {
            setIsConnected(true);
          } else if (conn.iceConnectionState === 'failed' || conn.iceConnectionState === 'closed') {
            setIsConnected(false);
          }
        });

        // 5. Remote track
        conn.addEventListener('track', (event: any) => {
          if (event.streams?.[0]) {
            setRemoteStream(event.streams[0]);
          }
        });

        // 6. Set Remote Description (Offer)
        await conn.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescReady.current = true;

        // Drain queued candidates
        for (const c of pendingCandidates.current) {
          try { await conn.addIceCandidate(c); } catch (_) {}
        }
        pendingCandidates.current = [];

        // 7. Create & send Answer
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);

        socket.emit('webrtc_signal', {
          to: roomId,
          signal: { type: answer.type, sdp: answer.sdp },
        });
        console.log('[Provider Video] Answer sent');

      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (pc.current && remoteDescReady.current) {
          try { await pc.current.addIceCandidate(candidate); } catch (_) {}
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
    } catch (err) {
      console.error('[Provider Video] handleSignal error:', err);
    }
  }, [roomId, socket, localStream]);

  useEffect(() => {
    return () => { endCall(); };
  }, [endCall]);

  return { localStream, remoteStream, isConnected, startLocalStream, handleSignal, endCall };
}

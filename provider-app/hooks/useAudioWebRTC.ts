/**
 * provider-app/hooks/useAudioWebRTC.ts
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

const API_URL = 'http://192.168.29.168:3000/api';

export function useAudioWebRTC(socket: any, roomId: string | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const remoteDescReady = useRef(false);

  const endCall = useCallback(() => {
    console.log('[Provider Audio] endCall');

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

  const startLocalStream = useCallback(async () => {
    console.log('[Provider Audio] startLocalStream');
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[Provider Audio] Error getting user media:', err);
      return null;
    }
  }, []);

  const handleSignal = useCallback(async (payload: { signal: any }) => {
    if (!roomId || !socket) return;
    const { signal } = payload;
    console.log('[Provider Audio] signal received:', signal?.type || 'candidate');

    try {
      if (signal.type === 'offer') {
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
          console.warn('[Provider Audio] TURN fetch failed, using STUN only');
        }

        const conn = new RTCPeerConnection({ iceServers } as any);
        pc.current = conn;
        remoteDescReady.current = false;

        let currentStream = localStream;
        if (!currentStream) {
           console.log('[Provider Audio] Waiting for mic before answering...');
           currentStream = await startLocalStream();
        }
        if (currentStream) {
          currentStream.getTracks().forEach(track => conn.addTrack(track, currentStream));
        }

        conn.addEventListener('icecandidate', (event: any) => {
          if (event.candidate) {
            socket.emit('webrtc_signal', {
              to: roomId,
              signal: { type: 'candidate', candidate: event.candidate },
            });
          }
        });

        conn.addEventListener('iceconnectionstatechange', () => {
          console.log('[Provider Audio] ICE state:', conn.iceConnectionState);
          if (conn.iceConnectionState === 'connected' || conn.iceConnectionState === 'completed') {
            setIsConnected(true);
          } else if (conn.iceConnectionState === 'failed' || conn.iceConnectionState === 'closed') {
            setIsConnected(false);
          }
        });

        conn.addEventListener('track', (event: any) => {
          if (event.streams?.[0]) {
            setRemoteStream(event.streams[0]);
          }
        });

        await conn.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescReady.current = true;

        for (const c of pendingCandidates.current) {
          try { await conn.addIceCandidate(c); } catch (_) {}
        }
        pendingCandidates.current = [];

        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);

        socket.emit('webrtc_signal', {
          to: roomId,
          signal: { type: answer.type, sdp: answer.sdp },
        });
        console.log('[Provider Audio] Answer sent');

      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (pc.current && remoteDescReady.current) {
          try { await pc.current.addIceCandidate(candidate); } catch (_) {}
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
    } catch (err) {
      console.error('[Provider Audio] handleSignal error:', err);
    }
  }, [roomId, socket, localStream]);

  useEffect(() => {
    return () => { endCall(); };
  }, [endCall]);

  return { localStream, remoteStream, isConnected, startLocalStream, handleSignal, endCall };
}

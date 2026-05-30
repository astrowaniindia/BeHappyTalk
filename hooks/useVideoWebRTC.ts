/**
 * hooks/useVideoWebRTC.ts
 * Clean, minimal WebRTC hook for VIDEO calls only.
 * Mobile is always the CALLER (sends offer).
 * Portal is always the CALLEE (sends answer).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { API_URL, secureFetch } from '../constants/ServerConfig';
import { useAuth } from './useAuth';

export function useVideoWebRTC(socketRef: any, roomId: string) {
  const { user } = useAuth();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const remoteDescReady = useRef(false);
  const disconnectTimer = useRef<any>(null);
  const callStarted = useRef(false);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log('[Video] endCall');

    if (disconnectTimer.current) {
      clearTimeout(disconnectTimer.current);
      disconnectTimer.current = null;
    }

    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }

    try { InCallManager.stop(); } catch (_) {}

    setLocalStream(prev => {
      prev?.getTracks().forEach(t => t.stop());
      return null;
    });
    setRemoteStream(null);
    setIsConnected(false);

    remoteDescReady.current = false;
    pendingCandidates.current = [];
    callStarted.current = false;
  }, []);

  // ── Start call (caller side — mobile) ───────────────────────────────────
  const startCall = useCallback(async () => {
    if (callStarted.current) {
      console.log('[Video] startCall already called — ignoring');
      return;
    }
    callStarted.current = true;
    console.log('[Video] startCall');

    try {
      // 1. Get camera + mic
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' },
      });
      setLocalStream(stream);

      // 2. Audio routing
      InCallManager.start({ media: 'video' });
      InCallManager.setForceSpeakerphoneOn(true);

      // 3. Fetch TURN credentials
      let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      try {
        const res = await secureFetch(`${API_URL}/turn-credentials`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          iceServers = data.iceServers;
          console.log('[Video] TURN servers:', iceServers.length);
        }
      } catch (e) {
        console.warn('[Video] TURN fetch failed, using STUN only');
      }

      // 4. Build PeerConnection
      const conn = new RTCPeerConnection({ iceServers } as any);
      pc.current = conn;
      remoteDescReady.current = false;

      // 5. Add local tracks
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

      // 7. ICE connection state
      conn.addEventListener('iceconnectionstatechange', () => {
        const state = conn.iceConnectionState;
        console.log('[Video] ICE state:', state);

        if (state === 'connected' || state === 'completed') {
          clearTimeout(disconnectTimer.current);
          disconnectTimer.current = null;
          setIsConnected(true);
        } else if (state === 'disconnected') {
          // Transient — give it 8 seconds to recover
          disconnectTimer.current = setTimeout(() => {
            if (pc.current?.iceConnectionState === 'disconnected') {
              console.log('[Video] Still disconnected after 8s — ending');
              setIsConnected(false);
            }
          }, 8000);
        } else if (state === 'failed' || state === 'closed') {
          clearTimeout(disconnectTimer.current);
          setIsConnected(false);
        }
      });

      // 8. Remote track
      conn.addEventListener('track', (event: any) => {
        console.log('[Video] Remote track:', event.track.kind);
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
      console.log('[Video] Offer sent');

    } catch (err) {
      console.error('[Video] startCall error:', err);
      callStarted.current = false;
      endCall();
    }
  }, [roomId, user, endCall]);

  // ── Handle incoming signals ──────────────────────────────────────────────
  const handleSignal = useCallback(async (payload: { signal: any }) => {
    const { signal } = payload;
    const conn = pc.current;

    if (!signal) return;
    console.log('[Video] signal received:', signal.type || 'candidate');

    try {
      if (signal.type === 'answer') {
        if (!conn || conn.signalingState !== 'have-local-offer') return;
        await conn.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescReady.current = true;
        // Drain queued candidates
        for (const c of pendingCandidates.current) {
          try { await conn.addIceCandidate(c); } catch (_) {}
        }
        pendingCandidates.current = [];
        console.log('[Video] Remote description set from answer, drained candidates');

      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (conn && remoteDescReady.current) {
          try { await conn.addIceCandidate(candidate); } catch (_) {}
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
      // Ignore 'offer' — mobile is always the caller
    } catch (err) {
      console.error('[Video] handleSignal error:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { endCall(); };
  }, []);

  return { localStream, remoteStream, isConnected, startCall, handleSignal, endCall };
}

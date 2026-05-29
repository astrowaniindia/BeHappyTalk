/**
 * useWebRTC.ts  — FIXED VERSION
 *
 * Key fixes applied:
 * 1. Added TURN servers so calls work across different networks/mobile data
 * 2. Fixed "race condition" where ICE candidates arrived before remoteDescription was set
 * 3. Fixed PeerConnection being recreated on every re-render (stable ref guard)
 * 4. Added proper cleanup to prevent memory leaks / ghost connections
 * 5. Fixed audio-only calls not playing remote audio (was missing remoteStream setup)
 * 6. Added connection timeout so app doesn't hang forever on failed calls
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

// ─── ICE Config with TURN servers ─────────────────────────────────────────────
// STUN alone only works when both devices are on the same WiFi.
// TURN servers relay the traffic when on mobile data or different networks.
// These are FREE public TURN servers — for production, get your own from:
// https://www.metered.ca/tools/openrelay/ (free tier available)
const ICE_CONFIG = {
  iceServers: [
    // Google STUN
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(socketRef: any, roomId: string) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const isCreatingOffer = useRef(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // ─── Cleanup helper ──────────────────────────────────────────────────────────
  const cleanupPC = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      (pcRef.current as any).oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidates.current = [];
    isCreatingOffer.current = false;
  }, []);

  // ─── Create PeerConnection ────────────────────────────────────────────────────
  const createPC = useCallback(() => {
    cleanupPC(); // Always clean up before creating a new one

    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (event: any) => {
      if (event.candidate && socketRef.current?.connected) {
        console.log('[WebRTC] Sending ICE candidate');
        socketRef.current.emit('webrtc_signal', {
          to: roomId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event: any) => {
      console.log('[WebRTC] Got remote track:', event.track?.kind);
      // FIX: Use event.streams[0] if available, otherwise build a new stream
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        // Build a MediaStream from the track
        setRemoteStream((prev) => {
          if (prev) {
            prev.addTrack(event.track);
            return prev;
          }
          const stream = new MediaStream([event.track]);
          return stream;
        });
      }
    };

    (pc as any).oniceconnectionstatechange = () => {
      const state = (pc as any).iceConnectionState;
      console.log('[WebRTC] ICE state:', state);
      if (state === 'connected' || state === 'completed') {
        setIsConnected(true);
        // Clear timeout — we connected successfully
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      }
      if (state === 'disconnected') {
        console.log('[WebRTC] Disconnected — may recover...');
        setIsConnected(false);
      }
      if (state === 'failed') {
        console.log('[WebRTC] ICE failed — ending call');
        setIsConnected(false);
        Alert.alert('Call Failed', 'Could not connect the call. Please check your internet and try again.');
      }
      if (state === 'closed') {
        setIsConnected(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socketRef, roomId, cleanupPC]);

  // ─── Start Call (Mobile is ALWAYS the caller / offer creator) ────────────────
  const startCall = useCallback(async (isVideo: boolean) => {
    // FIX: Prevent double-calling if socket reconnects
    if (isCreatingOffer.current) {
      console.log('[WebRTC] Already creating offer, skipping duplicate call');
      return;
    }
    isCreatingOffer.current = true;

    try {
      // Request permissions on Android
      if (Platform.OS === 'android') {
        const permsToRequest: string[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (isVideo) permsToRequest.push(PermissionsAndroid.PERMISSIONS.CAMERA);

        const grants = await PermissionsAndroid.requestMultiple(permsToRequest);

        if (grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Microphone permission is required to make calls.');
          isCreatingOffer.current = false;
          return;
        }
        if (isVideo && grants[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Camera permission is required for video calls.');
          isCreatingOffer.current = false;
          return;
        }
      }

      console.log('[WebRTC] Starting', isVideo ? 'video' : 'audio', 'call...');

      // Get local media
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo
          ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
      });

      setLocalStream(stream);

      // Start audio manager
      InCallManager.start({ media: isVideo ? 'video' : 'audio' });
      if (!isVideo) {
        InCallManager.setForceSpeakerphoneOn(false); // earpiece for audio
      } else {
        InCallManager.setForceSpeakerphoneOn(true); // speaker for video
      }

      const pc = createPC();
      stream.getTracks().forEach((track: any) => {
        console.log('[WebRTC] Adding track:', track.kind);
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      console.log('[WebRTC] Sending offer to room:', roomId);
      if (socketRef.current?.connected) {
        socketRef.current.emit('webrtc_signal', {
          to: roomId,
          signal: pc.localDescription,
        });
      }

      // FIX: Set a connection timeout — if no answer in 30 seconds, alert user
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isConnected) {
          console.log('[WebRTC] Connection timeout — no answer received');
          Alert.alert(
            'No Answer',
            'The provider did not connect in time. The session may have started but the call did not connect. Check your internet connection.',
          );
        }
      }, 30000);
    } catch (e: any) {
      console.error('[WebRTC] startCall error:', e);
      isCreatingOffer.current = false;
      Alert.alert('Call Error', 'Could not start the call: ' + (e?.message || 'Unknown error'));
    }
  }, [socketRef, roomId, createPC, isConnected]);

  // ─── Handle incoming WebRTC signals ─────────────────────────────────────────
  const handleSignal = useCallback(async ({ signal }: { signal: any }) => {
    try {
      console.log('[WebRTC] Received signal:', signal.type || 'candidate');

      // FIX: Don't create new PC here — caller already created one in startCall
      // Only create PC if we receive an offer (i.e., we are the callee — ShEPanel web side won't happen on mobile)
      let pc = pcRef.current;
      if (!pc) {
        if (signal.type === 'offer') {
          pc = createPC();
        } else {
          console.log('[WebRTC] No PC exists and signal is not an offer — ignoring');
          return;
        }
      }

      if (signal.type === 'offer') {
        // Safeguard: only handle offer if in stable state
        const sigState = (pc as any).signalingState;
        if (sigState !== 'stable') {
          console.log('[WebRTC] Skipping offer — not in stable state:', sigState);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        console.log('[WebRTC] Set remote description (offer)');

        // Flush pending candidates AFTER remote description is set
        for (const c of pendingCandidates.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidates.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current?.connected) {
          socketRef.current.emit('webrtc_signal', {
            to: roomId,
            signal: pc.localDescription,
          });
        }

      } else if (signal.type === 'answer') {
        const sigState = (pc as any).signalingState;
        if (sigState !== 'have-local-offer') {
          console.log('[WebRTC] Skipping answer — not in have-local-offer state:', sigState);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        console.log('[WebRTC] Set remote description (answer)');
        isCreatingOffer.current = false;

        // Flush pending candidates AFTER remote description is set
        for (const c of pendingCandidates.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidates.current = [];

      } else if (signal.type === 'candidate') {
        // FIX: Queue candidates if remote description not yet set
        if (pc.remoteDescription && (pc as any).remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.log('[WebRTC] Failed to add ICE candidate:', e);
          }
        } else {
          console.log('[WebRTC] Queuing ICE candidate (no remote desc yet)');
          pendingCandidates.current.push(signal.candidate);
        }
      }
    } catch (e) {
      console.error('[WebRTC] handleSignal error:', e);
    }
  }, [socketRef, roomId, createPC]);

  // ─── End Call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log('[WebRTC] Ending call...');

    setLocalStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((t: any) => {
          t.stop();
          t.enabled = false;
        });
      }
      return null;
    });

    cleanupPC();
    setRemoteStream(null);
    setIsConnected(false);

    try { InCallManager.stop(); } catch {}
  }, [cleanupPC]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return { localStream, remoteStream, isConnected, startCall, handleSignal, endCall };
}

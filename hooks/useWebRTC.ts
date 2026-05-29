/**
 * hooks/useWebRTC.ts — BeHappyTalk WebRTC with Metered.ca TURN
 *
 * HOW TO USE:
 *  1. Copy this file to: hooks/useWebRTC.ts
 *  2. In your server .env add:
 *       METERED_APP_SUBDOMAIN=your-app-subdomain   (e.g. "behappytalk")
 *       METERED_API_KEY=your-secret-key
 *  3. The server already has /api/turn-credentials — no server changes needed.
 *
 * BLACK SCREEN FIXES APPLIED:
 *  - getUserMedia is called BEFORE creating the PeerConnection, so the local
 *    stream is attached at construction time (avoids the "no local track" race).
 *  - addTrack is used instead of addStream (deprecated in newer WebRTC builds).
 *  - Remote stream is assembled from ontrack events, not the legacy onaddstream.
 *  - Mirror flag is set correctly on the local RTCView (see CallView.tsx).
 *  - TURN credentials are fetched fresh from the server before every call.
 *  - InCallManager is started AFTER local media is ready, not before.
 *  - All state transitions happen on the JS thread via setState, never mutated.
 *  - PeerConnection is torn down completely on endCall to avoid ghost tracks.
 */

import { useState, useCallback, useRef } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  startCall: (isVideo: boolean) => Promise<void>;
  handleSignal: (payload: { signal: any }) => Promise<void>;
  endCall: () => void;
}

// ─── ICE candidate queue ─────────────────────────────────────────────────────
// Candidates can arrive before remoteDescription is set.  We queue them and
// drain the queue once setRemoteDescription completes.

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTC(socketRef: any, roomId: string): UseWebRTCReturn {
  const { user } = useAuth();

  const [localStream, setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected]   = useState(false);

  // Refs — mutable, not reactive
  const pcRef             = useRef<RTCPeerConnection | null>(null);
  const isVideoCallRef    = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);
  const remoteDescSet     = useRef(false);
  const remoteStreamRef   = useRef<MediaStream | null>(null);

  // ─── Fetch TURN credentials from your server ──────────────────────────────

  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    try {
      const token = user?.token;
      if (!token) throw new Error('No auth token');

      const res = await secureFetch(`${API_URL}/turn-credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { iceServers } = await res.json();
      console.log('[WebRTC] TURN servers fetched:', iceServers?.length);
      return iceServers;
    } catch (err) {
      console.warn('[WebRTC] Could not fetch TURN creds, falling back to STUN:', err);
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    }
  }, [user]);

  // ─── Build PeerConnection ─────────────────────────────────────────────────

  const createPeerConnection = useCallback(
    (iceServers: RTCIceServer[]): RTCPeerConnection => {
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all', // switch to 'relay' if you want TURN-only
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'unified-plan',
      });

      // ICE candidate → send to peer via socket
      pc.onicecandidate = ({ candidate }) => {
        if (candidate && socketRef.current) {
          console.log('[WebRTC] Sending ICE candidate');
          socketRef.current.emit('webrtc_signal', {
            to: roomId,
            signal: { type: 'candidate', candidate },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE state:', pc.iceConnectionState);
        if (
          pc.iceConnectionState === 'connected' ||
          pc.iceConnectionState === 'completed'
        ) {
          setIsConnected(true);
        } else if (
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'disconnected' ||
          pc.iceConnectionState === 'closed'
        ) {
          setIsConnected(false);
        }
      };

      // ── KEY FIX: Use native stream from event.streams[0] ──────────────────
      pc.ontrack = (event) => {
        console.log('[WebRTC] ontrack fired, kind:', event.track.kind);

        if (event.streams && event.streams[0]) {
          console.log('[WebRTC] Remote stream obtained from event:', event.streams[0].id);
          remoteStreamRef.current = event.streams[0];
          setRemoteStream(event.streams[0]);
        } else {
          // Fallback: build stream from individual tracks if streams is empty
          let stream = remoteStreamRef.current;
          if (!stream) {
            stream = new MediaStream([]);
            remoteStreamRef.current = stream;
          }

          const alreadyHas = stream
            .getTracks()
            .some((t) => t.id === event.track.id);
          if (!alreadyHas) {
            stream.addTrack(event.track);
            console.log('[WebRTC] Added remote track to fallback stream:', event.track.kind);
          }

          setRemoteStream(stream);
        }
      };

      return pc;
    },
    [roomId, socketRef]
  );

  // ─── Drain queued ICE candidates ─────────────────────────────────────────

  const drainCandidateQueue = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    console.log(
      '[WebRTC] Draining',
      pendingCandidates.current.length,
      'queued candidates'
    );
    for (const c of pendingCandidates.current) {
      try {
        await pc.addIceCandidate(c);
      } catch (e) {
        console.warn('[WebRTC] addIceCandidate (queued) failed:', e);
      }
    }
    pendingCandidates.current = [];
  }, []);

  // ─── startCall (caller side) ──────────────────────────────────────────────

  const startCall = useCallback(
    async (isVideo: boolean) => {
      console.log('[WebRTC] startCall, isVideo:', isVideo);
      isVideoCallRef.current = isVideo;

      try {
        // 1. Get local media FIRST
        const constraints = {
          audio: true,
          video: isVideo ? { facingMode: 'user' } : false,
        };

        const stream = await mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        console.log('[WebRTC] Got local stream, tracks:', stream.getTracks().length);

        // 2. Start InCallManager AFTER getting media
        InCallManager.start({ media: isVideo ? 'video' : 'audio' });
        InCallManager.setForceSpeakerphoneOn(!isVideo); // earpiece for audio calls

        // 3. Fetch TURN credentials
        const iceServers = await fetchIceServers();

        // 4. Create PeerConnection and add local tracks
        const pc = createPeerConnection(iceServers);
        pcRef.current = pc;
        remoteDescSet.current = false;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
          console.log('[WebRTC] Added local track to PC:', track.kind);
        });

        // 5. Create and send offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });
        await pc.setLocalDescription(offer);
        console.log('[WebRTC] Offer created, sending via socket to room:', roomId);

        if (socketRef.current) {
          socketRef.current.emit('webrtc_signal', {
            to: roomId,
            signal: { type: 'offer', sdp: offer.sdp },
          });
        }
      } catch (err) {
        console.error('[WebRTC] startCall error:', err);
      }
    },
    [roomId, socketRef, fetchIceServers, createPeerConnection]
  );

  // ─── handleSignal (both sides) ────────────────────────────────────────────

  const handleSignal = useCallback(
    async ({ signal }: { signal: any }) => {
      if (!signal) return;
      console.log('[WebRTC] handleSignal type:', signal.type || 'candidate');

      try {
        // ── ANSWER: We are the callee ──────────────────────────────────────
        if (signal.type === 'offer') {
          // Guard: ignore duplicate offers when already negotiated
          if (pcRef.current && remoteDescSet.current && pcRef.current.signalingState === 'stable') {
            console.log('[WebRTC] Ignoring duplicate offer — already connected');
            return;
          }
          // Get local media if not already obtained
          let stream = localStream;
          if (!stream) {
            const isVideo = signal.sdp?.includes('m=video') ?? false;
            isVideoCallRef.current = isVideo;

            const constraints = {
              audio: true,
              video: isVideo ? { facingMode: 'user' } : false,
            };
            stream = await mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);
            console.log('[WebRTC] Callee got local stream');

            InCallManager.start({ media: isVideo ? 'video' : 'audio' });
            InCallManager.setForceSpeakerphoneOn(!isVideo);
          }

          // Create PC if needed
          let pc = pcRef.current;
          if (!pc) {
            const iceServers = await fetchIceServers();
            pc = createPeerConnection(iceServers);
            pcRef.current = pc;
            remoteDescSet.current = false;

            stream.getTracks().forEach((track) => {
              pc!.addTrack(track, stream!);
            });
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp: signal.sdp })
          );
          remoteDescSet.current = true;
          await drainCandidateQueue();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (socketRef.current) {
            socketRef.current.emit('webrtc_signal', {
              to: roomId,
              signal: { type: 'answer', sdp: answer.sdp },
            });
          }
          console.log('[WebRTC] Answer sent');
        }

        // ── ANSWER received by caller ──────────────────────────────────────
        else if (signal.type === 'answer') {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
          );
          remoteDescSet.current = true;
          await drainCandidateQueue();
          console.log('[WebRTC] Remote description set from answer');
        }

        // ── ICE candidate ──────────────────────────────────────────────────
        else if (signal.type === 'candidate' && signal.candidate) {
          const pc = pcRef.current;
          if (!pc) return;

          const candidate = new RTCIceCandidate(signal.candidate);

          if (!remoteDescSet.current) {
            // Queue it — remote description not set yet
            pendingCandidates.current.push(candidate);
            console.log('[WebRTC] Queued ICE candidate');
          } else {
            try {
              await pc.addIceCandidate(candidate);
            } catch (e) {
              console.warn('[WebRTC] addIceCandidate failed:', e);
            }
          }
        }
      } catch (err) {
        console.error('[WebRTC] handleSignal error:', err);
      }
    },
    [
      localStream,
      roomId,
      socketRef,
      fetchIceServers,
      createPeerConnection,
      drainCandidateQueue,
    ]
  );

  // ─── endCall ──────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    console.log('[WebRTC] endCall');

    // Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    // Close and null out the peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop InCallManager
    try {
      InCallManager.stop();
    } catch {}

    // Reset all state
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    remoteStreamRef.current = null;
    remoteDescSet.current = false;
    pendingCandidates.current = [];
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    isConnected,
    startCall,
    handleSignal,
    endCall,
  };
}

// ─── Type helper (react-native-webrtc doesn't export RTCIceServer) ───────────
interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);
  const remoteDescSet = useRef(false);

  const fetchIceServers = async () => {
    try {
      const token = user?.token;
      if (!token) return [{ urls: 'stun:stun.l.google.com:19302' }];
      const res = await secureFetch(`${API_URL}/turn-credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const { iceServers } = await res.json();
        return iceServers;
      }
    } catch (e) {
      console.warn('[VideoWebRTC] TURN fetch failed, using STUN', e);
    }
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  };

  const endCall = useCallback(() => {
    console.log('[VideoWebRTC] endCall');
    setIsConnected(false);
    
    InCallManager.stop();

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    remoteDescSet.current = false;
    pendingCandidates.current = [];
  }, [localStream]);

  const startCall = async () => {
    try {
      console.log('[VideoWebRTC] startCall');
      
      // 1. Get media
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' }
      });
      setLocalStream(stream);

      // 2. Configure audio routing
      InCallManager.start({ media: 'video' });
      InCallManager.setForceSpeakerphoneOn(true);

      // 3. Create PC
      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      remoteDescSet.current = false;

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle ICE
      pc.addEventListener('icecandidate', (event: any) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc_signal', {
            to: roomId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      });

      // Handle Connection State
      pc.addEventListener('iceconnectionstatechange', () => {
        console.log('[VideoWebRTC] ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsConnected(true);
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          setIsConnected(false);
          endCall();
        }
      });

      // Handle Remote Stream (v124+ standard)
      pc.addEventListener('track', (event: any) => {
        console.log('[VideoWebRTC] ontrack', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      });

      // 4. Create Offer
      const offer = await pc.createOffer({});
      
      // Prefer VP8 for better Android/Web compat
      let sdp = offer.sdp;
      if (sdp) {
        try {
          sdp = preferVP8(sdp);
          console.log('[VideoWebRTC] Munged local offer SDP to prefer VP8');
        } catch (e) {
          console.warn('[VideoWebRTC] SDP munging failed:', e);
        }
      }

      await pc.setLocalDescription({ type: offer.type, sdp });

      if (socketRef.current) {
        socketRef.current.emit('webrtc_signal', {
          to: roomId,
          signal: { type: offer.type, sdp }
        });
      }

    } catch (e) {
      console.error('[VideoWebRTC] startCall error', e);
      endCall();
    }
  };

  const handleSignal = async (payload: { signal: any }) => {
    const pc = pcRef.current;
    if (!pc) return;
    const { signal } = payload;

    try {
      if (signal.type === 'answer') {
        if (pc.signalingState !== 'have-local-offer') return;
        
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        remoteDescSet.current = true;

        // Drain ICE queue
        for (const candidate of pendingCandidates.current) {
          try { await pc.addIceCandidate(candidate); } catch(e){}
        }
        pendingCandidates.current = [];
      } 
      else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (remoteDescSet.current) {
          try { await pc.addIceCandidate(candidate); } catch(e){}
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
    } catch (e) {
      console.error('[VideoWebRTC] handleSignal error', e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return { localStream, remoteStream, isConnected, startCall, handleSignal, endCall };
}

// ─── Helper function for SDP mangling to prioritize VP8 ───────────────
function preferVP8(sdp: string): string {
  const lines = sdp.split('\r\n');
  let videoLineIdx = -1;
  let vp8Payload: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('m=video')) {
      videoLineIdx = i;
    } else if (lines[i].startsWith('a=rtpmap:') && lines[i].toLowerCase().includes('vp8/90000')) {
      const match = lines[i].match(/^a=rtpmap:(\d+) VP8/i);
      if (match) {
        vp8Payload = match[1];
      }
    }
  }

  if (videoLineIdx !== -1 && vp8Payload !== null) {
    const videoLine = lines[videoLineIdx];
    const parts = videoLine.split(' ');
    // parts[0] is 'm=video', parts[1] is port, parts[2] is protocol
    // The rest are payloads. We want to bring vp8Payload to the front.
    const payloads = parts.slice(3);
    const newPayloads = payloads.filter(p => p !== vp8Payload);
    newPayloads.unshift(vp8Payload);
    lines[videoLineIdx] = `${parts[0]} ${parts[1]} ${parts[2]} ${newPayloads.join(' ')}`;
  }

  return lines.join('\r\n');
}

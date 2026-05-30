import { useState, useRef, useCallback } from 'react';
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

export function useWebRTC(socketRef: any, roomId: string) {
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
      if (!token) throw new Error('No token');
      const res = await secureFetch(`${API_URL}/turn-credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const { iceServers } = await res.json();
        return iceServers;
      }
    } catch (e) {
      console.warn('[WebRTC] TURN fetch failed, using STUN', e);
    }
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  };

  const endCall = useCallback(() => {
    console.log('[WebRTC] endCall');
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

  const startCall = async (isVideo: boolean) => {
    try {
      console.log('[WebRTC] startCall', { isVideo });
      
      // 1. Get media
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user', width: 1280, height: 720 } : false
      });
      setLocalStream(stream);

      // 2. Configure audio routing
      InCallManager.start({ media: isVideo ? 'video' : 'audio' });
      InCallManager.setForceSpeakerphoneOn(isVideo);

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
        console.log('[WebRTC] ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsConnected(true);
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          setIsConnected(false);
          endCall();
        }
      });

      // Handle Remote Stream (v124+ standard)
      pc.addEventListener('track', (event: any) => {
        console.log('[WebRTC] ontrack', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      });

      // 4. Create Offer
      const offer = await pc.createOffer({}); // Unified Plan auto-adds transceivers based on addTrack
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('webrtc_signal', {
          to: roomId,
          signal: { type: 'offer', sdp: offer.sdp }
        });
      }

    } catch (e) {
      console.error('[WebRTC] startCall error', e);
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
      console.error('[WebRTC] handleSignal error', e);
    }
  };

  return { localStream, remoteStream, isConnected, startCall, handleSignal, endCall };
}

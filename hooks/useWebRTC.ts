/**
 * useWebRTC.ts — Clean WebRTC Stub for BeHappyTalk
 *
 * All connection and signaling logic has been removed as requested.
 * Returns standard stubs and simulates connection state changes so the UI works correctly.
 */

import { useState, useCallback } from 'react';
import { MediaStream } from 'react-native-webrtc';

export function useWebRTC(socketRef: any, roomId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const startCall = useCallback(async (isVideo: boolean) => {
    console.log('[WebRTC Stub] startCall requested, isVideo:', isVideo);
    // Simulate connection for UI testing after 1 second
    setTimeout(() => {
      setIsConnected(true);
      console.log('[WebRTC Stub] Simulating call connection (active state)...');
    }, 1000);
  }, []);

  const handleSignal = useCallback(async ({ signal }: { signal: any }) => {
    console.log('[WebRTC Stub] handleSignal received:', signal?.type);
  }, []);

  const endCall = useCallback(() => {
    console.log('[WebRTC Stub] endCall requested');
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  return { localStream, remoteStream, isConnected, startCall, handleSignal, endCall };
}

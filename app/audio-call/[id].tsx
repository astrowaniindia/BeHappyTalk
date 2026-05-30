/**
 * app/call/[id].tsx — Dedicated Call Screen for BeHappyTalk Mobile App
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { Audio } from 'expo-av';
import { API_URL, SOCKET_URL, secureFetch } from '../../constants/ServerConfig';
import AudioCallView from '../../components/AudioCallView';
import { useAudioWebRTC } from '../../hooks/useAudioWebRTC';

const PROVIDER_IMAGE = require('../../assets/images/girl_smiling_1775250936696.png');

export default function DedicatedAudioCallScreen() {
  const router = useRouter();
  const { id: providerId, sessionId, type, duration } = useLocalSearchParams<{
    id: string;
    sessionId?: string;
    type?: string;
    duration?: string;
  }>();
  const { user } = useAuth();

  const [contact, setContact] = useState<any>({ name: 'Loading...', image: PROVIDER_IMAGE });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [wallet, setWallet] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const socketRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const callStartedRef = useRef(false);
  const handleSignalRef = useRef<((payload: any) => void) | null>(null);

  const userId = user?.id;
  const roomId = userId && providerId ? `chat_${userId}_${providerId}` : '';

  const { localStream, remoteStream, isConnected, startCall, handleSignal, endCall } = useAudioWebRTC(socketRef, roomId);

  const endSession = useCallback(() => {
    stopRingback();
    endCall();
    if (sessionId && socketRef.current) {
      socketRef.current.emit('end_interaction', { sessionId });
    }
    router.replace(`/post-call?providerId=${providerId}&type=${type}&reason=user_ended`);
  }, [endCall, sessionId, providerId, type]);

  // Timer logic
  useEffect(() => {
    if (duration === 'unlimited') {
      setTimeLeft(0);
    } else if (duration) {
      setTimeLeft(parseInt(duration, 10) * 60);
    }
  }, [duration]);

  useEffect(() => {
    let timerInt: NodeJS.Timeout;
    if (isConnected && timeLeft !== null && duration !== 'unlimited') {
      timerInt = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev <= 1) {
            clearInterval(timerInt);
            endSession();
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);
    }
    return () => clearInterval(timerInt);
  }, [isConnected, timeLeft, duration, endSession]);

  // Ringback tone
  const playRingback = async () => {
    try {
      if (soundRef.current) return; // already playing
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );
      soundRef.current = sound;
    } catch (e) {
      console.log('Ringback error (non-fatal):', e);
    }
  };

  const stopRingback = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    
    soundRef.current = null; // Clear immediately to prevent double-calls
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (e) {
      // Ignore "Player does not exist" which happens during fast remounts
    }
  };

  useEffect(() => {
    setIsConnecting(true);
    playRingback();
    return () => {
      stopRingback();
    };
  }, []);

  useEffect(() => {
    if (isConnected) stopRingback();
  }, [isConnected]);

  // Main session setup
  useEffect(() => {
    if (!userId || !providerId) return;

    let activeTimeouts: any[] = [];

    // 1. Fetch provider details
    secureFetch(`${API_URL}/providers`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const found = data.find((p: any) => p.id === providerId);
        if (found) {
          setContact({
            ...found,
            image: found.imagePath ? { uri: found.imagePath } : PROVIDER_IMAGE,
          });
        }
      })
      .catch(console.error);

    // 2. Fetch wallet balance
    secureFetch(`${API_URL}/user/${userId}`)
      .then((r) => r.json())
      .then((data: any) => setWallet(data.walletBalance))
      .catch(console.error);

    // 3. Setup socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('[Call] Socket connected:', socketRef.current.id);
      socketRef.current.emit('join_chat', { userId, providerId });

      // Start WebRTC call once
      if (!callStartedRef.current) {
        callStartedRef.current = true;
        console.log('[Call] Initiating WebRTC call...');
        const timeoutId = setTimeout(async () => {
          await stopRingback();
          startCall(); // Removed type === 'Video' parameter
        }, 500);
        
        // Store timeout ID to clear on unmount
        activeTimeouts.push(timeoutId);
      }
    });

    socketRef.current.on('webrtc_signal', (payload: any) => {
      if (handleSignalRef.current) handleSignalRef.current(payload);
    });

    socketRef.current.on('session_ended', ({ reason }: { reason: string }) => {
      endCall();
      router.replace(`/post-call?providerId=${providerId}&type=${type}&reason=${reason}`);
    });

    socketRef.current.on('wallet_update', ({ walletBalance }: { walletBalance: number }) => {
      if (typeof walletBalance === 'number') setWallet(walletBalance);
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      endSession();
      return true;
    });

    return () => {
      backHandler.remove();
      stopRingback();
      activeTimeouts.forEach(clearTimeout);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, providerId]);

  // Keep handleSignalRef fresh
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <AudioCallView
          localStream={localStream}
          remoteStream={remoteStream}
          isConnected={isConnected}
          onEnd={endSession}
          callerName={contact.name}
          timeLeft={timeLeft}
          isUnlimited={duration === 'unlimited'}
          walletBalance={wallet}
        />
        {isConnecting && !isConnected && (
          <View style={styles.connectingOverlay}>
            <ActivityIndicator size="large" color="#FACC15" />
            <Text style={styles.connectingText}>Connecting to {contact.name}...</Text>
            <Text style={styles.encryptionText}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#34D399" /> End-to-End Encrypted
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 10, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 100,
  },
  connectingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  encryptionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
});

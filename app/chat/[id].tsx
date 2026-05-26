/**
 * app/chat/[id].tsx — FIXED VERSION
 *
 * Key fixes applied:
 * 1. FIXED: startCall was being called on socket 'connect' event — this fires
 *    every time socket reconnects, causing MULTIPLE offers to be sent.
 *    Now uses a ref guard so startCall is called exactly ONCE.
 * 2. FIXED: Two socket instances were being created (one in home.tsx, one here).
 *    Now properly manages a single socket instance.
 * 3. FIXED: WebRTC signal listener was attached but never cleaned up properly.
 * 4. IMPROVED: Audio routing — InCallManager is now started correctly for both
 *    audio and video calls.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar,
  TextInput, FlatList, Image, TouchableOpacity, KeyboardAvoidingView,
  ActivityIndicator, Alert, BackHandler
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { Audio } from 'expo-av';
import { API_URL, SOCKET_URL, secureFetch } from '../../constants/ServerConfig';
import CallView from '../../components/CallView';
import { useWebRTC } from '../../hooks/useWebRTC';

const PROVIDER_IMAGE = require('../../assets/images/girl_smiling_1775250936696.png');

type Message = {
  id: string;
  type: 'system' | 'incoming' | 'outgoing';
  text: string;
  time: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const { id: providerId, sessionId, type, duration } = useLocalSearchParams<{
    id: string;
    sessionId?: string;
    type?: string;
    duration?: string;
  }>();
  const { user } = useAuth();

  const [message, setMessage] = useState('');
  const [contact, setContact] = useState<any>({ name: 'Loading...', image: PROVIDER_IMAGE, status: 'online', verified: false });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [wallet, setWallet] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  // FIX: Guard to ensure startCall is called exactly once
  const callStartedRef = useRef(false);

  const userId = user?.id;
  const roomId = userId && providerId ? `chat_${userId}_${providerId}` : '';

  const { localStream, remoteStream, isConnected, startCall, handleSignal, endCall } = useWebRTC(socketRef, roomId);

  // ─── Timer countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (duration) setTimeLeft(parseInt(duration, 10) * 60);
  }, [duration]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // ─── Ringback sound ─────────────────────────────────────────────────────────
  const stopRingback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch {}
    }
  };

  const playRingback = async () => {
    await stopRingback();
    try {
      // Set audio mode FIRST — this prevents the wrong-thread clash with ExoPlayer
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,      // ← this is the key fix
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );
      soundRef.current = sound;
    } catch (e) {
      console.log('Ringback error (non-fatal):', e);
      // Don't crash — ringback is optional, the call should still work
    }
  };

  useEffect(() => {
    if (type && (type === 'Call' || type === 'Video' || type === 'Audio')) {
      setIsConnecting(true);
      playRingback();
    }
    return () => { stopRingback(); };
  }, [type]);

  useEffect(() => {
    if (isConnected) stopRingback();
  }, [isConnected]);

  // ─── Main setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !providerId) return;

    // 1. Fetch provider info
    secureFetch(`${API_URL}/providers`)
      .then(r => r.json())
      .then((data: any[]) => {
        const found = data.find((p: any) => p.id === providerId);
        if (found) setContact({ ...found, image: PROVIDER_IMAGE });
      })
      .catch(console.error);

    // 2. Fetch existing messages
    secureFetch(`${API_URL}/chat/${userId}/${providerId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        const mapped = data.map(m => ({
          id: m.id.toString(),
          type: m.senderId === userId ? 'outgoing' : 'incoming',
          text: m.text,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        } as Message));
        setMessages(mapped);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      })
      .catch(console.error);

    // 3. Fetch wallet balance
    secureFetch(`${API_URL}/user/${userId}`)
      .then(r => r.json())
      .then((data: any) => setWallet(data.walletBalance))
      .catch(console.error);

    // 4. Setup socket
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('[Chat] Socket connected:', socketRef.current.id);
      socketRef.current.emit('join_chat', { userId, providerId });

      // FIX: Only start call ONCE — not on every reconnect
      if ((type === 'Video' || type === 'Call' || type === 'Audio') && !callStartedRef.current) {
        callStartedRef.current = true;
        console.log('[Chat] Starting call, type:', type);
        // Small delay to ensure the provider has also connected their socket
        setTimeout(async () => {
          await stopRingback();   // ← stop ringback BEFORE starting call audio
          startCall(type === 'Video');
        }, 500);
      }
    });

    socketRef.current.on('webrtc_signal', handleSignal);

    socketRef.current.on('receive_message', (newMsg: any) => {
      if (newMsg.senderId === providerId) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id.toString())) return prev;
            return [
              ...prev,
              {
                id: newMsg.id.toString(),
                type: 'incoming',
                text: newMsg.text,
                time: new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
        }, 600);
      } else {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id.toString())) return prev;
          return [
            ...prev,
            {
              id: newMsg.id.toString(),
              type: 'outgoing',
              text: newMsg.text,
              time: new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        });
        setIsSending(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });

    socketRef.current.on('session_ended', ({ reason }: { reason: string }) => {
      endCall();
      const msg = reason === 'insufficient_funds'
        ? 'Session ended: Your wallet balance ran out.'
        : reason === 'duration_ended'
        ? 'Session ended: Time limit reached.'
        : 'Session has ended.';
      Alert.alert('Session Ended', msg, [{ text: 'OK', onPress: () => router.replace('/home') }]);
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
      if (socketRef.current) {
        socketRef.current.off('webrtc_signal', handleSignal);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      endCall();
    };
  }, [userId, providerId]);

  // FIX: handleSignal and startCall are stable refs from useWebRTC,
  // so we only need to re-attach if they change. Add them as listeners
  // separately to avoid re-running the whole effect.
  useEffect(() => {
    if (!socketRef.current) return;
    socketRef.current.off('webrtc_signal');
    socketRef.current.on('webrtc_signal', handleSignal);
  }, [handleSignal]);

  const endSession = useCallback(() => {
    stopRingback();
    endCall();
    if (sessionId && socketRef.current) {
      socketRef.current.emit('end_interaction', { sessionId });
    }
    router.replace('/home');
  }, [endCall, sessionId]);

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed || !socketRef.current || !userId || !isSessionActive) return;

    setIsSending(true);
    socketRef.current.emit('send_message', {
      userId,
      providerId,
      senderId: userId,
      text: trimmed,
    });
    setMessage('');
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setIsSending(true);
      try {
        const res = await secureFetch(`${API_URL}/chat/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image, senderId: userId })
        });
        const data = await res.json();
        if (data.success && socketRef.current) {
          socketRef.current.emit('send_message', {
            userId,
            providerId,
            senderId: userId,
            text: `[IMAGE]${data.url}`,
          });
        } else {
          Alert.alert('Upload Failed', data.error || 'Failed to upload image');
        }
      } catch (e) {
        console.error('Image upload failed', e);
      }
      setIsSending(false);
    }
  };

  const isSessionActive = Boolean(sessionId) && (timeLeft === null || timeLeft > 0);

  const renderMessageContent = (text: string) => {
    if (text.startsWith('[IMAGE]')) {
      const url = text.replace('[IMAGE]', '');
      return <Image source={{ uri: url }} style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: '#1A1C23' }} resizeMode="cover" />;
    }
    return <Text style={styles.msgText}>{text}</Text>;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'system') {
      return (
        <View style={styles.systemPillCt}>
          <View style={styles.systemPill}>
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'incoming') {
      return (
        <View style={styles.incomingRow}>
          <View style={styles.incomingBubble}>
            {renderMessageContent(item.text)}
          </View>
          <Text style={styles.timeLeft}>{item.time}</Text>
        </View>
      );
    }

    return (
      <View style={styles.outgoingRow}>
        <View style={styles.outgoingBubble}>
          {renderMessageContent(item.text)}
        </View>
        <View style={styles.timeRowRight}>
          <Text style={styles.timeRight}>{item.time}</Text>
          <MaterialCommunityIcons name="check-all" size={14} color="#34D399" />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {type && (type === 'Call' || type === 'Video' || type === 'Audio') ? (
          <View style={{ flex: 1 }}>
            <CallView
              localStream={localStream}
              remoteStream={remoteStream}
              isVideo={type === 'Video'}
              isConnected={isConnected}
              onEnd={endSession}
              callerName={contact.name}
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
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={24} color="rgba(255,255,255,0.92)" />
                <View style={styles.avatarCt}>
                  <Image source={contact.image} style={styles.avatar} />
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: contact.status === 'online' ? '#34D399' : '#F59E0B' },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.verified && (
                    <MaterialCommunityIcons name="check-decagram" size={14} color="#00E5FF" />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isTyping ? (
                    <Text style={styles.typingText}>typing...</Text>
                  ) : (
                    <Text style={styles.statusText}>
                      {contact.status === 'online' ? 'Online' : 'Away'}
                    </Text>
                  )}
                  {timeLeft !== null && (
                    <View style={{ backgroundColor: '#EF444425', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>
                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.headerActions, { flexDirection: 'column', gap: 6, alignItems: 'flex-end' }]}>
                {wallet !== null && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2028', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FACC1530' }}>
                    <MaterialCommunityIcons name="wallet-outline" size={14} color="#FACC15" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#FACC15', fontWeight: 'bold', fontSize: 11 }}>₹{wallet}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.endBtn} onPress={endSession}>
                  <Text style={styles.endBtnText}>End {type || 'Session'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <View style={styles.chatBg}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                  <View style={styles.emptyCt}>
                    <MaterialCommunityIcons name="chat-outline" size={48} color="rgba(255,255,255,0.10)" />
                    <Text style={styles.emptyText}>
                      Say hello to {contact.name}!{'\n'}They're ready to listen 💛
                    </Text>
                  </View>
                }
              />

              {isTyping && (
                <View style={styles.typingBubbleRow}>
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingDots}>● ● ●</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Input */}
            <View style={[styles.inputContainer, !isSessionActive && { opacity: 0.5 }]}>
              <TouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={!isSessionActive || isSending}>
                <MaterialCommunityIcons name="paperclip" size={24} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <View style={[styles.inputWrapper, !isSessionActive && { backgroundColor: '#12141B' }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder={isSessionActive ? 'Message...' : 'Session ended'}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  editable={isSessionActive}
                  onSubmitEditing={sendMessage}
                />
              </View>
              <TouchableOpacity
                style={[styles.sendButton, (!message.trim() || isSending || !isSessionActive) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!message.trim() || isSending || !isSessionActive}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.60)" />
                ) : (
                  <MaterialCommunityIcons name="send" size={20} color="rgba(255,255,255,0.92)" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 10, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 100
  },
  connectingText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  encryptionText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  safeArea: { flex: 1, backgroundColor: '#1A1C23', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#0A0B10' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C23', paddingVertical: 10, paddingHorizontal: 12, elevation: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarCt: { position: 'relative' },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#1A1C23' },
  headerInfo: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactName: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' },
  statusText: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 },
  typingText: { color: '#34D399', fontSize: 12, marginTop: 1, fontStyle: 'italic' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  endBtn: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  endBtnText: { color: '#0A0B10', fontWeight: 'bold', fontSize: 13 },
  chatBg: { flex: 1, backgroundColor: '#0D0E16' },
  listContent: { padding: 16, gap: 10, flexGrow: 1 },
  emptyCt: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  systemPillCt: { alignItems: 'center', marginVertical: 8 },
  systemPill: { backgroundColor: '#1A1C23', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  systemText: { color: 'rgba(255,255,255,0.60)', fontSize: 12 },
  incomingRow: { alignItems: 'flex-start', maxWidth: '78%' },
  incomingBubble: { backgroundColor: '#1E2028', padding: 12, borderRadius: 16, borderTopLeftRadius: 4 },
  timeLeft: { color: 'rgba(255,255,255,0.30)', fontSize: 11, marginTop: 4, marginLeft: 6 },
  outgoingRow: { alignItems: 'flex-end', alignSelf: 'flex-end', maxWidth: '78%' },
  outgoingBubble: { backgroundColor: '#4C1D95', padding: 12, borderRadius: 16, borderBottomRightRadius: 4 },
  timeRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginRight: 4 },
  timeRight: { color: 'rgba(255,255,255,0.30)', fontSize: 11 },
  msgText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 22 },
  typingBubbleRow: { paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { backgroundColor: '#1E2028', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderTopLeftRadius: 4, alignSelf: 'flex-start' },
  typingDots: { color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 3 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: Platform.OS === 'android' ? 36 : 12, backgroundColor: '#0A0B10', gap: 10 },
  inputWrapper: { flex: 1, backgroundColor: '#1A1C23', borderRadius: 24, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, minHeight: 48, justifyContent: 'center' },
  textInput: { color: 'rgba(255,255,255,0.92)', fontSize: 15, maxHeight: 100 },
  attachBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4C1D95', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
});

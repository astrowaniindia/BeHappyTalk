import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import io from 'socket.io-client';
import { RTCView } from 'react-native-webrtc';
import { useAudioWebRTC } from '../hooks/useAudioWebRTC';

const { width } = Dimensions.get('window');
const SOCKET_URL = 'https://provider.behappytalk.com';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  success: '#10B981',
  danger: '#EF4444',
  overlay: 'rgba(26, 42, 68, 0.95)', // Dark blue overlay for audio
};

export default function AudioCallsScreen() {
  const router = useRouter();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Call States: 'idle' | 'incoming' | 'active'
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active'>('idle');
  const [incomingData, setIncomingData] = useState<any>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Fetch audio call history
  const loadHistory = async () => {
    try {
      setRefreshing(true);
      const dataStr = await AsyncStorage.getItem('providerData');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      const res = await axios.get(`${SOCKET_URL}/api/provider/history/${data.id}`);
      if (res.data) {
        // Filter only audio calls
        const audioCalls = res.data.filter((s: any) => {
          const t = (s.type || '').toLowerCase();
          return t === 'audio' || t === 'call';
        }).map((s: any) => ({
          id: s.id,
          date: s.startTime || new Date().toISOString(),
          userName: s.userName || 'Unknown User',
          duration: s.duration || 0,
          earning: (s.rate * (s.duration || 0) * 0.5).toFixed(2),
        }));
        setHistory(audioCalls);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  // WebRTC Hook
  const { localStream, remoteStream, isConnected, startLocalStream, handleSignal, endCall: endWebRTC } = useAudioWebRTC(socket, roomId);

  const onRefresh = React.useCallback(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    let s: any;
    const init = async () => {
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        setProviderId(data.id);

        s = io(SOCKET_URL, { transports: ['websocket'] });
        setSocket(s);

        s.on('connect', () => {
          console.log('Audio Call Socket Connected');
          s.emit('provider_online', { providerId: data.id });
        });

        // Listen for incoming WebRTC audio calls
        s.on('incoming_request', (req: any) => {
          if (req.type === 'audio') {
            setIncomingData(req);
            setCallState('incoming');
          }
        });

        s.on('session_started', (data: any) => {
          if (data.type === 'audio') {
            setRoomId(data.room);
            setCallState('active');
            startLocalStream();
          }
        });

        s.on('session_ended', () => {
          endCall();
        });

        s.on('request_cancelled', () => {
          if (callState === 'incoming') {
            setCallState('idle');
            setIncomingData(null);
          }
        });
      }
    };
    init();

    return () => {
      if (s) s.disconnect();
      endWebRTC();
    };
  }, []);

  // Listen to WebRTC signaling events once room is set
  useEffect(() => {
    if (socket && roomId) {
      const webrtcListener = (data: any) => {
        handleSignal(data);
      };
      socket.on('webrtc_signal', webrtcListener);
      return () => {
        socket.off('webrtc_signal', webrtcListener);
      };
    }
  }, [socket, roomId, handleSignal]);

  // Timer for active call
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === 'active') {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Handle Mute
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const acceptCall = () => {
    console.log('Audio call accepted from user:', incomingData?.userId);
    if (socket && incomingData) {
      socket.emit('accept_interaction', {
        userId: incomingData.userId,
        providerId: providerId,
        type: incomingData.type,
        rate: incomingData.rate || 0,
        duration: incomingData.duration || 5
      });
    }
  };

  const rejectCall = () => {
    if (socket && incomingData) {
      socket.emit('reject_interaction', {
        userId: incomingData.userId,
        providerId: providerId
      });
    }
    setCallState('idle');
    setIncomingData(null);
  };

  const endCall = () => {
    if (socket && roomId) {
      socket.emit('end_interaction', { sessionId: incomingData?.sessionId || 'unknown' });
    }
    endWebRTC();
    setCallState('idle');
    setIncomingData(null);
    setCallDuration(0);
    setRoomId(null);
  };

  if (callState === 'incoming') {
    return (
      <View style={styles.fullscreenOverlay}>
        <StatusBar style="light" />
        <View style={styles.incomingContent}>
          <View style={styles.callerAvatar}>
            <Ionicons name="call" size={50} color={Colors.white} />
          </View>
          <Text style={styles.callerName}>User {incomingData?.userName || incomingData?.userId}</Text>
          <Text style={styles.incomingLabel}>Incoming Audio Call...</Text>
        </View>
        <View style={styles.callActionsBox}>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: Colors.danger }]} onPress={rejectCall}>
            <Ionicons name="close" size={32} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: Colors.success }]} onPress={acceptCall}>
            <Ionicons name="call" size={32} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (callState === 'active') {
    return (
      <View style={styles.activeCallContainer}>
        <StatusBar style="light" />
        
        {/* Hidden RTCView to bind audio stream */}
        {remoteStream && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={{ width: 0, height: 0, display: 'none' }}
          />
        )}

        <View style={styles.activeCallHeader}>
           <Text style={styles.secureText}>🔒 End-to-End Encrypted</Text>
        </View>

        <View style={styles.activeContent}>
          <View style={styles.activeAvatar}>
             <Ionicons name="person" size={70} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.activeName}>User {incomingData?.userName || incomingData?.userId || 'Connecting...'}</Text>
          <Text style={styles.activeDuration}>
            {isConnected ? formatTime(callDuration) : 'Connecting...'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.activeControlsBox}>
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              style={[styles.controlBtn, isMuted && { backgroundColor: 'rgba(255,255,255,0.9)' }]} 
              onPress={() => setIsMuted(!isMuted)}
            >
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color={isMuted ? Colors.primary : Colors.white} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlBtn, isSpeaker && { backgroundColor: 'rgba(255,255,255,0.9)' }]} 
              onPress={() => setIsSpeaker(!isSpeaker)}
            >
              <Ionicons name={isSpeaker ? "volume-high" : "volume-medium"} size={26} color={isSpeaker ? Colors.primary : Colors.white} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
            <Ionicons name="call" size={32} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Idle State
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audio Calls</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.idleContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
      >
        <View style={{ alignItems: 'center', padding: 32 }}>
          <View style={styles.waitingCircle}>
            <Ionicons name="call" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.idleTitle}>Ready for Audio Sessions</Text>
          <Text style={styles.idleSubtitle}>
            Stay on this screen to receive incoming audio calls, or view your history below.
          </Text>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Audio Calls</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No audio calls yet.</Text>
          ) : (
            history.map((item, index) => (
              <View key={item.id || index} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Date</Text>
                  <Text style={styles.historyValue}>{new Date(item.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>User</Text>
                  <Text style={styles.historyValue}>{item.userName}</Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Duration</Text>
                  <Text style={styles.historyValue}>{item.duration} mins</Text>
                </View>
                <View style={[styles.historyRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.historyLabel}>Earnings</Text>
                  <Text style={[styles.historyValue, { color: Colors.success }]}>₹{item.earning}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 40, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  
  // Idle State
  idleContent: { flexGrow: 1, paddingBottom: 40 },
  waitingCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E6EFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  idleTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, marginBottom: 12 },
  idleSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },
  
  historySection: { paddingHorizontal: 20 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginBottom: 16 },
  emptyText: { color: Colors.textLight, textAlign: 'center', marginTop: 10 },
  historyCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyLabel: { color: Colors.textLight, fontSize: 14 },
  historyValue: { color: Colors.textDark, fontSize: 14, fontWeight: '600' },

  // Incoming State
  fullscreenOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'space-between', paddingTop: 120, paddingBottom: 80 },
  incomingContent: { alignItems: 'center' },
  callerAvatar: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 32, elevation: 10, shadowColor: Colors.primary, shadowOpacity: 0.5, shadowRadius: 20 },
  callerName: { fontSize: 32, fontWeight: 'bold', color: Colors.white, marginBottom: 12 },
  incomingLabel: { fontSize: 18, color: 'rgba(255,255,255,0.7)' },
  callActionsBox: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 40 },
  roundBtn: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 },

  // Active Call State
  activeCallContainer: { flex: 1, backgroundColor: Colors.primary, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 50 },
  activeCallHeader: { alignItems: 'center' },
  secureText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
  activeContent: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 40 },
  activeAvatar: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  activeName: { fontSize: 28, fontWeight: 'bold', color: Colors.white, marginBottom: 12 },
  activeDuration: { fontSize: 18, color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 1 },
  
  activeControlsBox: { backgroundColor: 'rgba(0,0,0,0.1)', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 50 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 32 },
  controlBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  endCallBtn: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.danger, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: Colors.danger, shadowOpacity: 0.4, shadowRadius: 10 }
});

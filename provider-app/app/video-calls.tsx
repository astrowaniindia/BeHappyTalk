import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import io from 'socket.io-client';
import { RTCView } from 'react-native-webrtc';
import { useVideoWebRTC } from '../hooks/useVideoWebRTC';

const { width, height } = Dimensions.get('window');
const SOCKET_URL = 'http://192.168.29.168:3000';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  success: '#10B981',
  danger: '#EF4444',
  overlay: 'rgba(0,0,0,0.85)',
};

export default function VideoCallsScreen() {
  const router = useRouter();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Call States: 'idle' | 'incoming' | 'active'
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active'>('idle');
  const [incomingData, setIncomingData] = useState<any>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Fetch video call history
  const loadHistory = async () => {
    try {
      setRefreshing(true);
      const dataStr = await AsyncStorage.getItem('providerData');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      const res = await axios.get(`${SOCKET_URL}/api/provider/history/${data.id}`);
      if (res.data) {
        // Filter only video calls
        const videoCalls = res.data.filter((s: any) => (s.type || '').toLowerCase() === 'video').map((s: any) => ({
          id: s.id,
          date: s.startTime || new Date().toISOString(),
          userName: s.userName || 'Unknown User',
          duration: s.duration || 0,
          earning: (s.rate * (s.duration || 0) * 0.5).toFixed(2),
        }));
        setHistory(videoCalls);
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
  const { localStream, remoteStream, isConnected, startLocalStream, handleSignal, endCall: endWebRTC } = useVideoWebRTC(socket, roomId);

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
          console.log('Video Call Socket Connected');
          s.emit('provider_online', { providerId: data.id });
        });

        // Listen for incoming WebRTC video calls
        s.on('incoming_request', (req: any) => {
          if (req.type === 'video') {
            setIncomingData(req);
            setCallState('incoming');
          }
        });

        s.on('session_started', (data: any) => {
          if (data.type === 'video') {
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const acceptCall = () => {
    console.log('Call accepted from user:', incomingData?.userId);
    if (socket && incomingData) {
      socket.emit('accept_interaction', {
        userId: incomingData.userId,
        providerId: providerId,
        type: incomingData.type,
        rate: incomingData.rate || 0,
        duration: incomingData.duration || 5
      });
    }
    // We don't set active here; we wait for 'session_started' from server to get roomId
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
            <Ionicons name="person" size={60} color={Colors.white} />
          </View>
          <Text style={styles.callerName}>User {incomingData?.userName || incomingData?.userId}</Text>
          <Text style={styles.incomingLabel}>Incoming Video Call...</Text>
        </View>
        <View style={styles.callActionsBox}>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: Colors.danger }]} onPress={rejectCall}>
            <Ionicons name="close" size={32} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: Colors.success }]} onPress={acceptCall}>
            <Ionicons name="videocam" size={32} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (callState === 'active') {
    return (
      <View style={styles.activeCallContainer}>
        <StatusBar style="light" />
        
        {/* Remote Video Stream */}
        <View style={styles.remoteVideoPlaceholder}>
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              objectFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <>
              <Ionicons name="person" size={80} color="rgba(255,255,255,0.2)" />
              <Text style={styles.remoteVideoText}>Connecting...</Text>
            </>
          )}
        </View>

        {/* Local Video Stream */}
        <View style={styles.localVideoPlaceholder}>
          {localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              objectFit="cover"
              zOrder={1}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Text style={styles.localVideoText}>Your Camera</Text>
          )}
        </View>

        {/* Top bar */}
        <View style={styles.activeTopBar}>
          <View style={styles.durationBadge}>
            <View style={[styles.redDot, isConnected && { backgroundColor: Colors.success }]} />
            <Text style={styles.durationText}>{formatTime(callDuration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.activeControls}>
          <TouchableOpacity style={styles.controlBtn}>
            <Ionicons name="mic-off" size={24} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: Colors.danger, width: 64, height: 64, borderRadius: 32 }]} onPress={endCall}>
            <Ionicons name="call" size={32} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn}>
            <Ionicons name="camera-reverse" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Idle State (History)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Calls</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.idleContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
      >
        <View style={{ alignItems: 'center', padding: 32 }}>
          <View style={styles.waitingCircle}>
            <Ionicons name="videocam" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.idleTitle}>Ready for Video Sessions</Text>
          <Text style={styles.idleSubtitle}>
            Stay on this screen to receive incoming video calls, or view your history below.
          </Text>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Video Calls</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No video calls yet.</Text>
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
  fullscreenOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'space-between', paddingTop: 100, paddingBottom: 60 },
  incomingContent: { alignItems: 'center' },
  callerAvatar: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' },
  callerName: { fontSize: 32, fontWeight: 'bold', color: Colors.white, marginBottom: 8 },
  incomingLabel: { fontSize: 18, color: '#A0AABF' },
  callActionsBox: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 40 },
  roundBtn: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // Active Call State
  activeCallContainer: { flex: 1, backgroundColor: '#111827' },
  remoteVideoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937' },
  remoteVideoText: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 16 },
  localVideoPlaceholder: { position: 'absolute', bottom: 120, right: 20, width: 110, height: 160, backgroundColor: '#374151', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#4B5563', overflow: 'hidden', elevation: 10 },
  localVideoText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' },
  activeTopBar: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'center' },
  durationBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger, marginRight: 8 },
  durationText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  activeControls: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 20 },
  controlBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }
});

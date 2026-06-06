import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');
const SOCKET_URL = 'https://behappytalk-server-ipxj.onrender.com';

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
  
  // Call States: 'idle' | 'incoming' | 'active'
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active'>('idle');
  const [incomingData, setIncomingData] = useState<any>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
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

        s.on('connect', () => console.log('Video Call Socket Connected'));

        // Listen for incoming WebRTC video calls
        s.on('incoming_request', (req: any) => {
          if (req.type === 'video') {
            setIncomingData(req);
            setCallState('incoming');
          }
        });
      }
    };
    init();

    return () => {
      if (s) s.disconnect();
    };
  }, []);

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
    setCallState('active');
  };

  const rejectCall = () => {
    // Notify server call was rejected
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
    // Close WebRTC peer connection
    setCallState('idle');
    setIncomingData(null);
    setCallDuration(0);
  };

  if (callState === 'incoming') {
    return (
      <View style={styles.fullscreenOverlay}>
        <StatusBar style="light" />
        <View style={styles.incomingContent}>
          <View style={styles.callerAvatar}>
            <Ionicons name="person" size={60} color={Colors.white} />
          </View>
          <Text style={styles.callerName}>User {incomingData?.userId}</Text>
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
        {/* Placeholder for Remote Video Stream (RTCView) */}
        <View style={styles.remoteVideoPlaceholder}>
          <Ionicons name="person" size={80} color="rgba(255,255,255,0.2)" />
          <Text style={styles.remoteVideoText}>Client Video Stream</Text>
        </View>

        {/* Placeholder for Local Video Stream (RTCView) */}
        <View style={styles.localVideoPlaceholder}>
          <Text style={styles.localVideoText}>Your Camera</Text>
        </View>

        {/* Top bar */}
        <View style={styles.activeTopBar}>
          <View style={styles.durationBadge}>
            <View style={styles.redDot} />
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
        <View style={styles.waitingCircle}>
          <Ionicons name="videocam" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.idleTitle}>Ready for Video Sessions</Text>
        <Text style={styles.idleSubtitle}>
          Stay on this screen or the dashboard to receive incoming video call requests from clients.
        </Text>
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
  idleContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  waitingCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E6EFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  idleTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, marginBottom: 12 },
  idleSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },

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

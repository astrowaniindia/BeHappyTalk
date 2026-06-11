import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated, Dimensions, Switch, RefreshControl, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  success: '#10B981',
  danger: '#EF4444',
  blueLight: '#E6EFFF',
  greenLight: '#E6F7ED',
  sidebarBg: '#1B76FF',
  sidebarHover: 'rgba(255,255,255,0.1)'
};

const API_URL = 'http://192.168.29.168:3000';
const SOCKET_URL = 'http://192.168.29.168:3000';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [providerId, setProviderId] = useState(null);
  const [providerName, setProviderName] = useState('Provider');
  const [providerImage, setProviderImage] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  
  // New State for Analytics & Online Status
  const [isOnline, setIsOnline] = useState(true);
  const [totalLiveTime, setTotalLiveTime] = useState('00:00'); 
  const [dailyGains, setDailyGains] = useState('₹0.00'); 
  const [socketRef, setSocketRef] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const socketInitialized = useRef(false);
  const hasNavigatedToSession = useRef(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API_URL}/api/provider/${providerId}`);
      if (res.data && res.data.walletBalance !== undefined) {
        setWalletBalance(res.data.walletBalance.toFixed(2));
      }
    } catch (e) {}
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [providerId]);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;

  useEffect(() => {
    let socket: any;
    
    const init = async () => {
      // Prevent double-initialization
      if (socketInitialized.current) return;
      socketInitialized.current = true;

      try {
        const dataStr = await AsyncStorage.getItem('providerData');
        if (dataStr) {
          const data = JSON.parse(dataStr);
          setProviderId(data.id);
          if (data.name) setProviderName(data.name);
          
          const res = await axios.get(`${API_URL}/api/provider/${data.id}`);
          if (res.data) {
            if (res.data.walletBalance !== undefined) {
              setWalletBalance(res.data.walletBalance.toFixed(2));
            }
            if (res.data.status) {
              setIsOnline(res.data.status === 'online' || res.data.status === 'busy');
            }
            if (res.data.imagePath) {
              setProviderImage(res.data.imagePath);
            }
          }

          const histRes = await axios.get(`${API_URL}/api/provider/history/${data.id}`);
          if (histRes.data && Array.isArray(histRes.data)) {
            const today = new Date().toLocaleDateString();
            const todayGains = histRes.data
              .filter((s: any) => new Date(s.startTime).toLocaleDateString() === today)
              .reduce((acc: number, s: any) => acc + (s.cost || 0), 0);
            setDailyGains(`₹${todayGains.toFixed(2)}`);
            
            const totalMins = histRes.data.reduce((acc: number, s: any) => acc + (Math.floor((s.duration || 0) / 60)), 0);
            const hrs = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            setTotalLiveTime(`${hrs}h ${mins}m`);
          }

          socket = io(SOCKET_URL, { 
            transports: ['websocket'], 
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000 
          });
          setSocketRef(socket);

          socket.on('connect', () => {
            console.log('Provider Socket Connected:', socket.id);
            // Just register socket, do not force online
            socket.emit('provider_connected', { providerId: data.id });
          });

          socket.on('provider_status_changed', (payload: any) => {
            if (payload.providerId === data.id) {
              setIsOnline(payload.state.isOnline);
            }
          });

          socket.on('incoming_request', (req: any) => {
            console.log('Incoming Request:', req);
            setIncomingRequest(req);
          });

          socket.on('session_started', (data: any) => {
            console.log('Session started:', data);
            // Prevent double navigation
            if (hasNavigatedToSession.current) return;
            hasNavigatedToSession.current = true;

            const typeStr = (data.type || '').toLowerCase();
            if (typeStr === 'video') {
              router.push({ pathname: '/video-session', params: { roomId: data.room, sessionId: data.sessionId, userId: data.userId } });
            } else if (typeStr === 'audio' || typeStr === 'call') {
              router.push({ pathname: '/audio-session', params: { roomId: data.room, sessionId: data.sessionId, userId: data.userId } });
            } else {
              // Chat type - navigate to chat
              router.push({ pathname: '/chat/[id]', params: { id: data.userId, name: 'User' } });
            }
          });
        }
      } catch (e) {
        console.log('Error initializing dashboard', e);
      }
    };
    
    init();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const toggleOnlineStatus = () => {
    const newState = !isOnline;
    setIsOnline(newState);
    if (socketRef && providerId) {
      console.log('Emitting update_provider_status', newState);
      socketRef.emit('update_provider_status', { providerId, isOnline: newState });
    }
  };

  const handleAcceptRequest = () => {
    console.log('Accepted request:', incomingRequest);
    if (socketRef && incomingRequest) {
      // Reset navigation guard for the new session
      hasNavigatedToSession.current = false;
      socketRef.emit('accept_interaction', {
        userId: incomingRequest.userId,
        providerId: providerId,
        type: incomingRequest.type,
        rate: incomingRequest.rate || 0,
        duration: incomingRequest.duration || 5
      });
      // We do NOT navigate here anymore! We wait for the 'session_started' socket event to ensure the room is ready.
    }
    setIncomingRequest(null);
  };

  const handleRejectRequest = () => {
    console.log('Rejected request:', incomingRequest);
    if (socketRef && incomingRequest) {
      socketRef.emit('reject_interaction', {
        userId: incomingRequest.userId,
        providerId: providerId
      });
    }
    setIncomingRequest(null);
  };

  const toggleSidebar = () => {
    const toValue = isSidebarOpen ? -width * 0.75 : 0;
    Animated.timing(slideAnim, { toValue, duration: 300, useNativeDriver: true }).start();
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('providerToken');
    await AsyncStorage.removeItem('providerData');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <StatusBar style="light" backgroundColor={Colors.primary} />
      
      {/* Top App Bar - Dual Row */}
      <View style={[styles.appBarContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        
        {/* Brand Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 16 }}>
          <Image source={require('../assets/icon.png')} style={{ width: 24, height: 24, resizeMode: 'contain', borderRadius: 4 }} />
          <Text style={{ color: Colors.white, fontSize: 15, fontWeight: 'bold', marginLeft: 6, letterSpacing: 0.5, opacity: 0.9 }}>
            BEHAPPYTALK PROVIDER
          </Text>
        </View>

        {/* Row 1: Menu, Title, Profile Avatar */}
        <View style={styles.appBarRow1}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={toggleSidebar} style={{ padding: 8, marginLeft: -8 }}>
              <Ionicons name="menu" size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.appBarTitle}>Studio Dashboard</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.navAvatar}>
              {providerImage ? (
                <Image source={{ uri: providerImage }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
              ) : (
                <Ionicons name="person" size={20} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Row 2: Wallet, Notifications, Online Toggle */}
        <View style={styles.appBarRow2}>
          <TouchableOpacity style={styles.navWalletBadge} onPress={() => router.push('/wallet')}>
            <Ionicons name="wallet" size={16} color={Colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.navWalletText}>₹{walletBalance}</Text>
          </TouchableOpacity>

          <View style={[styles.appBarRight, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: isOnline ? '#10B981' : 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontSize: 12, marginRight: 4 }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#059669' }}
                thumbColor={Colors.white}
                style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
              />
            </View>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              <View style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger, borderWidth: 2, borderColor: Colors.primary }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        
        {/* Offline Warning Card */}
        {!isOnline && (
          <View style={styles.offlineWarning}>
            <Ionicons name="warning-outline" size={24} color="#B45309" />
            <Text style={styles.offlineText}>You are currently offline. Toggle your status above to start receiving calls from clients.</Text>
          </View>
        )}

        {/* Top 3 Metric Cards */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#F3E8FF' }]}>
               <Ionicons name="time" size={24} color="#A855F7" />
            </View>
            <View>
              <Text style={styles.metricLabel}>TOTAL LIVE TIME</Text>
              <Text style={styles.metricValue}>{totalLiveTime}</Text>
            </View>
          </View>
          
          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#FEF3C7' }]}>
               <Ionicons name="trending-up" size={24} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.metricLabel}>DAILY GAINS</Text>
              <Text style={styles.metricValue}>{dailyGains}</Text>
            </View>
          </View>
          
          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: Colors.greenLight }]}>
              <Ionicons name="wallet" size={24} color={Colors.success} />
            </View>
            <View>
              <Text style={styles.metricLabel}>TOTAL WALLET</Text>
              <Text style={styles.metricValue}>₹{walletBalance}</Text>
            </View>
          </View>
        </View>

        {/* Waiting Room Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={24} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Waiting Room</Text>
          </View>
          <View style={styles.sectionBody}>
            {isOnline ? (
              <Text style={styles.emptyText}>No users in waiting room right now. Stay online to be visible.</Text>
            ) : (
              <Text style={styles.emptyText}>Go online to see users in your waiting room.</Text>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Overlay when sidebar is open */}
      {isSidebarOpen && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleSidebar} />
      )}

      {/* INCOMING REQUEST MODAL */}
      {incomingRequest && (
        <View style={styles.incomingModalContainer}>
          <View style={styles.incomingModal}>
            <View style={styles.incomingHeader}>
              <Ionicons 
                name={
                  incomingRequest.type === 'video' ? 'videocam' : 
                  incomingRequest.type === 'audio' ? 'call' : 'chatbubbles'
                } 
                size={32} 
                color={Colors.white} 
              />
            </View>
            <Text style={styles.incomingTitle}>Incoming {incomingRequest.type} Request</Text>
            <Text style={styles.incomingSubtitle}>
              User wants to connect with you.
            </Text>

            <View style={styles.incomingActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={handleRejectRequest}>
                <Ionicons name="close" size={24} color={Colors.white} />
                <Text style={styles.actionBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAcceptRequest}>
                <Ionicons name="checkmark" size={24} color={Colors.white} />
                <Text style={styles.actionBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Quick Action Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.bottomBarBtn} onPress={() => router.push('/chats')}>
          <Ionicons name="chatbubbles" size={20} color={Colors.white} />
          <Text style={styles.bottomBarText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomBarBtn} onPress={() => router.push('/audio-calls')}>
          <Ionicons name="call" size={20} color={Colors.white} />
          <Text style={styles.bottomBarText}>Audio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomBarBtn} onPress={() => router.push('/video-calls')}>
          <Ionicons name="videocam" size={20} color={Colors.white} />
          <Text style={styles.bottomBarText}>Video</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Sidebar using Animated */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={{flex: 1}}>
            <View style={styles.sidebarHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.logoContainer}>
                  <Image source={require('../assets/icon.png')} style={{ width: 28, height: 28, resizeMode: 'contain', borderRadius: 6 }} />
                  <Text style={styles.sidebarBrand}>BeHappyTalk</Text>
                </View>
                <TouchableOpacity onPress={toggleSidebar} style={{ padding: 4 }}>
                  <Ionicons name="menu" size={28} color={Colors.white} />
                </TouchableOpacity>
              </View>

              {/* Online Toggle Moved to Sidebar */}
              <View style={styles.sidebarToggleContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#10B981' : '#6B7A99' }]} />
                  <Text style={[styles.statusText, { color: isOnline ? Colors.white : 'rgba(255,255,255,0.5)', marginLeft: 8, marginRight: 8 }]}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </View>
                <Switch
                  value={isOnline}
                  onValueChange={toggleOnlineStatus}
                  trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#059669' }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>

          <ScrollView style={styles.sidebarMenu}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemActive]} onPress={() => { toggleSidebar(); }}>
              <Ionicons name="grid" size={22} color={Colors.white} />
              <Text style={[styles.menuItemText, styles.menuItemTextActive]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/audio-calls'); }}>
              <Ionicons name="call" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Audio Calls</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/video-calls'); }}>
              <Ionicons name="videocam" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Video Calls</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/chats'); }}>
              <Ionicons name="chatbubbles" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Live Inbox</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/sessions'); }}>
              <Ionicons name="time" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Sessions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/reviews'); }}>
              <Ionicons name="star" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>My Reviews</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/schedule'); }}>
              <Ionicons name="calendar" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>My Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/wallet'); }}>
              <Ionicons name="wallet" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Wallet & Payouts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/profile'); }}>
              <Ionicons name="person" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/support'); }}>
              <Ionicons name="help-circle" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </TouchableOpacity>

            {/* Legal Links Section */}
            <View style={{ marginTop: 24, paddingHorizontal: 20, marginBottom: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>LEGAL</Text>
            </View>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/terms'); }}>
              <Ionicons name="document-text" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Terms & Conditions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/privacy'); }}>
              <Ionicons name="shield-checkmark" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/safety'); }}>
              <Ionicons name="warning" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Safety & Guidelines</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/child-safety'); }}>
              <Ionicons name="people" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Child Safety</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/report-vulnerability'); }}>
              <Ionicons name="bug" size={22} color="rgba(255,255,255,0.7)" />
              <Text style={styles.menuItemText}>Report Vulnerability</Text>
            </TouchableOpacity>
            
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.sidebarFooter}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                {providerImage ? (
                  <Image source={{ uri: providerImage }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                ) : (
                  <Text style={styles.avatarText}>{providerName.charAt(0).toUpperCase()}</Text>
                )}
                <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.danger }]} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{providerName}</Text>
                <Text style={[styles.profileStatusText, { color: isOnline ? Colors.success : Colors.danger }]}>
                  {isOnline ? 'Live Now' : 'Offline'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="power" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  appBarContainer: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    zIndex: 10,
  },
  appBarRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appBarRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  navWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  navWalletText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center' },
  appBarTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  appBarRight: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: 'bold', marginRight: 8 },
  scrollContent: { flex: 1 },
  scrollInner: { padding: 20 },
  offlineWarning: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F59E0B' },
  offlineText: { color: '#B45309', marginLeft: 12, flex: 1, fontSize: 14, fontWeight: '600' },
  metricsContainer: { marginBottom: 24 },
  metricCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  metricIconContainer: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  metricLabel: { color: Colors.textDark, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  metricValue: { color: Colors.textDark, fontSize: 24, fontWeight: '900' },
  sectionCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginLeft: 12 },
  sectionBody: { paddingBottom: 10 },
  emptyText: { color: Colors.textLight, fontSize: 15 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  sidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: width * 0.75, backgroundColor: Colors.sidebarBg, zIndex: 20, elevation: 10 },
  sidebarHeader: { padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  sidebarBrand: { color: Colors.white, fontSize: 22, fontWeight: 'bold', marginLeft: 12 },
  sidebarToggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 24 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  sidebarMenu: { flex: 1, paddingTop: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 },
  menuItemActive: { backgroundColor: Colors.sidebarHover, borderLeftWidth: 4, borderLeftColor: Colors.white },
  menuItemText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600', marginLeft: 16 },
  menuItemTextActive: { color: Colors.white },
  sidebarFooter: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 18 },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.sidebarBg },
  profileInfo: { marginLeft: 12, flex: 1 },
  profileName: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  profileStatusText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  logoutButton: { padding: 8 },
  bottomBar: { flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: 16, paddingHorizontal: 12, justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', zIndex: 5 },
  bottomBarBtn: { flex: 1, backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, marginHorizontal: 4, borderRadius: 12, elevation: 3, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  bottomBarText: { color: Colors.white, fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  incomingModalContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  incomingModal: { width: width * 0.85, backgroundColor: Colors.white, borderRadius: 24, padding: 32, alignItems: 'center', elevation: 20 },
  incomingHeader: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  incomingTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, marginBottom: 8, textTransform: 'capitalize' },
  incomingSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', marginBottom: 32 },
  incomingActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  actionBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
  rejectBtn: { backgroundColor: Colors.danger },
  acceptBtn: { backgroundColor: Colors.success },
  actionBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});

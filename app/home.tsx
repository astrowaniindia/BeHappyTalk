import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar,
  TextInput, FlatList, Image, TouchableOpacity, Modal, Animated,
  Dimensions, TouchableWithoutFeedback, ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, clearUser } from '../hooks/useAuth';
import { API_URL, SOCKET_URL, secureFetch } from '../constants/ServerConfig';
import io from 'socket.io-client';

const { width } = Dimensions.get('window');


// We use the same image for all 3 providers for now
const PROVIDER_IMAGE = require('../assets/images/girl_smiling_1775250936696.png');

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'Verified' | 'Inbox'>('Verified');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAnonModal, setShowAnonModal] = useState(false);
  const [showRecommendedModal, setShowRecommendedModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [connectingModal, setConnectingModal] = useState(false);
  const [durationModal, setDurationModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<{ type: string, rate: number } | null>(null);
  const socketRef = useRef<any>(null);

  const [providers, setProviders] = useState<any[]>([]);
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);

  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;

  const fetchData = () => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      secureFetch(`${API_URL}/providers`).then(r => r.json()),
      secureFetch(`${API_URL}/inbox/${user.id}`).then(r => r.json()),
      secureFetch(`${API_URL}/recents/${user.id}`).then(r => r.json()),
      secureFetch(`${API_URL}/user/${user.id}`).then(r => r.json()),
    ])
      .then(([prov, inbox, recents, userData]) => {
        setProviders(prov.map((p: any) => ({ ...p, image: PROVIDER_IMAGE })));
        setInboxItems(
          inbox.map((i: any) => ({ ...i, image: i.isSystem ? null : PROVIDER_IMAGE }))
        );
        setRecentContacts(recents.map((r: any) => ({ ...r, image: PROVIDER_IMAGE })));
        setWalletBalance(userData.walletBalance || Math.floor(userData.walletbalance) || 500);
      })
      .catch(err => console.log('Fetch error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();

    if (user) {
      socketRef.current = io(SOCKET_URL, { 
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity
      });
      
      const joinRoom = () => {
        socketRef.current.emit('user_online', { userId: user.id });
      };

      socketRef.current.on('connect', joinRoom);
      if (socketRef.current.connected) joinRoom();

      socketRef.current.on('session_accepted', ({ providerId, sessionId, type, duration, agoraChannel }: any) => {
        console.log('[Socket] Session Accepted received! Channel:', agoraChannel);
        setConnectingModal(false);
        setSelectedProvider(null);
        setDurationModal(false);
        router.push(`/chat/${providerId}?sessionId=${sessionId}&type=${type}&duration=${duration}&channel=${encodeURIComponent(agoraChannel || '')}`);
      });

      socketRef.current.on('session_rejected', () => {
        setConnectingModal(false);
        alert('Provider is currently unavailable. Please try again later.');
      });

      socketRef.current.on('wallet_update', ({ walletBalance }: { walletBalance: number }) => {
         setWalletBalance(walletBalance);
      });
    }
  }, [user]);

  // Refresh inbox when switching to Inbox tab
  useEffect(() => {
    if (activeTab === 'Inbox' && user) {
      secureFetch(`${API_URL}/inbox/${user.id}`)
        .then(r => r.json())
        .then(inbox =>
          setInboxItems(inbox.map((i: any) => ({ ...i, image: i.isSystem ? null : PROVIDER_IMAGE })))
        )
        .catch(() => {});
    }
  }, [activeTab]);

  const toggleDrawer = () => {
    if (isDrawerOpen) {
      Animated.timing(slideAnim, { toValue: -width * 0.75, duration: 280, useNativeDriver: true }).start(() =>
        setIsDrawerOpen(false)
      );
    } else {
      setIsDrawerOpen(true);
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    }
  };

  const handleTalkNow = (provider: any) => {
    setSelectedProvider(provider);
  };

  const promptDuration = (type: string, rate: number) => {
    setSelectedInteraction({ type, rate });
    setDurationModal(true);
  };

  const submitRequest = (duration: number) => {
    if (!selectedInteraction || !selectedProvider) return;
    const { type, rate } = selectedInteraction;

    if (walletBalance < rate * duration) {
      alert(`Insufficient balance. Requires ₹${rate * duration} for ${duration} mins.`);
      return;
    }
    setDurationModal(false);
    setConnectingModal(true);
    socketRef.current?.emit('request_interaction', {
      userId: user?.id,
      userName: user?.name,
      providerId: selectedProvider.id,
      type,
      rate,
      duration
    });
  };

  const handleLogout = async () => {
    toggleDrawer();
    setTimeout(async () => {
      await clearUser();
      router.replace('/login');
    }, 300);
  };

  const renderRecent = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.recentItem} onPress={() => router.push(`/chat/${item.id}`)}>
      <View style={styles.recentAvatarCt}>
        <Image source={item.image} style={styles.recentAvatar} />
        <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? '#34D399' : '#EF4444' }]} />
      </View>
      <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProvider = ({ item }: { item: any }) => (
    <View style={styles.providerCard}>
      <View style={styles.providerHeader}>
        <View style={styles.providerAvatarCt}>
          <Image source={item.image} style={styles.providerAvatar} />
          <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? '#34D399' : '#EF4444' }]} />
        </View>
        <View style={styles.providerMeta}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{item.name}</Text>
            {item.verified ? <MaterialCommunityIcons name="check-decagram" size={16} color="#FDE047" /> : null}
          </View>
          <Text style={styles.providerDemo}>{item.demographic}</Text>
          <Text style={styles.providerRating}>
            {item.rating}{' '}
            <MaterialIcons name="star" size={12} color="rgba(255,255,255,0.45)" />{' '}
            <Text style={styles.reviewsText}>({item.reviews})</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.providerTagline}>{item.tagline}</Text>

      <View style={styles.providerFooter}>
        <View style={styles.providerStats}>
          <Text style={styles.providerStatText}>Exp: {item.exp} hrs</Text>
          <Text style={styles.providerStatText}>{item.langs}</Text>
        </View>
        {item.status === 'busy' ? (
          <View style={styles.busyAction}>
            <Text style={styles.waitTime}>Wait ~ {item.waitTime}</Text>
            <TouchableOpacity style={styles.bellButton}>
              <MaterialCommunityIcons name="bell" size={24} color="#FBBF24" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.talkButton} onPress={() => handleTalkNow(item)}>
            <Text style={styles.talkButtonText}>TALK NOW</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderInboxItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.inboxItem}
      onPress={() => !item.isSystem && router.push(`/chat/${item.providerId}`)}
    >
      <View style={styles.inboxAvatarCt}>
        {item.isSystem ? (
          <View style={[styles.inboxAvatarPlaceholder, { backgroundColor: '#4C1D95' }]}>
            <MaterialCommunityIcons name="emoticon-happy" size={28} color="#FACC15" />
          </View>
        ) : item.image ? (
          <Image source={item.image} style={styles.inboxAvatar} />
        ) : (
          <View style={styles.inboxAvatarPlaceholder}>
            <MaterialIcons name="person" size={32} color="#0A0B10" />
          </View>
        )}
        {!item.isSystem && (
          <View style={[styles.statusDotLg, { backgroundColor: item.status === 'online' ? '#34D399' : '#EF4444' }]} />
        )}
      </View>

      <View style={styles.inboxContent}>
        <View style={styles.inboxHeaderRow}>
          <View style={styles.nameRow}>
            <Text style={styles.inboxName}>{item.name}</Text>
            {item.isSystem && <MaterialCommunityIcons name="check-decagram" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />}
          </View>
          <Text style={styles.inboxDate}>{item.date}</Text>
        </View>
        <View style={styles.inboxMsgRow}>
          <MaterialCommunityIcons name={(item.icon || 'message-text') as any} size={14} color={item.iconColor || '#34D399'} />
          <Text style={styles.inboxMessage} numberOfLines={1}>{item.message}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity style={styles.userIconBg} onPress={toggleDrawer}>
            <MaterialIcons name="person" size={24} color="rgba(255,255,255,0.45)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.searchContainer} onPress={() => router.push('/search')}>
            <Feather name="search" size={18} color="rgba(255,255,255,0.45)" style={{ marginRight: 8 }} />
            <Text style={styles.fakeSearchInput}>Search listeners...</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.walletContainer} onPress={() => router.push('/wallet')}>
            <MaterialCommunityIcons name="wallet-outline" size={20} color="#FACC15" />
            <Text style={styles.walletText}>₹ {walletBalance.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Verified' && styles.activeTabButton]}
            onPress={() => setActiveTab('Verified')}
          >
            <Text style={[styles.tabText, activeTab === 'Verified' && styles.activeTabText]}>Verified</Text>
            {activeTab === 'Verified' && <MaterialCommunityIcons name="check-decagram" size={16} color="#FDE047" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Inbox' && styles.activeTabButton]}
            onPress={() => setActiveTab('Inbox')}
          >
            <Text style={[styles.tabText, activeTab === 'Inbox' && styles.activeTabText]}>Inbox</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingCt}>
            <ActivityIndicator size="large" color="#FACC15" />
          </View>
        ) : activeTab === 'Verified' ? (
          <FlatList
            data={providers}
            keyExtractor={item => item.id}
            renderItem={renderProvider}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              recentContacts.length > 0 ? (
                <View style={styles.recentsSection}>
                  <Text style={styles.recentsTitle}>Recently Contacted</Text>
                  <FlatList
                    data={recentContacts}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={renderRecent}
                    contentContainerStyle={{ gap: 16 }}
                  />
                </View>
              ) : null
            }
          />
        ) : (
          <FlatList
            data={inboxItems}
            keyExtractor={item => item.id}
            renderItem={renderInboxItem}
            contentContainerStyle={[styles.listContent, { paddingTop: 8 }]}
            ListEmptyComponent={
              <Text style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 40 }}>
                No messages yet.{'\n'}Start chatting with a listener!
              </Text>
            }
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fabBtn} onPress={() => setShowRecommendedModal(true)}>
        <MaterialCommunityIcons name="star-shooting" size={24} color="#0A0B10" />
      </TouchableOpacity>

      {/* Drawer */}
      <Modal visible={isDrawerOpen} transparent animationType="none">
        <View style={styles.drawerOverlay}>
          <TouchableWithoutFeedback onPress={toggleDrawer}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.drawerContent, { transform: [{ translateX: slideAnim }] }]}>
            {/* Profile */}
            <View style={styles.drawerProfileSection}>
              <View style={styles.largeAvatar}>
                <MaterialIcons name="person" size={60} color="#0A0B10" />
              </View>
              <Text style={styles.drawerName}>{user?.name || 'You'}</Text>
              <Text style={styles.drawerPhone}>{user?.phone || ''}</Text>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); setTimeout(() => setShowAnonModal(true), 320); }}>
                <MaterialIcons name="account-circle" size={24} color="rgba(255,255,255,0.45)" />
                <Text style={styles.drawerMenuText}>My Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Links */}
            <View style={styles.drawerListSection}>
              <Text style={styles.drawerSectionTitle}>Communicate</Text>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/care'); }}>
                <MaterialCommunityIcons name="heart-box" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>User Care</Text>
              </TouchableOpacity>

              <View style={styles.drawerMenuItem}>
                <MaterialIcons name="settings" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>Settings</Text>
              </View>

              <View style={styles.subMenu}>
                <TouchableOpacity style={styles.subMenuItem}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.subMenuText}>Delete Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.subMenuItem}>
                  <AntDesign name="loading" size={20} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.subMenuText}>Usage</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.subMenuItem} onPress={handleLogout}>
                  <AntDesign name="logout" size={20} color="#EF4444" />
                  <Text style={[styles.subMenuText, { color: '#EF4444' }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.drawerFooter}>
              <Text style={styles.versionText}>App v341: 3.44.0</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Anonymous Modal */}
      <Modal visible={showAnonModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowAnonModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.anonModalContent}>
            <Text style={styles.anonModalTitle}>You are Anonymous</Text>
            <Text style={styles.anonModalBody}>
              Dear {user?.name || 'user'},{'\n'}Your profile is anonymous to all listeners. Your privacy is our priority.
            </Text>
            <TouchableOpacity style={styles.anonModalBtn} onPress={() => setShowAnonModal(false)}>
              <Text style={styles.anonModalBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recommended Modal */}
      <Modal visible={showRecommendedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowRecommendedModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.recommendedModalContent}>
            <Text style={styles.recommendedTitle}>Recommended For You ✨</Text>
            <View style={styles.recommendedGrid}>
              {providers.slice(0, 3).map((rec: any) => (
                <View key={rec.id} style={styles.recCard}>
                  <View style={styles.recAvatarRing}>
                    <Image source={rec.image} style={styles.recAvatar} />
                    <View style={styles.recStatusDot} />
                  </View>
                  <View style={styles.nameRow}>
                    <Text style={styles.recName}>{rec.name}</Text>
                    <MaterialCommunityIcons name="check-decagram" size={13} color="#FDE047" />
                  </View>
                  <Text style={styles.recDemo}>{rec.demographic}</Text>
                  <TouchableOpacity
                    style={styles.recTalkBtn}
                    onPress={() => { setShowRecommendedModal(false); handleTalkNow(rec); }}
                  >
                    <Text style={styles.recTalkText}>Talk Now</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Connection Mode Selection Modal */}
      <Modal visible={!!selectedProvider && !connectingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <TouchableWithoutFeedback onPress={() => setSelectedProvider(null)}>
             <View style={StyleSheet.absoluteFillObject} />
           </TouchableWithoutFeedback>
           <View style={[styles.anonModalContent, { padding: 16 }]}>
              {selectedProvider && (
                 <>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                       <Image source={selectedProvider.image} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }} />
                       <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold' }}>Connect with {selectedProvider.name}</Text>
                       <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4 }}>Select an interaction type to continue</Text>
                    </View>

                    <TouchableOpacity style={styles.interactionOption} onPress={() => promptDuration('Chat', selectedProvider.priceChat)}>
                       <MaterialCommunityIcons name="chat-processing" size={28} color="#34D399" />
                       <View style={styles.interactionInfo}>
                          <Text style={styles.interactionTitle}>Chat</Text>
                          <Text style={styles.interactionRate}>₹ {selectedProvider.priceChat} / min</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.25)" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.interactionOption} onPress={() => promptDuration('Call', selectedProvider.priceCall)}>
                       <MaterialCommunityIcons name="phone" size={28} color="#00E5FF" />
                       <View style={styles.interactionInfo}>
                          <Text style={styles.interactionTitle}>Voice Call</Text>
                          <Text style={styles.interactionRate}>₹ {selectedProvider.priceCall} / min</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.25)" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.interactionOption} onPress={() => promptDuration('Video', selectedProvider.priceVideo)}>
                       <MaterialCommunityIcons name="video" size={28} color="#FACC15" />
                       <View style={styles.interactionInfo}>
                          <Text style={styles.interactionTitle}>Video Call</Text>
                          <Text style={styles.interactionRate}>₹ {selectedProvider.priceVideo} / min</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.25)" />
                    </TouchableOpacity>
                 </>
              )}
           </View>
        </View>
      </Modal>

      {/* Duration Selection Modal */}
      <Modal visible={durationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <TouchableWithoutFeedback onPress={() => setDurationModal(false)}>
             <View style={StyleSheet.absoluteFillObject} />
           </TouchableWithoutFeedback>
           <View style={[styles.anonModalContent, { padding: 24 }]}>
              <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>Select Duration</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>How long would you like to chat?</Text>
              
              <View style={{ gap: 12 }}>
                 {[5, 10, 15].map(min => (
                    <TouchableOpacity
                       key={min}
                       style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E2028', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
                       onPress={() => submitRequest(min)}
                    >
                       <Text style={{ color: '#FACC15', fontSize: 16, fontWeight: 'bold' }}>{min} Minutes</Text>
                       <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>₹ {selectedInteraction ? selectedInteraction.rate * min : 0}</Text>
                    </TouchableOpacity>
                 ))}
              </View>
           </View>
        </View>
      </Modal>
      <Modal visible={connectingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <View style={[styles.anonModalContent, { alignItems: 'center', padding: 32 }]}>
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 16 }} />
              <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' }}>Requesting Session...</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 8, textAlign: 'center', marginBottom: 20 }}>Waiting for provider to accept</Text>
              
              <TouchableOpacity
                 style={{ borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 }}
                 onPress={() => {
                    setConnectingModal(false);
                    socketRef.current?.emit('cancel_interaction', { providerId: selectedProvider?.id });
                 }}
              >
                 <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: 'bold' }}>Cancel Request</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0B10', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  loadingCt: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topHeaderBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 12 },
  userIconBg: { backgroundColor: '#1A1C23', padding: 8, borderRadius: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C23', borderRadius: 20, paddingHorizontal: 12, height: 40 },
  fakeSearchInput: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  walletContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FACC15', borderRadius: 20, paddingHorizontal: 12, height: 40, gap: 6, backgroundColor: '#12141A' },
  walletText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold' },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  tabButton: { flex: 1, flexDirection: 'row', paddingVertical: 16, justifyContent: 'center', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabButton: { borderBottomColor: '#FACC15' },
  tabText: { fontSize: 16, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  activeTabText: { color: 'rgba(255,255,255,0.92)', fontWeight: 'bold' },

  listContent: { padding: 16, paddingBottom: 40, gap: 16 },
  recentsSection: { marginBottom: 16 },
  recentsTitle: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  recentItem: { alignItems: 'center', width: 64 },
  recentAvatarCt: { position: 'relative' },
  recentAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  statusDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#0A0B10' },
  recentName: { color: 'rgba(255,255,255,0.70)', fontSize: 12, marginTop: 8, textAlign: 'center' },

  providerCard: { backgroundColor: '#1A1C23', borderRadius: 12, padding: 16 },
  providerHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  providerAvatarCt: { position: 'relative' },
  providerAvatar: { width: 64, height: 64, borderRadius: 32 },
  providerMeta: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerName: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' },
  providerDemo: { color: 'rgba(255,255,255,0.70)', fontSize: 14 },
  providerRating: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  reviewsText: { color: 'rgba(255,255,255,0.25)' },
  providerTagline: { color: 'rgba(255,255,255,0.70)', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  providerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  providerStats: { gap: 4 },
  providerStatText: { color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '600' },
  talkButton: { borderWidth: 1, borderColor: '#FACC15', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  talkButtonText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold' },
  busyAction: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitTime: { color: '#EF4444', fontSize: 12, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden' },
  bellButton: { borderWidth: 1, borderColor: '#FBBF24', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  inboxItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  inboxAvatarCt: { position: 'relative' },
  inboxAvatar: { width: 56, height: 56, borderRadius: 28 },
  inboxAvatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  statusDotLg: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#0A0B10' },
  inboxContent: { flex: 1 },
  inboxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  inboxName: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600' },
  inboxDate: { color: 'rgba(255,255,255,0.25)', fontSize: 12 },
  inboxMsgRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inboxMessage: { color: 'rgba(255,255,255,0.45)', fontSize: 13, flex: 1 },

  fabBtn: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FACC15', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  drawerOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' },
  drawerContent: { width: '75%', backgroundColor: '#0A0B10', height: '100%', elevation: 8 },
  drawerProfileSection: { padding: 24, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 20 : 60, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  largeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  drawerName: { color: 'rgba(255,255,255,0.92)', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  drawerPhone: { color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 },
  drawerMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  drawerMenuText: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: '500' },
  drawerListSection: { padding: 24 },
  drawerSectionTitle: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  subMenu: { marginLeft: 40, marginTop: 8 },
  subMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  subMenuText: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  drawerFooter: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 40 },
  versionText: { color: 'rgba(255,255,255,0.15)', fontSize: 13, textAlign: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  anonModalContent: { backgroundColor: '#1A1C23', width: width * 0.85, borderRadius: 12, padding: 24, elevation: 5 },
  anonModalTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  anonModalBody: { color: 'rgba(255,255,255,0.70)', fontSize: 14, lineHeight: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 20, marginBottom: 16 },
  anonModalBtn: { alignSelf: 'flex-end', borderWidth: 1, borderColor: '#FACC15', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  anonModalBtnText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold' },

  recommendedModalContent: { backgroundColor: '#1A1C23', width, position: 'absolute', bottom: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  recommendedTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  recommendedGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  recCard: { backgroundColor: '#12141A', width: '31%', borderRadius: 12, padding: 12, alignItems: 'center' },
  recAvatarRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 2.5, borderColor: '#FDE047', alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' },
  recAvatar: { width: 52, height: 52, borderRadius: 26 },
  recStatusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#34D399', borderWidth: 2, borderColor: '#12141A' },
  recName: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 'bold' },
  recDemo: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 12, marginTop: 2, textAlign: 'center' },
  recTalkBtn: { borderWidth: 1, borderColor: '#FACC15', borderRadius: 6, paddingVertical: 6, width: '100%', alignItems: 'center' },
  recTalkText: { color: '#FACC15', fontSize: 11, fontWeight: 'bold' },

  interactionOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2028', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  interactionInfo: { flex: 1, marginLeft: 16 },
  interactionTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' },
  interactionRate: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4 },
});

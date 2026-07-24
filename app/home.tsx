import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar,
  TextInput, FlatList, Image, TouchableOpacity, Modal, Animated,
  Dimensions, TouchableWithoutFeedback, ActivityIndicator, RefreshControl,
  ScrollView, PanResponder, Share, Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, clearUser, saveUser } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { API_URL, SOCKET_URL, secureFetch } from '../constants/ServerConfig';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');


// We use the same image for all 3 providers for now
const PROVIDER_IMAGE = require('../assets/images/girl_smiling_1775250936696.png');

const PREDEFINED_AVATARS = [
  { id: 'avatar_fox', source: require('../assets/images/avatars/fox.jpg') },
  { id: 'avatar_girl', source: require('../assets/images/avatars/girl.jpg') },
  { id: 'avatar_boy', source: require('../assets/images/avatars/boy.jpg') },
  { id: 'avatar_panda', source: require('../assets/images/avatars/panda.jpg') },
  { id: 'avatar_dog', source: require('../assets/images/avatars/dog.jpg') },
  { id: 'avatar_cat', source: require('../assets/images/avatars/cat.jpg') },
  { id: 'avatar_boy2', source: require('../assets/images/avatars/boy2.jpg') },
  { id: 'avatar_girl2', source: require('../assets/images/avatars/girl2.jpg') }
];

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerScrollRef = useRef<ScrollView>(null);
  const drawerScrollY = useRef(0);
  const scrollDrawer = (direction: 'up' | 'down') => {
    const next = Math.max(0, drawerScrollY.current + (direction === 'down' ? 250 : -250));
    drawerScrollRef.current?.scrollTo({ y: next, animated: true });
  };
  const [showAnonModal, setShowAnonModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [showRecommendedModal, setShowRecommendedModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [connectingModal, setConnectingModal] = useState(false);
  const [durationModal, setDurationModal] = useState(false);
  const [offlineModal, setOfflineModal] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState('');
  const [selectedInteraction, setSelectedInteraction] = useState<{ type: string, rate: number, duration?: number } | null>(null);
  const socketRef = useRef<any>(null);
  const hasNavigatedRef = useRef(false); // prevent duplicate session_accepted navigation

  const [providers, setProviders] = useState<any[]>([]);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [insufficientModal, setInsufficientModal] = useState(false);
  const [busyModal, setBusyModal] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Download BeHappyTalk to talk with expert consultants instantly! https://behappytalk.com/download',
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  const fetchData = (isRefresh = false) => {
    if (!user) return;
    if (!isRefresh) setLoading(true);

    Promise.all([
      secureFetch(`${API_URL}/providers?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      secureFetch(`${API_URL}/inbox/${user.id}?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      secureFetch(`${API_URL}/recents/${user.id}?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      secureFetch(`${API_URL}/user/${user.id}?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
    ])
      .then(([prov, inbox, recents, userData]) => {
        // SECURITY: If the user's account was deleted or banned from the database, force log them out immediately
        if (userData && userData.error === 'User not found.') {
          clearUser().then(() => router.replace('/login'));
          return;
        }

        setProviders(prov.map((p: any) => ({ ...p, image: p.imagePath ? { uri: p.imagePath } : PROVIDER_IMAGE })));
        setRecentContacts(recents.map((r: any) => ({ ...r, image: r.imagePath ? { uri: r.imagePath } : PROVIDER_IMAGE })));
        const balance = userData.walletBalance ?? userData.walletbalance ?? 5000;
        setWalletBalance(Number(balance));
      })
      .catch(err => console.log('Fetch error:', err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [user]);

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
        socketRef.current.emit('get_all_provider_statuses', {}, (statuses: any) => {
           setProviders(prev => prev.map(p => {
              const state = statuses[p.id];
              if (state) {
                 return { 
                   ...p, 
                   isOnline: state.isOnline, 
                   status: state.isOnline ? (state.isTalking ? 'busy' : 'online') : 'offline',
                   settings: state.settings,
                   busyUntil: state.busyUntil
                 };
              }
              return p;
           }));
        });
      };

      socketRef.current.on('connect', joinRoom);
      if (socketRef.current.connected) joinRoom();

      socketRef.current.on('provider_status_changed', ({ providerId, state }: any) => {
         setProviders(prev => prev.map(p => {
            if (p.id === providerId) {
               return { 
                 ...p, 
                 isOnline: state.isOnline, 
                 status: state.isOnline ? (state.isTalking ? 'busy' : 'online') : 'offline',
                 settings: state.settings,
                 busyUntil: state.busyUntil
               };
            }
            return p;
         }));
      });

      socketRef.current.on('session_accepted', ({ providerId, sessionId, type, duration, room }: any) => {
        console.log('[Socket] Session Accepted received! Room:', room);
        // Guard: only navigate once per session request
        if (hasNavigatedRef.current) {
          console.log('[Socket] Ignoring duplicate session_accepted');
          return;
        }
        hasNavigatedRef.current = true;
        setConnectingModal(false);
        setSelectedProvider(null);
        setDurationModal(false);
        const t = (type || '').toLowerCase();
        if (t === 'video') {
          router.push(`/video-call/${providerId}?sessionId=${sessionId}&type=${type}&duration=${duration}&channel=${encodeURIComponent(room || '')}`);
        } else if (t === 'audio' || t === 'call') {
          router.push(`/audio-call/${providerId}?sessionId=${sessionId}&type=${type}&duration=${duration}&channel=${encodeURIComponent(room || '')}`);
        } else {
          router.push(`/chat/${providerId}?sessionId=${sessionId}&type=${type}&duration=${duration}&channel=${encodeURIComponent(room || '')}`);
        }
      });

      socketRef.current.on('session_rejected', () => {
        setConnectingModal(false);
        setOfflineMessage('Provider is currently unavailable. Please try again later.');
        setOfflineModal(true);
      });

      socketRef.current.on('wallet_update', ({ walletBalance }: { walletBalance: number }) => {
         setWalletBalance(walletBalance);
      });

      return () => {
        hasNavigatedRef.current = false; // reset on cleanup so next session works
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [user]);


  const isDrawerOpenRef = useRef(isDrawerOpen);
  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, { toValue: -width * 0.75, duration: 280, useNativeDriver: true }).start(() =>
      setIsDrawerOpen(false)
    );
  };

  const toggleDrawer = () => {
    if (isDrawerOpenRef.current) closeDrawer();
    else openDrawer();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 35 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 3;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 40 && !isDrawerOpenRef.current) {
          openDrawer();
        } else if (gestureState.dx < -40 && isDrawerOpenRef.current) {
          closeDrawer();
        }
      }
    })
  ).current;

  const pickImage = async () => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        const res = await secureFetch(`${API_URL}/user/upload-image`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ base64Image: base64Img })
        });
        const data = await res.json();
        if (data.success) {
          saveUser({ ...user, profileImage: data.url });
          setShowAvatarModal(false);
        } else {
          alert(data.error || 'Failed to upload image');
        }
      } catch (err: any) {
        alert(err.message || 'Network error');
        console.log(err);
      }
    }
  };

  const selectPredefinedAvatar = async (avatarId: string) => {
    if (!user) return;
    try {
      const res = await secureFetch(`${API_URL}/user/update-profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ profileImage: avatarId })
      });
      const data = await res.json();
      if (data.success) {
        saveUser({ ...user, profileImage: avatarId });
        setShowAvatarModal(false);
      } else {
        alert(data.error || 'Failed to update avatar');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
      console.log(err);
    }
  };

  const saveName = async () => {
    if (!user) return;
    if (!editNameValue.trim()) return;
    try {
      const res = await secureFetch(`${API_URL}/user/update-profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: editNameValue.trim() })
      });
      const data = await res.json();
      if (data.success) {
        saveUser({ ...user, name: editNameValue.trim() });
        setShowEditNameModal(false);
      } else {
        alert(data.error || 'Failed to update name');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
      console.log(err);
    }
  };

  const handleTalkNow = (provider: any) => {
    setSelectedProvider(provider);
  };

  const promptDuration = (type: string, rate: number) => {
    if (selectedProvider && selectedProvider.status === 'offline') {
      setOfflineMessage(`${selectedProvider.name} is currently offline right now. Please try again later.`);
      setOfflineModal(true);
      return;
    }
    setSelectedInteraction({ type, rate });
    setDurationModal(true);
  };

  const submitRequest = (duration: number | 'unlimited') => {
    if (!selectedInteraction || !selectedProvider) return;
    const { type, rate } = selectedInteraction;

    const requiredBalance = duration === 'unlimited' ? rate * 1 : rate * duration;
    if (walletBalance < requiredBalance) {
      setDurationModal(false);
      setInsufficientModal(true);
      return;
    }
    
    if (selectedProvider.status === 'busy') {
      setDurationModal(false);
      setSelectedInteraction({ type, rate, duration });
      setBusyModal(true);
      return;
    }

    setDurationModal(false);
    setConnectingModal(true);
    hasNavigatedRef.current = false; // RESET the ref so new sessions can navigate!
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
        <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? '#34D399' : (item.status === 'busy' ? '#FACC15' : 'rgba(255,255,255,0.2)') }]} />
      </View>
      <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProvider = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.providerCard} onPress={() => router.push(`/provider/${item.id}`)} activeOpacity={0.8}>
      <View style={styles.providerHeader}>
        <View style={styles.providerAvatarCt}>
          <Image source={item.image} style={styles.providerAvatar} />
          <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? '#34D399' : '#EF4444' }]} />
        </View>
        <View style={styles.providerMeta}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{item.name}</Text>
            {item.status === 'online' && <Text style={{color: '#34D399', fontSize: 11, fontWeight: 'bold', marginLeft: 4}}>Online</Text>}
            {item.status === 'busy' && <Text style={{color: '#FACC15', fontSize: 11, fontWeight: 'bold', marginLeft: 4, fontStyle: 'italic'}}>{item.busyUntil && (item.busyUntil - Date.now()) > 0 ? `Busy (~${Math.ceil((item.busyUntil - Date.now()) / 60000)}m)` : 'Talking...'}</Text>}
            {item.status === 'offline' && <Text style={{color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold', marginLeft: 4}}>Offline</Text>}
          </View>
          <Text style={styles.providerDemo}>{item.demographic}</Text>
          <Text style={styles.providerRating}>
            {item.rating || '5.0'}{' '}
            <MaterialIcons name="star" size={12} color="rgba(255,255,255,0.45)" />{' '}
            <Text style={styles.reviewsText}>({item.reviews || '0'})</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.providerTagline}>{item.tagline}</Text>

      <View style={styles.providerFooter}>
        <View style={styles.providerStats}>
          <Text style={styles.providerStatText}>Exp: {item.exp || '3+'} hrs</Text>
          <Text style={styles.providerStatText}>{item.langs || 'English'}</Text>
        </View>
        {item.status === 'busy' ? (
          <View style={styles.busyAction}>
            <Text style={styles.waitTime}>Wait ~ {item.waitTime || '5 min'}</Text>
            <TouchableOpacity style={styles.bellButton} onPress={() => handleTalkNow(item)}>
              <MaterialCommunityIcons name="bell" size={24} color="#FBBF24" />
            </TouchableOpacity>
          </View>
        ) : item.status === 'offline' ? (
          <TouchableOpacity style={[styles.talkButton, { borderColor: '#EF4444' }]} onPress={() => {
             setOfflineMessage(`${item.name} is currently offline right now. Please try again later.`);
             setOfflineModal(true);
          }}>
            <Text style={[styles.talkButtonText, { color: '#EF4444' }]}>Offline</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.talkButton} onPress={() => handleTalkNow(item)}>
            <Text style={styles.talkButtonText}>{t('talkNow')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
      <StatusBar style="light" />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity style={styles.userIconBg} onPress={toggleDrawer}>
            <MaterialCommunityIcons name="menu" size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
             <Image source={require('../assets/images/icon.png')} style={{ width: 34, height: 34, borderRadius: 17 }} />
             <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 22, fontWeight: 'bold' }}>BeHappyTalk</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
             <TouchableOpacity style={styles.walletContainer} onPress={() => router.push('/wallet')}>
               <MaterialCommunityIcons name="wallet-outline" size={20} color="#FACC15" />
               <Text style={styles.walletText}>₹ {walletBalance.toFixed(0)}</Text>
             </TouchableOpacity>
          </View>
        </View>

        {/* Action Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 5, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{t('verified')}</Text>
            <MaterialCommunityIcons name="check-decagram" size={16} color="#22C55E" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Feather name="search" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/inbox')}>
              <MaterialCommunityIcons name="message-text-outline" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingCt}>
            <ActivityIndicator size="large" color="#FACC15" />
          </View>
        ) : (
          <FlatList
            data={providers}
            keyExtractor={item => item.id}
            renderItem={renderProvider}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" colors={['#FACC15']} progressBackgroundColor="#111111" />
            }
            ListHeaderComponent={
              recentContacts.length > 0 ? (
                <View style={styles.recentsSection}>
                  <Text style={styles.recentsTitle}>{t('recentlyContacted')}</Text>
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
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fabBtn} onPress={() => setShowRecommendedModal(true)}>
        <MaterialCommunityIcons name="star-shooting" size={24} color="#000000" />
      </TouchableOpacity>

      {/* Drawer */}
      <Modal visible={isDrawerOpen} transparent animationType="none">
        <View style={styles.drawerOverlay}>
          <TouchableWithoutFeedback onPress={toggleDrawer}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.drawerContent, { transform: [{ translateX: slideAnim }] }]}>
            <ScrollView
              ref={drawerScrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
              onScroll={e => { drawerScrollY.current = e.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
            >
            {/* Profile */}
            <View style={styles.drawerProfileSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                 <Image source={require('../assets/images/icon.png')} style={{ width: 32, height: 32, borderRadius: 16 }} />
                 <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold' }}>BeHappyTalk</Text>
                </View>
                <TouchableOpacity onPress={toggleDrawer} style={{ padding: 8, backgroundColor: '#333', borderRadius: 20 }}>
                  <MaterialIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.largeAvatar} onPress={() => setShowAvatarModal(true)} activeOpacity={0.8}>
                {user?.profileImage ? (
                  <Image source={user.profileImage.startsWith('avatar_') ? PREDEFINED_AVATARS.find(a => a.id === user.profileImage)?.source : { uri: user.profileImage }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                ) : (
                  <>
                    <MaterialIcons name="person" size={50} color="rgba(255,255,255,0.5)" />
                    <View style={{ position: 'absolute', bottom: -5, right: -5, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FACC15', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000000' }}>
                      <MaterialIcons name="add-a-photo" size={14} color="#000000" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                <Text style={[styles.drawerName, { marginBottom: 0 }]}>{user?.name || 'You'}</Text>
                <TouchableOpacity onPress={() => { setEditNameValue(user?.name || ''); setShowEditNameModal(true); }}>
                  <MaterialIcons name="edit" size={18} color="#FACC15" />
                </TouchableOpacity>
              </View>
              <Text style={styles.drawerPhone}>{user?.phone || ''}</Text>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); setTimeout(() => setShowAnonModal(true), 320); }}>
                <MaterialIcons name="account-circle" size={24} color="rgba(255,255,255,0.45)" />
                <Text style={styles.drawerMenuText}>{t('myProfile')}</Text>
              </TouchableOpacity>
            </View>

            {/* Links */}
            <View style={styles.drawerListSection}>
              <Text style={styles.drawerSectionTitle}>{t('communicate') || 'Communicate'}</Text>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/refer'); }}>
                <MaterialCommunityIcons name="gift-outline" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>Refer a Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); handleShareApp(); }}>
                <MaterialCommunityIcons name="share-variant" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>Share App</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/history'); }}>
                <MaterialCommunityIcons name="history" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>{t('callSummary')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/support'); }}>
                <MaterialCommunityIcons name="headset" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>Support</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={toggleLanguage}>
                <MaterialIcons name="language" size={24} color="#3B82F6" />
                <Text style={[styles.drawerMenuText, { color: '#3B82F6', fontWeight: 'bold' }]}>{t('changeLanguage')}</Text>
              </TouchableOpacity>



              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/settings'); }}>
                <MaterialIcons name="settings" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>{t('settings')}</Text>
              </TouchableOpacity>
            </View>

            {/* Legal Links */}
            <View style={styles.drawerListSection}>
              <Text style={styles.drawerSectionTitle}>{t('legal') || 'Legal'}</Text>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/terms'); }}>
                <MaterialCommunityIcons name="file-document-outline" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>{t('terms') || 'Terms & Conditions'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/privacy'); }}>
                <MaterialCommunityIcons name="shield-account-outline" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>{t('privacy') || 'Privacy Policy'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/safety'); }}>
                <MaterialIcons name="security" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>{t('safety') || 'Safety Policy'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/child-safety'); }}>
                <MaterialIcons name="child-care" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>Child Safety</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerMenuItem} onPress={() => { toggleDrawer(); router.push('/report-vulnerability'); }}>
                <MaterialIcons name="bug-report" size={24} color="rgba(255,255,255,0.70)" />
                <Text style={styles.drawerMenuText}>Report Vulnerability</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerListSection}>
              <TouchableOpacity style={styles.drawerMenuItem} onPress={handleLogout}>
                <MaterialIcons name="logout" size={24} color="#EF4444" />
                <Text style={[styles.drawerMenuText, { color: '#EF4444' }]}>{t('logout') || 'Logout'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerFooter}>
              <Text style={styles.versionText}>App v{Constants.expoConfig?.version ?? '1.0.2'} ({Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion ?? '—'})</Text>
            </View>
            </ScrollView>

            <View style={styles.drawerScrollArrows}>
              <TouchableOpacity style={styles.drawerScrollArrowBtn} onPress={() => scrollDrawer('up')}>
                <MaterialIcons name="keyboard-arrow-up" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerScrollArrowBtn} onPress={() => scrollDrawer('down')}>
                <MaterialIcons name="keyboard-arrow-down" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Anonymous Modal */}
      <Modal visible={showAvatarModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowAvatarModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.anonModalContent}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Choose Avatar</Text>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                  {PREDEFINED_AVATARS.map((avatar) => (
                    <TouchableOpacity key={avatar.id} onPress={() => selectPredefinedAvatar(avatar.id)} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: user?.profileImage === avatar.id ? 3 : 0, borderColor: '#FACC15' }}>
                      <Image source={avatar.source} style={{ width: '100%', height: '100%', borderRadius: 40 }} />
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333', gap: 10 }} onPress={pickImage}>
                  <MaterialIcons name="photo-library" size={24} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Choose from Gallery</Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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

      {/* Recommended / Favorites Modal */}
      <Modal visible={showRecommendedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowRecommendedModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={styles.recommendedModalContent}>
            <Text style={styles.recommendedTitle}>{recentContacts.length > 0 ? "Quick Talk (Favorites) ⭐" : "Recommended For You ✨"}</Text>
            <View style={styles.recommendedGrid}>
              {(recentContacts.length > 0 ? recentContacts : providers).slice(0, 3).map((rec: any) => (
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
      <Modal visible={!!selectedProvider && !connectingModal && !durationModal && !insufficientModal && !offlineModal && !busyModal} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
           <TouchableWithoutFeedback onPress={() => setSelectedProvider(null)}>
             <View style={StyleSheet.absoluteFillObject} />
           </TouchableWithoutFeedback>
           <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHandle} />
              {selectedProvider && (
                 <>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                       <Image source={selectedProvider.image} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }} />
                       <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold' }}>Connect with {selectedProvider.name}</Text>
                       <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4 }}>Select an interaction type to continue</Text>
                    </View>

                    {(!selectedProvider.settings || selectedProvider.settings.chat !== false) && (
                    <TouchableOpacity style={styles.interactionOption} onPress={() => promptDuration('Chat', selectedProvider.priceChat)}>
                       <MaterialCommunityIcons name="chat-processing" size={28} color="#34D399" />
                       <View style={styles.interactionInfo}>
                          <Text style={styles.interactionTitle}>Chat</Text>
                          <Text style={styles.interactionRate}>₹ {selectedProvider.priceChat} / min</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.25)" />
                    </TouchableOpacity>
                    )}

                    {(!selectedProvider.settings || selectedProvider.settings.audio !== false) && (
                    <TouchableOpacity style={styles.interactionOption} onPress={() => promptDuration('Audio', selectedProvider.priceCall)}>
                       <MaterialCommunityIcons name="phone" size={28} color="#00E5FF" />
                       <View style={styles.interactionInfo}>
                          <Text style={styles.interactionTitle}>Voice Call</Text>
                          <Text style={styles.interactionRate}>₹ {selectedProvider.priceCall} / min</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.25)" />
                    </TouchableOpacity>
                    )}

                    {(!selectedProvider.settings || selectedProvider.settings.video !== false) && (
                    <TouchableOpacity style={styles.interactionOption} onPress={() => promptDuration('Video', selectedProvider.priceVideo)}>
                       <MaterialCommunityIcons name="video" size={28} color="#FACC15" />
                       <View style={styles.interactionInfo}>
                          <Text style={styles.interactionTitle}>Video Call</Text>
                          <Text style={styles.interactionRate}>₹ {selectedProvider.priceVideo} / min</Text>
                       </View>
                       <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.25)" />
                    </TouchableOpacity>
                    )}
                 </>
              )}
           </View>
        </View>
      </Modal>

      {/* Duration Selection Modal */}
      <Modal visible={durationModal} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
           <TouchableWithoutFeedback onPress={() => setDurationModal(false)}>
             <View style={StyleSheet.absoluteFillObject} />
           </TouchableWithoutFeedback>
           <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHandle} />
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
                 
                 <TouchableOpacity
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.3)' }}
                    onPress={() => submitRequest('unlimited')}
                 >
                    <View>
                       <Text style={{ color: '#34D399', fontSize: 16, fontWeight: 'bold' }}>Pay As You Go</Text>
                       <Text style={{ color: 'rgba(52, 211, 153, 0.7)', fontSize: 12, marginTop: 2 }}>Talk until your balance runs out</Text>
                    </View>
                    <Text style={{ color: 'rgba(52, 211, 153, 0.7)', fontSize: 14 }}>₹ {selectedInteraction ? selectedInteraction.rate : 0}/min</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>
      <Modal visible={connectingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <View style={[styles.anonModalContent, { alignItems: 'center', padding: 32 }]}>
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 16 }} />
              <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' }}>{selectedProvider?.status === 'busy' ? 'Joining Waitlist...' : 'Requesting Session...'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 8, textAlign: 'center', marginBottom: 20 }}>{selectedProvider?.status === 'busy' ? 'You are in queue. Provider will accept when free.' : 'Waiting for provider to accept'}</Text>
              
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

      {/* Insufficient Balance Modal */}
      <Modal visible={insufficientModal} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setInsufficientModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={[styles.bottomSheetContent, { alignItems: 'center' }]}>
            <View style={styles.bottomSheetHandle} />
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
               <MaterialCommunityIcons name="cash-remove" size={32} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 8, textAlign: 'center' }}>Insufficient Balance</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              If you want to talk to {selectedProvider?.name}, you have to add some money to your wallet.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={{ backgroundColor: '#111111', flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setInsufficientModal(false)}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: '#FACC15', flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }} onPress={() => {
                setInsufficientModal(false);
                router.push('/wallet');
              }}>
                <Text style={{ color: '#000000', fontWeight: 'bold', textAlign: 'center' }}>Add Money</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Offline Modal */}
      <Modal visible={offlineModal} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setOfflineModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={[styles.bottomSheetContent, { alignItems: 'center' }]}>
            <View style={styles.bottomSheetHandle} />
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
               <MaterialCommunityIcons name="account-cancel" size={32} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 8, textAlign: 'center' }}>Provider Unavailable</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              {offlineMessage}
            </Text>
            <TouchableOpacity style={{ backgroundColor: '#FACC15', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }} onPress={() => setOfflineModal(false)}>
              <Text style={{ color: '#000000', fontWeight: 'bold', textAlign: 'center' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Busy Provider Modal */}
      <Modal visible={busyModal} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <TouchableWithoutFeedback onPress={() => setBusyModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <View style={[styles.bottomSheetContent, { alignItems: 'center' }]}>
            <View style={styles.bottomSheetHandle} />
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
               <MaterialCommunityIcons name="phone-in-talk" size={32} color="#FACC15" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 8, textAlign: 'center' }}>Provider is Busy</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              {selectedProvider?.name} is currently on a call. Please try again after {selectedProvider?.busyUntil && (selectedProvider.busyUntil - Date.now()) > 0 ? Math.ceil((selectedProvider.busyUntil - Date.now()) / 60000) : 'a few'} minutes.
            </Text>
            
            <View style={{ flexDirection: 'column', gap: 12, width: '100%' }}>
              <TouchableOpacity style={{ backgroundColor: '#FACC15', width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }} onPress={() => {
                setBusyModal(false);
                socketRef.current?.emit('join_waitlist', {
                  providerId: selectedProvider?.id,
                  userId: user?.id,
                  userName: user?.name,
                  type: selectedInteraction?.type,
                  rate: selectedInteraction?.rate,
                  duration: selectedInteraction?.duration
                });
                alert(`You have successfully joined ${selectedProvider?.name}'s waiting room! Please stay on this screen. You will be automatically connected when the provider is ready.`);
              }}>
                <Text style={{ color: '#000000', fontWeight: 'bold', textAlign: 'center' }}>Wait in Waiting Room</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: '#111111', width: '100%', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }} onPress={() => {
                setBusyModal(false);
                setSelectedProvider(null);
              }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>Find Someone Else</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal visible={showEditNameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.anonModalContent}>
            <Text style={styles.anonModalTitle}>Edit Your Name</Text>
            <TextInput
              style={{ backgroundColor: '#1A1A1A', color: 'rgba(255,255,255,0.92)', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} style={{ backgroundColor: '#FACC15', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}>
                <Text style={{ color: '#000', fontSize: 15, fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  loadingCt: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 12 },
  userIconBg: { backgroundColor: '#111111', padding: 8, borderRadius: 8 },
  walletContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FACC15', borderRadius: 20, paddingHorizontal: 12, height: 36, gap: 6, backgroundColor: '#0A0A0A' },
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
  statusDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#000000' },
  recentName: { color: 'rgba(255,255,255,0.70)', fontSize: 12, marginTop: 8, textAlign: 'center' },

  providerCard: { backgroundColor: '#111111', borderRadius: 12, padding: 16 },
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
  statusDotLg: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#000000' },
  inboxContent: { flex: 1 },
  inboxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  inboxName: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600' },
  inboxDate: { color: 'rgba(255,255,255,0.25)', fontSize: 12 },
  inboxMsgRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inboxMessage: { color: 'rgba(255,255,255,0.45)', fontSize: 13, flex: 1 },

  fabBtn: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FACC15', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  drawerOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' },
  drawerContent: { width: '75%', backgroundColor: '#000000', height: '100%', elevation: 8 },
  drawerScrollArrows: { position: 'absolute', right: 10, top: '45%', gap: 10 },
  drawerScrollArrowBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center'
  },
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
  drawerFooter: { padding: 24, paddingBottom: 40 },
  versionText: { color: 'rgba(255,255,255,0.15)', fontSize: 13, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  bottomSheetContent: { backgroundColor: '#111111', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderBottomWidth: 0 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  anonModalContent: { backgroundColor: '#111111', width: width * 0.85, borderRadius: 12, padding: 24, elevation: 5 },
  anonModalTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  anonModalBody: { color: 'rgba(255,255,255,0.70)', fontSize: 14, lineHeight: 22, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 20, marginBottom: 16 },
  anonModalBtn: { alignSelf: 'flex-end', borderWidth: 1, borderColor: '#FACC15', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  anonModalBtnText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold' },

  recommendedModalContent: { backgroundColor: '#111111', width, position: 'absolute', bottom: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  recommendedTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  recommendedGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  recCard: { backgroundColor: '#0A0A0A', width: '31%', borderRadius: 12, padding: 12, alignItems: 'center' },
  recAvatarRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 2.5, borderColor: '#FDE047', alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' },
  recAvatar: { width: 52, height: 52, borderRadius: 26 },
  recStatusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#34D399', borderWidth: 2, borderColor: '#0A0A0A' },
  recName: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 'bold' },
  recDemo: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 12, marginTop: 2, textAlign: 'center' },
  recTalkBtn: { borderWidth: 1, borderColor: '#FACC15', borderRadius: 8, paddingVertical: 6, width: '100%', alignItems: 'center' },
  recTalkText: { color: '#FACC15', fontSize: 11, fontWeight: 'bold' },

  interactionOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2028', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  interactionInfo: { flex: 1, marginLeft: 16 },
  interactionTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' },
  interactionRate: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4 },
});

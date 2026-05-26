import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL, SOCKET_URL, secureFetch } from '../../constants/ServerConfig';
import { useAuth } from '../../hooks/useAuth';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

export default function ProviderProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  // Interaction states
  const [durationModal, setDurationModal] = useState(false);
  const [connectingModal, setConnectingModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<{type: string, rate: number} | null>(null);
  
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    // Fetch provider
    secureFetch(`${API_URL}/provider/${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setProvider(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching provider:', err);
        setLoading(false);
      });
      
    // Fetch user wallet
    if (user?.id) {
      secureFetch(`${API_URL}/user/${user.id}`)
        .then(r => r.json())
        .then(data => { if (data.walletBalance !== undefined) setWalletBalance(data.walletBalance); })
        .catch(console.error);
    }
  }, [id, user]);

  useEffect(() => {
    if (!user?.id) return;
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('user_connect', { userId: user.id });
    });
    
    socketRef.current.on('interaction_accepted', (payload: any) => {
      setConnectingModal(false);
      router.replace({
        pathname: '/chat/[id]',
        params: { id: payload.providerId, sessionId: payload.sessionId, type: payload.type, duration: payload.duration.toString() }
      });
    });

    socketRef.current.on('interaction_rejected', (payload: any) => {
      setConnectingModal(false);
      alert(payload.reason || 'Provider is currently busy or declined the request.');
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  const promptDuration = (type: string, rate: number) => {
    if (!provider) return;
    if (provider.status !== 'online') {
      alert(`Provider is currently ${provider.status}. Please try again later.`);
      return;
    }
    setSelectedInteraction({ type, rate });
    setDurationModal(true);
  };

  const submitRequest = (duration: number) => {
    if (!selectedInteraction || !provider || !user) return;
    const { type, rate } = selectedInteraction;

    if (walletBalance < rate * duration) {
      alert(`Insufficient balance. Requires ₹${rate * duration} for ${duration} mins.`);
      return;
    }
    
    setDurationModal(false);
    setConnectingModal(true);
    
    socketRef.current?.emit('request_interaction', {
      userId: user.id,
      userName: user.name,
      providerId: provider.id,
      type,
      rate,
      duration
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00F5FF" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Provider not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Cover & Avatar Section */}
        <View style={styles.headerArea}>
          <LinearGradient colors={['#1A202E', '#05070A']} style={styles.coverImage} />
          
          <TouchableOpacity style={styles.topBackBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            <Image 
              source={provider.imagePath ? { uri: provider.imagePath } : require('../../assets/images/girl_smiling_1775250936696.png')} 
              style={styles.avatar} 
            />
            <View style={[styles.statusBadge, { backgroundColor: provider.status === 'online' ? '#34D399' : (provider.status === 'busy' ? '#FACC15' : '#EF4444') }]} />
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.infoSection}>
          <View style={{flexDirection:'row', alignItems:'center', gap: 6}}>
             <Text style={styles.nameText}>{provider.name}</Text>
             {provider.verified && <MaterialCommunityIcons name="check-decagram" size={20} color="#00F5FF" />}
          </View>
          <Text style={styles.taglineText}>{provider.tagline || 'Astrologer & Counselor'}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={22} color="#FACC15" />
              <Text style={styles.statValue}>{provider.rating || '5.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="briefcase-clock" size={22} color="#00F5FF" />
              <Text style={styles.statValue}>{provider.exp || '3+'} Yrs</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="people" size={22} color="#3A8DFF" />
              <Text style={styles.statValue}>{provider.reviews || '0'}</Text>
              <Text style={styles.statLabel}>Consults</Text>
            </View>
          </View>
        </View>

        {/* About & Bio */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>About {provider.name}</Text>
          <Text style={styles.bioText}>
            {provider.bio || `Hi, I am ${provider.name}. I am an experienced professional here to help you navigate through life's challenges. I look forward to connecting with you and providing the guidance you need.`}
          </Text>

          <View style={styles.tagsContainer}>
            {provider.langs ? provider.langs.split(',').map((lang: string, idx: number) => (
              <View key={idx} style={styles.tagBadge}>
                <Text style={styles.tagText}>{lang.trim()}</Text>
              </View>
            )) : (
              <View style={styles.tagBadge}><Text style={styles.tagText}>English</Text></View>
            )}
            {provider.demographic ? (
               <View style={styles.tagBadge}><Text style={styles.tagText}>{provider.demographic}</Text></View>
            ) : null}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.chatBtn]} onPress={() => promptDuration('Chat', provider.priceChat || 10)}>
            <View style={styles.priceTag}><Text style={styles.priceText}>₹{provider.priceChat || 10}/min</Text></View>
            <MaterialCommunityIcons name="message-text" size={20} color="#05070A" />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => promptDuration('Call', provider.priceCall || 20)}>
            <View style={styles.priceTag}><Text style={styles.priceText}>₹{provider.priceCall || 20}/min</Text></View>
            <MaterialIcons name="call" size={20} color="#05070A" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.videoBtn]} onPress={() => promptDuration('Video', provider.priceVideo || 30)}>
             <View style={styles.priceTag}><Text style={styles.priceText}>₹{provider.priceVideo || 30}/min</Text></View>
            <MaterialIcons name="videocam" size={20} color="#05070A" />
            <Text style={styles.actionText}>Video</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Duration Modal */}
      <Modal visible={durationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Duration</Text>
              <TouchableOpacity onPress={() => setDurationModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#F0F4F8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>How long would you like to connect?</Text>
            
            <View style={styles.durationGrid}>
              {[5, 10, 15, 30].map(mins => (
                <TouchableOpacity key={mins} style={styles.durationBtn} onPress={() => submitRequest(mins)}>
                  <Text style={styles.durationMins}>{mins} min</Text>
                  <Text style={styles.durationPrice}>₹{(selectedInteraction?.rate || 0) * mins}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.walletInfo}>
              <MaterialCommunityIcons name="wallet" size={16} color="#94A3B8" />
              <Text style={styles.walletText}>Wallet Balance: ₹{walletBalance}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Connecting Modal */}
      <Modal visible={connectingModal} transparent animationType="fade">
        <View style={styles.connectingOverlay}>
          <View style={styles.pulseRing}>
            <Image source={provider.imagePath ? { uri: provider.imagePath } : require('../../assets/images/girl_smiling_1775250936696.png')} style={styles.connectingAvatar} />
          </View>
          <Text style={styles.connectingTitle}>Calling {provider.name}...</Text>
          <Text style={styles.connectingSub}>Waiting for provider to accept</Text>
          
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setConnectingModal(false)}>
            <MaterialCommunityIcons name="phone-hangup" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070A' },
  loadingContainer: { flex: 1, backgroundColor: '#05070A', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#F0F4F8', fontSize: 18, marginBottom: 20 },
  backBtn: { backgroundColor: '#1A202E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  headerArea: { height: 180, position: 'relative', marginBottom: 60, backgroundColor: '#121620' },
  coverImage: { width: '100%', height: '100%' },
  topBackBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  avatarContainer: { position: 'absolute', bottom: -50, alignSelf: 'center', width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: '#05070A', backgroundColor: '#121620', elevation: 10 },
  avatar: { width: '100%', height: '100%', borderRadius: 65, resizeMode: 'cover' },
  statusBadge: { position: 'absolute', bottom: 5, right: 12, width: 24, height: 24, borderRadius: 12, borderWidth: 4, borderColor: '#05070A' },
  infoSection: { alignItems: 'center', paddingHorizontal: 20 },
  nameText: { color: '#F0F4F8', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  taglineText: { color: '#00F5FF', fontSize: 15, fontWeight: '600', marginBottom: 24 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121620', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 24, width: '100%', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(0,245,255,0.1)' },
  statItem: { alignItems: 'center', flex: 1, gap: 4 },
  statValue: { color: '#F0F4F8', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  detailsSection: { padding: 24, marginTop: 10 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 16 },
  bioText: { color: '#94A3B8', fontSize: 15, lineHeight: 26 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24, gap: 10 },
  tagBadge: { backgroundColor: 'rgba(58,141,255,0.10)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(58,141,255,0.2)' },
  tagText: { color: '#3A8DFF', fontSize: 13, fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10,13,20,0.95)', padding: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: 'rgba(0,245,255,0.1)' },
  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, position: 'relative' },
  chatBtn: { backgroundColor: '#3A8DFF' },
  callBtn: { backgroundColor: '#00F5FF' },
  videoBtn: { backgroundColor: '#00FF94' },
  actionText: { color: '#05070A', fontWeight: '900', fontSize: 15, textTransform: 'uppercase' },
  priceTag: { position: 'absolute', top: -12, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 2, borderColor: '#05070A' },
  priceText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#121620', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(0,245,255,0.2)', borderBottomWidth: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  modalSubtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 24 },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  durationBtn: { width: '47%', backgroundColor: 'rgba(0,245,255,0.1)', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,245,255,0.3)' },
  durationMins: { color: '#00F5FF', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  durationPrice: { color: '#F0F4F8', fontSize: 14, fontWeight: '600' },
  walletInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8, backgroundColor: '#1A202E', paddingVertical: 12, borderRadius: 12 },
  walletText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  
  connectingOverlay: { flex: 1, backgroundColor: 'rgba(5,7,10,0.95)', justifyContent: 'center', alignItems: 'center' },
  pulseRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(0,245,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#00F5FF' },
  connectingAvatar: { width: 100, height: 100, borderRadius: 50 },
  connectingTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  connectingSub: { color: '#00F5FF', fontSize: 16, fontWeight: '600', marginBottom: 40 },
  cancelBtn: { backgroundColor: '#EF4444', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 10 }
});

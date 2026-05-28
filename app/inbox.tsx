import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, Platform, StatusBar as RNStatusBar, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { API_URL, secureFetch } from '../constants/ServerConfig';

export default function InboxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInbox = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      const r = await secureFetch(`${API_URL}/inbox/${user.id}`);
      const inbox = await r.json();
      setInboxItems(inbox.map((i: any) => ({
        ...i,
        image: i.isSystem ? null : (i.provider?.imagePath ? { uri: i.provider.imagePath } : (i.imagePath ? { uri: i.imagePath } : require('../assets/images/girl_smiling_1775250936696.png')))
      })));
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [user]);

  const renderInboxItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.inboxItem}
      onPress={() => item.isSystem ? router.push('/chat/system') : router.push(`/chat/${item.providerId}`)}
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
            <MaterialIcons name="person" size={32} color="#000000" />
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="rgba(255,255,255,0.92)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inbox</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={inboxItems}
          keyExtractor={item => item.id}
          renderItem={renderInboxItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchInbox} tintColor="#FACC15" colors={['#FACC15']} progressBackgroundColor="#111111" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('noMessages') || 'No messages yet'}</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  listContent: { padding: 16, paddingTop: 8 },
  emptyText: { color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 40 },
  
  inboxItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  inboxAvatarCt: { position: 'relative' },
  inboxAvatar: { width: 56, height: 56, borderRadius: 28 },
  inboxAvatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  statusDotLg: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#000000' },
  inboxContent: { flex: 1 },
  inboxHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  inboxName: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600' },
  inboxDate: { color: 'rgba(255,255,255,0.25)', fontSize: 12 },
  inboxMsgRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inboxMessage: { color: 'rgba(255,255,255,0.45)', fontSize: 13, flex: 1 }
});

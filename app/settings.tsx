import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../hooks/useLanguage';
import { clearUser } from '../hooks/useAuth';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogout = async () => {
    setTimeout(async () => {
      await clearUser();
      router.replace('/login');
    }, 300);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings') || 'Settings'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>{t('account') || 'Account'}</Text>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#EF4444" />
          <Text style={[styles.menuItemText, { color: '#EF4444' }]}>{t('deleteAccount') || 'Delete Account'}</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.30)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <AntDesign name="logout" size={24} color="#EF4444" />
          <Text style={[styles.menuItemText, { color: '#EF4444' }]}>{t('logout') || 'Logout'}</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.30)" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('legal') || 'Legal'}</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms')}>
          <MaterialCommunityIcons name="file-document-outline" size={24} color="rgba(255,255,255,0.70)" />
          <Text style={styles.menuItemText}>{t('terms') || 'Terms & Conditions'}</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.30)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy')}>
          <MaterialCommunityIcons name="shield-account-outline" size={24} color="rgba(255,255,255,0.70)" />
          <Text style={styles.menuItemText}>{t('privacy') || 'Privacy Policy'}</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.30)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/safety')}>
          <MaterialIcons name="security" size={24} color="rgba(255,255,255,0.70)" />
          <Text style={styles.menuItemText}>{t('safety') || 'Safety Policy'}</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.30)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/child-safety')}>
          <MaterialIcons name="child-care" size={24} color="rgba(255,255,255,0.70)" />
          <Text style={styles.menuItemText}>Child Safety</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.30)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/report-vulnerability')}>
          <MaterialIcons name="bug-report" size={24} color="rgba(255,255,255,0.70)" />
          <Text style={styles.menuItemText}>Report Vulnerability</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.30)" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, marginTop: 10, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', padding: 16, borderRadius: 12, marginBottom: 8 },
  menuItemText: { flex: 1, color: 'rgba(255,255,255,0.92)', fontSize: 16, marginLeft: 16 },
});

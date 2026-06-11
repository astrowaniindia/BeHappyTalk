import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar, Linking } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SupportScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="headset" size={48} color="#FACC15" style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.cardTitle}>How can we help you?</Text>
          <Text style={styles.cardDesc}>If you're experiencing issues or have any questions about BeHappyTalk, our team is available 24/7 to assist you.</Text>
          
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:care@BeHappyTalk.com')}>
            <MaterialCommunityIcons name="email-outline" size={24} color="#000" />
            <Text style={styles.contactBtnText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heading}>Frequently Asked Questions</Text>
        
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I start a session?</Text>
          <Text style={styles.faqAnswer}>Simply browse our list of available providers and tap the "Talk Now" button to request a voice, video, or chat session.</Text>
        </View>
        
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How does billing work?</Text>
          <Text style={styles.faqAnswer}>Your wallet is charged per minute during live sessions. Make sure to recharge your wallet before connecting to a provider.</Text>
        </View>
        
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I report a problem?</Text>
          <Text style={styles.faqAnswer}>You can report any issues directly by emailing our support team or using the Report Vulnerability link in the app settings.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222', borderRadius: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#111', padding: 24, borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: '#333' },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  cardDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  contactBtn: { backgroundColor: '#FACC15', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  contactBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  heading: { color: '#FACC15', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  faqItem: { marginBottom: 20, backgroundColor: '#111', padding: 16, borderRadius: 12 },
  faqQuestion: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  faqAnswer: { color: '#aaa', fontSize: 14, lineHeight: 22 },
});

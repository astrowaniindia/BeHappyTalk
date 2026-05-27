import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { API_URL, secureFetch } from '../constants/ServerConfig';

const { width, height } = Dimensions.get('window');

const RECHARGE_OPTIONS = [
  { amount: '160', talktime: '160.00', isPopular: false, label: '' },
  { amount: '240', talktime: '240.00', isPopular: false, label: '' },
  { amount: '480', talktime: '480.00', isPopular: false, label: '' },
  { amount: '999', talktime: '1099.00', isPopular: true, label: 'Extra 100' },
  { amount: '1,799', talktime: '1999.00', isPopular: false, label: 'Extra 200' },
  { amount: '4,399', talktime: '4999.00', isPopular: false, label: 'Extra 600' },
  { amount: '8,799', talktime: '9999.00', isPopular: false, label: 'Extra 1200' },
  { amount: '12,999', talktime: '14999.00', isPopular: false, label: 'Extra 2000' },
  { amount: '17,499', talktime: '19999.00', isPopular: false, label: 'Extra 2500' },
];

export default function Wallet() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Recharge' | 'History'>('Recharge');
  const [selectedPlan, setSelectedPlan] = useState(RECHARGE_OPTIONS[3]); // Default to 999
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      secureFetch(`${API_URL}/user/${user.id}`)
        .then(r => r.json())
        .then(data => setWalletBalance(data.walletBalance || Math.floor(data.walletbalance) || 5000))
        .catch(console.error);
    }
  }, [user]);

  const handleNext = () => {
    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        router.push('/payment');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <MaterialIcons name="arrow-back" size={24} color="rgba(255, 255, 255, 0.92)" />
          </TouchableOpacity>
          <View style={styles.headerWalletBox}>
             <MaterialCommunityIcons name="wallet-outline" size={20} color="rgba(255, 255, 255, 0.70)" />
             <Text style={styles.headerTitle}>My Wallet</Text>
          </View>
          <Text style={styles.headerBalance}>₹ {walletBalance.toFixed(2)}/-</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Recharge' && styles.activeTabButton]}
            onPress={() => setActiveTab('Recharge')}
          >
            <Text style={[styles.tabText, activeTab === 'Recharge' && styles.activeTabText]}>Recharge</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'History' && styles.activeTabButton]}
            onPress={() => setActiveTab('History')}
          >
            <Text style={[styles.tabText, activeTab === 'History' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {activeTab === 'History' ? (
              <View style={[styles.historyCard, { alignItems: 'center', paddingVertical: 40 }]}>
                 <Text style={{color: 'rgba(255, 255, 255, 0.45)', fontSize: 16}}>No recent history</Text>
              </View>
          ) : (
            <>
              {/* Grid Layout */}
              <View style={styles.gridContainer}>
                {RECHARGE_OPTIONS.map((plan, index) => {
                  const isSelected = selectedPlan.amount === plan.amount;
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.gridItem, isSelected && styles.gridItemActive]}
                      onPress={() => setSelectedPlan(plan)}
                    >
                      {plan.isPopular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>Most Popular</Text>
                        </View>
                      )}
                      <Text style={[styles.planAmount, isSelected && { color: '#FACC15' }]}>
                        ₹{plan.amount}
                      </Text>
                      {plan.label ? (
                        <Text style={styles.planLabel}>{plan.label}</Text>
                      ) : null}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Breakdown Math */}
              <View style={styles.breakdownContainer}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Talktime</Text>
                  <Text style={styles.breakdownValue}>{selectedPlan.talktime}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Amount:</Text>
                  <Text style={styles.breakdownValue}>₹ {selectedPlan.amount}.00</Text>
                </View>
                <View style={[styles.breakdownRow, { marginTop: 8 }]}>
                  <Text style={styles.breakdownTotalLabel}>Amount payable</Text>
                  <Text style={styles.breakdownTotalValue}>₹ {selectedPlan.amount}.00</Text>
                </View>
              </View>

              {/* Checkout Controls */}
              <View style={styles.paymentControls}>
                <TouchableOpacity style={styles.paymentButton} onPress={() => router.push('/offers')}>
                   <View style={styles.paymentRowLeft}>
                      <MaterialCommunityIcons name="ticket-percent-outline" size={24} color="#FACC15" />
                      <Text style={styles.paymentButtonText}>Coupon</Text>
                   </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.paymentButton}>
                   <View style={styles.paymentRowLeft}>
                      <View style={styles.upiIconBox}>
                        <FontAwesome5 name="google-pay" size={16} color="rgba(255, 255, 255, 0.92)" />
                      </View>
                      <Text style={styles.paymentButtonText}>UPI</Text>
                   </View>
                   <Text style={styles.moreText}>More</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </ScrollView>

        {/* Footer Next only on Recharge tab */}
        {activeTab === 'Recharge' && (
            <View style={styles.footer}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
            </View>
        )}

      </View>

      {/* Loading Overlay */}
      {isLoading && (
          <View style={styles.loadingOverlay}>
              <View style={styles.loadingSpinnerBox}>
                 <ActivityIndicator size="large" color="#3B82F6" />
              </View>
              <Text style={styles.loadingText}>LOADING</Text>
          </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0B10', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#12141A', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, marginHorizontal: 16, marginTop: 16, justifyContent: 'space-between' },
  backButton: { marginRight: 12 },
  headerWalletBox: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle: { color: 'rgba(255, 255, 255, 0.70)', fontSize: 16, fontWeight: '500' },
  headerBalance: { color: 'rgba(255, 255, 255, 0.92)', fontSize: 16, fontWeight: 'bold' },
  tabsContainer: { flexDirection: 'row', marginHorizontal: 40, marginTop: 24, marginBottom: 24 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabButton: { borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
  tabText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 16, fontWeight: '500' },
  activeTabText: { color: 'rgba(255, 255, 255, 0.92)' },
  scrollContent: { flex: 1, paddingHorizontal: 24 },
  
  historyCard: { backgroundColor: '#1A1C23', borderRadius: 12, padding: 16 },
  historyDate: { color: 'rgba(255, 255, 255, 0.25)', fontSize: 12, marginBottom: 12 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  historySuccessText: { color: 'rgba(255, 255, 255, 0.92)', fontSize: 16, fontWeight: '500' },
  historyAmountBox: { borderWidth: 1, borderColor: '#FACC15', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  historyAmountText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold' },
  historyCoupon: { color: 'rgba(255, 255, 255, 0.25)', fontSize: 12 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  gridItem: { width: '30%', backgroundColor: '#1A1C23', borderRadius: 12, height: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#0A0B10', position: 'relative' },
  gridItemActive: { borderColor: '#FACC15' },
  popularBadge: { position: 'absolute', top: -10, backgroundColor: '#FBBF24', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  popularText: { color: '#0A0B10', fontSize: 10, fontWeight: 'bold' },
  planAmount: { color: 'rgba(255, 255, 255, 0.92)', fontSize: 16, fontWeight: 'bold' },
  planLabel: { color: '#FACC15', fontSize: 10, marginTop: 4 },
  breakdownContainer: { marginTop: 40, marginBottom: 30, paddingHorizontal: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  breakdownLabel: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 14 },
  breakdownValue: { color: 'rgba(255, 255, 255, 0.70)', fontSize: 14 },
  breakdownTotalLabel: { color: 'rgba(255, 255, 255, 0.92)', fontSize: 16, fontWeight: 'bold' },
  breakdownTotalValue: { color: 'rgba(255, 255, 255, 0.92)', fontSize: 16, fontWeight: 'bold' },
  paymentControls: { gap: 16 },
  paymentButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#FACC15', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#0A0B10' },
  paymentRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentButtonText: { color: '#FACC15', fontSize: 16, fontWeight: '500' },
  upiIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FACC15', justifyContent: 'center', alignItems: 'center' },
  moreText: { color: '#FACC15', fontSize: 14, fontWeight: '500' },
  footer: { paddingHorizontal: 24, paddingVertical: 20 },
  nextButton: { borderWidth: 1, borderColor: '#FACC15', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextButtonText: { color: '#FACC15', fontSize: 16, fontWeight: 'bold' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(33, 34, 44, 0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingSpinnerBox: { width: 80, height: 80, backgroundColor: '#1A1C23', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loadingText: { color: 'rgba(255, 255, 255, 0.92)', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});

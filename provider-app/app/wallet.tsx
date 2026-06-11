import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, FlatList, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  success: '#10B981',
  danger: '#EF4444',
  border: '#E2E8F0',
  cardBg: '#2C3E50',
};

const API_URL = 'http://192.168.29.168:3000';

export default function WalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    try {
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        const res = await axios.get(`${API_URL}/api/provider/${data.id}`);
        if (res.data && res.data.walletBalance !== undefined) {
          setBalance(res.data.walletBalance.toFixed(2));
        }
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'call_audio': return <Ionicons name="call" size={20} color="#3B82F6" />;
      case 'call_video': return <Ionicons name="videocam" size={20} color="#8B5CF6" />;
      case 'chat': return <Ionicons name="chatbubbles" size={20} color="#10B981" />;
      case 'withdrawal': return <Ionicons name="cash" size={20} color="#EF4444" />;
      default: return <Ionicons name="wallet" size={20} color={Colors.textDark} />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'call_audio': return 'Audio Session';
      case 'call_video': return 'Video Session';
      case 'chat': return 'Chat Session';
      case 'withdrawal': return 'Bank Withdrawal';
      default: return 'Transaction';
    }
  };

  const renderTransaction = ({ item }: { item: typeof DUMMY_TRANSACTIONS[0] }) => {
    const isNegative = item.amount < 0;
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View style={[styles.iconBox, { backgroundColor: isNegative ? '#FEE2E2' : '#EFF6FF' }]}>
            {getTransactionIcon(item.type)}
          </View>
          <View>
            <Text style={styles.transactionTitle}>{getTransactionLabel(item.type)}</Text>
            <Text style={styles.transactionDate}>{item.date}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: isNegative ? Colors.danger : Colors.success }]}>
            {isNegative ? '-' : '+'}₹{Math.abs(item.amount)}
          </Text>
          {item.status === 'processing' && (
            <Text style={styles.statusProcessing}>Processing</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet & Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        
        {/* Main Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>Available Balance</Text>
            <Ionicons name="wallet-outline" size={24} color="rgba(255,255,255,0.7)" />
          </View>
          <Text style={styles.balanceText}>₹{balance}</Text>
          
          <View style={styles.walletActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/coming-soon')}>
              <Ionicons name="cash-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={() => router.push('/coming-soon')}>
              <Ionicons name="document-text-outline" size={20} color={Colors.white} />
              <Text style={[styles.actionButtonText, { color: Colors.white }]}>Statements</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Account Card */}
        <TouchableOpacity style={styles.bankInfoCard} onPress={() => router.push('/coming-soon')}>
          <View style={styles.bankDetails}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="add" size={24} color={Colors.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.bankName}>Add Payout Account</Text>
              <Text style={styles.bankSubtitle}>Connect a bank account to withdraw</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent Transactions List */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={transactions}
            keyExtractor={(item: any) => item.id}
            renderItem={renderTransaction as any}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: Colors.textLight, marginTop: 20 }}>
                No transactions yet.
              </Text>
            }
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 40,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  walletCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: Colors.cardBg,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
  balanceText: {
    color: Colors.white,
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 0.48,
  },
  actionButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  bankInfoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankName: {
    color: Colors.textDark,
    fontSize: 15,
    fontWeight: 'bold',
  },
  bankSubtitle: {
    color: Colors.textLight,
    fontSize: 12,
    marginTop: 2,
  },
  editBankText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  transactionsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  seeAllText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  statusProcessing: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginTop: 4,
  }
});

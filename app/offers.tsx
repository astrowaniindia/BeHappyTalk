import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, TextInput, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function Offers() {
  const router = useRouter();
  const [coupon, setCoupon] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Offers</Text>
        </View>

        {/* Coupon Input Area */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.inputField}
            placeholder="Enter coupon Code"
            placeholderTextColor="rgba(255, 255, 255, 0.45)"
            value={coupon}
            onChangeText={setCoupon}
          />
          <TouchableOpacity style={styles.applyButton}>
            <Text style={styles.applyButtonText}>APPLY</Text>
          </TouchableOpacity>
        </View>

        {/* Empty State message */}
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Oops! No coupons available right now</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { color: 'rgba(255, 255, 255, 0.70)', fontSize: 18, fontWeight: '500' },
  inputSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12 },
  inputField: { flex: 1, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.92)', fontSize: 16, paddingVertical: 12, fontStyle: 'italic' },
  applyButton: { borderWidth: 1, borderColor: '#FACC15', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  applyButtonText: { color: '#FACC15', fontSize: 14, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 14 }
});

import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  border: '#E2E8F0',
};

export default function ScheduleScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]); // Empty state for real data
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/coming-soon')}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Calendar Strip Placeholder */}
      <View style={styles.calendarStrip}>
        <Text style={styles.calendarText}>Calendar View Coming Soon</Text>
      </View>

      {/* Appointments List */}
      <FlatList
        data={appointments}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <View />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textLight} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>No Upcoming Appointments</Text>
            <Text style={styles.emptySubtitle}>You don't have any advance bookings scheduled at the moment.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 40, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  calendarStrip: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center', justifyContent: 'center', height: 80 },
  calendarText: { color: Colors.textLight, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { marginTop: 16, color: Colors.textDark, fontSize: 18, fontWeight: 'bold' },
  emptySubtitle: { marginTop: 8, color: Colors.textLight, fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  border: '#E2E8F0',
  star: '#F59E0B',
};

const API_URL = 'http://192.168.29.168:3000';

export default function ReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]); // Real empty state
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState('0.0');
  const [totalReviews, setTotalReviews] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async () => {
    try {
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        // Assuming an API endpoint exists for fetching reviews
        const res = await axios.get(`${API_URL}/api/provider/${data.id}/reviews`);
        if (res.data && res.data.reviews) {
          setReviews(res.data.reviews);
          setAverageRating(res.data.averageRating || '0.0');
          setTotalReviews(res.data.totalReviews || 0);
        }
      }
    } catch (error) {
      console.log('Skipping API fetch - endpoint not ready');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  }, []);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons 
            key={star} 
            name={star <= rating ? "star" : "star-outline"} 
            size={16} 
            color={Colors.star} 
          />
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.userName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.dateText}>
              {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        </View>
        {renderStars(item.rating)}
      </View>
      {item.comment ? <Text style={styles.commentText}>{item.comment}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Card */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.averageRating}>{averageRating}</Text>
            {renderStars(Number(averageRating))}
            <Text style={styles.totalReviews}>Based on {totalReviews} reviews</Text>
          </View>
          <View style={styles.summaryRight}>
            <Ionicons name="trophy" size={48} color="rgba(27, 118, 255, 0.15)" />
          </View>
        </View>
      </View>

      {/* Reviews List */}
      <FlatList
        data={reviews}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderReviewItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="star-half-outline" size={64} color={Colors.textLight} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>Complete sessions with clients to start receiving ratings and reviews.</Text>
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
  summaryContainer: { padding: 20, paddingBottom: 10 },
  summaryCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  summaryLeft: { flex: 1 },
  averageRating: { fontSize: 42, fontWeight: 'bold', color: Colors.textDark, marginBottom: 4 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  totalReviews: { fontSize: 13, color: Colors.textLight },
  summaryRight: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F4F7FB', justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  reviewCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  userName: { fontSize: 15, fontWeight: 'bold', color: Colors.textDark },
  dateText: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  commentText: { fontSize: 14, color: Colors.textDark, lineHeight: 20, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { marginTop: 16, color: Colors.textDark, fontSize: 18, fontWeight: 'bold' },
  emptySubtitle: { marginTop: 8, color: Colors.textLight, fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});

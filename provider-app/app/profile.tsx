import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Image } from 'react-native';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  success: '#10B981',
  danger: '#EF4444',
  border: '#E2E8F0',
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<any>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [priceChat, setPriceChat] = useState('10');
  const [priceCall, setPriceCall] = useState('20');
  const [priceVideo, setPriceVideo] = useState('30');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_URL = 'https://provider.behappytalk.com';

  useEffect(() => {
    setProfileImageError(false);
  }, [profileImage]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        setProviderData(data);
        setName(data.name || 'Studio Partner');
        setPhone(data.phone || '');
        setBio(data.bio || data.tagline || 'Experienced consultant ready to help clients achieve their goals.');
        setSpecialty(data.specialty || data.demographic || 'General Consultation');
        setPriceChat(String(data.priceChat ?? 10));
        setPriceCall(String(data.priceCall ?? 20));
        setPriceVideo(String(data.priceVideo ?? 30));
        setProfileImage(data.imagePath || null);
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(base64Image); // optimistic UI
      
      try {
        const token = await AsyncStorage.getItem('providerToken');
        const imgRes = await axios.post(`${API_URL}/api/provider/upload-image`, 
          { base64Image }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (providerData) {
          const updatedData = { ...providerData, imagePath: imgRes.data.url };
          await AsyncStorage.setItem('providerData', JSON.stringify(updatedData));
          setProviderData(updatedData);
          setProfileImage(imgRes.data.url);
          Alert.alert('Success', 'Profile picture updated!');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to upload image.');
        setProfileImage(providerData?.imagePath || null);
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      const token = await AsyncStorage.getItem('providerToken');
      await axios.post(`${API_URL}/api/provider/remove-image`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setProfileImage(null);
      if (providerData) {
        const updatedData = { ...providerData, imagePath: null };
        await AsyncStorage.setItem('providerData', JSON.stringify(updatedData));
        setProviderData(updatedData);
      }
      Alert.alert('Success', 'Profile picture removed.');
    } catch (err) {
      Alert.alert('Error', 'Failed to remove image.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('providerToken');
      await axios.post(`${API_URL}/api/provider/update-profile`, {
        name,
        bio,
        demographic: specialty,
        priceChat: Number(priceChat) || 0,
        priceCall: Number(priceCall) || 0,
        priceVideo: Number(priceVideo) || 0,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (providerData) {
        const updatedData = { ...providerData, name, bio, specialty, demographic: specialty, priceChat, priceCall, priceVideo };
        await AsyncStorage.setItem('providerData', JSON.stringify(updatedData));
        setProviderData(updatedData);
      }
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('providerToken');
            await AsyncStorage.removeItem('providerData');
            router.replace('/');
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.container} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
          }
        >
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {profileImage && !profileImageError ? (
                <Image
                  source={{ uri: profileImage }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              )}
              <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickImage}>
                <Ionicons name="camera" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.providerName}>{name}</Text>
            <Text style={styles.providerRole}>Verified Partner</Text>
            
            {profileImage && (
              <TouchableOpacity onPress={handleRemoveImage} style={{ marginTop: 10 }}>
                <Text style={{ color: Colors.danger, fontWeight: 'bold' }}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F1F5F9', color: Colors.textLight }]}
                value={phone}
                editable={false}
              />
              <Text style={styles.hintText}>Phone numbers cannot be changed.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialty</Text>
              <TextInput
                style={styles.input}
                value={specialty}
                onChangeText={setSpecialty}
                placeholder="e.g. Relationship Advice"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Short Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell clients about yourself..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Pricing Section */}
          <View style={[styles.formSection, { paddingTop: 0 }]}>
            <Text style={styles.sectionTitle}>Pricing Rates (per minute)</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chat Rate (₹)</Text>
              <TextInput style={styles.input} placeholder="e.g. 15" keyboardType="numeric" value={priceChat} onChangeText={setPriceChat} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Audio Call Rate (₹)</Text>
              <TextInput style={styles.input} placeholder="e.g. 20" keyboardType="numeric" value={priceCall} onChangeText={setPriceCall} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Video Call Rate (₹)</Text>
              <TextInput style={styles.input} placeholder="e.g. 30" keyboardType="numeric" value={priceVideo} onChangeText={setPriceVideo} />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.white,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.textDark,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  providerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  providerRole: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  formSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textDark,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  hintText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
  },
  actionSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FEF2F2', // Light red bg
    borderRadius: 12,
  },
  logoutBtnText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

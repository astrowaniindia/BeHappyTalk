import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [refreshing, setRefreshing] = useState(false);

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
        setBio(data.bio || 'Experienced consultant ready to help clients achieve their goals.');
        setSpecialty(data.specialty || 'General Consultation');
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // In a real app, you would make an API call here to update the backend
    Alert.alert('Success', 'Profile updated successfully!');
    
    // Update local storage
    if (providerData) {
      const updatedData = { ...providerData, name, bio, specialty };
      await AsyncStorage.setItem('providerData', JSON.stringify(updatedData));
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
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              <TouchableOpacity style={styles.editAvatarBtn}>
                <Ionicons name="camera" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.providerName}>{name}</Text>
            <Text style={styles.providerRole}>Verified Partner</Text>
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
              <TextInput style={styles.input} placeholder="e.g. 15" keyboardType="numeric" defaultValue="15" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Audio Call Rate (₹)</Text>
              <TextInput style={styles.input} placeholder="e.g. 20" keyboardType="numeric" defaultValue="25" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Video Call Rate (₹)</Text>
              <TextInput style={styles.input} placeholder="e.g. 30" keyboardType="numeric" defaultValue="40" />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
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

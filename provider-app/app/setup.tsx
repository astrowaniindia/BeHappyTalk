import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const Colors = {
  primary: '#1773fc',
  bgDarker: '#f8fafc',
  bg: '#f1f5f9',
  surface: '#ffffff',
  text: '#0f172a',
  textDim: '#475569',
  border: '#e2e8f0',
  success: '#10b981',
};

const API_URL = 'https://provider.behappytalk.com';

export default function SetupScreen() {
  const [providerId, setProviderId] = useState('');
  const [demographic, setDemographic] = useState('');
  const [tagline, setTagline] = useState('');
  const [langs, setLangs] = useState('');
  const [priceChat, setPriceChat] = useState('10');
  const [priceCall, setPriceCall] = useState('20');
  const [priceVideo, setPriceVideo] = useState('30');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        setProviderId(data.id);
      } else {
        router.replace('/');
      }
    };
    init();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSend = async () => {
    if (!tagline || !demographic || !langs || !priceChat || !priceCall || !priceVideo) {
      Alert.alert('Incomplete', 'Please fill all fields to setup your profile.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('providerToken');
      const payload = {
        demographic,
        tagline,
        langs,
        priceChat: parseInt(priceChat, 10),
        priceCall: parseInt(priceCall, 10),
        priceVideo: parseInt(priceVideo, 10),
      };
      const response = await axios.post(`${API_URL}/api/provider/update-profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let newImage = null;
      if (profileImage) {
        const imgRes = await axios.post(`${API_URL}/api/provider/upload-image`,
          { base64Image: profileImage },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        newImage = imgRes.data.url;
      }
      
      // Update local storage
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        const newData = { ...data, ...response.data };
        if (newImage) newData.imagePath = newImage;
        await AsyncStorage.setItem('providerData', JSON.stringify(newData));
      }
      
      Alert.alert('Success!', 'Your profile has been successfully set up and is now visible to users.', [
        { text: 'Go to Dashboard', onPress: () => router.replace('/dashboard') }
      ]);
    } catch (error: any) {
      console.log('Setup error', error?.response?.data || error);
      Alert.alert('Setup Failed', error.response?.data?.error || 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconCircle} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 72, height: 72, borderRadius: 36 }} />
              ) : (
                <Ionicons name="camera" size={32} color={Colors.primary} />
              )}
            </TouchableOpacity>
            <Text style={styles.title}>Setup Your Profile</Text>
            <Text style={styles.subtitle}>Complete your profile so users can find you and book sessions.</Text>
          </View>

          <View style={styles.form}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Demographic (e.g. F • 25 yrs)</Text>
              <TextInput style={styles.input} value={demographic} onChangeText={setDemographic} placeholder="M/F • Age" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Languages Spoken</Text>
              <TextInput style={styles.input} value={langs} onChangeText={setLangs} placeholder="English • Hindi • Marathi" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tagline / Bio</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                value={tagline} 
                onChangeText={setTagline} 
                placeholder="I am here to listen and help you..." 
                multiline
              />
            </View>

            <View style={styles.pricingSection}>
              <Text style={styles.sectionTitle}>Set Your Pricing (₹/min)</Text>
              
              <View style={styles.priceRow}>
                <View style={styles.priceBox}>
                  <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
                  <Text style={styles.priceLabel}>Chat</Text>
                  <TextInput style={styles.priceInput} value={priceChat} onChangeText={setPriceChat} keyboardType="numeric" />
                </View>
                
                <View style={styles.priceBox}>
                  <Ionicons name="call" size={20} color={Colors.primary} />
                  <Text style={styles.priceLabel}>Audio</Text>
                  <TextInput style={styles.priceInput} value={priceCall} onChangeText={setPriceCall} keyboardType="numeric" />
                </View>
                
                <View style={styles.priceBox}>
                  <Ionicons name="videocam" size={20} color={Colors.primary} />
                  <Text style={styles.priceLabel}>Video</Text>
                  <TextInput style={styles.priceInput} value={priceVideo} onChangeText={setPriceVideo} keyboardType="numeric" />
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, loading && { opacity: 0.7 }]} 
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Send & Publish Profile</Text>
                  <Ionicons name="paper-plane" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0edff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textDim,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.bgDarker,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  pricingSection: {
    marginTop: 10,
    marginBottom: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.bgDarker,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDim,
    marginTop: 4,
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingVertical: 8,
  },
  submitButton: {
    backgroundColor: Colors.success,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

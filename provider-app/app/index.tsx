import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// SaaS Theme Colors matching the web portal
const Colors = {
  primary: '#1773fc',
  primaryHover: '#125ccc',
  bgDarker: '#f8fafc',
  bg: '#f1f5f9',
  surface: '#ffffff',
  text: '#0f172a',
  textDim: '#475569',
  border: '#e2e8f0',
  danger: '#ef4444',
  success: '#10b981',
};

// Use the live production backend that the main app uses
const API_URL = 'http://192.168.29.168:3000';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('providerToken');
      if (token) {
        router.replace('/dashboard');
      } else {
        setIsCheckingAuth(false);
      }
    } catch (e) {
      setIsCheckingAuth(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }


  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone and password.');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login to:', `${API_URL}/api/provider/login`);
      const response = await fetch(`${API_URL}/api/provider/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ phone, password })
      });
      
      const data = await response.json();
      console.log('Login Response:', data);

      if (response.ok && data.token) {
        await AsyncStorage.setItem('providerToken', data.token);
        await AsyncStorage.setItem('providerData', JSON.stringify(data));
        
        // Success! Go to dashboard
        router.replace('/dashboard');
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error details:', error);
      Alert.alert('Login Failed', 'Failed to log in. Please check your network connection.');
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
        <View style={styles.content}>
          <View style={styles.loginBox}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={{ marginBottom: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Image 
                  source={require('../assets/icon.png')} 
                  style={{ width: 80, height: 80, resizeMode: 'contain', borderRadius: 20 }} 
                />
              </View>
              <Text style={styles.title}>BeHappyTalk Provider Login</Text>
              <Text style={styles.subtitle}>Manage your professional creator studio</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1111111111"
                  placeholderTextColor={Colors.textDim}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your secret key"
                    placeholderTextColor={Colors.textDim}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={Colors.textDim} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, loading && { opacity: 0.7 }]} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>Secure Login</Text>
                )}
              </TouchableOpacity>
              
              <Text style={styles.authToggle}>
                Don't have an account? Join BeHappyTalk Partner Hub
              </Text>
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBox: {
    backgroundColor: Colors.surface,
    padding: 32,
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 8,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(23, 115, 252, 0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDim,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bgDarker,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgDarker,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    color: Colors.text,
  },
  eyeBtn: {
    padding: 16,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  authToggle: {
    marginTop: 24,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const API_URL = 'https://provider.behappytalk.com';

type Step = 'phone' | 'otp' | 'name';
type Status = 'idle' | 'loading' | 'error';

const RESEND_SECONDS = 30;

export default function LoginScreen() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [step, setStep] = useState<Step>('phone');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const otpInputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('providerToken');
      const dataStr = await AsyncStorage.getItem('providerData');
      if (token && dataStr) {
        const data = JSON.parse(dataStr);
        if (data.verified === false) { router.replace('/setup'); } else { router.replace('/dashboard'); }
      } else {
        setIsCheckingAuth(false);
      }
    } catch (e) {
      setIsCheckingAuth(false);
    }
  };

  const otp = otpDigits.join('');

  const routeAfterAuth = (data: any) => {
    if (data.verified === false) { router.replace('/setup'); } else { router.replace('/dashboard'); }
  };

  const sendOtp = async () => {
    if (phone.length !== 10) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/provider/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Try again.');
        return;
      }
      setDevOtp(data.otp || '');
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
      setResendIn(RESEND_SECONDS);
      setStatus('idle');
      setTimeout(() => otpInputs.current[0]?.focus(), 300);
    } catch {
      setStatus('error');
      setErrorMsg('Network error — make sure the server is running.');
    }
  };

  const verifyOtp = async (code: string) => {
    if (code.length !== 6) {
      setErrorMsg('Enter the 6-digit code.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/provider/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Incorrect OTP. Please try again.');
        return;
      }
      if (data.isNewUser) {
        setStatus('idle');
        setStep('name');
        return;
      }
      await AsyncStorage.setItem('providerToken', data.token);
      await AsyncStorage.setItem('providerData', JSON.stringify(data));
      setStatus('idle');
      routeAfterAuth(data);
    } catch {
      setStatus('error');
      setErrorMsg('Network error — make sure the server is running.');
    }
  };

  const completeSignup = async () => {
    if (name.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/provider/otp/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong. Try again.');
        return;
      }
      await AsyncStorage.setItem('providerToken', data.token);
      await AsyncStorage.setItem('providerData', JSON.stringify(data));
      setStatus('idle');
      routeAfterAuth(data);
    } catch {
      setStatus('error');
      setErrorMsg('Network error — make sure the server is running.');
    }
  };

  const handleOtpChange = (text: string, idx: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    setErrorMsg('');

    if (digit && idx < 5) {
      otpInputs.current[idx + 1]?.focus();
    }
    const joined = next.join('');
    if (joined.length === 6) {
      verifyOtp(joined);
    }
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpInputs.current[idx - 1]?.focus();
    }
  };

  const goBackToPhone = () => {
    setStep('phone');
    setOtpDigits(['', '', '', '', '', '']);
    setDevOtp('');
    setErrorMsg('');
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isLoading = status === 'loading';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.loginBox}>
            <View style={styles.header}>
              <View style={{ marginBottom: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Image
                  source={require('../assets/icon.png')}
                  style={{ width: 80, height: 80, resizeMode: 'contain', borderRadius: 20 }}
                />
              </View>
              <Text style={styles.title}>BeHappyTalk Provider</Text>
              <Text style={styles.subtitle}>
                {step === 'phone' && "Manage your professional creator studio"}
                {step === 'otp' && `Enter the 6-digit code sent to +91 ${phone}`}
                {step === 'name' && "You're new here — what should we call you?"}
              </Text>
            </View>

            <View style={styles.formContainer}>
              {step === 'phone' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>PHONE NUMBER</Text>
                    <View style={styles.phoneRow}>
                      <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="10-digit number"
                        placeholderTextColor={Colors.textDim}
                        value={phone}
                        onChangeText={t => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setErrorMsg(''); }}
                        keyboardType="phone-pad"
                        maxLength={10}
                        autoFocus
                      />
                    </View>
                  </View>

                  {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                    onPress={sendOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.loginButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.helperText}>
                    We'll send a one-time code to log in or join as a provider — no password needed.
                  </Text>
                </>
              )}

              {step === 'otp' && (
                <>
                  <TouchableOpacity onPress={goBackToPhone} style={styles.backRow}>
                    <Text style={styles.backRowText}>← Change Number</Text>
                  </TouchableOpacity>

                  {!!devOtp && (
                    <View style={styles.devBanner}>
                      <Text style={styles.devBannerText}>Dev mode — no SMS sent yet. Your code: {devOtp}</Text>
                    </View>
                  )}

                  <View style={styles.otpRow}>
                    {otpDigits.map((d, idx) => (
                      <TextInput
                        key={idx}
                        ref={r => { otpInputs.current[idx] = r; }}
                        style={styles.otpBox}
                        value={d}
                        onChangeText={t => handleOtpChange(t, idx)}
                        onKeyPress={e => handleOtpKeyPress(e, idx)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectionColor={Colors.primary}
                      />
                    ))}
                  </View>

                  {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                    onPress={() => verifyOtp(otp)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.loginButtonText}>Verify & Continue</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={sendOtp} disabled={resendIn > 0 || isLoading} style={styles.resendRow}>
                    <Text style={[styles.resendText, resendIn > 0 && { opacity: 0.4 }]}>
                      {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'name' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>FULL NAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Priya Sharma"
                      placeholderTextColor={Colors.textDim}
                      value={name}
                      onChangeText={t => { setName(t); setErrorMsg(''); }}
                      autoCapitalize="words"
                      autoFocus
                    />
                  </View>

                  {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                    onPress={completeSignup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.loginButtonText}>Create Provider Account</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
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
  content: {
    flexGrow: 1,
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
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  countryCode: {
    backgroundColor: Colors.bgDarker,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    height: 52,
  },
  countryCodeText: { color: Colors.text, fontSize: 15, fontWeight: '600' },

  backRow: { marginBottom: 16 },
  backRowText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otpBox: {
    width: 46, height: 54, borderRadius: 12, backgroundColor: Colors.bgDarker,
    borderWidth: 1, borderColor: Colors.border, color: Colors.text,
    fontSize: 22, fontWeight: '700', textAlign: 'center'
  },

  devBanner: { backgroundColor: 'rgba(23, 115, 252, 0.08)', borderWidth: 1, borderColor: 'rgba(23, 115, 252, 0.25)', borderRadius: 10, padding: 10, marginBottom: 16 },
  devBannerText: { color: Colors.primary, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  resendRow: { alignItems: 'center', marginTop: 4 },
  resendText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },

  errorText: { color: Colors.danger, fontSize: 13, marginBottom: 16, textAlign: 'center', lineHeight: 18 },

  helperText: { color: Colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },

  loginButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

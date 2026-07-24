import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Image, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
  ScrollView, Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { saveUser } from '../hooks/useAuth';
import { API_URL, secureFetch } from '../constants/ServerConfig';

const { width } = Dimensions.get('window');

const slides = [
  {
    title: 'Judgement Free Zone!',
    subtitle: 'Talk with people who get you',
    image: require('../assets/images/girl_smiling_1775250936696.png'),
  },
  {
    title: 'Anonymous & 100% Safe',
    subtitle: 'Safe space to share your feelings',
    image: require('../assets/images/guy_smiling_1775250920976.png'),
  },
  {
    title: 'Feel Better in 10 Mins',
    subtitle: "You're never alone, we're here",
    image: require('../assets/images/girl_smiling_1775250936696.png'),
  },
];

type Step = 'phone' | 'otp';
type Mode = 'otp' | 'password';
type Status = 'idle' | 'loading' | 'error';

const RESEND_SECONDS = 30;

export default function Login() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [step, setStep] = useState<Step>('phone');
  const [mode, setMode] = useState<Mode>('otp');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const otpInputs = useRef<Array<TextInput | null>>([]);

  // Carousel auto-cycle
  useEffect(() => {
    const t = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
      setSlide(p => (p + 1) % slides.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const otp = otpDigits.join('');

  const sendOtp = async () => {
    if (phone.length !== 10) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await secureFetch(`${API_URL}/otp/send`, {
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
      const res = await secureFetch(`${API_URL}/otp/verify`, {
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
        router.replace({ pathname: '/signup', params: { phone } });
        return;
      }
      await saveUser({ id: data.id, name: data.name, phone: data.phone, email: data.email, token: data.token });
      setStatus('idle');
      router.replace('/home');
    } catch {
      setStatus('error');
      setErrorMsg('Network error — make sure the server is running.');
    }
  };

  const loginWithPassword = async () => {
    if (phone.length !== 10) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setErrorMsg('Enter your password.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await secureFetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Incorrect phone or password.');
        return;
      }
      await saveUser({ id: data.id, name: data.name, phone: data.phone, email: data.email, token: data.token });
      setStatus('idle');
      router.replace('/home');
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

  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword('');
    setErrorMsg('');
  };

  const cur = slides[slide];
  const isLoading = status === 'loading';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Carousel */}
      <View style={styles.topSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>BeHappyTalk</Text>
        </View>
        <Animated.View style={[styles.carouselInner, { opacity: fadeAnim }]}>
          <Text style={styles.slideTitle}>{cur.title}</Text>
          <Text style={styles.slideSubtitle}>{cur.subtitle}</Text>
          <Image source={cur.image} style={styles.heroImage} resizeMode="cover" />
        </Animated.View>
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, slide === i && styles.activeDot]} />
          ))}
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {step === 'phone' && (
            <>
              <Text style={styles.stepTitle}>Welcome Back</Text>
              <Text style={styles.stepSubtitle}>
                {mode === 'otp' ? "We'll send you a one-time code to log in." : 'Log in with your phone and password.'}
              </Text>

              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    placeholder="10-digit number"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={t => { setPhone(t.replace(/\D/g, '')); setErrorMsg(''); }}
                    selectionColor="#FACC15"
                    autoFocus
                  />
                </View>
              </View>

              {mode === 'password' && (
                <View style={styles.fieldWrapper}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1 }]}
                      placeholder="Your password"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={t => { setPassword(t); setErrorMsg(''); }}
                      selectionColor="#FACC15"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.45)" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : <View style={{ height: 16 }} />}

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={mode === 'otp' ? sendOtp : loginWithPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.submitBtnText}>{mode === 'otp' ? 'Send OTP' : 'Log In'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => switchMode(mode === 'otp' ? 'password' : 'otp')} style={styles.switchModeRow}>
                <Text style={styles.switchModeText}>
                  {mode === 'otp' ? 'Login with password instead' : 'Login with OTP instead'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/signup')} style={styles.switchModeRow}>
                <Text style={styles.switchModeText}>New here? <Text style={styles.termsLink}>Create an account</Text></Text>
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </>
          )}

          {step === 'otp' && (
            <>
              <TouchableOpacity onPress={goBackToPhone} style={styles.backRow}>
                <Text style={styles.backRowText}>← Change Number</Text>
              </TouchableOpacity>

              <Text style={styles.stepTitle}>Verify Your Number</Text>
              <Text style={styles.stepSubtitle}>Enter the 6-digit code sent to +91 {phone}</Text>

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
                    selectionColor="#FACC15"
                  />
                ))}
              </View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : <View style={{ height: 16 }} />}

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={() => verifyOtp(otp)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={sendOtp} disabled={resendIn > 0 || isLoading} style={styles.resendRow}>
                <Text style={[styles.resendText, resendIn > 0 && { opacity: 0.4 }]}>
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  topSection: { flex: 1, paddingTop: 56, paddingHorizontal: 24 },
  logoBox: { alignSelf: 'flex-start', marginBottom: 32 },
  logoText: { color: 'rgba(255,255,255,0.92)', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  carouselInner: { flex: 1 },
  slideTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  slideSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },
  heroImage: { position: 'absolute', bottom: 0, right: -20, width: width * 0.65, height: width * 0.75 },
  pagination: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  activeDot: { width: 20, backgroundColor: '#FACC15', borderRadius: 3 },

  bottomSheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '68%',
  },

  stepTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  stepSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24, lineHeight: 20 },

  backRow: { marginBottom: 16 },
  backRowText: { color: '#FACC15', fontSize: 14, fontWeight: '600' },

  fieldWrapper: { marginBottom: 16 },
  fieldLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 6, marginLeft: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: '#111111', borderRadius: 10, height: 50,
    paddingHorizontal: 14, color: 'rgba(255,255,255,0.92)', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
  },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  countryCode: {
    backgroundColor: '#111111', borderRadius: 10, height: 50,
    paddingHorizontal: 14, justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
  },
  countryCodeText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600' },

  passwordRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
  },
  eyeBtn: { paddingHorizontal: 12 },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  otpBox: {
    width: 46, height: 54, borderRadius: 10, backgroundColor: '#111111',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff',
    fontSize: 22, fontWeight: '700', textAlign: 'center'
  },

  devBanner: { backgroundColor: 'rgba(250, 204, 21, 0.1)', borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.3)', borderRadius: 10, padding: 10, marginBottom: 16 },
  devBannerText: { color: '#FACC15', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  resendRow: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  resendText: { color: '#FACC15', fontSize: 13, fontWeight: '700' },

  switchModeRow: { alignItems: 'center', marginBottom: 12 },
  switchModeText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' },

  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center', lineHeight: 18 },

  submitBtn: {
    backgroundColor: '#FACC15', borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#000000', fontSize: 16, fontWeight: '800' },

  termsText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#FACC15' },
});

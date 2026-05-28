import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Image, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
  ScrollView, Animated
} from 'react-native';
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

type Mode = 'login' | 'signup';
type Status = 'idle' | 'loading' | 'error';

export default function Login() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState<Mode>('login');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Form fields
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrorMsg('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  const validate = (): string | null => {
    if (phone.length < 10) return 'Enter a valid 10-digit mobile number.';
    if (mode === 'signup' && name.trim().length < 2) return 'Please enter your full name.';
    if (password.length < 4) return 'Password must be at least 4 characters.';
    if (mode === 'signup' && password !== confirmPassword)
      return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setErrorMsg(err); return; }

    setStatus('loading');
    setErrorMsg('');

    const endpoint = mode === 'signup' ? 'register' : 'login';
    const body: any = { phone: '+91' + phone, password };
    if (mode === 'signup') body.name = name.trim();

    try {
      const res = await secureFetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        if (res.status === 400) setErrorMsg('Phone number already registered. Please log in.');
        else if (res.status === 404) setErrorMsg('Account not found. Please sign up first.');
        else if (res.status === 401) setErrorMsg('Incorrect password. Please try again.');
        else setErrorMsg(data.error || 'Something went wrong. Try again.');
        return;
      }

      await saveUser({ id: data.id, name: data.name, phone: data.phone, token: data.token });
      setStatus('idle');
      router.replace('/home');
    } catch {
      setStatus('error');
      setErrorMsg('Network error — make sure the server is running.');
    }
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
        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.activeTab]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'signup' && styles.activeTab]}
            onPress={() => switchMode('signup')}
          >
            <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Name — signup only */}
          {mode === 'signup' && (
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Your Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Ansh Sharma"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                selectionColor="#FACC15"
              />
            </View>
          )}

          {/* Phone */}
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
                onChangeText={setPhone}
                selectionColor="#FACC15"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>{mode === 'signup' ? 'Create Password' : 'Password'}</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                placeholder="Min 4 characters"
                placeholderTextColor="rgba(255,255,255,0.25)"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                selectionColor="#FACC15"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password — signup only */}
          {mode === 'signup' && (
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  placeholder="Re-enter password"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  selectionColor="#FACC15"
                />
                <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error */}
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : (
            <View style={{ height: 16 }} />
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Log In Securely' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'signup' && (
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
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
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '62%',
  },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#111111',
    borderRadius: 12, padding: 4, marginBottom: 24
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  activeTab: { backgroundColor: '#FACC15' },
  tabText: { color: 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#000000', fontWeight: '700' },

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
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { width: 42, height: 50, justifyContent: 'center', alignItems: 'center' },
  eyeText: { fontSize: 18 },

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

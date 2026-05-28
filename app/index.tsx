import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { loadUser } from '../hooks/useAuth';

export default function Splash() {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const runAnimation = (toValue: number, duration: number, cb?: () => void) => {
    Animated.timing(fadeAnim, { toValue, duration, useNativeDriver: true }).start(cb);
  };

  useEffect(() => {
    // Phase 0: sad face fades in
    runAnimation(1, 500);

    const t1 = setTimeout(() => {
      runAnimation(0, 300, () => {
        setPhase(1);
        runAnimation(1, 500);
      });
    }, 1500);

    const t2 = setTimeout(() => {
      runAnimation(0, 300, () => {
        setPhase(2);
        runAnimation(1, 500);
      });
    }, 3500);

    const t3 = setTimeout(async () => {
      runAnimation(0, 400);
      // Check if user is already logged in
      const existing = await loadUser();
      setTimeout(() => {
        if (existing) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      }, 400);
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {phase === 0 && <Text style={styles.faceText}>:(</Text>}
        {phase === 1 && <Text style={styles.faceText}>:)</Text>}
        {phase === 2 && (
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>BeHappyTalk</Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.anonymousText}>Anonymous</Text>
        <View style={styles.footerLinks}>
          <Text style={styles.linkText}>Chat</Text>
          <View style={styles.separator} />
          <Text style={styles.linkText}>Call</Text>
          <View style={styles.separator} />
          <Text style={styles.linkText}>V Call</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: '50%',
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  faceText: { color: 'rgba(255,255,255,0.92)', fontSize: 64, fontWeight: 'bold' },
  logoBox: { borderWidth: 2, borderColor: '#FACC15', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  logoText: { color: 'rgba(255,255,255,0.92)', fontSize: 32, fontWeight: 'bold', letterSpacing: 0.5 },
  footer: { alignItems: 'center', gap: 12 },
  anonymousText: { color: '#FACC15', fontSize: 16, fontWeight: '500' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600' },
  separator: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.25)' },
});

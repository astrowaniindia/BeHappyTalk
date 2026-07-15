import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

const Colors = {
  primary: '#1773fc',
  bg: '#f1f5f9',
};

// Signup is now part of the unified OTP flow on the login screen —
// this route just exists so old links/deep-links don't dead-end.
export default function SignupScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

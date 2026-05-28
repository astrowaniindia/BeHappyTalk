import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LanguageProvider } from '../hooks/useLanguage';

// Global Fetch Bypass for localtunnel & ngrok warning screens
const originalFetch = global.fetch;
global.fetch = function (input: any, init?: any) {
  const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
  if (url.includes('loca.lt') || url.includes('ngrok')) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      init.headers.set('bypass-tunnel-reminder', 'true');
      init.headers.set('ngrok-skip-browser-warning', 'true');
    } else if (Array.isArray(init.headers)) {
      init.headers.push(['bypass-tunnel-reminder', 'true']);
      init.headers.push(['ngrok-skip-browser-warning', 'true']);
    } else {
      init.headers['bypass-tunnel-reminder'] = 'true';
      init.headers['ngrok-skip-browser-warning'] = 'true';
    }
  }
  return originalFetch(input, init);
};

export default function RootLayout() {
  return (
    <LanguageProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="home" />
        <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="search" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="care" />
        <Stack.Screen name="offers" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="safety" />
        <Stack.Screen name="child-safety" />
        <Stack.Screen name="report-vulnerability" />
      </Stack>
    </LanguageProvider>
  );
}

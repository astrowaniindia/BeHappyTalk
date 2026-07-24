import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const AUTH_KEY = 'behappytalk_user';

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  token?: string;
  profileImage?: string;
};

let _globalUser: AuthUser | null = null;
const _listeners: Array<(u: AuthUser | null) => void> = [];

function notify(u: AuthUser | null) {
  _globalUser = u;
  _listeners.forEach(fn => fn(u));
}

export async function saveUser(user: AuthUser) {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  notify(user);
}

export async function clearUser() {
  await AsyncStorage.removeItem(AUTH_KEY);
  notify(null);
}

export async function loadUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    _globalUser = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(_globalUser);

  useEffect(() => {
    // Subscribe to changes
    _listeners.push(setUser);

    // On mount, load from storage if not already loaded
    if (!_globalUser) {
      loadUser().then(u => {
        if (u) notify(u);
      });
    }

    return () => {
      const idx = _listeners.indexOf(setUser);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }, []);

  return { user };
}

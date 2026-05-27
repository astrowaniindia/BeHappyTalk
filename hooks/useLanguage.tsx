import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'hi';

interface LanguageContextProps {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps>({
  language: 'en',
  toggleLanguage: () => {},
  t: (key: string) => key,
});

const translations = {
  en: {
    communicate: 'Communicate',
    userCare: 'User Care',
    settings: 'Settings',
    deleteAccount: 'Delete Account',
    usage: 'Usage',
    logout: 'Logout',
    search: 'Search listeners...',
    verified: 'Verified',
    inbox: 'Inbox',
    recentlyContacted: 'Recently Contacted',
    talkNow: 'TALK NOW',
    noMessages: 'No messages yet.\nStart chatting with a listener!',
    myProfile: 'My Profile',
    changeLanguage: 'Switch to Hindi (हिंदी)'
  },
  hi: {
    communicate: 'संपर्क करें',
    userCare: 'उपयोगकर्ता सहायता',
    settings: 'सेटिंग्स',
    deleteAccount: 'खाता हटाएं',
    usage: 'उपयोग',
    logout: 'लॉग आउट',
    search: 'श्रोताओं को खोजें...',
    verified: 'सत्यापित',
    inbox: 'इनबॉक्स',
    recentlyContacted: 'हाल ही में संपर्क किया',
    talkNow: 'अभी बात करें',
    noMessages: 'अभी तक कोई संदेश नहीं।\nकिसी श्रोता से बात करना शुरू करें!',
    myProfile: 'मेरी प्रोफाइल',
    changeLanguage: 'Switch to English'
  }
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem('appLanguage').then(val => {
      if (val === 'hi' || val === 'en') {
        setLanguage(val as Language);
      }
    });
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    setLanguage(newLang);
    AsyncStorage.setItem('appLanguage', newLang);
  };

  const t = (key: string) => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

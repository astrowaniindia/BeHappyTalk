import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Share, Dimensions, Alert, Clipboard } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

const { width } = Dimensions.get('window');

export default function ReferScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const referralCode = "BHT-X9A2K4"; // Dummy code for now

  const copyToClipboard = () => {
    Clipboard.setString(referralCode);
    Alert.alert("Copied!", "Referral code copied to clipboard.");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join BeHappyTalk using my referral code ${referralCode} and get ₹250 bonus! Download now: https://behappytalk.com/app`,
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: "Refer a friend",
          headerStyle: { backgroundColor: '#FFD700' },
          headerTintColor: '#000',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          )
        }} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image 
            source={require('../assets/images/refer_earn_banner.png')} 
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* Amount Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>Get ₹250</Text>
          </View>
          <Text style={styles.subtext}>For every new user you refer</Text>
        </View>

        {/* Code Box */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Your Referral Code : {referralCode}</Text>
          <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <Text style={styles.shareText}>Share your referral code and get a bonus up to ₹5000</Text>

        {/* Social Icons */}
        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialIcon} onPress={handleShare}>
            <FontAwesome name="facebook-square" size={40} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon} onPress={handleShare}>
            <FontAwesome name="telegram" size={40} color="#0088cc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon} onPress={handleShare}>
            <Ionicons name="share-social" size={40} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Whatsapp Button */}
        <TouchableOpacity style={styles.whatsappButton} onPress={handleShare}>
          <FontAwesome name="whatsapp" size={24} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.whatsappText}>Refer Via Whatsapp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.haveCodeBtn}>
          <Text style={styles.haveCodeText}>Have a referral code?</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termText}>1. Your friend must sign up on BeHappyTalk using your referral code.</Text>
          <Text style={styles.termText}>2. You will receive the reward after your friend's first wallet recharge or call.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#E0F2FE',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: -20,
  },
  amountBadge: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  subtext: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    fontWeight: '500',
  },
  codeContainer: {
    backgroundColor: '#FDE68A',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  copyButton: {
    padding: 4,
  },
  shareText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 30,
  },
  socialIcon: {
    padding: 8,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  whatsappText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  haveCodeBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  haveCodeText: {
    color: '#EC4899',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  termsContainer: {
    paddingHorizontal: 20,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  termText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 10,
    lineHeight: 20,
  }
});

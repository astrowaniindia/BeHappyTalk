import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last updated: 5/28/2026</Text>
        
        <Text style={styles.heading}>Data We Collect and Usage</Text>
        <Text style={styles.paragraph}>BeHappyTalk asks for User's personal information (email, demographic location and address, age, name, sex, phone number, preference in partner selection, payment details, personality facets, interests) when the User registers with the Site. All information collected at the Site to become a Registered User is obtained purely for providing the Services and to improve the quality of your experience.</Text>
        <Text style={styles.paragraph}>The User information collected at the Site is of two categories: Personally Identifiable Information and Non-Personally Identifiable Information. BeHappyTalk uses the information collected at the Site for providing high quality Services and suggesting and recommending matches best suited for the User, processing payments, assessing User preference and compatibility aspects.</Text>

        <Text style={styles.heading}>Sources of Data Collection</Text>
        <Text style={styles.paragraph}>The information the User provides at the Site may come to BeHappyTalk through the following sources:</Text>
        <Text style={styles.bulletItem}>• Log Files: Every time the User visits the Site, BeHappyTalk servers automatically gather information from the User browser (such as IP addresses, browser type, Internet service provider, referring/exit pages, platform type, date/time stamp, and number of clicks).</Text>
        <Text style={styles.bulletItem}>• Cookies: Small files placed on User's computer which allow BeHappyTalk to count the number of visitors and distinguish repeat visitors from new visitors. Cookies allow BeHappyTalk to save user preferences and track user trends.</Text>
        <Text style={styles.bulletItem}>• Web Beacons: Small transparent graphic images often used in conjunction with cookies to further personalize the Site for Users.</Text>
        <Text style={styles.bulletItem}>• Mobile Analytics: Mobile analytics software to better understand the functionality of our mobile software on User's phone.</Text>
        <Text style={styles.bulletItem}>• User Profile Information: When the User is a Registered User, BeHappyTalk collects a wide variety of information about the User including answers to the Compatibility Assessment.</Text>
        <Text style={styles.bulletItem}>• Payment Information: To process payments, BeHappyTalk may require User name, address, phone number, email address and credit card information. BeHappyTalk does not store credit card information — all transactions are processed by authorized payment gateways.</Text>

        <Text style={styles.heading}>Disclosure of Your Information</Text>
        <Text style={styles.paragraph}>For providing the Services, BeHappyTalk will disclose User profile information and verification results to recommended/suggested matches. Photos and other profile information posted by User will be available for viewing.</Text>
        <Text style={styles.paragraph}>BeHappyTalk may disclose information if required to do so by law, at the request of a third party, or if in BeHappyTalk's sole discretion, believes that disclosure is reasonable to comply with law, protect BeHappyTalk's rights, or protect someone's health or safety.</Text>

        <Text style={styles.heading}>Information Sharing</Text>
        <Text style={styles.paragraph}>BeHappyTalk does not rent, sell or share any personal or sensitive information of User other than as mentioned in this Privacy Policy, with any third party.</Text>

        <Text style={styles.heading}>Opt-out Provisions</Text>
        <Text style={styles.paragraph}>User has the right to opt-in or opt-out of any marketing/promotional/newsletter mailings. At User's request, BeHappyTalk can cancel User registration and remove/block personally identifiable information from its database. You can contact our support team at care@BeHappyTalk.com through your registered email address with a request to delete your data from our records.</Text>

        <Text style={styles.heading}>Security Practices</Text>
        <Text style={styles.paragraph}>BeHappyTalk follows stringent security techniques and requirements for handling sensitive and personal information. These techniques and requirements are fully compliant with the guidelines set forth under law. BeHappyTalk servers are accessible only to authorized personnel. All representatives handling information under these provisions are under contractual confidentiality obligation with BeHappyTalk.</Text>

        <Text style={styles.heading}>Links to Other Sites</Text>
        <Text style={styles.paragraph}>BeHappyTalk is not responsible for the privacy policies or practices or the content of any other websites that may provide access to, or be linked to or from, this Site. Users are encouraged to review the policies and practices of such sites.</Text>

        <Text style={styles.heading}>Contact Us</Text>
        <Text style={styles.paragraph}>If you have any questions or concerns about this Privacy Policy, please contact us at care@BeHappyTalk.com</Text>
        <Text style={styles.paragraph}>By registering with the Site and consenting to our Terms and Conditions, User agrees and confirms consent to providing BeHappyTalk this information, which is lawful, necessary and permissible.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  lastUpdated: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  heading: {
    color: '#FACC15',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  subHeading: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  bulletItem: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 10,
  },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last updated: 5/28/2026</Text>
        
        <Text style={styles.paragraph}>These Terms and Conditions are a legal and binding Agreement between You ("the User") and NEXETERN (hereinafter referred to as "BeHappyTalk"). Terms and Conditions state the grounds on which the User can use and/or register with this BeHappyTalk.com ("Site"/"Website"/"Us"/"We"/"Our"/"BeHappyTalk"). Terms and Conditions are updated from time to time at Our sole discretion and the most updated version is available on the Site at all times. Continued use by the User of the Site after any revision indicates the User's acceptance of the updated Terms and Conditions.</Text>
        
        <Text style={styles.paragraph}>By accessing the Site, and using the Services as offered in this Site, You become the User and become bound by, the terms and conditions of this Agreement and other Policies of BeHappyTalk for as long as You continue to use/visit the Site or Services. IF YOU DO NOT AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS, DO NOT USE OR REGISTER WITH THE SITE OR FOR THE SERVICES.</Text>

        <Text style={styles.heading}>1. Eligibility</Text>
        <Text style={styles.subHeading}>Minimum Age</Text>
        <Text style={styles.paragraph}>User of the Site must be at least 18 years old to use or to register at the Site for the Services. By using the Services on the Site, the User represents and warrants that he/she is a minimum 18 years old.</Text>
        
        <Text style={styles.subHeading}>Marital Status</Text>
        <Text style={styles.paragraph}>By requesting to use, registering to use, or using the Services, the User represents and warrants that the User is not married or is divorced.</Text>
        
        <Text style={styles.subHeading}>Criminal History</Text>
        <Text style={styles.paragraph}>By requesting to use, registering to use, and/or using the Service, the User represents and warrants that the User has never been convicted under any applicable law. BeHappyTalk reserves the right to conduct a criminal background check, at any time and using available public records.</Text>
        
        <Text style={styles.subHeading}>Verification</Text>
        <Text style={styles.paragraph}>By agreeing to the Terms and Conditions, User hereby authorises BeHappyTalk (and its third party authentication agency) to conduct verification checks on the User. The verification process is critical for receiving the complete set of Services offered at the Site.</Text>

        <Text style={styles.heading}>2. Use of Site and Service</Text>
        <Text style={styles.paragraph}>As a User of the Site or a Registered User, the User agrees to the following:</Text>
        <Text style={styles.bulletItem}>• Exclusive Use: The account with the Site is for the User's personal use only. The User may not authorize others to use the account.</Text>
        <Text style={styles.bulletItem}>• Geographic Limitations: The Site and Services are currently intended for Users within India.</Text>
        <Text style={styles.bulletItem}>• Information Submitted: The User is solely responsible for the information and content provided at the Site for the Service.</Text>
        <Text style={styles.bulletItem}>• Risk Assumption: All risks when using the Services and the Site remain with the User.</Text>
        <Text style={styles.bulletItem}>• No Guarantees: BeHappyTalk does not make any representations or guarantees regarding the number or frequency of matches through the Service.</Text>
        <Text style={styles.bulletItem}>• No Tolerance for Objectionable Content: Abuse, trolling, inappropriate and objectionable content are an immediate violation of the Terms of Use.</Text>
        <Text style={styles.bulletItem}>• No False Information: By registering with the Site, the User undertakes not to provide inaccurate, misleading or false information to BeHappyTalk or to any other user.</Text>
        <Text style={styles.bulletItem}>• No Advertising or Commercial Solicitation: The User undertakes not to advertise or solicit any user to buy or sell any products or services through the Site.</Text>
        <Text style={styles.bulletItem}>• Single Bona Fide Profile: As a Registered User, the User is expected to create only one bona fide profile for genuine relationship-seeking purposes.</Text>

        <Text style={styles.heading}>3. Proprietary Rights</Text>
        <Text style={styles.paragraph}>The User confirms and agrees that BeHappyTalk is the owner of highly valuable proprietary information, including without limitation, the patented compatibility matching system, compatibility profiles, and Personality Assessment. BeHappyTalk owns and hereby retains all proprietary rights in the Services, the information provided in the Site and the Site.</Text>

        <Text style={styles.heading}>4. Subscription and Payment</Text>
        <Text style={styles.paragraph}>BeHappyTalk offers both free and paid subscription plans. The free plan includes 11 days of access. Paid plans unlock full features including unlimited messaging, voice calls, and priority matching. All payments are processed through authorized payment gateways. Subscription plans are non-refundable unless otherwise stated.</Text>

        <Text style={styles.heading}>5. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>BeHappyTalk provides its Services on an "as is" and "as available" basis without any warranties of any kind, whether express or implied. BeHappyTalk does not warrant that the Services will be uninterrupted, error-free, or free of viruses or other harmful components.</Text>

        <Text style={styles.heading}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>BeHappyTalk shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from User's access to or use of, or inability to access or use, the Services or any content on the Site.</Text>

        <Text style={styles.heading}>7. Governing Law</Text>
        <Text style={styles.paragraph}>These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of India.</Text>

        <Text style={styles.heading}>8. Contact</Text>
        <Text style={styles.paragraph}>If you have any questions about these Terms and Conditions, please contact us at care@BeHappyTalk.com</Text>

        <Text style={styles.paragraph}>By using BeHappyTalk.com, you agree to these Terms and Conditions. These terms were last updated on May 28, 2026.</Text>
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

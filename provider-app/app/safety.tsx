import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SafetyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A2A44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety & Guidelines</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last updated: May 15, 2026</Text>
        
        <Text style={styles.paragraph}>We are committed to free expression, and we believe everyone is best served when everyone has a voice. We believe a rich diversity of viewpoints and experiences enriches our entire community. In order to protect the experience and safety of our users, however, there are some limitations on the type of content and behavior that we allow.</Text>
        <Text style={styles.paragraph}>If you see something on BeHappyTalk that you believe violates our policies, please report it to us. This Content and Conduct Policy is part of our Terms & Conditions.</Text>

        <Text style={styles.heading}>Content and Conduct Guidelines</Text>

        <Text style={styles.subHeading}>1. Adult Content</Text>
        <Text style={styles.paragraph}>You may not post or stream adult content, which we consider to be any media that is pornographic and/or may be intended to cause sexual arousal. This includes full or partial nudity, obscene gestures, simulating sexual acts, or any sexual content.</Text>

        <Text style={styles.subHeading}>2. Graphic Violence</Text>
        <Text style={styles.paragraph}>You may not post or stream graphically violent or gratuitously gory content, which we consider any media that depicts death, violence, surgical procedures or serious injury to humans or animals in graphic detail.</Text>

        <Text style={styles.subHeading}>3. Dangerous Activities or Products</Text>
        <Text style={styles.paragraph}>You may not post or stream content that depicts dangerous activities or products, including promotion of self-harm, suicide, eating disorders, dangerous contests, dangerous controlled substances, or streaming while driving.</Text>

        <Text style={styles.subHeading}>4. Illegal or Regulated Goods and Services</Text>
        <Text style={styles.paragraph}>You may not post or stream content depicting illegal or regulated goods and services including counterfeit goods, human trafficking, drugs, financial instruments, gambling, weapons, stolen goods, or prostitution or sexual services.</Text>

        <Text style={styles.subHeading}>5. Unlawful Use</Text>
        <Text style={styles.paragraph}>You may not use BeHappyTalk for any unlawful purposes or to further illegal activities. By using BeHappyTalk, you agree to comply with all applicable laws governing your online conduct and content.</Text>

        <Text style={styles.subHeading}>6. Intellectual Property</Text>
        <Text style={styles.paragraph}>You may not post or stream content that you do not have a right to make available, or that infringes any patent, trademark, trade secret, copyright, privacy, or other proprietary rights of any party.</Text>

        <Text style={styles.subHeading}>7. Unauthorized Use</Text>
        <Text style={styles.paragraph}>You may not post or stream another's voice or image without their permission. Accordingly, you may not post or stream any recordings or images of another person that were produced or distributed without their permission.</Text>

        <Text style={styles.subHeading}>8. Private Information</Text>
        <Text style={styles.paragraph}>You may not post or stream another person's private information without their permission, including photos, videos, and personally identifiable information, nor may you threaten to do so or encourage others to do so.</Text>

        <Text style={styles.subHeading}>9. Spam and Security</Text>
        <Text style={styles.paragraph}>You may not use BeHappyTalk for the purpose of spamming anyone. You may not register accounts or post content automatically, systematically, or programmatically. You may not upload or transmit software viruses, malware, or any other harmful computer code.</Text>

        <Text style={styles.subHeading}>10. Advertising</Text>
        <Text style={styles.paragraph}>You may not post or stream any unsolicited or unauthorized advertising, promotional materials, spam, chain letters, pyramid schemes or any other form of solicitation, or offer any unauthorized contest, giveaway, or sweepstakes.</Text>

        <Text style={styles.subHeading}>11. Impersonation</Text>
        <Text style={styles.paragraph}>You may not impersonate individuals, groups, or organizations in a manner that is intended to or does mislead, confuse, or deceive others.</Text>

        <Text style={styles.subHeading}>12. Violence and Physical Harm</Text>
        <Text style={styles.paragraph}>You may not make specific threats of violence or wish for the serious physical harm, death, or disease of an individual or group of people. You may not promote or encourage suicide or self-harm.</Text>

        <Text style={styles.subHeading}>13. Minors</Text>
        <Text style={styles.paragraph}>You may not post or stream content that contains minors (below the age of 18). BeHappyTalk is intended for adults only. We use age-verification measures designed to confirm that members are at least eighteen (18) years old.</Text>

        <Text style={styles.subHeading}>14. Child Endangerment or Sexual Exploitation</Text>
        <Text style={styles.paragraph}>You may not post or stream content that sexualizes minors or that promotes or glorifies child sexual exploitation. When we are made aware of such content we remove it without further notice and report it to The National Center for Missing & Exploited Children (NCMEC).</Text>

        <Text style={styles.subHeading}>15. Abusive Conduct</Text>
        <Text style={styles.paragraph}>You may not harass another person or incite other people to do so. You may not direct abuse at someone by sending unwanted sexual content, objectifying them in a sexually explicit manner, or otherwise engaging in sexual misconduct.</Text>

        <Text style={styles.subHeading}>16. Hateful Conduct and Bullying</Text>
        <Text style={styles.paragraph}>You may not promote violence against, threaten, or harass other people on the basis of race, religion, ethnicity, national origin, sexual orientation, gender, gender identity, age, disability, serious disease, veteran status, or any other protected characteristic.</Text>

        <Text style={styles.subHeading}>17. Termination/Suspension, Reporting and Appeals</Text>
        <Text style={styles.paragraph}>BeHappyTalk reviews reports of prohibited content or conduct using a combination of automated tools and human moderation. If a violation is identified, BeHappyTalk may remove the content, temporarily suspend the member's profile, or permanently terminate the member's account.</Text>

        <Text style={styles.subHeading}>18. Criminal Background and Screening</Text>
        <Text style={styles.paragraph}>BeHappyTalk does not generally conduct criminal background checks as a condition of membership. Users should refer to our Terms and Conditions for details on background checks and membership eligibility.</Text>

        <Text style={styles.heading}>Consequences of Violating the Content and Conduct Policy</Text>
        <Text style={styles.paragraph}>We impose a variety of penalties for violating our Content and Conduct Policy, including content removal, warnings, account suspensions of increasing duration, account removals from the BeHappyTalk platform, and notifying law enforcement and appropriate law enforcement agencies.</Text>
        <Text style={styles.paragraph}>To report illegal or inappropriate content, please contact us at care@BeHappyTalk.com</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#1A2A44',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  lastUpdated: {
    color: '#6B7A99',
    fontSize: 14,
    marginBottom: 20,
  },
  heading: {
    color: '#1A2A44',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  subHeading: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 6,
  },
  paragraph: {
    color: '#6B7A99',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
});




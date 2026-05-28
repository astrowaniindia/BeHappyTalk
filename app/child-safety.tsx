import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ChildSafetyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Safety</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Effective Date: 01/01/2025</Text>
        
        <Text style={styles.heading}>Definitions and Scope</Text>
        <Text style={styles.paragraph}>This policy applies to all users of BeHappyTalk and establishes strict guidelines to prevent child abuse, exploitation, and harm. For the purposes of this document:</Text>
        <Text style={styles.bulletItem}>• Child: Any individual under the age of 18.</Text>
        <Text style={styles.bulletItem}>• Abuse: Physical, emotional, or sexual mistreatment of a child.</Text>
        <Text style={styles.bulletItem}>• Exploitation: The use of a child for personal, financial, or other gain.</Text>
        <Text style={styles.bulletItem}>• Harm: Any action that negatively impacts a child's physical, emotional, or mental well-being.</Text>

        <Text style={styles.heading}>Age Restrictions</Text>
        <Text style={styles.bulletItem}>• BeHappyTalk is strictly for users aged 18 and above.</Text>
        <Text style={styles.bulletItem}>• Accounts suspected of being operated by minors will be suspended pending verification.</Text>

        <Text style={styles.heading}>Prohibited Conduct</Text>
        <Text style={styles.bulletItem}>• Engaging in any form of communication, content sharing, or solicitation involving minors.</Text>
        <Text style={styles.bulletItem}>• Grooming, coercion, or any attempt to exploit children in any way.</Text>
        <Text style={styles.bulletItem}>• Sharing, distributing, or requesting explicit content involving minors.</Text>
        <Text style={styles.bulletItem}>• Any conduct that facilitates child exploitation, whether intentional or unintentional.</Text>

        <Text style={styles.heading}>User Verification and Reporting</Text>
        <Text style={styles.bulletItem}>• All users are required to complete a secure identity verification process.</Text>
        <Text style={styles.bulletItem}>• Suspicious behavior should be reported through the in-app reporting system.</Text>
        <Text style={styles.bulletItem}>• Reports will be reviewed promptly, and necessary actions, including law enforcement notification, will be taken.</Text>

        <Text style={styles.heading}>Data Protection and Privacy</Text>
        <Text style={styles.paragraph}>Any report involving minors will be handled with strict confidentiality while ensuring legal compliance.</Text>

        <Text style={styles.heading}>Law Enforcement Collaboration</Text>
        <Text style={styles.bulletItem}>• BeHappyTalk cooperates fully with law enforcement agencies in investigations of child exploitation.</Text>
        <Text style={styles.bulletItem}>• Data and evidence related to potential violations will be provided to legal authorities as required.</Text>

        <Text style={styles.heading}>Penalties and Enforcement</Text>
        <Text style={styles.bulletItem}>• Any user found violating child safety policies will face immediate account suspension and a permanent ban.</Text>
        <Text style={styles.bulletItem}>• Cases involving child exploitation will be reported to law enforcement.</Text>
        <Text style={styles.bulletItem}>• Legal actions may be pursued against violators as per international law.</Text>

        <Text style={styles.heading}>Education and Awareness</Text>
        <Text style={styles.paragraph}>Regular updates will be made to strengthen security measures and enhance user awareness. This policy is enforceable worldwide and will be updated as necessary to comply with evolving international laws and best practices.</Text>
        <Text style={styles.paragraph}>By using BeHappyTalk, users agree to abide by this Child Safety Policy. Violations will be taken seriously and addressed immediately.</Text>

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

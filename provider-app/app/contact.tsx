import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function Contact() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📍 Get in Touch</Text>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Office Address</Text>
        <Text style={styles.text}>NEXETERN</Text>
        <Text style={styles.text}>BeHappyTalk.com</Text>
        <Text style={styles.text}>267/500, Pratap Nagar,</Text>
        <Text style={styles.text}>Jaipur – 302033,</Text>
        <Text style={styles.text}>Rajasthan, India</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.item}><Text style={styles.icon}>📞</Text> <Text style={styles.label}>Phone:</Text> +91-7414858885</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.item}><Text style={styles.icon}>✉️</Text> <Text style={styles.label}>Email:</Text> info@behappytalk.com</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 24,
  },
  item: {
    fontSize: 16,
    color: '#475569',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontWeight: '600',
    color: '#1e293b',
  }
});

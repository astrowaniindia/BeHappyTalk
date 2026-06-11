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
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    lineHeight: 24,
  },
  item: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontWeight: '600',
    color: '#FFFFFF',
  }
});

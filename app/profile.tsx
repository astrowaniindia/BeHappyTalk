import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../constants/ServerConfig';

const ProfileManager = () => {
  const { user } = useAuth(); // Assuming useAuth provides the logged-in user
  const token = user?.token;

  // ===== STATE MANAGEMENT =====
  const [profileData, setProfileData] = useState({
    bio: '',
    profileImage: '',
    languages: [],
    experience: '',
    expertise: [],
    demographic: { age: '', gender: '', location: '' },
    pricing: { chat: 0, audioCall: 0, videoCall: 0 }
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // ===== LOAD EXISTING PROFILE ON MOUNT =====
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id);
    }
  }, [user]);

  const fetchUserProfile = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          bio: data.bio || '',
          profileImage: data.profileImage || '',
          languages: data.languages || [],
          experience: data.experience || '',
          expertise: data.expertise || [],
          demographic: data.demographic || { age: '', gender: '', location: '' },
          pricing: data.pricing || { chat: 0, audioCall: 0, videoCall: 0 }
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== SAVE PROFILE TO BACKEND =====
  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User ID not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      setSuccess('');

      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      setSuccess('✅ Profile saved successfully!');
      Alert.alert('Success', 'Profile saved successfully!');
      
      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {success ? <Text style={styles.successText}>{success}</Text> : null}

      <Text style={styles.label}>About Me (BIO):</Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={4}
        value={profileData.bio}
        onChangeText={(text) => handleInputChange('bio', text)}
        placeholder="Describe your expertise..."
      />

      <Text style={styles.label}>Experience (E.G. 5+ YEARS):</Text>
      <TextInput
        style={styles.input}
        value={profileData.experience}
        onChangeText={(text) => handleInputChange('experience', text)}
        placeholder="e.g., 10+ years"
      />

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSaveProfile}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '⏳ SAVING...' : '✅ SAVE PROFILE'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1400',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1400',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#00D9FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  successText: {
    color: '#3c3',
    backgroundColor: '#efe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  }
});

export default ProfileManager;

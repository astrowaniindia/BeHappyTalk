import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  border: '#E2E8F0',
  bubbleProvider: '#1B76FF',
  bubbleUser: '#FFFFFF',
  success: '#10B981',
  overlay: 'rgba(0,0,0,0.6)',
};

const SOCKET_URL = 'https://provider.behappytalk.com';
const API_URL = 'https://provider.behappytalk.com/api';

function ChatImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="image-outline" size={32} color={Colors.textLight} />
        <Text style={{ color: Colors.textLight, fontSize: 12, marginTop: 6 }}>Image unavailable</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: '#E2E8F0' }}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams(); // user ID and Name
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let s: any;
    const init = async () => {
      const dataStr = await AsyncStorage.getItem('providerData');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        setProviderId(data.id);

        s = io(SOCKET_URL, { transports: ['websocket'] });
        setSocket(s);

        s.on('connect', () => {
          console.log('Chat Socket Connected');
          s.emit('join_chat', { providerId: data.id, userId: id });
        });

        s.on('receive_message', (msg: any) => {
          setMessages((prev) => [...prev, msg]);
          setIsSending(false);
          scrollToBottom();
        });

        s.on('session_ended', (data: any) => {
          console.log('Chat Session Ended', data);
          setEndReason(data.reason || 'User ended the chat');
          setSessionEnded(true);
          setIsSending(false);
        });

        // Try to fetch active session to get the proper sessionId
        try {
          const res = await fetch(`${API_URL}/user/${id}/active-session`);
          const sessionData = await res.json();
          if (sessionData && sessionData.id) {
            setSessionId(sessionData.id);
          }
        } catch (err) {
          console.error('Failed to fetch active session', err);
        }
        // Fetch historical messages
        try {
          const chatRes = await fetch(`${API_URL}/chat/${id}/${data.id}`);
          const chatData = await chatRes.json();
          if (Array.isArray(chatData)) {
            setMessages(chatData);
            setTimeout(scrollToBottom, 300);
          }
        } catch (err) {
          console.error('Failed to fetch chat history', err);
        }
      }
    };
    init();

    return () => {
      if (s) s.disconnect();
    };
  }, [id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleEndChat = async () => {
    if (!socket) return;
    
    let currentSessionId = sessionId;
    
    // If we don't have it locally, try fetching it one last time to be safe
    if (!currentSessionId) {
      try {
        const res = await fetch(`${API_URL}/user/${id}/active-session`);
        const sessionData = await res.json();
        if (sessionData && sessionData.id) {
          currentSessionId = sessionData.id;
        }
      } catch (err) {
        console.error('Failed to fetch active session on end', err);
      }
    }

    if (!currentSessionId) {
      console.warn('Could not find active session ID to end.');
      Alert.alert('Unable to End Chat', 'Could not find the active session. Please check your connection and try again.');
      return;
    }

    console.log('Emitting end_interaction for session:', currentSessionId);
    socket.emit('end_interaction', { sessionId: currentSessionId });
    setSessionEnded(true);
  };

  const sendMessage = () => {
    if (!inputText.trim() || !socket || !providerId) return;

    setIsSending(true);
    const newMsg = {
      userId: id,
      providerId: providerId,
      senderId: providerId,
      text: inputText.trim(),
    };

    socket.emit('send_message', newMsg);
    setInputText('');
    scrollToBottom();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setIsSending(true);
      try {
        const res = await fetch(`${API_URL}/chat/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image, senderId: providerId })
        });
        const data = await res.json();
        if (data.success && socket) {
          socket.emit('send_message', {
            userId: id,
            providerId,
            senderId: providerId,
            text: `[IMAGE]${data.url}`,
          });
        } else {
          Alert.alert('Upload Failed', data.error || 'Failed to upload image');
        }
      } catch (e) {
        console.error('Image upload failed', e);
      }
      setIsSending(false);
    }
  };

  const renderMessageContent = (text: string, isMine: boolean) => {
    if (text.startsWith('[IMAGE]')) {
      const url = text.replace('[IMAGE]', '');
      return <ChatImage url={url} />;
    }
    return <Text style={[styles.messageText, isMine ? styles.textProvider : styles.textUser]}>{text}</Text>;
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.senderId === providerId;

    return (
      <View style={[styles.messageWrapper, isMine ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleProvider : styles.bubbleUser]}>
          {renderMessageContent(item.text, isMine)}
        </View>
        <Text style={styles.timeText}>
          {new Date(item.timestamp || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{name || `User ${id}`}</Text>
          <Text style={styles.headerSubtitle}>Live Chat</Text>
        </View>
        <TouchableOpacity style={styles.endChatButton} onPress={handleEndChat}>
          <Text style={styles.endChatText}>End</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Send a message to start the conversation.</Text>
              </View>
            }
          />
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage} disabled={sessionEnded || isSending}>
            <Ionicons name="attach" size={28} color={Colors.textLight} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder={sessionEnded ? "Chat ended" : "Type a message..."}
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!sessionEnded}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || sessionEnded || isSending) && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || sessionEnded || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Session Ended Modal overlay */}
      {sessionEnded && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.modalTitle}>Chat Session Ended</Text>
            <Text style={styles.modalSubtitle}>
              The session was successfully closed. Your wallet balance has been updated with the earnings from this chat.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => router.back()}>
              <Text style={styles.modalButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 40, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { padding: 8 },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark },
  headerSubtitle: { fontSize: 12, color: Colors.success, fontWeight: '600', marginTop: 2 },
  endChatButton: { backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  endChatText: { color: '#EF4444', fontWeight: 'bold', fontSize: 14 },
  chatContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  messageWrapper: { marginBottom: 16, maxWidth: '80%' },
  messageWrapperLeft: { alignSelf: 'flex-start' },
  messageWrapperRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  bubbleProvider: { backgroundColor: Colors.bubbleProvider, borderBottomRightRadius: 4 },
  bubbleUser: { backgroundColor: Colors.bubbleUser, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  textProvider: { color: Colors.white },
  textUser: { color: Colors.textDark },
  timeText: { fontSize: 11, color: Colors.textLight, marginTop: 4, marginHorizontal: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  attachButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  textInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 45, maxHeight: 120, fontSize: 15, color: Colors.textDark },
  sendButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginBottom: 0 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textLight, fontSize: 14 },
  
  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent: { width: '85%', backgroundColor: Colors.white, borderRadius: 24, padding: 32, alignItems: 'center', elevation: 10 },
  modalIcon: { marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, marginBottom: 12 },
  modalSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  modalButton: { backgroundColor: Colors.primary, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' }
});

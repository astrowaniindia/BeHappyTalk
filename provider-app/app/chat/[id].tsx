import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const Colors = {
  primary: '#1B76FF',
  white: '#FFFFFF',
  textDark: '#1A2A44',
  textLight: '#6B7A99',
  background: '#F4F7FB',
  border: '#E2E8F0',
  bubbleProvider: '#1B76FF',
  bubbleUser: '#FFFFFF',
};

const SOCKET_URL = 'https://behappytalk-server-ipxj.onrender.com';

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // user ID
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

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
          scrollToBottom();
        });
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

  const sendMessage = () => {
    if (!inputText.trim() || !socket || !providerId) return;

    const newMsg = {
      userId: id,
      providerId: providerId,
      senderId: providerId,
      text: inputText,
    };

    socket.emit('send_message', newMsg);
    // Let the server echo it back via receive_message so we don't duplicate
    // Or we can add it optimistically, but server gives us back the inserted DB row.
    setInputText('');
    scrollToBottom();
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.senderId === providerId;

    return (
      <View style={[styles.messageWrapper, isMine ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleProvider : styles.bubbleUser]}>
          <Text style={[styles.messageText, isMine ? styles.textProvider : styles.textUser]}>
            {item.text}
          </Text>
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
          <Text style={styles.headerTitle}>User {id}</Text>
          <Text style={styles.headerSubtitle}>Live Chat</Text>
        </View>
        <TouchableOpacity style={styles.endChatButton} onPress={() => router.back()}>
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
            keyExtractor={(_, index) => index.toString()}
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
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  endChatButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endChatText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleProvider: {
    backgroundColor: Colors.bubbleProvider,
    borderBottomRightRadius: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.bubbleUser,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textProvider: {
    color: Colors.white,
  },
  textUser: {
    color: Colors.textDark,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    marginHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 45,
    maxHeight: 120,
    fontSize: 15,
    color: Colors.textDark,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: Colors.textLight,
    fontSize: 14,
  },
});

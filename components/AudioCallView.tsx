import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface AudioCallViewProps {
  localStream: any;
  remoteStream: any;
  isConnected: boolean;
  onEnd: () => void;
  callerName: string;
  timeLeft?: number | null;
  isUnlimited?: boolean;
  walletBalance?: number | null;
}

export default function AudioCallView({
  localStream,
  remoteStream,
  isConnected,
  onEnd,
  callerName,
  timeLeft,
  isUnlimited,
  walletBalance,
}: AudioCallViewProps) {
  const [isMuted, setIsMuted] = useState(false);

  // ── Track controls ────────────────────────────────────────────────────────

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const m = Math.floor(absSeconds / 60).toString().padStart(2, '0');
    const s = (absSeconds % 60).toString().padStart(2, '0');
    return isUnlimited ? `+${m}:${s}` : `${m}:${s}`;
  };

  const showTimer = isConnected && timeLeft !== undefined && timeLeft !== null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── Audio-call avatar screen ─────────────────────────── */}
      <View style={styles.waitingScreen}>
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {callerName?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>

        <Text style={styles.callerName}>{callerName}</Text>

        <Text style={styles.connectingText}>
          {isConnected ? 'Audio Call' : 'Connecting…'}
        </Text>

        {/* Timer */}
        {showTimer && (
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(timeLeft!)}</Text>
          </View>
        )}
      </View>

      {/* ── Wallet Balance overlay badge ───────────────────────────────── */}
      {walletBalance !== undefined && walletBalance !== null && (
        <View style={styles.walletBadge}>
          <Ionicons name="wallet-outline" size={14} color="#FACC15" style={{ marginRight: 4 }} />
          <Text style={styles.walletText}>₹{walletBalance}</Text>
        </View>
      )}

      {/*
        ── Hidden audio player ────────────────────────────────────────────
        IMPORTANT: Keep an RTCView in the tree so the remote audio track
        is actually rendered/played by the native layer.
      */}
      {remoteStream && (
        <RTCView
          stream={remoteStream}
          style={styles.hiddenAudio}
          zOrder={1}
          objectFit="cover"
        />
      )}

      {/* ── Controls (Hangup, Timer, Mute ONLY) ────────────────────────── */}
      <View style={styles.controls}>
        {/* Toggle mute */}
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
          onPress={toggleMute}
        >
          <MaterialIcons
            name={isMuted ? 'mic-off' : 'mic'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ width: 20 }} />

        {/* End call */}
        <TouchableOpacity style={styles.endBtn} onPress={onEnd}>
          <Ionicons
            name="call"
            size={32}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E16',
  },
  waitingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#000',
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  connectingText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
  },
  timerBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  timerText: {
    color: '#FACC15',
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hiddenAudio: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 20,
    gap: 30,
  },
  ctrlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnActive: {
    backgroundColor: '#6b7280',
  },
  endBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
    zIndex: 10,
  },
  walletText: {
    color: '#FACC15',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

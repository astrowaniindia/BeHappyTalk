import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface VideoCallViewProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  onEnd: () => void;
  callerName: string;
  timeLeft: number | null;
  isUnlimited: boolean;
  walletBalance: number | null;
}

export default function VideoCallView({
  localStream,
  remoteStream,
  isConnected,
  onEnd,
  callerName,
  timeLeft,
  isUnlimited,
  walletBalance,
}: VideoCallViewProps) {
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        // @ts-ignore
        if (track._switchCamera) track._switchCamera();
      });
    }
  };

  const hasRemoteVideo = remoteStream != null;
  const hasLocalVideo = localStream != null && !isVideoOff;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      {/* Wallet Balance Badge */}
      {walletBalance !== null && (
        <View style={styles.walletBadge}>
          <Ionicons name="wallet-outline" size={14} color="#FACC15" style={{ marginRight: 4 }} />
          <Text style={styles.walletText}>₹{walletBalance}</Text>
        </View>
      )}

      {/* Main Screen: Remote Video OR Waiting screen */}
      {hasRemoteVideo ? (
        <RTCView
          key={remoteStream?.id || 'remote-video'}
          stream={remoteStream}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
          zOrder={0}
        />
      ) : (
        <View style={styles.waitingScreen}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{callerName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.callerName}>{callerName}</Text>
        </View>
      )}

      {/* Floating Timer */}
      {isConnected && (
        <View style={styles.floatingTimer}>
          <Text style={styles.timerText}>
            {isUnlimited ? '∞' : timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </Text>
        </View>
      )}

      {/* Local PiP */}
      {hasLocalVideo && (
        <RTCView
          key={localStream?.id || 'local-video'}
          stream={localStream}
          style={styles.localVideo}
          objectFit="cover"
          mirror={true}
          zOrder={1}
        />
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={switchCamera}>
          <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.ctrlBtn, isVideoOff && styles.ctrlBtnActive]} onPress={toggleVideo}>
          <MaterialIcons name={isVideoOff ? 'videocam-off' : 'videocam'} size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endBtn} onPress={onEnd}>
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]} onPress={toggleMute}>
          <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.ctrlBtnPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  waitingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0E16',
    gap: 16,
  },
  avatarCircle: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: '#FACC15',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40, fontWeight: '600', color: '#000',
  },
  callerName: {
    color: '#fff', fontSize: 22, fontWeight: '600',
  },
  floatingTimer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  timerText: {
    color: '#FACC15', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'],
  },
  localVideo: {
    position: 'absolute',
    bottom: 140, right: 16,
    width: 110, height: 160,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: '#fff',
    backgroundColor: '#333',
  },
  controls: {
    position: 'absolute',
    bottom: 48, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  ctrlBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlBtnActive: {
    backgroundColor: '#e53935',
  },
  ctrlBtnPlaceholder: {
    width: 52,
  },
  endBtn: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: '#e53935',
    alignItems: 'center', justifyContent: 'center',
  },
  walletBadge: {
    position: 'absolute',
    top: 60, left: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.3)',
    zIndex: 10,
  },
  walletText: {
    color: '#FACC15', fontSize: 14, fontWeight: 'bold',
  },
});

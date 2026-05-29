import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface CallViewProps {
  localStream: any;
  remoteStream: any;
  isVideo: boolean;
  isConnected: boolean;
  onEnd: () => void;
  callerName: string;
  timeLeft?: number | null;
  isUnlimited?: boolean;
}

export default function CallView({ localStream, remoteStream, isVideo, isConnected, onEnd, callerName, timeLeft, isUnlimited }: CallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        if (track._switchCamera) {
          track._switchCamera();
        }
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.container}>
      {/* Remote stream — full screen, only if it's a Video call */}
      {remoteStream && isVideo ? (
        <RTCView
          stream={remoteStream}
          style={styles.remoteVideo}
          objectFit="cover"
          zOrder={0}
        />
      ) : (
        <View style={styles.waitingScreen}>
          {isConnected && (timeLeft !== undefined && timeLeft !== null) && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            </View>
          )}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{callerName?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.connectingText}>
            {isConnected ? (isVideo ? 'Video Call' : 'Audio Call') : 'Connecting...'}
          </Text>
        </View>
      )}

      {/* Floating Timer for Video Calls */}
      {remoteStream && isVideo && isConnected && (timeLeft !== undefined && timeLeft !== null) && (
        <View style={[styles.timerContainer, { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      )}

      {/* Local stream — picture in picture, bottom right, only for video */}
      {isVideo && localStream && !isVideoOff && (
        <RTCView
          stream={localStream}
          style={styles.localVideo}
          objectFit="cover"
          zOrder={1}
          mirror={true}
        />
      )}

      {/* For audio calls — hidden RTCView still needed to play audio */}
      {!isVideo && localStream && (
        <RTCView
          stream={localStream}
          style={styles.hiddenAudio}
          zOrder={0}
        />
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {isVideo && (
          <TouchableOpacity style={styles.ctrlBtn} onPress={switchCamera}>
            <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.ctrlBtn, isVideoOff && styles.ctrlBtnActive]} onPress={toggleVideo}>
          <MaterialIcons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endBtn} onPress={onEnd}>
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]} onPress={toggleMute}>
          <MaterialIcons name={isMuted ? "mic-off" : "mic"} size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Placeholder for symmetry if not video */}
        {!isVideo && <View style={{ width: 50 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  remoteVideo: { width, height, position: 'absolute', top: 0, left: 0 },
  localVideo: {
    position: 'absolute', bottom: 140, right: 16,
    width: 110, height: 160,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: '#fff',
    zIndex: 10,
  },
  hiddenAudio: { width: 0, height: 0 },
  waitingScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000',
  },
  timerContainer: {
    marginBottom: 40,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  timerText: {
    color: '#FACC15',
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 40, fontWeight: '600', color: '#000' },
  callerName: { color: '#fff', fontSize: 22, fontWeight: '500', marginTop: 16 },
  connectingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8 },
  controlsContainer: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingHorizontal: 20,
  },
  ctrlBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlBtnActive: {
    backgroundColor: '#6b7280',
  },
  endBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#e53935',
    alignItems: 'center', justifyContent: 'center',
  },
});

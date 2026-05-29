/**
 * components/CallView.tsx — BeHappyTalk
 *
 * BLACK SCREEN FIXES APPLIED:
 *  - RTCView requires a non-zero width/height AND a valid streamURL.
 *    We gate rendering behind a null-check on the stream prop.
 *  - zOrder={0} for remote (background), zOrder={1} for local PiP (foreground).
 *    Mixing zOrder values is the most common cause of blank video on Android.
 *  - objectFit="cover" is set explicitly — defaults to "contain" which can look black
 *    on some aspect ratios.
 *  - The hidden audio RTCView still needs to be mounted so audio tracks are played;
 *    we give it width:1/height:1 (not 0) to keep it in the render tree on Android.
 *  - mirror={true} on local stream so the self-view looks natural.
 *  - Timer shows for both video (floating) and audio (center screen) modes.
 */

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

export default function CallView({
  localStream,
  remoteStream,
  isVideo,
  isConnected,
  onEnd,
  callerName,
  timeLeft,
  isUnlimited,
}: CallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // ── Track controls ────────────────────────────────────────────────────────

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        if (typeof track._switchCamera === 'function') {
          track._switchCamera();
        }
      });
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const m = Math.floor(absSeconds / 60).toString().padStart(2, '0');
    const s = (absSeconds % 60).toString().padStart(2, '0');
    // For pay-as-you-go (isUnlimited), show elapsed time with a + prefix
    return isUnlimited ? `+${m}:${s}` : `${m}:${s}`;
  };

  const showTimer =
    isConnected && timeLeft !== undefined && timeLeft !== null;

  // ── Remote stream URL ─────────────────────────────────────────────────────
  // react-native-webrtc ≥ 106 uses stream.toURL() on Android and the stream
  // object itself on iOS.  The RTCView component handles both automatically
  // when you pass the stream object directly as the `stream` prop.
  const hasRemoteVideo = isVideo && remoteStream != null;
  const hasLocalVideo  = isVideo && localStream != null && !isVideoOff;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Remote video (full screen) ────────────────────────────────────── */}
      {hasRemoteVideo ? (
        <RTCView
          stream={remoteStream}
          style={styles.remoteVideo}
          objectFit="cover"
          zOrder={0}
          mirror={false}
        />
      ) : (
        /* ── Waiting / audio-call avatar screen ─────────────────────────── */
        <View style={styles.waitingScreen}>
          {/* Avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {callerName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>

          <Text style={styles.callerName}>{callerName}</Text>

          <Text style={styles.connectingText}>
            {isConnected
              ? isVideo
                ? 'Video Call'
                : 'Audio Call'
              : 'Connecting…'}
          </Text>

          {/* Timer for audio call / waiting screen */}
          {showTimer && (
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatTime(timeLeft!)}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Floating timer for video calls ───────────────────────────────── */}
      {hasRemoteVideo && showTimer && (
        <View style={styles.floatingTimer}>
          <Text style={styles.timerText}>{formatTime(timeLeft!)}</Text>
        </View>
      )}

      {/* ── Local PiP (bottom-right), video only ─────────────────────────── */}
      {hasLocalVideo && (
        <RTCView
          stream={localStream}
          style={styles.localVideo}
          objectFit="cover"
          zOrder={1}
          mirror={true}
        />
      )}

      {/*
        ── Hidden audio player ────────────────────────────────────────────
        IMPORTANT: Even for audio-only calls, keep an RTCView in the tree so
        the remote audio track is actually rendered/played by the native layer.
        Width/height must be > 0 on Android — the native renderer ignores
        views with zero size.
      */}
      {!isVideo && remoteStream && (
        <RTCView
          stream={remoteStream}
          style={styles.hiddenAudio}
          zOrder={0}
          objectFit="cover"
        />
      )}

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <View style={styles.controls}>
        {/* Camera flip — video only */}
        {isVideo ? (
          <TouchableOpacity style={styles.ctrlBtn} onPress={switchCamera}>
            <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.ctrlBtnPlaceholder} />
        )}

        {/* Toggle video */}
        <TouchableOpacity
          style={[styles.ctrlBtn, isVideoOff && styles.ctrlBtnActive]}
          onPress={toggleVideo}
        >
          <MaterialIcons
            name={isVideoOff ? 'videocam-off' : 'videocam'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* End call */}
        <TouchableOpacity style={styles.endBtn} onPress={onEnd}>
          <Ionicons
            name="call"
            size={28}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>

        {/* Toggle mute */}
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
          onPress={toggleMute}
        >
          <MaterialIcons
            name={isMuted ? 'mic-off' : 'mic'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Spacer for symmetry when not video */}
        {!isVideo ? (
          <View style={styles.ctrlBtnPlaceholder} />
        ) : (
          <View style={styles.ctrlBtnPlaceholder} />
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Remote full-screen
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
  },

  // Audio / waiting state
  waitingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0E16',
    gap: 16,
  },

  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#000',
  },
  callerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  connectingText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
  },

  // Timer badge (center, used on audio/waiting screen)
  timerBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FACC15',
  },

  // Floating timer (top center, used on video call)
  floatingTimer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FACC15',
    zIndex: 10,
  },
  timerText: {
    color: '#FACC15',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Local PiP
  localVideo: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },

  // Hidden audio player — must NOT be 0×0 on Android
  hiddenAudio: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
  },

  // Control row
  controls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnActive: {
    backgroundColor: '#6b7280',
  },
  ctrlBtnPlaceholder: {
    width: 52,
  },
  endBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

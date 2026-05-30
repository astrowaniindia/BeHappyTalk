/**
 * components/VideoCallView.tsx
 * Simple, clean UI for the video call screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  callerName: string;
  timeLeft: number | null;
  isUnlimited: boolean;
  walletBalance: number | null;
  onEnd: () => void;
}

export default function VideoCallView({
  localStream,
  remoteStream,
  isConnected,
  callerName,
  timeLeft,
  isUnlimited,
  walletBalance,
  onEnd,
}: Props) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(c => !c);
  };

  const flipCamera = () => {
    localStream?.getVideoTracks().forEach((t: any) => {
      t._switchCamera?.();
    });
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={s.root}>

      {/* ── Remote video (full screen) ─────────────── */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={s.remoteFull}
          objectFit="cover"
          zOrder={0}
        />
      ) : (
        <View style={s.waitBox}>
          <View style={s.avatarRing}>
            <Text style={s.avatarLetter}>
              {callerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={s.waitName}>{callerName}</Text>
          <Text style={s.waitSub}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
      )}

      {/* ── Timer (top-centre) ─────────────────────── */}
      {isConnected && (
        <View style={s.timerBadge}>
          <Text style={s.timerTxt}>
            {isUnlimited || timeLeft === 0
              ? '∞'
              : timeLeft !== null
              ? fmt(timeLeft)
              : '--:--'}
          </Text>
        </View>
      )}

      {/* ── Wallet (top-left) ─────────────────────── */}
      {walletBalance !== null && (
        <View style={s.walletBadge}>
          <MaterialCommunityIcons name="wallet-outline" size={13} color="#FACC15" />
          <Text style={s.walletTxt}> ₹{walletBalance}</Text>
        </View>
      )}

      {/* ── Local video (PiP, bottom-right) ────────── */}
      {localStream && !camOff && (
        <RTCView
          streamURL={localStream.toURL()}
          style={s.localPip}
          objectFit="cover"
          zOrder={1}
          mirror={true}
        />
      )}{/* ── Controls row ──────────────────────────── */}
      <View style={s.controls}>
        <TouchableOpacity style={s.ctrlBtn} onPress={flipCamera}>
          <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.ctrlBtn, camOff && s.ctrlActive]}
          onPress={toggleCam}
        >
          <MaterialIcons
            name={camOff ? 'videocam-off' : 'videocam'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* End call */}
        <TouchableOpacity style={s.endBtn} onPress={onEnd}>
          <MaterialIcons name="call-end" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.ctrlBtn, muted && s.ctrlActive]}
          onPress={toggleMute}
        >
          <MaterialIcons
            name={muted ? 'mic-off' : 'mic'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Placeholder for symmetry */}
        <View style={s.ctrlBtn} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  remoteFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
  },
  waitBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarLetter: {
    fontSize: 44,
    fontWeight: '700',
    color: '#000',
  },
  waitName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  waitSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  timerBadge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 5,
  },
  timerTxt: {
    color: '#FACC15',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  walletBadge: {
    position: 'absolute',
    top: 56,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 5,
  },
  walletTxt: {
    color: '#FACC15',
    fontSize: 13,
    fontWeight: '700',
  },
  localPip: {
    position: 'absolute',
    bottom: 130,
    right: 14,
    width: 100,
    height: 148,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#222',
    zIndex: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 10,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlActive: {
    backgroundColor: '#c62828',
  },
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

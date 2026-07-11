import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, StatusBar, Animated, Easing,
  ActivityIndicator, Modal, Alert, Dimensions, Platform, Linking, RefreshControl, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg: '#06080F',
  bg2: '#0B0E1A',
  card: '#101520',
  card2: '#141B26',
  border: '#1C2333',
  borderHi: '#2A3347',
  gold: '#F0A500',
  goldLight: '#FFD166',
  goldGlow: '#F0A50040',
  blue: '#4A9EFF',
  blueGlow: '#4A9EFF25',
  purple: '#9B72FF',
  purpleGlow: '#9B72FF25',
  green: '#2ECC71',
  greenGlow: '#2ECC7125',
  red: '#FF4D6D',
  text: '#E8EFF8',
  text2: '#8B9BB4',
  text3: '#445062',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isPhone = (p: string) => { const d = p.replace(/\D/g, ''); return d.length >= 10 && d.length <= 15; };

// ─── Floating Particle ────────────────────────────────────────────────────────
function FloatingParticle({ x, delay, color, size = 2 }: { x: number; delay: number; color: string; size?: number }) {
  const y = useRef(new Animated.Value(H)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const go = () => {
      y.setValue(H + 20);
      op.setValue(0);
      Animated.parallel([
        Animated.timing(y, { toValue: -50, duration: 7000 + Math.random() * 5000, easing: Easing.linear, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(op, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.delay(4000),
          Animated.timing(op, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
      ]).start(() => go());
    };
    setTimeout(go, delay);
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', left: x, transform: [{ translateY: y }], opacity: op }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </Animated.View>
  );
}

// ─── Ramsun Logo ───────────────────────────────────────────────────────────────────
function RamsunLogo({ size = 80 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulse }] }}>
      <View style={{ position: 'absolute', width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7, backgroundColor: C.gold, opacity: 0.06 }} />
      <Image
        source={require('../../assets/images/ramsun-logo.webp')}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
    </Animated.View>
  );
}

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.3, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: a }} />;
}

// ─── Spin Loader ──────────────────────────────────────────────────────────────
function SpinLoader({ color = C.gold, size = 20 }: { color?: string; size?: number }) {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(r, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const rot = r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: color, borderTopColor: 'transparent', transform: [{ rotate: rot }] }} />
  );
}

// ─── Step Dots ────────────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ height: 4, width: i === current ? 28 : 8, borderRadius: 2, backgroundColor: i === current ? C.gold : i < current ? C.green : C.border }} />
      ))}
    </View>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
function InputField({ label, error, inputStyle, ...props }: { label: string; error?: string; inputStyle?: any; [k: string]: any }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: C.text2, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 }}>{label}</Text>
      <TextInput
        style={[{
          backgroundColor: C.bg2, borderWidth: 1.5,
          borderColor: error ? C.red : focused ? C.gold + '80' : C.border,
          borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
          fontSize: 15, color: C.text,
        }, inputStyle]}
        placeholderTextColor={C.text3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? <Text style={{ color: C.red, fontSize: 11, marginTop: 5, marginLeft: 4 }}>{error}</Text> : null}
    </View>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
function PrimaryBtn({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    if (disabled || loading) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={press} disabled={disabled || loading} activeOpacity={0.9} style={{
        backgroundColor: disabled ? C.border : C.gold, borderRadius: 16,
        paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center',
        shadowColor: disabled ? 'transparent' : C.gold, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 16, elevation: disabled ? 0 : 10,
      }}>
        {loading ? <SpinLoader color="#000" /> : <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>{label}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── File Upload Button ───────────────────────────────────────────────────────
function FileBtn({ icon, label, hint, value, onPress, color }: { icon: string; label: string; hint: string; value: any; onPress: () => void; color: string }) {
  const done = !!value;
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 16, borderRadius: 18, marginBottom: 10,
        backgroundColor: done ? color + '15' : C.card,
        borderWidth: 1.5, borderColor: done ? color + '70' : C.border,
        borderStyle: done ? 'solid' : 'dashed',
      }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: done ? color + '25' : C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>{done ? '✓' : icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: done ? color : C.text, fontSize: 14, fontWeight: '700' }}>{label}</Text>
          <Text style={{ color: C.text2, fontSize: 11, marginTop: 2 }}>
            {done ? (value.name || value.fileName || 'File selected ✓') : hint}
          </Text>
        </View>
        {!done && (
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.text2, fontSize: 16, fontWeight: '300' }}>+</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── UPCL Waiting Screen ──────────────────────────────────────────────────────
function UPCLWaiting({ project, onClose }: { project: any; onClose: () => void }) {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.9)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(r1, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(r2, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
    ])).start();
    Animated.timing(progress, { toValue: 0.35, duration: 3000, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, []);

  const rot1 = r1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2 = r2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  const stages = [
    { label: 'Application Submitted', done: true, color: C.green },
    { label: 'Admin Review Pending', done: false, active: true, color: C.gold },
    { label: 'UPCL Portal Processing', done: false, color: C.blue },
    { label: 'Bank Loan Sanction', done: false, color: C.purple },
  ];

  return (
    <View style={{ flex: 1, alignItems: 'center', padding: 28 }}>
      {/* Animated rings */}
      <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 8 }}>
        <Animated.View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: C.blue, borderTopColor: 'transparent', transform: [{ rotate: rot1 }] }} />
        <Animated.View style={{ position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: C.purple, borderBottomColor: 'transparent', transform: [{ rotate: rot2 }] }} />
        <Animated.View style={{ transform: [{ scale: pulse }], alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>🏛️</Text>
        </Animated.View>
      </View>

      <Text style={{ color: C.blue, fontSize: 24, fontWeight: '900', marginBottom: 4, textAlign: 'center' }}>UPCL Portal</Text>
      <Text style={{ color: C.gold, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>Processing Application</Text>
      <Text style={{ color: C.text2, fontSize: 12, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
        Project #{project?.client_id || project?.id} is currently under{'\n'}process in the backend.
      </Text>

      {/* Progress bar */}
      <View style={{ width: '100%', marginBottom: 20 }}>
        <View style={{ height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
          <Animated.View style={{ height: '100%', borderRadius: 3, backgroundColor: C.blue, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
        <Text style={{ color: C.text3, fontSize: 10, textAlign: 'right' }}>Processing...</Text>
      </View>

      {/* Stages */}
      <View style={{ width: '100%', gap: 10, marginBottom: 28 }}>
        {stages.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: s.done ? C.green + '30' : s.active ? C.gold + '25' : C.border, borderWidth: 1, borderColor: s.done ? C.green + '70' : s.active ? C.gold + '60' : C.borderHi, alignItems: 'center', justifyContent: 'center' }}>
              {s.done ? <Text style={{ fontSize: 11 }}>✓</Text> : s.active ? <SpinLoader color={C.gold} size={12} /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.text3 }} />}
            </View>
            <Text style={{ color: s.done ? C.green : s.active ? C.gold : C.text3, fontSize: 13, fontWeight: s.done || s.active ? '700' : '400' }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={() => Linking.openURL('https://upcl.org')} style={{ backgroundColor: C.blue, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14, marginBottom: 12, width: '100%', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>🌐 Open UPCL Portal</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose} style={{ backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14, borderWidth: 1, borderColor: C.border, width: '100%', alignItems: 'center' }}>
        <Text style={{ color: C.text2, fontSize: 14, fontWeight: '700' }}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── PROJECT DETAIL MODAL ─────────────────────────────────────────────────────
function ProjectDetailModal({ project, role, visible, onClose, onUpdateStep }: {
  project: any; role: string; visible: boolean; onClose: () => void;
  onUpdateStep: (id: number, step: number, status: string) => Promise<void>;
}) {
  const currentStep = project?.step ?? 0;
  const [busy, setBusy] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const slideY = useRef(new Animated.Value(800)).current;
  const bg = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }),
        Animated.timing(bg, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 800, duration: 260, useNativeDriver: true }),
      Animated.timing(bg, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => { slideY.setValue(800); bg.setValue(0); onClose(); });
  };

  if (!project) return null;

  const STEPS = [
    { id: 1, icon: '📄', label: 'Doc Upload', desc: 'Required documents uploaded' },
    { id: 2, icon: '📋', label: 'UPCL Approval', desc: 'UPCL documents verified' },
    { id: 3, icon: '📝', label: 'Loan Apply', desc: 'Applied on UPCL portal' },
    { id: 4, icon: '🏦', label: 'Loan Process', desc: 'Bank processing' },
    { id: 5, icon: '⚡', label: 'Installation', desc: 'Solar system installed' },
  ];

  // Show UPCL waiting screen if loan is in process but not fully approved/installed, and we want to show a loading screen.
  // Actually, let's just show the full modal for now so employees can see all steps.
  // We'll remove the forced UPCLWaiting for employees so they can mark steps.
  // If we need a dedicated UPCL view, it can be a separate button.

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={{ flex: 1, backgroundColor: bg.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.88)'] }), justifyContent: 'flex-end' }}>
        <Animated.View style={{ backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%', borderTopWidth: 1, borderColor: C.border, transform: [{ translateY: slideY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>PROJECT #{project.id}</Text>
                <Text style={{ color: C.text, fontSize: 24, fontWeight: '900' }}>{project.customer_name || '—'}</Text>
                <Text style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>{project.phone}</Text>
              </View>
              <TouchableOpacity onPress={close} style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
                <Text style={{ color: C.text2, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Progress */}
            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: C.text2, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>PROGRESS</Text>
                <Text style={{ color: C.gold, fontWeight: '800' }}>{Math.round(((currentStep - 1) / 4) * 100)}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${((currentStep - 1) / 4) * 100}%` as any, backgroundColor: C.gold, borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                {STEPS.map(s => (
                  <View key={s.id} style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: currentStep >= s.id ? C.gold + '30' : C.border, borderWidth: 1.5, borderColor: currentStep >= s.id ? C.gold : C.borderHi, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: currentStep >= s.id ? 14 : 10, color: currentStep >= s.id ? C.gold : C.text3 }}>{currentStep >= s.id ? '✓' : s.id}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {project.failed_document && (
              <View style={{ backgroundColor: C.red + '20', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.red + '50' }}>
                <Text style={{ color: C.red, fontSize: 14, fontWeight: '800', marginBottom: 4 }}>⚠️ Document Rejected</Text>
                <Text style={{ color: C.text, fontSize: 12 }}>{project.failed_document} was rejected.</Text>
                <Text style={{ color: C.text2, fontSize: 11, marginTop: 4 }}>Reason: {project.rejection_reason}</Text>
                <TouchableOpacity onPress={async () => {
                  try {
                    const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
                    if (!r.canceled && r.assets.length > 0) {
                      setBusy(true);
                      const asset = r.assets[0];
                      const form = new FormData();
                      const fileName = asset.name || 'reupload.pdf';
                      const mimeType = asset.mimeType || 'application/pdf';
                      if (Platform.OS === 'web') {
                        const blobRes = await fetch(asset.uri);
                        const blob = await blobRes.blob();
                        form.append('file', blob, fileName);
                      } else {
                        form.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);
                      }
                      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: form });
                      const json = await res.json();
                      if (json.success) {
                        const updateRes = await fetch(`${API_URL}/projects/${project.id}`, {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ [project.failed_document]: json.filePath, failed_document: null, rejection_reason: null })
                        });
                        if (updateRes.ok) { Alert.alert('Success', 'Document re-uploaded successfully.'); onClose(); }
                        else Alert.alert('Error', 'Failed to update document.');
                      } else {
                        Alert.alert('Error', 'Failed to upload file.');
                      }
                    }
                  } catch (e) { Alert.alert('Error', 'Something went wrong.'); }
                  finally { setBusy(false); }
                }} style={{ backgroundColor: C.red, padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{busy ? 'Uploading...' : 'Re-Upload Document'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Workflow Steps */}
            <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>WORKFLOW</Text>
            {STEPS.map(s => {
              const done = currentStep >= s.id;
              const isNext = currentStep + 1 === s.id;
              return (
                <TouchableOpacity key={s.id} onPress={() => {
                  if (!isNext || role !== 'admin') return;
                  Alert.alert('Mark Complete?', `Mark "${s.label}" as done?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Confirm', onPress: async () => {
                        setBusy(true);
                        try {
                          await onUpdateStep(project.id, s.id, s.label);
                        } finally {
                          setBusy(false);
                        }
                      }
                    }
                  ]);
                }} disabled={!isNext || busy || role !== 'admin'} activeOpacity={0.75} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, marginBottom: 10,
                  backgroundColor: done ? C.gold + '15' : isNext ? C.gold + '25' : C.card,
                  borderWidth: 1.5, borderColor: done ? C.gold + '50' : isNext ? C.gold : C.border,
                }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: (done || isNext) ? C.gold + '25' : C.border, alignItems: 'center', justifyContent: 'center' }}>
                    {isNext ? <SpinLoader color={C.gold} /> : <Text style={{ fontSize: 22, textShadowColor: C.gold, textShadowRadius: 8 }}>{s.icon}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: (done || isNext) ? C.gold : C.text2, fontSize: 15, fontWeight: '700' }}>{s.label}</Text>
                    <Text style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>{s.desc}</Text>
                  </View>
                  {done && <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: C.gold + '30', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>✓</Text></View>}
                  {isNext && !busy && role === 'admin' && <View style={{ backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>Mark ✓</Text></View>}
                  {isNext && busy && role === 'admin' && <SpinLoader color={C.gold} />}
                  {!done && (!isNext || role !== 'admin') && <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: C.border }} />}
                </TouchableOpacity>
              );
            })}

            {/* Details */}
            <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12, marginTop: 8 }}>APPLICANT INFO</Text>
            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
              {[
                ['🆔 Client ID', project.client_id || project.id],
                ['📧 Email', project.email],
                ['📍 Address', project.address],
                ['📌 Site Location', project.site_location],
                ['⚡ Capacity', project.capacity ? `${project.capacity} kW` : '—'],
                ['📊 Status', project.status],
              ].map(([l, v]) => (
                <View key={l} style={{ flexDirection: 'row', paddingVertical: 11, borderBottomWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text2, fontSize: 13, width: 110 }}>{l}</Text>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '600', flex: 1, flexWrap: 'wrap' }}>{v || '—'}</Text>
                </View>
              ))}
            </View>

            {/* Files */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>UPLOADED DOCUMENTS</Text>
              {!(project.site_photo || project.agreement || project.quotation) && (
                <Text style={{ color: C.text3, fontSize: 12, fontStyle: 'italic', marginBottom: 12 }}>No documents uploaded yet.</Text>
              )}
              <View style={{ gap: 8 }}>
                {project.site_photo && (
                  <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}${project.site_photo}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.blueGlow, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.blue + '40' }}>
                    <Text style={{ fontSize: 26 }}>📷</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.blue, fontSize: 14, fontWeight: '700' }}>Site Photo</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>Tap to download / view</Text>
                    </View>
                    <View style={{ backgroundColor: C.blue + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: C.blue, fontSize: 10, fontWeight: '700' }}>VIEW</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {project.agreement && (
                  <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}${project.agreement}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.greenGlow, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.green + '40' }}>
                    <Text style={{ fontSize: 26 }}>📄</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.green, fontSize: 14, fontWeight: '700' }}>Signed Agreement</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>Tap to download / view</Text>
                    </View>
                    <View style={{ backgroundColor: C.green + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: C.green, fontSize: 10, fontWeight: '700' }}>VIEW</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {project.quotation && (
                  <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}${project.quotation}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.purpleGlow, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.purple + '40' }}>
                    <Text style={{ fontSize: 26 }}>📋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.purple, fontSize: 14, fontWeight: '700' }}>Quotation</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>Tap to download / view</Text>
                    </View>
                    <View style={{ backgroundColor: C.purple + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: C.purple, fontSize: 10, fontWeight: '700' }}>VIEW</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Send Reminder */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>SEND REMINDER</Text>
              <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border }}>
                <TextInput 
                  placeholder="Ping admin about this project..."
                  placeholderTextColor={C.text3}
                  value={reminderMsg}
                  onChangeText={setReminderMsg}
                  style={{ color: C.text, backgroundColor: C.bg2, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}
                />
                <PrimaryBtn label="Send Reminder" onPress={async () => {
                  if (!reminderMsg.trim()) return;
                  setBusy(true);
                  try {
                    await fetch(`${API_URL}/reminders`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ project_id: project.id, message: reminderMsg.trim() })
                    });
                    Alert.alert('Sent', 'Reminder sent to admin.');
                    setReminderMsg('');
                  } catch(e) {
                    Alert.alert('Error', 'Failed to send reminder.');
                  } finally {
                    setBusy(false);
                  }
                }} loading={busy} disabled={!reminderMsg.trim()} />
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── NEW PROJECT MODAL (2 Steps) ──────────────────────────────────────────────
function NewProjectModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ customer_name: '', phone: '', email: '', address: '', capacity: '', site_photo: null as any, site_location: '', agreement: null as any, quotation: null as any });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const slideY = useRef(new Animated.Value(800)).current;
  const bg = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }),
        Animated.timing(bg, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 800, duration: 260, useNativeDriver: true }),
      Animated.timing(bg, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      slideY.setValue(800); bg.setValue(0);
      setStep(0); setErrors({});
      setData({ customer_name: '', phone: '', email: '', address: '', capacity: '', site_photo: null, site_location: '', agreement: null, quotation: null });
      onClose();
    });
  };

  const goNext = () => {
    const e: Record<string, string> = {};
    if (!data.customer_name.trim() || data.customer_name.trim().length < 2) e.customer_name = 'Name required (min 2 chars)';
    if (!isPhone(data.phone)) e.phone = 'Valid 10-15 digit phone required';
    if (!isEmail(data.email)) e.email = 'Valid email address required';
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(1);
  };

  const pickPhoto = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!r.canceled && r.assets && r.assets.length > 0) setData(d => ({ ...d, site_photo: r.assets[0] }));
    } catch (e) {
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const pickDoc = async (field: 'agreement' | 'quotation') => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!r.canceled && r.assets.length > 0) setData(d => ({ ...d, [field]: r.assets[0] }));
  };

  const uploadFile = async (asset: any, fallbackName: string) => {
    const form = new FormData();
    const fileName = asset.fileName || asset.name || fallbackName;
    const mimeType = asset.mimeType || asset.type || 'application/octet-stream';

    if (Platform.OS === 'web') {
      // On web, asset.uri is a blob: URL — fetch it and send as Blob
      const blobRes = await fetch(asset.uri);
      const blob = await blobRes.blob();
      form.append('file', blob, fileName);
    } else {
      // On native, use the RN FormData trick
      form.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);
    }

    const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: form });
    if (!res.ok) {
      console.error('Upload failed:', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json.success ? json.filePath : null;
  };


  const submit = async () => {
    setLoading(true);
    try {
      let site_photo = null, agreement = null, quotation = null;
      if (data.site_photo) site_photo = await uploadFile(data.site_photo, 'site_photo.jpg');
      if (data.agreement) agreement = await uploadFile(data.agreement, 'agreement.pdf');
      if (data.quotation) quotation = await uploadFile(data.quotation, 'quotation.pdf');

      const userId = await AsyncStorage.getItem('ramsun_user_id').catch(() => null);

      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: data.customer_name.trim(),
          phone: data.phone.trim(),
          email: data.email.trim().toLowerCase(),
          address: data.address.trim(),
          capacity: data.capacity.trim(),
          site_photo,
          site_location: data.site_location.trim(),
          agreement,
          quotation,
          user_id: userId ? parseInt(userId) : null,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed'); }
      onSuccess();
      close();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create project. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={{ flex: 1, backgroundColor: bg.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.88)'] }), justifyContent: 'flex-end' }}>
        <Animated.View style={{ backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '95%', borderTopWidth: 1, borderColor: C.border, transform: [{ translateY: slideY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <View>
                <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>NEW APPLICATION</Text>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginTop: 4 }}>
                  {step === 0 ? 'Customer Details' : 'Site Information'}
                </Text>
              </View>
              <TouchableOpacity onPress={close} style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.text2, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <StepDots total={2} current={step} />

            {step === 0 && (
              <View>
                <InputField label="CUSTOMER NAME *" placeholder="Full Name" value={data.customer_name}
                  onChangeText={(t: string) => { setData(d => ({ ...d, customer_name: t })); setErrors(e => ({ ...e, customer_name: '' })); }}
                  error={errors.customer_name} />
                <InputField label="PHONE NUMBER *" placeholder="+91 98765 43210" keyboardType="phone-pad" value={data.phone}
                  onChangeText={(t: string) => { setData(d => ({ ...d, phone: t })); setErrors(e => ({ ...e, phone: '' })); }}
                  error={errors.phone} />
                <InputField label="EMAIL ADDRESS *" placeholder="customer@email.com" keyboardType="email-address" autoCapitalize="none" value={data.email}
                  onChangeText={(t: string) => { setData(d => ({ ...d, email: t })); setErrors(e => ({ ...e, email: '' })); }}
                  error={errors.email} />

                <Text style={{ color: C.text2, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 12, marginTop: 4 }}>DOCUMENTS (Optional)</Text>
                <FileBtn icon="📷" label="Site Photo" hint="Camera or Gallery" value={data.site_photo} onPress={pickPhoto} color={C.blue} />

                {/* Site Location field below site photo */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: C.text2, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 }}>SITE LOCATION (Where is this site?)</Text>
                  <TextInput
                    style={{
                      backgroundColor: C.bg2, borderWidth: 1.5, borderColor: C.border,
                      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                      fontSize: 15, color: C.text,
                    }}
                    placeholder="e.g. Village Nainital, Near Water Tank, Uttarakhand"
                    placeholderTextColor={C.text3}
                    value={data.site_location}
                    onChangeText={(t: string) => setData(d => ({ ...d, site_location: t }))}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <FileBtn icon="📄" label="Signed Agreement" hint="Upload PDF or image" value={data.agreement} onPress={() => pickDoc('agreement')} color={C.green} />
                <FileBtn icon="📋" label="Quotation (Back Office)" hint="Upload PDF or image" value={data.quotation} onPress={() => pickDoc('quotation')} color={C.purple} />

                <View style={{ marginTop: 8 }}>
                  <PrimaryBtn label="Next: Site Info →" onPress={goNext} />
                </View>
              </View>
            )}

            {step === 1 && (
              <View>
                {/* Review */}
                <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text2, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 14 }}>REVIEW SUMMARY</Text>
                  {[['👤 Name', data.customer_name], ['📱 Phone', data.phone], ['📧 Email', data.email]].map(([l, v]) => (
                    <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderColor: C.border }}>
                      <Text style={{ color: C.text2, fontSize: 13 }}>{l}</Text>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{v || '—'}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {data.site_photo && <View style={{ backgroundColor: C.blueGlow, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.blue + '50' }}><Text style={{ color: C.blue, fontSize: 11, fontWeight: '700' }}>📷 Photo</Text></View>}
                    {data.agreement && <View style={{ backgroundColor: C.greenGlow, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.green + '50' }}><Text style={{ color: C.green, fontSize: 11, fontWeight: '700' }}>📄 Agreement</Text></View>}
                    {data.quotation && <View style={{ backgroundColor: C.purpleGlow, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.purple + '50' }}><Text style={{ color: C.purple, fontSize: 11, fontWeight: '700' }}>📋 Quotation</Text></View>}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => setStep(0)} style={{ flex: 1, backgroundColor: C.card, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>← Back</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 2 }}>
                    <PrimaryBtn label="Submit Application ✓" onPress={submit} loading={loading} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── PROJECT CARD ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onPress, index }: { project: any; onPress: () => void; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 55, friction: 11, delay: index * 65, useNativeDriver: true }).start();
  }, []);

  const pct = (((project.step || 1) - 1) / 4) * 100;
  const stepColors = [C.text3, C.blue, C.purple, C.gold, C.green, C.green];
  const col = stepColors[Math.min(project.step || 1, 5)];

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{
        backgroundColor: C.card, borderRadius: 22, padding: 18, marginBottom: 12,
        borderWidth: 1, borderColor: C.border,
        shadowColor: col, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: col + '22', borderWidth: 1.5, borderColor: col + '55', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: col, fontSize: 22, fontWeight: '900' }}>{(project.customer_name || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text2, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 3 }}>PROJECT #{project.client_id || project.id}</Text>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{project.customer_name}</Text>
            <Text style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>{project.phone}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            <View style={{ backgroundColor: col + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: col + '45' }}>
              <Text style={{ color: col, fontSize: 10, fontWeight: '800' }}>{project.step || 1}/5</Text>
            </View>
            {project.failed_document && <Text style={{ color: C.red, fontSize: 10, fontWeight: '700' }}>⚠️ Rejected</Text>}
          </View>
        </View>

        <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: col, borderRadius: 2 }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PulsingDot color={pct >= 100 ? C.green : C.gold} />
            <Text style={{ color: C.text2, fontSize: 12 }}>{project.status || 'Registration'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>View Details</Text>
            <Text style={{ color: C.gold, fontSize: 14 }}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardScreen({ role, onLogout }: { role: string; onLogout: () => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [newModal, setNewModal] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<any>(null);
  const headerY = useRef(new Animated.Value(-30)).current;
  const headerOp = useRef(new Animated.Value(0)).current;
  const statsOp = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.spring(headerY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
        Animated.timing(headerOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(statsOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const userId = await AsyncStorage.getItem('ramsun_user_id').catch(() => null);
      const userParam = userId ? `?user_id=${userId}` : '';
      const r = await fetch(`${API_URL}/projects${userParam}`);
      if (!r.ok) throw new Error();
      setProjects(await r.json());
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStep = async (id: number, step: number, status: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const r = await fetch(`${API_URL}/projects/${id}/step`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, status }),
        signal: controller.signal as any
      });
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error();
      await load();
      setSelected(null);
      showToast(`"${status}" marked complete ✓`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update step. Please check your connection.');
      throw error; // Rethrow to ensure caller handles it if needed
    }
  };

  const stats = [
    { label: 'Total', val: projects.length, color: C.blue },
    { label: 'Pending', val: projects.filter(p => !p.step || p.step < 2).length, color: C.gold },
    { label: 'Active', val: projects.filter(p => (p.step || 1) >= 2 && (p.step || 1) < 5).length, color: C.purple },
    { label: 'Done', val: projects.filter(p => (p.step || 1) >= 5).length, color: C.green },
  ];

  const roleColor = role === 'admin' ? C.gold : C.green;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Background ambient */}
      <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -100, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: C.gold, opacity: 0.04 }} />
        <View style={{ position: 'absolute', top: 200, left: -80, width: 180, height: 180, borderRadius: 90, backgroundColor: C.blue, opacity: 0.04 }} />
      </View>

      {/* Toast */}
      {!!toast && (
        <Animated.View style={{
          position: 'absolute', top: 54, left: 16, right: 16, zIndex: 999,
          backgroundColor: C.green, borderRadius: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 18, paddingVertical: 14,
          shadowColor: C.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 16,
        }}>
          <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 }}>{toast}</Text>
        </Animated.View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={C.gold} />}
      >
        {/* Header */}
        <Animated.View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, opacity: headerOp, transform: [{ translateY: headerY }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <RamsunLogo size={46} />
              <View>
                <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>
                  Ramsun<Text style={{ color: C.gold }}>Solar</Text>
                </Text>
                <Text style={{ color: C.text2, fontSize: 11, letterSpacing: 0.5, marginTop: 1 }}>Energy Management CRM</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 7 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: roleColor + '18', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: roleColor + '40' }}>
                <PulsingDot color={roleColor} />
                <Text style={{ color: roleColor, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{role.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={onLogout} style={{ backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.text2, fontSize: 11, fontWeight: '700' }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, gap: 10, paddingBottom: 4, opacity: statsOp, marginBottom: 8 }}>
          {stats.map((s, i) => (
            <View key={i} style={{
              backgroundColor: C.card, borderRadius: 22, padding: 18, width: '48%', alignItems: 'center',
              borderWidth: 1, borderColor: s.color + '35',
              shadowColor: s.color, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
            }}>
              <Text style={{ color: s.color, fontSize: 34, fontWeight: '900' }}>{s.val}</Text>
              <Text style={{ color: C.text2, fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 }}>{s.label}</Text>
              <View style={{ width: 28, height: 2, backgroundColor: s.color + '50', borderRadius: 1, marginTop: 6 }} />
            </View>
          ))}
        </Animated.View>

        {/* Projects */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 8, marginBottom: 12 }}>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>Projects</Text>
          <TouchableOpacity onPress={load} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.border }}>
            {refreshing ? <SpinLoader size={14} /> : <Text style={{ color: C.gold, fontSize: 14 }}>↻</Text>}
            {!refreshing && <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>Refresh</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 70, gap: 16 }}>
              <SpinLoader size={36} />
              <Text style={{ color: C.text2 }}>Loading projects...</Text>
            </View>
          ) : projects.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 70, gap: 14 }}>
              <RamsunLogo size={70} />
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginTop: 8 }}>No Projects Yet</Text>
              <Text style={{ color: C.text2, fontSize: 14, textAlign: 'center' }}>Tap the + button below{'\n'}to add your first project</Text>
            </View>
          ) : (
            projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} onPress={() => setSelected(p)} />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <Animated.View style={{ position: 'absolute', bottom: 36, right: 24, transform: [{ scale: fabScale }] }}>
        <TouchableOpacity onPress={() => setNewModal(true)} activeOpacity={0.85} style={{
          width: 64, height: 64, borderRadius: 22, backgroundColor: C.gold,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: C.gold, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 18,
        }}>
          <Text style={{ color: '#000', fontSize: 34, lineHeight: 38, fontWeight: '200', marginTop: -2 }}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      {selected && (
        <ProjectDetailModal project={selected} role={role} visible={!!selected} onClose={() => setSelected(null)} onUpdateStep={updateStep} />
      )}
      <NewProjectModal visible={newModal} onClose={() => setNewModal(false)} onSuccess={() => { load(); showToast('Project created successfully! 🎉'); }} />
    </SafeAreaView>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phase, setPhase] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(cardY, { toValue: 0, tension: 55, friction: 12, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const particles = Array.from({ length: 14 }, (_, i) => ({
    x: (i / 14) * W + (Math.random() - 0.5) * 30,
    delay: i * 400 + Math.random() * 2000,
    color: i % 3 === 0 ? C.gold : i % 3 === 1 ? C.blue : C.purple,
    size: Math.random() * 2 + 1.5,
  }));

  const switchMode = (m: 'login' | 'register') => {
    setMode(m); setError(''); setPhase('form'); setOtp('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!isEmail(email)) { setError('Enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      if (mode === 'login') {
        const r = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }), signal: controller.signal });
        const d = await r.json();
        if (d.success) {
          // Save user_id for tenant isolation
          if (d.user?.id) {
            await AsyncStorage.setItem('ramsun_user_id', String(d.user.id)).catch(() => {});
          }
          onLogin(d.user?.role || 'employee');
        }
        else setError(d.message || 'Invalid credentials. Try again.');
      } else {
        const r = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }), signal: controller.signal });
        const d = await r.json();
        if (d.success) setPhase('otp');
        else setError(d.message || 'Registration failed.');
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') setError('Request timed out. Check your network and try again.');
      else setError('Cannot connect to server. Check your network connection.');
    }
    finally { clearTimeout(timeout); setLoading(false); }
  };


  const handleOTP = async () => {
    setError('');
    if (otp.length < 4) { setError('Enter the complete 4-digit OTP'); return; }
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch(`${API_URL}/auth/verify-register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), otp }), signal: controller.signal });
      const d = await r.json();
      if (d.success) {
        if (d.user?.id) {
          await AsyncStorage.setItem('ramsun_user_id', String(d.user.id)).catch(() => {});
        }
        onLogin(d.user?.role || 'employee');
      }
      else setError(d.message || 'Invalid OTP. Please try again.');
    } catch (e: any) {
      if (e?.name === 'AbortError') setError('Request timed out. Try again.');
      else setError('Cannot connect to server.');
    }
    finally { clearTimeout(timeout); setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* Background */}
      <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -120, right: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: C.gold, opacity: 0.05 }} />
        <View style={{ position: 'absolute', bottom: 80, left: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: C.blue, opacity: 0.06 }} />
        <View style={{ position: 'absolute', top: H * 0.35, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: C.purple, opacity: 0.04 }} />
        {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeIn, alignItems: 'center', width: '100%' }}>
          {/* Logo */}
          <Animated.View style={{ transform: [{ scale: logoScale }], marginBottom: 20, alignItems: 'center' }}>
            <RamsunLogo size={110} />
          </Animated.View>
          <Text style={{ color: C.text, fontSize: 40, fontWeight: '900', letterSpacing: -1, textAlign: 'center' }}>
            Ramsun<Text style={{ color: C.gold }}>Solar</Text>
          </Text>
          <Text style={{ color: C.text2, fontSize: 13, marginTop: 6, marginBottom: 40, letterSpacing: 0.8 }}>
            Project Management Platform
          </Text>

          {/* Card */}
          <Animated.View style={{
            width: '100%', backgroundColor: C.card, borderRadius: 28, padding: 24,
            borderWidth: 1, borderColor: C.border,
            shadowColor: C.gold, shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.07, shadowRadius: 40, elevation: 14,
            transform: [{ translateY: cardY }],
          }}>
            {/* Tab switcher */}
            <View style={{ flexDirection: 'row', backgroundColor: C.bg2, borderRadius: 16, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: C.border }}>
              {(['login', 'register'] as const).map(m => (
                <TouchableOpacity key={m} onPress={() => switchMode(m)} activeOpacity={0.8} style={{
                  flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
                  backgroundColor: mode === m ? C.gold : 'transparent',
                }}>
                  <Text style={{ color: mode === m ? '#000' : C.text2, fontWeight: '800', fontSize: 14 }}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {phase === 'form' ? (
              <>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 }}>
                  {mode === 'login' ? 'Welcome Back 👋' : 'Create Account'}
                </Text>
                <Text style={{ color: C.text2, fontSize: 13, marginBottom: 22 }}>
                  {mode === 'login' ? 'Sign in to your workspace' : 'Register for access'}
                </Text>

                {!!error && (
                  <View style={{ backgroundColor: C.red + '18', borderWidth: 1, borderColor: C.red + '50', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 18 }}>
                    <Text style={{ fontSize: 16 }}>⚠️</Text>
                    <Text style={{ color: C.red, fontSize: 13, fontWeight: '600', flex: 1 }}>{error}</Text>
                  </View>
                )}

                <InputField label="EMAIL ADDRESS" placeholder="your@email.com" value={email}
                  onChangeText={(t: string) => { setEmail(t); setError(''); }}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                <InputField label="PASSWORD" placeholder="Min 6 characters" value={password}
                  onChangeText={(t: string) => { setPassword(t); setError(''); }}
                  secureTextEntry autoCapitalize="none" />
                <View style={{ marginTop: 8 }}>
                  <PrimaryBtn label={mode === 'login' ? 'Sign In →' : 'Send OTP →'} onPress={handleSubmit} loading={loading} />
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 }}>Check Your Email</Text>
                <Text style={{ color: C.text2, fontSize: 13, marginBottom: 22 }}>
                  OTP sent to <Text style={{ color: C.gold, fontWeight: '700' }}>{email}</Text>
                </Text>

                {!!error && (
                  <View style={{ backgroundColor: C.red + '18', borderWidth: 1, borderColor: C.red + '50', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 18 }}>
                    <Text style={{ fontSize: 16 }}>⚠️</Text>
                    <Text style={{ color: C.red, fontSize: 13, fontWeight: '600', flex: 1 }}>{error}</Text>
                  </View>
                )}

                <Text style={{ color: C.text2, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 }}>ENTER OTP</Text>
                <TextInput
                  style={{ backgroundColor: C.bg2, borderWidth: 2, borderColor: C.gold + '70', borderRadius: 18, paddingVertical: 22, paddingHorizontal: 20, fontSize: 42, fontWeight: '900', color: C.text, textAlign: 'center', letterSpacing: 18, marginBottom: 20 }}
                  placeholder="• • • •" placeholderTextColor={C.text3}
                  value={otp} onChangeText={t => { setOtp(t.replace(/\D/g, '')); setError(''); }}
                  keyboardType="number-pad" maxLength={4} autoFocus
                />
                <PrimaryBtn label="Verify & Enter" onPress={handleOTP} loading={loading} />
                <TouchableOpacity onPress={() => { setPhase('form'); setOtp(''); setError(''); }} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={{ color: C.text2, fontWeight: '600', fontSize: 14 }}>← Go Back</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          <Text style={{ color: C.text3, fontSize: 11, marginTop: 30 }}>
            made by <Text style={{ color: C.gold, fontWeight: '700' }}>mac studio hub</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('ramsun_user_role')
      .then(r => { setRole(r); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  const handleLogin = async (r: string) => {
    await AsyncStorage.setItem('ramsun_user_role', r).catch(() => { });
    setRole(r);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('ramsun_user_role').catch(() => {});
    await AsyncStorage.removeItem('ramsun_user_id').catch(() => {});
    setRole(null);
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <RamsunLogo size={90} />
        <SpinLoader color={C.gold} size={28} />
      </View>
    );
  }

  return role
    ? <DashboardScreen role={role} onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />;
}

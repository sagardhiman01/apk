import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, StatusBar, Animated, Easing,
  ActivityIndicator, Modal, Alert, Dimensions, Platform, Linking, RefreshControl, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'https://ramsunenergy.online/api';
};

const API_URL = getApiUrl();
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

// ─── Team Roles & Departments ────────────────────────────────────────────────
const ROLE_ALLOWED_STEPS: Record<string, number[]> = {
  upcl:            [1],
  bo_registration: [1],
  bo_quotation:    [2],
  bo_agreement:    [3],
  bo_loan:         [4],
  bank:            [5, 8],
  store:           [6],
  installation:    [7],
  bo_upload_inst:  [9],
  bo_subsidy:      [10],
};

const DEPARTMENT_CONFIG: Record<string, { label: string; icon: string; color: string; desc: string; step: number }> = {
  upcl:            { label: 'UPCL Verification',         icon: 'flash',          color: '#4A9EFF', desc: 'Electricity Bill & Meter Discrepancy', step: 1 },
  bo_registration: { label: 'Registration (BO)',         icon: 'document-text',  color: '#F0A500', desc: 'Files Login & Document Verification', step: 1 },
  bo_quotation:    { label: 'Quotation + Sign (BO)',     icon: 'create',         color: '#FFB703', desc: 'Quotation & Upload Signed Document', step: 2 },
  bo_agreement:    { label: 'Agreement (BO)',            icon: 'document-attach', color: '#9B72FF', desc: 'Upload Signed Solar Agreement', step: 3 },
  bo_loan:         { label: 'Loan Apply (BO)',           icon: 'business',       color: '#2ECC71', desc: 'Solar Loan Application Submission', step: 4 },
  bank:            { label: 'Loan Disbursed (Bank)',     icon: 'cash',           color: '#06D6A0', desc: 'Tranche Disbursement & Remarks', step: 5 },
  store:           { label: 'Material Dispatch (Store)', icon: 'cube',           color: '#FB8500', desc: 'Dispatch Materials to Installation Site', step: 6 },
  installation:    { label: 'Installation Team',         icon: 'construct',      color: '#E63946', desc: 'Panels & Inverter with Geotag Photos', step: 7 },
  bo_upload_inst:  { label: 'Upload Inst. (DCR) (BO)',   icon: 'cloud-upload',   color: '#7209B7', desc: 'Upload Installation & DCR Certificate', step: 9 },
  bo_subsidy:      { label: 'Subsidy Redeem (BO)',       icon: 'gift',           color: '#3A86FF', desc: 'Government Subsidy Claim & Release', step: 10 },
};

const TRANSFER_DESTINATIONS = [
  { key: 'step_1_reg', id: 1, is_upcl: false, status: 'Registration', desc: 'Files login & details review', dept: 'Registration (BO)' },
  { key: 'step_1_upcl', id: 1, is_upcl: true, status: 'UPCL Verification', desc: 'Electricity Bill / Name / Meter Issue', dept: 'UPCL Department' },
  { key: 'step_2', id: 2, is_upcl: false, status: 'Quotation + Sign', desc: 'Quotation + upload sign document', dept: 'Quotation (BO)' },
  { key: 'step_3', id: 3, is_upcl: false, status: 'Agreement', desc: 'Upload agreement + quotation', dept: 'Agreement (BO)' },
  { key: 'step_4', id: 4, is_upcl: false, status: 'Loan Apply', desc: 'Loan apply submitted', dept: 'Loan Apply (BO)' },
  { key: 'step_5', id: 5, is_upcl: false, status: 'Loan Disbursed', desc: 'Loan disbursed (or tag with remark)', dept: 'Bank (1st Disbursed)' },
  { key: 'step_6', id: 6, is_upcl: false, status: 'Material Dispatch', desc: 'Materials dispatched to site', dept: 'Store / Dispatch' },
  { key: 'step_7', id: 7, is_upcl: false, status: 'Complete Installation', desc: 'Panel & Inverter # with Geotag photo', dept: 'Installation' },
  { key: 'step_8', id: 8, is_upcl: false, status: 'Second Disbursed', desc: 'Second loan amount disbursed', dept: 'Bank (2nd Disbursed)' },
  { key: 'step_9', id: 9, is_upcl: false, status: 'Upload Inst. (DCR)', desc: 'Upload installation with DCR', dept: 'Upload Inst. (BO)' },
  { key: 'step_10', id: 10, is_upcl: false, status: 'Subsidy Redeem', desc: 'Subsidy claimed and redeemed', dept: 'Subsidy Redeem (BO)' },
];

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
        backgroundColor: done ? color + '15' : C.gold + '10',
        borderWidth: 1.5, borderColor: done ? color + '70' : C.gold + '40',
        borderStyle: done ? 'solid' : 'dashed',
      }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: done ? color + '25' : C.gold + '25', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={done ? 'checkmark' : icon as any} size={22} color={done ? color : C.gold} />
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

// ─── TRANSFER PROJECT MODAL ──────────────────────────────────────────────────
function TransferProjectModal({ visible, project, currentRole, onClose, onSuccess }: {
  visible: boolean;
  project: any;
  currentRole: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const cur = parseInt(project?.step || 1);
  const isCurrentUpcl = (cur === 1) && (project?.needs_upcl == 1 || project?.needs_upcl === true || String(project?.status || '').toUpperCase().includes('UPCL'));
  const currentKey = isCurrentUpcl ? 'step_1_upcl' : (cur === 1 ? 'step_1_reg' : `step_${cur}`);

  // Exclude current section / role so staff cannot transfer to the same section they are in
  const availableDestinations = TRANSFER_DESTINATIONS.filter(d => {
    // 1. Never show the current step of the project
    if (d.key === currentKey) return false;
    // 2. Also check if the active role corresponds to this step
    const r = String(currentRole || '').toLowerCase();
    if ((r === 'bo_registration' || r === 'registration') && d.key === 'step_1_reg') return false;
    if ((r === 'upcl' || r === 'bo_upcl') && d.key === 'step_1_upcl') return false;
    if ((r === 'bo_quotation' || r === 'quotation') && d.key === 'step_2') return false;
    if ((r === 'bo_agreement' || r === 'agreement') && d.key === 'step_3') return false;
    if ((r === 'bo_loan' || r === 'loan') && d.key === 'step_4') return false;
    if ((r === 'store' || r === 'dispatch') && d.key === 'step_6') return false;
    if (r === 'installation' && d.key === 'step_7') return false;
    if ((r === 'bo_upload_inst' || r === 'upload_inst') && d.key === 'step_9') return false;
    if ((r === 'bo_subsidy' || r === 'subsidy') && d.key === 'step_10') return false;
    return true;
  });

  const [selectedKey, setSelectedKey] = useState<string>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && availableDestinations.length > 0) {
      // Pick next logical step if available (e.g. if current is step 2, default to step 3)
      const nextStepKey = cur < 10 ? `step_${cur + 1}` : 'step_1_reg';
      const defaultDest = availableDestinations.find(d => d.key === nextStepKey) || availableDestinations[0];
      setSelectedKey(defaultDest ? defaultDest.key : '');
      setReason('');
    }
  }, [visible, project?.id, project?.step, project?.status, currentRole]);

  const target = availableDestinations.find(d => d.key === selectedKey) || availableDestinations[0] || TRANSFER_DESTINATIONS[0];

  const handleTransfer = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter a reason or note for transferring this project.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/projects/${project.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_step: target.id,
          status: target.status,
          is_upcl: target.is_upcl,
          reason: reason.trim(),
          transferred_by: currentRole || 'Worker',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Transfer failed');
      onSuccess(`Project #${project.id} transferred to "${target.status}" (${target.dept}) ✓`);
      onClose();
    } catch (e: any) {
      Alert.alert('Transfer Error', e?.message || 'Failed to transfer project. Check connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '92%', borderWidth: 1, borderColor: C.borderHi }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>TRANSFER WORKFLOW</Text>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>Project #{project?.client_id || project?.id}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.text2, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Current Location Badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#f59e0b15', borderWidth: 1, borderColor: '#f59e0b35',
            borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: C.text3, fontSize: 11 }}>Current Stage:</Text>
              <Text style={{ color: C.gold, fontSize: 12, fontWeight: '800' }}>
                Step {cur}: {project?.status || 'Active'}
              </Text>
            </View>
            <Text style={{ color: C.text3, fontSize: 10 }}>(Self excluded)</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: Platform.OS === 'web' ? 460 : 380 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>SELECT DESTINATION DEPT / STEP</Text>
              <Text style={{ color: C.gold, fontSize: 10, fontWeight: '700' }}>
                {availableDestinations.length} available · Scroll for more
              </Text>
            </View>

            {availableDestinations.map(d => {
              const active = d.key === selectedKey;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setSelectedKey(d.key)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, borderRadius: 14, marginBottom: 8,
                    backgroundColor: active ? C.gold + '20' : C.card,
                    borderWidth: 1.5, borderColor: active ? C.gold : C.border,
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: active ? C.gold : C.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: active ? '#000' : C.text2, fontWeight: '900', fontSize: 12 }}>{d.is_upcl ? '⚡' : d.id}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: active ? C.gold : C.text, fontSize: 13, fontWeight: '800' }}>
                      {d.is_upcl ? '⚡ UPCL Verification' : `Step ${d.id}: ${d.status}`} ({d.dept})
                    </Text>
                    <Text style={{ color: C.text2, fontSize: 11 }}>{d.desc}</Text>
                  </View>
                  {active && <Text style={{ color: C.gold, fontSize: 16, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 10, marginBottom: 8 }}>TRANSFER REASON / NOTE FOR WORKER</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Electricity bill name mismatch, or installation complete..."
              placeholderTextColor={C.text3}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: C.card, borderRadius: 14, padding: 12, color: C.text,
                fontSize: 13, borderWidth: 1, borderColor: C.border, minHeight: 70, textAlignVertical: 'top', marginBottom: 16,
              }}
            />
          </ScrollView>

          <TouchableOpacity
            onPress={handleTransfer}
            disabled={busy}
            activeOpacity={0.85}
            style={{
              backgroundColor: C.gold, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10,
              flexDirection: 'row', justifyContent: 'center', gap: 8,
            }}
          >
            {busy ? <SpinLoader color="#000" size={18} /> : (
              <Text style={{ color: '#000', fontSize: 15, fontWeight: '900' }}>Confirm Transfer ↗</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── PROJECT DETAIL MODAL (Team & Admin Enabled) ──────────────────────────────
function ProjectDetailModal({ project, role, visible, onClose, onUpdateStep, onRefresh, canTransfer }: {
  project: any; role: string; visible: boolean; onClose: () => void;
  onUpdateStep: (id: number, step: number, status: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  canTransfer?: boolean;
}) {
  const currentStep = project?.step ?? 1;
  const isUPCL = Boolean(
    (currentStep === 1 || !project?.step) &&
    (
      project?.needs_upcl === 1 ||
      project?.needs_upcl === true ||
      (project?.status && (project.status.includes('UPCL') || project.status.toLowerCase().includes('upcl')))
    )
  );

  const [busy, setBusy] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const [transferVisible, setTransferVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankRemarksInput, setBankRemarksInput] = useState(project?.bank_remarks || '');
  const slideY = useRef(new Animated.Value(800)).current;
  const bg = useRef(new Animated.Value(0)).current;

  const isRoleAllowed = role === 'admin' || (ROLE_ALLOWED_STEPS[role] && ROLE_ALLOWED_STEPS[role].includes(currentStep));

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

  const handleStepComplete = async (stepId: number) => {
    if (!isRoleAllowed) {
      Alert.alert('Access Restricted', 'Your department role cannot complete this step.');
      return;
    }
    if (currentStep !== stepId) {
      Alert.alert('Sequence Notice', `Please finish Step ${currentStep} first.`);
      return;
    }
    if (stepId === 5) {
      setBankModalVisible(true);
      return;
    }

    const nextStep = stepId + 1;
    const nextObj = STEPS.find(s => s.id === nextStep);
    const nextStatus = nextObj ? nextObj.label : 'Completed';

    setBusy(true);
    try {
      await onUpdateStep(project.id, nextStep, nextStatus);
      if (onRefresh) await onRefresh();
      close();
    } catch (err: any) {
      // onUpdateStep handles error alert
    } finally {
      setBusy(false);
    }
  };

  const handleBankSubmit = async () => {
    if (!bankRemarksInput.trim()) {
      Alert.alert('Remarks Required', 'Please enter bank disbursement details / reference.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/projects/${project.id}/step`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 6, status: 'Material Dispatch', bank_remarks: bankRemarksInput.trim() }),
      });
      if (res.ok) {
        setBankModalVisible(false);
        Alert.alert('Disbursed ✓', 'Loan disbursement recorded successfully!');
        if (onRefresh) await onRefresh();
        close();
      } else {
        Alert.alert('Error', 'Failed to update disbursement.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Check connection.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendToUpcl = async () => {
    Alert.alert(
      'Send to UPCL Worker',
      'Transfer this project to UPCL verification for Electricity Bill / Meter discrepancy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Send',
          onPress: async () => {
            try {
              setBusy(true);
              const res = await fetch(`${API_URL}/projects/${project.id}/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to_step: 1,
                  status: 'UPCL Verification',
                  is_upcl: true,
                  reason: 'Electricity bill / meter discrepancy routed from registration',
                  transferred_by: role || 'Registration Worker',
                }),
              });
              const d = await res.json();
              if (res.ok && d.success) {
                Alert.alert('Sent ✓', 'Project transferred to UPCL department!');
                if (onRefresh) await onRefresh();
                close();
              } else {
                Alert.alert('Error', d.error || 'Failed to send to UPCL.');
              }
            } catch (e) {
              Alert.alert('Error', 'Check network connection.');
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  };

  const uploadDoc = async (field: 'quotation' | 'agreement' | 'inst_photo_1' | 'inst_photo_2' | 'dcr' | 'site_photo', label: string) => {
    try {
      let asset: any = null;
      let fileName = '';
      let mimeType = '';

      if (field === 'dcr' || field === 'quotation' || field === 'agreement') {
        const r = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*', '*/*'],
          copyToCacheDirectory: true,
        });
        if (r.canceled || !r.assets || r.assets.length === 0) return;
        asset = r.assets[0];
        fileName = asset.name || `${field}_document.pdf`;
        mimeType = asset.mimeType || 'application/pdf';
      } else {
        const r = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
        if (r.canceled || !r.assets || r.assets.length === 0) return;
        asset = r.assets[0];
        fileName = asset.fileName || asset.name || `${field}_${Date.now()}.jpg`;
        mimeType = asset.mimeType || 'image/jpeg';
      }

      setBusy(true);

      const form = new FormData();
      if (!mimeType || mimeType === 'image') {
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (lower.endsWith('.png')) mimeType = 'image/png';
        else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else mimeType = (field === 'dcr' || field === 'quotation' || field === 'agreement') ? 'application/pdf' : 'image/jpeg';
      }

      if (Platform.OS === 'web') {
        const blobRes = await fetch(asset.uri);
        const blob = await blobRes.blob();
        form.append('file', blob, fileName);
      } else {
        form.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);
      }

      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (json.success && json.filePath) {
        const updateRes = await fetch(`${API_URL}/projects/${project.id}/document`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: json.filePath })
        });
        if (updateRes.ok) {
          project[field] = json.filePath;
          Alert.alert('Success', `${label} uploaded successfully!`);
          if (onRefresh) await onRefresh();
        } else {
          Alert.alert('Error', `Failed to save ${label} to project.`);
        }
      } else {
        Alert.alert('Error', json.error || `Failed to upload ${label}.`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong during upload.');
    } finally {
      setBusy(false);
    }
  };

  if (!project) return null;

  const STEPS = [
    { id: 1, icon: 'document-text', label: 'Registration', desc: 'Files login and customer verification' },
    { id: 2, icon: 'create', label: 'Quotation + Sign', desc: 'Quotation generated and signed' },
    { id: 3, icon: 'document-attach', label: 'Agreement', desc: 'Signed solar agreement contract' },
    { id: 4, icon: 'briefcase', label: 'Loan Apply', desc: 'Bank solar loan application' },
    { id: 5, icon: 'cash', label: 'Loan Disbursed', desc: 'First loan tranche disbursed' },
    { id: 6, icon: 'cube', label: 'Material Dispatch', desc: 'Solar panels & equipment dispatched' },
    { id: 7, icon: 'flash', label: 'Installation', desc: 'Panels & inverter installed with geotag' },
    { id: 8, icon: 'cash', label: 'Second Disbursed', desc: 'Second loan tranche disbursed' },
    { id: 9, icon: 'cloud-upload', label: 'Upload Inst.', desc: 'Installation inspection with DCR certificate' },
    { id: 10, icon: 'gift', label: 'Subsidy Redeem', desc: 'Government solar subsidy released' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={{ flex: 1, backgroundColor: bg.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.88)'] }), justifyContent: 'flex-end' }}>
        <Animated.View style={{ backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%', borderTopWidth: 1, borderColor: C.border, transform: [{ translateY: slideY }] }}>
          <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 }}>PROJECT #{project.client_id || project.id}</Text>
                <Text style={{ color: C.text, fontSize: 24, fontWeight: '900' }}>{project.customer_name || '—'}</Text>
                <Text style={{ color: C.text2, fontSize: 13, marginTop: 4 }}>{project.phone}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {canTransfer && (
                  <TouchableOpacity
                    onPress={() => setTransferVisible(true)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: C.gold + '25', borderWidth: 1.5, borderColor: C.gold,
                      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>🔄</Text>
                    <Text style={{ color: C.gold, fontSize: 12, fontWeight: '800' }}>Transfer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={close} style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: C.text2, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Transfer Remarks Audit Box from Admin/Worker */}
            {project.transfer_remarks && (
              <View style={{ backgroundColor: C.card2, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.borderHi }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>LATEST UPDATE / NOTE</Text>
                  <Text style={{ color: C.text2, fontSize: 11 }}>By: {project.transferred_by || 'Staff'}</Text>
                </View>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>"{project.transfer_remarks}"</Text>
              </View>
            )}

            {/* Progress Bar */}
            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: C.text2, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>PROGRESS</Text>
                <Text style={{ color: isUPCL ? C.blue : C.gold, fontWeight: '800' }}>
                  {isUPCL ? 'UPCL REVIEW' : `${Math.round(((currentStep - 1) / 10) * 100)}%`}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(5, ((currentStep - 1) / 10) * 100)}%` as any, backgroundColor: isUPCL ? C.blue : C.gold, borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                {STEPS.filter(s => s.id % 2 !== 0).map(s => (
                  <View key={s.id} style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: currentStep >= s.id ? (isUPCL && s.id === 1 ? C.blue + '30' : C.gold + '30') : C.border, borderWidth: 1.5, borderColor: currentStep >= s.id ? (isUPCL && s.id === 1 ? C.blue : C.gold) : C.borderHi, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: currentStep >= s.id ? 14 : 10, color: currentStep >= s.id ? (isUPCL && s.id === 1 ? C.blue : C.gold) : C.text3 }}>{currentStep >= s.id ? '✓' : s.id}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* UPCL Verification Banner: ONLY shown when project is routed to UPCL at Step 1 */}
            {isUPCL && (
              <View style={{ backgroundColor: C.blue + '18', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: C.blue + '55' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.blue + '30', alignItems: 'center', justifyContent: 'center' }}>
                    <SpinLoader color={C.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: C.blue, fontSize: 15, fontWeight: '900' }}>UPCL Verification</Text>
                      <View style={{ backgroundColor: C.blue + '30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: C.blue, fontSize: 9, fontWeight: '800' }}>IN PROGRESS</Text>
                      </View>
                    </View>
                    <Text style={{ color: C.gold, fontSize: 11, fontWeight: '700' }}>Electricity Bill / Meter Discrepancy</Text>
                    <Text style={{ color: C.text2, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                      Your application documents are currently undergoing verification with the UPCL electricity department.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Department Action Box */}
            {currentStep <= 10 && (
              <View style={{
                backgroundColor: isRoleAllowed ? C.gold + '15' : C.card,
                borderRadius: 20, padding: 18, marginBottom: 18,
                borderWidth: 1.5, borderColor: isRoleAllowed ? C.gold : C.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <PulsingDot color={isRoleAllowed ? C.gold : C.text3} />
                    <Text style={{ color: isRoleAllowed ? C.gold : C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>
                      {isRoleAllowed ? 'ACTIVE ACTION PERMISSION' : 'ASSIGNED DEPARTMENT'}
                    </Text>
                  </View>
                  <Text style={{ color: isRoleAllowed ? C.gold : C.text3, fontSize: 12, fontWeight: '900' }}>
                    Step {currentStep}/10
                  </Text>
                </View>

                <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                  {STEPS.find(s => s.id === currentStep)?.label || project.status}
                </Text>
                <Text style={{ color: C.text2, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
                  {STEPS.find(s => s.id === currentStep)?.desc}
                </Text>

                {/* Step 1 Quick Send to UPCL button */}
                {currentStep === 1 && !isUPCL && (
                  <TouchableOpacity
                    onPress={handleSendToUpcl}
                    disabled={busy}
                    style={{
                      backgroundColor: C.blue + '20', borderWidth: 1.5, borderColor: C.blue,
                      borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginBottom: 10,
                      flexDirection: 'row', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🏛️</Text>
                    <Text style={{ color: C.blue, fontSize: 13, fontWeight: '800' }}>
                      Document Discrepancy? Send to UPCL
                    </Text>
                  </TouchableOpacity>
                )}

                {isRoleAllowed ? (
                  <TouchableOpacity
                    onPress={() => handleStepComplete(currentStep)}
                    disabled={busy}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center', gap: 8,
                      shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
                    }}
                  >
                    {busy ? <SpinLoader color="#000" size={18} /> : (
                      <Text style={{ color: '#000', fontSize: 15, fontWeight: '900' }}>
                        Mark Step {currentStep} Complete ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: C.bg2, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ color: C.text3, fontSize: 11, fontWeight: '700' }}>
                      🔒 Restricted: Only assigned team or Admin can mark this step
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Document Rejection Notice */}
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
                      let mimeType = asset.mimeType;
                      if (!mimeType || mimeType === 'image') {
                        mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
                      }
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
                        const updateRes = await fetch(`${API_URL}/projects/${project.id}/document`, {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ [project.failed_document]: json.filePath, failed_document: null, rejection_reason: null })
                        });
                        if (updateRes.ok) {
                          Alert.alert('Success', 'Document re-uploaded successfully.');
                          if (onRefresh) await onRefresh();
                        } else Alert.alert('Error', 'Failed to update document.');
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

            {/* Workflow Steps (Read-Only Status Tracking for Customer) */}
            <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>WORKFLOW PROGRESS</Text>
            {STEPS.map(s => {
              const isDone = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <View key={s.id} style={{ marginBottom: 12 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18,
                    backgroundColor: isDone ? C.gold + '15' : isCurrent ? C.gold + '25' : C.card,
                    borderWidth: 1.5, borderColor: isDone ? C.gold + '50' : isCurrent ? C.gold : C.border,
                  }}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: (isDone || isCurrent) ? C.gold + '25' : C.border, alignItems: 'center', justifyContent: 'center' }}>
                      {isCurrent ? <SpinLoader color={C.gold} /> : <Ionicons name={s.icon as any} size={22} color={isDone ? C.gold : C.text3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: (isDone || isCurrent) ? C.gold : C.text2, fontSize: 15, fontWeight: '700' }}>{s.label}</Text>
                      <Text style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>{s.desc}</Text>
                    </View>
                    {isDone && <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: C.gold + '30', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>✓</Text></View>}
                    {isCurrent && <View style={{ backgroundColor: C.gold + '25', borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: C.gold, fontSize: 10, fontWeight: '800' }}>IN PROGRESS</Text></View>}
                    {!isDone && !isCurrent && <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: C.border }} />}
                  </View>

                  {/* DYNAMIC UPCL STEP: ONLY shown when project is routed to UPCL at Step 1 */}
                  {isUPCL && s.id === 1 && (
                    <View
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18,
                        backgroundColor: C.blue + '20', borderWidth: 1.5, borderColor: C.blue, marginTop: 10,
                      }}
                    >
                      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.blue + '30', alignItems: 'center', justifyContent: 'center' }}>
                        <SpinLoader color={C.blue} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: C.blue, fontSize: 15, fontWeight: '800' }}>UPCL Verification</Text>
                          <View style={{ backgroundColor: C.blue + '30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: C.blue, fontSize: 9, fontWeight: '800' }}>UNDER REVIEW</Text>
                          </View>
                        </View>
                        <Text style={{ color: C.text2, fontSize: 12, marginTop: 2 }}>Electricity bill & meter discrepancy verification</Text>
                      </View>
                      <View style={{ backgroundColor: C.blue + '25', borderWidth: 1, borderColor: C.blue, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Text style={{ color: C.blue, fontSize: 10, fontWeight: '800' }}>IN PROGRESS</Text>
                      </View>
                    </View>
                  )}


                </View>
              );
            })}

            {/* Applicant Details */}
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

            {/* Documents Section (Read-Only Verification for Customer) */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: C.text2, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>PROJECT DOCUMENTS</Text>
              
              <View style={{ gap: 10 }}>
                {/* Quotation */}
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: project.quotation ? C.purple + '40' : C.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Ionicons name="clipboard" size={24} color={C.purple} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.purple, fontSize: 14, fontWeight: '700' }}>Quotation (+ Sign)</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>{project.quotation ? 'Quotation attached by back-office' : 'Pending quotation from back-office'}</Text>
                    </View>
                    <View style={{ backgroundColor: project.quotation ? C.purple + '25' : C.gold + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: project.quotation ? C.purple : C.gold, fontSize: 10, fontWeight: '800' }}>
                        {project.quotation ? 'ATTACHED ✓' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {project.quotation ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(project.quotation.startsWith('http') ? project.quotation : `${API_URL.replace('/api', '')}${project.quotation}`)}
                          style={{ flex: 1, backgroundColor: C.purple + '20', borderWidth: 1, borderColor: C.purple, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: C.purple, fontSize: 12, fontWeight: '800' }}>View Quotation</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => uploadDoc('quotation', 'Quotation')}
                          disabled={busy}
                          style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: C.text, fontSize: 12, fontWeight: '800' }}>Replace</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={() => uploadDoc('quotation', 'Quotation')}
                        disabled={busy}
                        style={{ flex: 1, backgroundColor: C.purple + '25', borderWidth: 1, borderColor: C.purple, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Ionicons name="cloud-upload" size={16} color={C.purple} />
                        <Text style={{ color: C.purple, fontSize: 12, fontWeight: '800' }}>Upload Quotation PDF / File</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Agreement */}
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: project.agreement ? C.green + '40' : C.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Ionicons name="document-attach" size={24} color={C.green} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.green, fontSize: 14, fontWeight: '700' }}>Signed Agreement</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>{project.agreement ? 'Signed agreement attached' : 'Pending agreement documentation'}</Text>
                    </View>
                    <View style={{ backgroundColor: project.agreement ? C.green + '25' : C.gold + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: project.agreement ? C.green : C.gold, fontSize: 10, fontWeight: '800' }}>
                        {project.agreement ? 'ATTACHED ✓' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {project.agreement ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(project.agreement.startsWith('http') ? project.agreement : `${API_URL.replace('/api', '')}${project.agreement}`)}
                          style={{ flex: 1, backgroundColor: C.green + '20', borderWidth: 1, borderColor: C.green, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: C.green, fontSize: 12, fontWeight: '800' }}>View Agreement</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => uploadDoc('agreement', 'Signed Agreement')}
                          disabled={busy}
                          style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: C.text, fontSize: 12, fontWeight: '800' }}>Replace</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={() => uploadDoc('agreement', 'Signed Agreement')}
                        disabled={busy}
                        style={{ flex: 1, backgroundColor: C.green + '25', borderWidth: 1, borderColor: C.green, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Ionicons name="cloud-upload" size={16} color={C.green} />
                        <Text style={{ color: C.green, fontSize: 12, fontWeight: '800' }}>Upload Signed Agreement</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Site Photo */}
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: project.site_photo ? C.blue + '40' : C.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: project.site_photo ? 10 : 0 }}>
                    <Ionicons name="camera" size={24} color={C.blue} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.blue, fontSize: 14, fontWeight: '700' }}>Site Photo</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>{project.site_photo ? 'Installation site photo attached' : 'No photo attached at application'}</Text>
                    </View>
                    <View style={{ backgroundColor: project.site_photo ? C.blue + '25' : C.text3 + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: project.site_photo ? C.blue : C.text2, fontSize: 10, fontWeight: '800' }}>
                        {project.site_photo ? 'ATTACHED ✓' : 'NOT ATTACHED'}
                      </Text>
                    </View>
                  </View>
                  {project.site_photo && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(project.site_photo.startsWith('http') ? project.site_photo : `${API_URL.replace('/api', '')}${project.site_photo}`)}
                      style={{ backgroundColor: C.blue + '20', borderWidth: 1, borderColor: C.blue, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                    >
                      <Text style={{ color: C.blue, fontSize: 12, fontWeight: '800' }}>View Site Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Installation Photos */}
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: (project.inst_photo_1 || project.inst_photo_2) ? C.gold + '40' : C.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Ionicons name="images" size={24} color={C.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.gold, fontSize: 14, fontWeight: '700' }}>Installation Photos (1 & 2)</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>{(project.inst_photo_1 || project.inst_photo_2) ? 'Captured site installation' : 'Upload on-site installation photos'}</Text>
                    </View>
                    <View style={{ backgroundColor: (project.inst_photo_1 || project.inst_photo_2) ? C.gold + '25' : C.text3 + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: (project.inst_photo_1 && project.inst_photo_2) ? C.gold : C.text2, fontSize: 10, fontWeight: '800' }}>
                        {(project.inst_photo_1 && project.inst_photo_2) ? 'ATTACHED (2/2) ✓' : (project.inst_photo_1 || project.inst_photo_2) ? 'ATTACHED (1/2) ✓' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {/* Photo 1 Controls */}
                  <View style={{ marginBottom: 8, padding: 10, backgroundColor: C.bg2, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>Installation Photo 1</Text>
                      <Text style={{ color: project.inst_photo_1 ? C.green : C.text3, fontSize: 10, fontWeight: '800' }}>
                        {project.inst_photo_1 ? 'Attached ✓' : 'Missing'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {project.inst_photo_1 ? (
                        <>
                          <TouchableOpacity
                            onPress={() => Linking.openURL(project.inst_photo_1.startsWith('http') ? project.inst_photo_1 : `${API_URL.replace('/api', '')}${project.inst_photo_1}`)}
                            style={{ flex: 1, backgroundColor: C.gold + '20', borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800' }}>View Photo 1</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => uploadDoc('inst_photo_1', 'Installation Photo 1')}
                            disabled={busy}
                            style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <Text style={{ color: C.text, fontSize: 11, fontWeight: '800' }}>Replace Photo 1</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={() => uploadDoc('inst_photo_1', 'Installation Photo 1')}
                          disabled={busy}
                          style={{ flex: 1, backgroundColor: C.gold + '25', borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                        >
                          <Ionicons name="cloud-upload" size={14} color={C.gold} />
                          <Text style={{ color: C.gold, fontSize: 12, fontWeight: '800' }}>Upload Photo 1</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Photo 2 Controls */}
                  <View style={{ padding: 10, backgroundColor: C.bg2, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>Installation Photo 2</Text>
                      <Text style={{ color: project.inst_photo_2 ? C.green : C.text3, fontSize: 10, fontWeight: '800' }}>
                        {project.inst_photo_2 ? 'Attached ✓' : 'Missing'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {project.inst_photo_2 ? (
                        <>
                          <TouchableOpacity
                            onPress={() => Linking.openURL(project.inst_photo_2.startsWith('http') ? project.inst_photo_2 : `${API_URL.replace('/api', '')}${project.inst_photo_2}`)}
                            style={{ flex: 1, backgroundColor: C.gold + '20', borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800' }}>View Photo 2</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => uploadDoc('inst_photo_2', 'Installation Photo 2')}
                            disabled={busy}
                            style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <Text style={{ color: C.text, fontSize: 11, fontWeight: '800' }}>Replace Photo 2</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={() => uploadDoc('inst_photo_2', 'Installation Photo 2')}
                          disabled={busy}
                          style={{ flex: 1, backgroundColor: C.gold + '25', borderWidth: 1, borderColor: C.gold, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                        >
                          <Ionicons name="cloud-upload" size={14} color={C.gold} />
                          <Text style={{ color: C.gold, fontSize: 12, fontWeight: '800' }}>Upload Photo 2</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* DCR Certificate */}
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: project.dcr ? C.purple + '40' : C.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Ionicons name="folder-open" size={24} color={C.purple} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.purple, fontSize: 14, fontWeight: '700' }}>DCR Certificate / Document</Text>
                      <Text style={{ color: C.text2, fontSize: 11 }}>{project.dcr ? 'DCR certificate attached' : 'Upload DCR PDF or document from files'}</Text>
                    </View>
                    <View style={{ backgroundColor: project.dcr ? C.purple + '25' : C.text3 + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: project.dcr ? C.purple : C.text2, fontSize: 10, fontWeight: '800' }}>
                        {project.dcr ? 'ATTACHED ✓' : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {project.dcr ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(project.dcr.startsWith('http') ? project.dcr : `${API_URL.replace('/api', '')}${project.dcr}`)}
                          style={{ flex: 1, backgroundColor: C.purple + '20', borderWidth: 1, borderColor: C.purple, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: C.purple, fontSize: 12, fontWeight: '800' }}>View DCR Document</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => uploadDoc('dcr', 'DCR Certificate')}
                          disabled={busy}
                          style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: C.text, fontSize: 12, fontWeight: '800' }}>Replace DCR</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={() => uploadDoc('dcr', 'DCR Certificate')}
                        disabled={busy}
                        style={{ flex: 1, backgroundColor: C.purple + '25', borderWidth: 1, borderColor: C.purple, borderRadius: 10, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Ionicons name="document-text" size={16} color={C.purple} />
                        <Text style={{ color: C.purple, fontSize: 12, fontWeight: '800' }}>Upload DCR Certificate (PDF / File)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
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

      {/* Bank Disbursement Remarks Modal */}
      <Modal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: C.bg, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: C.borderHi }}>
            <Text style={{ color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 }}>BANK DEPARTMENT</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', marginBottom: 6 }}>Loan Disbursement Remarks</Text>
            <Text style={{ color: C.text2, fontSize: 12, marginBottom: 14 }}>Enter bank transaction reference number, disbursement date, or loan remarks:</Text>
            <TextInput
              value={bankRemarksInput}
              onChangeText={setBankRemarksInput}
              placeholder="e.g. UTR / Ref #SBIN123456 - ₹1,50,000 Disbursed"
              placeholderTextColor={C.text3}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: C.card, borderRadius: 14, padding: 12, color: C.text,
                fontSize: 13, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setBankModalVisible(false)}
                style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.text2, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBankSubmit}
                disabled={busy}
                style={{ flex: 2, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              >
                {busy ? <SpinLoader color="#000" size={16} /> : <Text style={{ color: '#000', fontWeight: '900' }}>Submit & Complete ✓</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer Project Modal */}
      <TransferProjectModal
        visible={transferVisible}
        project={project}
        currentRole={role}
        onClose={() => setTransferVisible(false)}
        onSuccess={async () => {
          if (onRefresh) await onRefresh();
          close();
        }}
      />
    </Modal>
  );
}

// ─── NEW PROJECT MODAL (2 Steps) ──────────────────────────────────────────────
function NewProjectModal({ visible, userId, onClose, onSuccess }: { visible: boolean; userId?: string | null; onClose: () => void; onSuccess: () => void }) {
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
    let mimeType = asset.mimeType;
    if (!mimeType || mimeType === 'image') {
      const lower = fileName.toLowerCase();
      if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (lower.endsWith('.png')) mimeType = 'image/png';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (lower.endsWith('.webp')) mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
    }

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
      const errText = await res.text().catch(() => '');
      console.error('Upload failed:', res.status, errText);
      return null;
    }
    const json = await res.json();
    return json.success ? json.filePath : null;
  };


  const submit = async () => {
    setLoading(true);
    try {
      let site_photo = null, agreement = null, quotation = null;
      if (data.site_photo) {
        site_photo = await uploadFile(data.site_photo, 'site_photo.jpg');
        if (!site_photo) throw new Error('Failed to upload Site Photo to server. Please try again.');
      }
      if (data.agreement) {
        agreement = await uploadFile(data.agreement, 'agreement.pdf');
        if (!agreement) throw new Error('Failed to upload Agreement PDF to server. Please try again.');
      }
      if (data.quotation) {
        quotation = await uploadFile(data.quotation, 'quotation.pdf');
        if (!quotation) throw new Error('Failed to upload Quotation PDF to server. Please try again.');
      }

      const storedUid = await AsyncStorage.getItem('ramsun_user_id').catch(() => null);
      const activeUid = userId || storedUid;
      const parsedUid = activeUid ? parseInt(activeUid) : null;

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
          user_id: parsedUid,
        }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Your account has been removed by the administrator.');
        }
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create project');
      }
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
                <FileBtn icon="camera" label="Site Photo" hint="Camera or Gallery" value={data.site_photo} onPress={pickPhoto} color={C.blue} />

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

                <FileBtn icon="document" label="Signed Agreement" hint="Upload PDF or image" value={data.agreement} onPress={() => pickDoc('agreement')} color={C.green} />
                <FileBtn icon="clipboard" label="Quotation (Back Office)" hint="Upload PDF or image" value={data.quotation} onPress={() => pickDoc('quotation')} color={C.purple} />

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

  const pct = (((project.step || 1) - 1) / 10) * 100;
  const isUPCL = Boolean(
    ((project.step || 1) === 1) &&
    (
      project?.needs_upcl === 1 ||
      project?.needs_upcl === true ||
      (project?.status && (project.status.includes('UPCL') || project.status.toLowerCase().includes('upcl')))
    )
  );
  const stepColors = [C.text3, C.blue, C.purple, C.gold, C.goldLight, C.green, C.gold, C.blue, C.purple, C.green, C.gold, C.purple];
  const col = isUPCL ? C.blue : stepColors[Math.min(project.step || 1, 11)];

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{
        backgroundColor: C.card, borderRadius: 22, padding: 18, marginBottom: 12,
        borderWidth: 1, borderColor: isUPCL ? C.blue + '60' : C.border,
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
              <Text style={{ color: col, fontSize: 10, fontWeight: '800' }}>{isUPCL ? '🏛️ UPCL' : `${project.step || 1}/10`}</Text>
            </View>
            {project.failed_document && <Text style={{ color: C.red, fontSize: 10, fontWeight: '700' }}>⚠️ Rejected</Text>}
          </View>
        </View>

        <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: col, borderRadius: 2 }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PulsingDot color={pct >= 100 ? C.green : isUPCL ? C.blue : C.gold} />
            <Text style={{ color: isUPCL ? C.blue : C.text2, fontSize: 12, fontWeight: isUPCL ? '700' : '400' }}>
              {isUPCL ? '🏛️ UPCL Verification (Bill Issue)' : (project.status || 'Registration')}
            </Text>
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
function DashboardScreen({ role, userId, accessCode, onLogout }: { role: string; userId?: string | null; accessCode?: string | null; onLogout: () => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [adminFilter, setAdminFilter] = useState('all');
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

  const ADMIN_TABS = [
    { key: 'all', label: 'All Projects', icon: '🌐' },
    { key: 'upcl', label: 'UPCL', icon: '⚡' },
    { key: 'bo_registration', label: 'Registration', icon: '📝' },
    { key: 'bo_quotation', label: 'Quotation', icon: '📋' },
    { key: 'bo_agreement', label: 'Agreement', icon: '📄' },
    { key: 'bo_loan', label: 'Loan', icon: '🏦' },
    { key: 'bank', label: 'Bank', icon: '💰' },
    { key: 'store', label: 'Store / Dispatch', icon: '📦' },
    { key: 'installation', label: 'Installation', icon: '🔧' },
    { key: 'bo_upload_inst', label: 'Upload Inst.', icon: '📤' },
    { key: 'bo_subsidy', label: 'Subsidy', icon: '🎁' },
  ];

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
      let query = '';
      if (role === 'admin') {
        if (adminFilter !== 'all') {
          query = `?role=${adminFilter}`;
        }
      } else if (role === 'employee' || role === 'client') {
        const storedUid = await AsyncStorage.getItem('ramsun_user_id').catch(() => null);
        const activeUid = userId || storedUid;
        if (activeUid) {
          query = `?user_id=${activeUid}&role=${role}`;
        } else {
          query = `?role=${role}`;
        }
      } else {
        // Department roles logged in via access code (e.g. upcl, bo_registration, etc.)
        query = `?role=${role}`;
      }
      const r = await fetch(`${API_URL}/projects${query}`);
      if (r.status === 401 || r.status === 403) {
        Alert.alert('Session Expired', 'Your account has been removed or rotated by the administrator.');
        onLogout();
        return;
      }
      if (!r.ok) throw new Error();
      setProjects(await r.json());
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [role, userId, adminFilter, onLogout]);

  const refreshProjectDetail = async () => {
    await load();
    if (selected) {
      try {
        let query = '';
        if (role === 'admin') {
          if (adminFilter !== 'all') query = `?role=${adminFilter}`;
        } else if (role === 'employee' || role === 'client') {
          const storedUid = await AsyncStorage.getItem('ramsun_user_id').catch(() => null);
          const activeUid = userId || storedUid;
          if (activeUid) query = `?user_id=${activeUid}&role=${role}`;
        } else {
          query = `?role=${role}`;
        }
        const r = await fetch(`${API_URL}/projects${query}`);
        if (r.status === 401 || r.status === 403) {
          Alert.alert('Session Expired', 'Your account has been removed or rotated by the administrator.');
          onLogout();
          return;
        }
        if (r.ok) {
          const list = await r.json();
          const updated = list.find((p: any) => p.id === selected.id);
          if (updated) setSelected(updated);
        }
      } catch(e) {}
    }
  };

  useEffect(() => { load(); }, [load]);

  // Real-time session validation: auto-signout if access code rotated/revoked or account deleted
  useEffect(() => {
    if (role === 'admin') return;
    const interval = setInterval(async () => {
      try {
        const storedCode = accessCode || await AsyncStorage.getItem('ramsun_access_code').catch(() => null);
        if (storedCode) {
          const res = await fetch(`${API_URL}/auth/validate-code?code=${storedCode}`);
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            clearInterval(interval);
            Alert.alert('Session Expired', 'Your Access Code has been rotated or revoked by Admin. Please get the new code from management.');
            onLogout();
            return;
          }
          const d = await res.json().catch(() => ({}));
          if (d && d.valid === false) {
            clearInterval(interval);
            Alert.alert('Session Expired', 'Your Access Code has been rotated or revoked by Admin. Please get the new code from management.');
            onLogout();
            return;
          }
        } else {
          const storedUid = await AsyncStorage.getItem('ramsun_user_id').catch(() => null);
          const activeUid = userId || storedUid;
          if (!activeUid) return;
          const res = await fetch(`${API_URL}/auth/validate?user_id=${activeUid}`);
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            clearInterval(interval);
            Alert.alert('Session Expired', 'Your account has been removed by the administrator.');
            onLogout();
          }
        }
      } catch (e) {
        // Network offline: ignore
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [role, userId, accessCode, onLogout]);

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
      throw error;
    }
  };

  const isEmailLogin = !accessCode || role === 'employee' || role === 'client';
  const canTransfer = !isEmailLogin && role !== 'admin';
  const isRegistrationRole = role === 'bo_registration' || role === 'registration';
  // ONLY Registration role with access code (or admin) can create projects; email login CANNOT create projects
  const canCreateProject = (Boolean(accessCode) && isRegistrationRole) || role === 'admin';

  // Strict department and section isolation: Only show projects belonging to the active section
  const displayProjects = projects.filter(p => {
    if (role && role !== 'admin' && role !== 'employee' && role !== 'client') {
      const step = parseInt(p.step || 1);
      const isUpcl = Boolean(p.needs_upcl == 1 || p.needs_upcl === true || (p.status && p.status.toUpperCase().includes('UPCL')));
      if (role === 'bo_registration' || role === 'registration') {
        return step === 1 && !isUpcl;
      }
      if (role === 'upcl' || role === 'bo_upcl') {
        return step === 1 && isUpcl;
      }
      if (ROLE_ALLOWED_STEPS[role]) {
        return ROLE_ALLOWED_STEPS[role].includes(step);
      }
      return false;
    }
    return true;
  });

  const stats = [
    { label: 'Total', val: displayProjects.length, color: C.blue },
    { label: 'Pending', val: displayProjects.filter(p => !p.step || p.step < 2).length, color: C.gold },
    { label: 'Active', val: displayProjects.filter(p => (p.step || 1) >= 2 && (p.step || 1) < 10).length, color: C.purple },
    { label: 'Done', val: displayProjects.filter(p => (p.step || 1) >= 10).length, color: C.green },
  ];

  const deptCfg = DEPARTMENT_CONFIG[role];
  const roleColor = role === 'admin' ? C.gold : (deptCfg?.color || C.green);
  const displayRoleLabel = role === 'admin' ? 'ADMIN' : (deptCfg?.label || role).toUpperCase();

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
                <Text style={{ color: roleColor, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{displayRoleLabel}</Text>
              </View>
              <TouchableOpacity onPress={onLogout} style={{ backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.text2, fontSize: 11, fontWeight: '700' }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Team Department Queue Banner - Clean without logo/icon */}
        {role !== 'admin' && role !== 'employee' && deptCfg && (
          <View style={{
            marginHorizontal: 16, marginBottom: 14,
            backgroundColor: deptCfg.color + '15',
            borderRadius: 20, padding: 16,
            borderWidth: 1.5, borderColor: deptCfg.color + '55',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: deptCfg.color, fontSize: 17, fontWeight: '900' }}>
                {deptCfg.label} Portal
              </Text>
              <View style={{ backgroundColor: deptCfg.color + '25', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: deptCfg.color, fontSize: 9, fontWeight: '800' }}>ACTIVE QUEUE</Text>
              </View>
            </View>
            <Text style={{ color: C.text2, fontSize: 12, marginTop: 4 }}>
              {displayProjects.length} {displayProjects.length === 1 ? 'project' : 'projects'} assigned to your section
            </Text>
          </View>
        )}

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

        {/* Admin Filter Tabs - Clean name without icon */}
        {role === 'admin' && (
          <View style={{ marginBottom: 12, marginTop: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {ADMIN_TABS.map(tab => {
                const active = adminFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setAdminFilter(tab.key)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: active ? C.gold : C.card,
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
                      borderWidth: 1, borderColor: active ? C.gold : C.border,
                    }}
                  >
                    <Text style={{ color: active ? '#000' : C.text, fontSize: 12, fontWeight: active ? '900' : '700' }}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Projects Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 8, marginBottom: 12 }}>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>
            {role === 'admin' && adminFilter !== 'all' ? `${ADMIN_TABS.find(t => t.key === adminFilter)?.label} Projects` : 'Projects'}
          </Text>
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
          ) : displayProjects.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 70, gap: 14 }}>
              <RamsunLogo size={70} />
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', marginTop: 8 }}>No Projects in Queue</Text>
              <Text style={{ color: C.text2, fontSize: 14, textAlign: 'center' }}>
                {role === 'admin' ? 'Tap the + button below\nto add your first project' : 'Your department queue currently has no pending projects.'}
              </Text>
            </View>
          ) : (
            displayProjects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} onPress={() => setSelected(p)} />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB - Only visible for Registration access code users and Admin */}
      {canCreateProject && (
        <Animated.View style={{ position: 'absolute', bottom: 36, right: 24, transform: [{ scale: fabScale }] }}>
          <TouchableOpacity onPress={() => setNewModal(true)} activeOpacity={0.85} style={{
            width: 64, height: 64, borderRadius: 22, backgroundColor: C.gold,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: C.gold, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 18,
          }}>
            <Text style={{ color: '#000', fontSize: 34, lineHeight: 38, fontWeight: '200', marginTop: -2 }}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {selected && (
        <ProjectDetailModal project={selected} role={role} visible={!!selected} onClose={() => setSelected(null)} onUpdateStep={updateStep} onRefresh={refreshProjectDetail} canTransfer={canTransfer} />
      )}
      <NewProjectModal visible={newModal} userId={userId} onClose={() => setNewModal(false)} onSuccess={() => { load(); showToast('Project created successfully! 🎉'); }} />
    </SafeAreaView>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: string, userId?: string | number | null, accessCode?: string | null) => void }) {
  const [loginType, setLoginType] = useState<'code' | 'email'>('code');
  const [accessCode, setAccessCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phase, setPhase] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
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

  const handleCodeLogin = async () => {
    const clean = accessCode.trim().toUpperCase();
    if (!clean) {
      setCodeError('Please enter your 8-digit access code');
      return;
    }
    setCodeLoading(true);
    setCodeError('');
    try {
      const res = await fetch(`${API_URL}/auth/login-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean })
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        const teamRole = d.user?.role || 'employee';
        await AsyncStorage.setItem('ramsun_access_code', clean).catch(() => {});
        await AsyncStorage.setItem('ramsun_user_role', teamRole).catch(() => {});
        onLogin(teamRole, null, clean);
      } else {
        setCodeError(d.message || 'Invalid or revoked access code. Please check with admin.');
      }
    } catch (e: any) {
      setCodeError('Cannot connect to server. Check your network.');
    } finally {
      setCodeLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m); setError(''); setPhase('form'); setOtp(''); setDevOtp('');
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
        const d = await r.json().catch(() => ({}));
        if (d.success) {
          const uid = d.user?.id || d.user?.user_id;
          if (uid) {
            await AsyncStorage.setItem('ramsun_user_id', String(uid)).catch(() => {});
          }
          onLogin(d.user?.role || 'employee', uid, null);
        }
        else setError(d.message || 'Invalid credentials. Try again.');
      } else {
        const r = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }), signal: controller.signal });
        const d = await r.json().catch(() => ({}));
        if (d.success) {
          setPhase('otp');
          if (d.otp) {
            setDevOtp(d.otp);
            setOtp(d.otp);
          }
        }
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
    const codeToVerify = otp.trim() || devOtp || '1234';
    if (codeToVerify.length < 4) { setError('Enter the complete 4-digit OTP'); return; }
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch(`${API_URL}/auth/verify-register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), otp: codeToVerify }), signal: controller.signal });
      const d = await r.json().catch(() => ({}));
      if (d.success) {
        const uid = d.user?.id || d.user?.user_id;
        if (uid) {
          await AsyncStorage.setItem('ramsun_user_id', String(uid)).catch(() => {});
        }
        onLogin(d.user?.role || 'employee', uid, null);
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
          <Animated.View style={{ transform: [{ scale: logoScale }], marginBottom: 18, alignItems: 'center' }}>
            <RamsunLogo size={98} />
          </Animated.View>
          <Text style={{ color: C.text, fontSize: 38, fontWeight: '900', letterSpacing: -1, textAlign: 'center' }}>
            Ramsun<Text style={{ color: C.gold }}>Solar</Text>
          </Text>
          <Text style={{ color: C.text2, fontSize: 13, marginTop: 4, marginBottom: 28, letterSpacing: 0.8 }}>
            Team & Management Mobile Portal
          </Text>

          {/* Card */}
          <Animated.View style={{
            width: '100%', backgroundColor: C.card, borderRadius: 28, padding: 22,
            borderWidth: 1, borderColor: C.border,
            shadowColor: C.gold, shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.07, shadowRadius: 40, elevation: 14,
            transform: [{ translateY: cardY }],
          }}>
            {/* Main Login Switcher: Access Code vs Email */}
            <View style={{ flexDirection: 'row', backgroundColor: C.bg2, borderRadius: 16, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
              <TouchableOpacity
                onPress={() => { setLoginType('code'); setCodeError(''); }}
                activeOpacity={0.8}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  backgroundColor: loginType === 'code' ? C.gold : 'transparent',
                }}
              >
                <Text style={{ color: loginType === 'code' ? '#000' : C.text2, fontWeight: '800', fontSize: 13 }}>
                  🔑 Access Code
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setLoginType('email'); setError(''); }}
                activeOpacity={0.8}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  backgroundColor: loginType === 'email' ? C.gold : 'transparent',
                }}
              >
                <Text style={{ color: loginType === 'email' ? '#000' : C.text2, fontWeight: '800', fontSize: 13 }}>
                  👤 Email Login
                </Text>
              </TouchableOpacity>
            </View>

            {loginType === 'code' ? (
              /* ACCESS CODE FORM */
              <View>
                <Text style={{ color: C.text, fontSize: 21, fontWeight: '900', marginBottom: 4 }}>
                  Team Member Portal
                </Text>
                <Text style={{ color: C.text2, fontSize: 12, marginBottom: 18, lineHeight: 18 }}>
                  Enter the 8-character Access Code issued by Admin to open your section queue.
                </Text>

                {!!codeError && (
                  <View style={{ backgroundColor: C.red + '18', borderWidth: 1, borderColor: C.red + '50', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 16 }}>⚠️</Text>
                    <Text style={{ color: C.red, fontSize: 13, fontWeight: '600', flex: 1 }}>{codeError}</Text>
                  </View>
                )}

                <Text style={{ color: C.text2, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 }}>
                  ENTER ACCESS CODE
                </Text>
                <TextInput
                  style={{
                    backgroundColor: C.bg2, borderWidth: 2, borderColor: C.gold + '75',
                    borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16,
                    fontSize: 26, fontWeight: '900', color: C.gold, textAlign: 'center',
                    letterSpacing: 6, marginBottom: 18,
                  }}
                  placeholder="e.g. 7X9K2M4P"
                  placeholderTextColor={C.text3}
                  value={accessCode}
                  onChangeText={t => { setAccessCode(t.toUpperCase()); setCodeError(''); }}
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />

                <PrimaryBtn
                  label="Enter Workspace →"
                  onPress={handleCodeLogin}
                  loading={codeLoading}
                />

                <View style={{ marginTop: 16, backgroundColor: C.bg2, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text3, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
                    💡 Admin generates access codes exclusively on the Web Admin Panel. If your code is expired or rotated, please contact management.
                  </Text>
                </View>
              </View>
            ) : (
              /* EMAIL LOGIN / REGISTER FORM */
              <View>
                {/* Secondary Tab switcher */}
                <View style={{ flexDirection: 'row', backgroundColor: C.bg2, borderRadius: 14, padding: 3, marginBottom: 20, borderWidth: 1, borderColor: C.border }}>
                  {(['login', 'register'] as const).map(m => (
                    <TouchableOpacity key={m} onPress={() => switchMode(m)} activeOpacity={0.8} style={{
                      flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                      backgroundColor: mode === m ? C.gold + '25' : 'transparent',
                    }}>
                      <Text style={{ color: mode === m ? C.gold : C.text2, fontWeight: '800', fontSize: 12 }}>
                        {m === 'login' ? 'Sign In' : 'Register'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {phase === 'form' ? (
                  <>
                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', marginBottom: 4 }}>
                      {mode === 'login' ? 'Welcome Back 👋' : 'Create Account'}
                    </Text>
                    <Text style={{ color: C.text2, fontSize: 12, marginBottom: 18 }}>
                      {mode === 'login' ? 'Sign in with your email & password' : 'Register for access'}
                    </Text>

                    {!!error && (
                      <View style={{ backgroundColor: C.red + '18', borderWidth: 1, borderColor: C.red + '50', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 }}>
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
                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', marginBottom: 4 }}>Verify Your Account</Text>
                    <Text style={{ color: C.text2, fontSize: 12, marginBottom: 14 }}>
                      OTP sent to <Text style={{ color: C.gold, fontWeight: '700' }}>{email}</Text>
                    </Text>

                    {!!devOtp ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { setOtp(devOtp); setError(''); }}
                        style={{
                          backgroundColor: C.gold + '22',
                          borderWidth: 1.5,
                          borderColor: C.gold,
                          borderRadius: 14,
                          padding: 12,
                          marginBottom: 16,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: C.gold, fontSize: 14, fontWeight: '900' }}>
                          🔑 Verification Code: {devOtp}
                        </Text>
                        <Text style={{ color: C.text2, fontSize: 11, marginTop: 3 }}>
                          Tap here to auto-fill code
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, marginBottom: 14, alignItems: 'center' }}>
                        <Text style={{ color: C.text2, fontSize: 11 }}>
                          Test / Fallback code: <Text style={{ color: C.gold, fontWeight: '800' }}>1234</Text>
                        </Text>
                      </View>
                    )}

                    {!!error && (
                      <View style={{ backgroundColor: C.red + '18', borderWidth: 1, borderColor: C.red + '50', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 16 }}>⚠️</Text>
                        <Text style={{ color: C.red, fontSize: 13, fontWeight: '600', flex: 1 }}>{error}</Text>
                      </View>
                    )}

                    <Text style={{ color: C.text2, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 }}>ENTER OTP</Text>
                    <TextInput
                      style={{ backgroundColor: C.bg2, borderWidth: 2, borderColor: C.gold + '70', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 20, fontSize: 36, fontWeight: '900', color: C.text, textAlign: 'center', letterSpacing: 14, marginBottom: 18 }}
                      placeholder="• • • •" placeholderTextColor={C.text3}
                      value={otp} onChangeText={t => { setOtp(t.replace(/\D/g, '')); setError(''); }}
                      keyboardType="number-pad" maxLength={4} autoFocus
                    />
                    <PrimaryBtn label="Verify & Enter →" onPress={handleOTP} loading={loading} />
                    <TouchableOpacity onPress={() => { setPhase('form'); setOtp(''); setError(''); }} style={{ marginTop: 14, alignItems: 'center' }}>
                      <Text style={{ color: C.text2, fontWeight: '600', fontSize: 13 }}>← Go Back</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </Animated.View>

          <Text style={{ color: C.text3, fontSize: 11, marginTop: 24 }}>
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
  const [userId, setUserId] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('ramsun_user_role'),
      AsyncStorage.getItem('ramsun_user_id'),
      AsyncStorage.getItem('ramsun_access_code'),
    ])
      .then(async ([r, uId, aCode]) => {
        // If user logged in with an access code:
        if (aCode && r) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const vRes = await fetch(`${API_URL}/auth/validate-code?code=${aCode}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (vRes.status === 401 || vRes.status === 403 || vRes.status === 404) {
              await AsyncStorage.removeItem('ramsun_user_role').catch(() => {});
              await AsyncStorage.removeItem('ramsun_access_code').catch(() => {});
              setRole(null);
              setAccessCode(null);
              setChecking(false);
              return;
            }
            const d = await vRes.json().catch(() => ({}));
            if (d && d.valid === false) {
              await AsyncStorage.removeItem('ramsun_user_role').catch(() => {});
              await AsyncStorage.removeItem('ramsun_access_code').catch(() => {});
              setRole(null);
              setAccessCode(null);
              setChecking(false);
              return;
            }
            setRole(d.role || r);
            setAccessCode(aCode);
            setChecking(false);
            return;
          } catch (e) {
            setRole(r);
            setAccessCode(aCode);
            setChecking(false);
            return;
          }
        }

        // If user logged in with email/password:
        if (r && uId) {
          if (r !== 'admin') {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 6000);
              const vRes = await fetch(`${API_URL}/auth/validate?user_id=${uId}`, { signal: controller.signal });
              clearTimeout(timeout);
              if (vRes.status === 401 || vRes.status === 403 || vRes.status === 404) {
                await AsyncStorage.removeItem('ramsun_user_role').catch(() => {});
                await AsyncStorage.removeItem('ramsun_user_id').catch(() => {});
                setRole(null);
                setUserId(null);
                setChecking(false);
                return;
              }
            } catch (e) {}
          }
          setRole(r);
          setUserId(uId);
        } else if (r === 'admin') {
          setRole(r);
          setUserId(uId);
        } else {
          await AsyncStorage.removeItem('ramsun_user_role').catch(() => {});
          await AsyncStorage.removeItem('ramsun_user_id').catch(() => {});
          await AsyncStorage.removeItem('ramsun_access_code').catch(() => {});
          setRole(null);
          setUserId(null);
          setAccessCode(null);
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const handleLogin = async (r: string, uId?: string | number | null, aCode?: string | null) => {
    await AsyncStorage.setItem('ramsun_user_role', r).catch(() => {});
    if (aCode) {
      await AsyncStorage.setItem('ramsun_access_code', aCode).catch(() => {});
      setAccessCode(aCode);
    }
    if (uId) {
      await AsyncStorage.setItem('ramsun_user_id', String(uId)).catch(() => {});
      setUserId(String(uId));
    }
    setRole(r);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('ramsun_user_role').catch(() => {});
    await AsyncStorage.removeItem('ramsun_user_id').catch(() => {});
    await AsyncStorage.removeItem('ramsun_access_code').catch(() => {});
    setRole(null);
    setUserId(null);
    setAccessCode(null);
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
    ? <DashboardScreen role={role} userId={userId} accessCode={accessCode} onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />;
}

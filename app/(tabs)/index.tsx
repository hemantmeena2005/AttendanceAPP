import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';

// *** CONFIG ***
const API_URL = 'http://192.168.69.249:3000/api/attendance/batch'; 
const { width } = Dimensions.get('window');
const SCANNER_SIZE = 280;

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [isIdSaved, setIsIdSaved] = useState(false);
  
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadStoredData();
    const interval = setInterval(() => {
      checkNetwork();
      syncQueue();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStoredData = async () => {
    try {
      const savedId = await AsyncStorage.getItem('studentId');
      const savedQueue = await AsyncStorage.getItem('offlineQueue');
      if (savedId) { setStudentId(savedId); setIsIdSaved(true); }
      if (savedQueue) setQueue(JSON.parse(savedQueue));
    } catch (e) {}
  };

  const checkNetwork = async () => {
    const status = await Network.getNetworkStateAsync();
    const online = status.isConnected && status.isInternetReachable;
    setIsOnline(online);
    return online;
  };

  const saveStudentId = async () => {
    if (!studentId.trim()) return Alert.alert("Wait", "Please enter your Student ID");
    // Confirm before locking
    Alert.alert(
      "Confirm ID",
      `Is "${studentId}" correct? You cannot change this later.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm & Lock", onPress: async () => {
            await AsyncStorage.setItem('studentId', studentId);
            setIsIdSaved(true);
        }}
      ]
    );
  };

  // --- NEW HELPER: ADD TO HISTORY ---
  const addToHistory = async (records) => {
    try {
      const currentHist = JSON.parse(await AsyncStorage.getItem('attendanceHistory') || '[]');
      const combined = [...records, ...currentHist];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      await AsyncStorage.setItem('attendanceHistory', JSON.stringify(unique));
    } catch (e) {
      console.log("Error saving history", e);
    }
  };

  const handleScan = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate(50); 
    
    const newRecord = {
      id: `rec-${Date.now()}`,
      studentId, // Uses the locked ID
      token: data,
      scannedAtUtc: new Date().toISOString()
    };

    const online = await checkNetwork();
    
    if (online) {
      try {
        await sendBatch([newRecord]);
        await addToHistory([newRecord]); 
        Alert.alert("Synced", "Attendance marked successfully! ☁️");
      } catch (err) {
        saveOffline(newRecord);
      }
    } else {
      saveOffline(newRecord);
    }
  };

  const saveOffline = async (record) => {
    const updated = [...queue, record];
    setQueue(updated);
    await AsyncStorage.setItem('offlineQueue', JSON.stringify(updated));
    Alert.alert("Saved Offline", "No internet. Saved to queue. 💾");
  };

  const sendBatch = async (records) => {
    const res = await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    const json = await res.json();
    if (!json.results) throw new Error("Failed");
    return json;
  };

  const syncQueue = async () => {
    const q = JSON.parse(await AsyncStorage.getItem('offlineQueue') || '[]');
    if (q.length === 0 || isSyncing) return;

    const online = await checkNetwork();
    if (!online) return;

    setIsSyncing(true);
    try {
      await sendBatch(q);
      await addToHistory(q);
      setQueue([]);
      await AsyncStorage.setItem('offlineQueue', '[]');
      Vibration.vibrate([50, 50]); 
    } catch (e) {
      console.log("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- RENDER PERMISSION ---
  if (!permission) return <View style={styles.bg} />;
  if (!permission.granted) {
    return (
      <View style={[styles.bg, styles.center]}>
        <Ionicons name="camera-outline" size={80} color="#cbd5e1" />
        <Text style={styles.h2}>Camera Access Needed</Text>
        <Text style={styles.subtext}>To scan attendance QR codes</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- RENDER LOGIN (Only shows if no ID is saved) ---
  if (!isIdSaved) {
    return (
      <View style={[styles.bg, styles.center]}>
        <View style={styles.loginCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="school" size={32} color="#4f46e5" />
          </View>
          <Text style={styles.h1}>Welcome</Text>
          <Text style={styles.subtext}>Enter your ID to get started</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Student ID (e.g. 2023-CS-01)" 
            placeholderTextColor="#94a3b8"
            value={studentId} 
            onChangeText={setStudentId}
            autoCapitalize="characters"
          />
          
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={16} color="#d97706" />
            <Text style={styles.warningText}>ID will be locked to this device.</Text>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={saveStudentId}>
            <Text style={styles.btnText}>Confirm ID</Text>
            <Ionicons name="lock-closed" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="dark-content" />
      <BlurView intensity={80} tint="light" style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline Mode'}</Text>
        </View>
        
        {/* LOCKED ID DISPLAY (No Logout Button) */}
        <View style={styles.lockedIdContainer}>
          <Ionicons name="lock-closed" size={14} color="#94a3b8" />
          <Text style={styles.lockedIdText}>{studentId}</Text>
        </View>
      </BlurView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.scannerSection}>
          <Text style={styles.sectionTitle}>Scan Attendance</Text>
          <View style={styles.cameraContainer}>
            {scanned ? (
              <View style={styles.scannedView}>
                <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                <Text style={styles.scannedText}>Scanned!</Text>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setScanned(false)}>
                  <Text style={styles.btnSecText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleScan}
              >
                <View style={styles.frameContainer}>
                  <View style={styles.frameRow}>
                    <View style={[styles.corner, styles.tl]} />
                    <View style={[styles.corner, styles.tr]} />
                  </View>
                  <View style={styles.frameSpacer} />
                  <View style={styles.frameRow}>
                    <View style={[styles.corner, styles.bl]} />
                    <View style={[styles.corner, styles.br]} />
                  </View>
                </View>
              </CameraView>
            )}
          </View>
          <Text style={styles.hintText}>Align QR code within the frame</Text>
        </View>

        {queue.length > 0 && (
          <View style={styles.queueSection}>
            <View style={styles.queueHeader}>
              <Text style={styles.sectionTitle}>Pending Uploads ({queue.length})</Text>
              {isSyncing && <ActivityIndicator size="small" color="#4f46e5" />}
            </View>
            
            {queue.map((item, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="cloud-offline-outline" size={20} color="#f59e0b" />
                </View>
                <View style={{flex:1}}>
                  <Text style={styles.cardTitle}>Attendance Record</Text>
                  <Text style={styles.cardTime}>{new Date(item.scannedAtUtc).toLocaleString()}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={[styles.btnPrimary, {marginTop:10, backgroundColor:'#334155'}]} 
              onPress={syncQueue}
              disabled={isSyncing}
            >
              <Text style={styles.btnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
              <Ionicons name="sync" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContent: { paddingTop: 110, paddingBottom: 40, paddingHorizontal: 20 },
  h1: { fontSize: 28, fontWeight: '700', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  h2: { fontSize: 22, fontWeight: '600', color: '#0f172a', marginTop: 20 },
  subtext: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  hintText: { textAlign:'center', color:'#94a3b8', marginTop:12, fontSize:13 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 16, height: 100,
    borderBottomWidth: 1, borderColor: 'rgba(200,200,200,0.2)'
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  
  // Locked ID Style
  lockedIdContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  lockedIdText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  loginCard: { width: '100%', backgroundColor: 'white', padding: 24, borderRadius: 24, alignItems: 'center', shadowColor:'#000', shadowOpacity:0.05, shadowRadius:10, shadowOffset:{width:0,height:4} },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' },
  input: { width: '100%', height: 56, backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: '#0f172a', marginBottom: 16 },
  
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, backgroundColor: '#fffbeb', padding: 10, borderRadius: 8, width: '100%' },
  warningText: { color: '#b45309', fontSize: 13, flex: 1 },

  btnPrimary: { flexDirection:'row', gap:8, width:'100%', height: 56, backgroundColor: '#4f46e5', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor:'#4f46e5', shadowOpacity:0.3, shadowRadius:8, shadowOffset:{width:0,height:4} },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  btnSecondary: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#f1f5f9', borderRadius: 99, marginTop: 16 },
  btnSecText: { color: '#475569', fontWeight: '600' },
  scannerSection: { alignItems: 'center', marginBottom: 32 },
  cameraContainer: { width: SCANNER_SIZE, height: SCANNER_SIZE, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:20, shadowOffset:{width:0,height:10} },
  scannedView: { flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  scannedText: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  frameContainer: { flex: 1, padding: 20, justifyContent: 'space-between' },
  frameRow: { flexDirection: 'row', justifyContent: 'space-between' },
  frameSpacer: { flex: 1 },
  corner: { width: 40, height: 40, borderColor: 'white', borderWidth: 4, borderRadius: 4 },
  tl: { borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { borderRightWidth: 0, borderTopWidth: 0 },
  br: { borderLeftWidth: 0, borderTopWidth: 0 },
  queueSection: { width: '100%' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 8, gap: 16 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  cardTime: { fontSize: 12, color: '#94a3b8' },
});
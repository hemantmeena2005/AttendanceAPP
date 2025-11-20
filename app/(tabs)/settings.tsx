import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const [studentId, setStudentId] = useState('');
    const [savedId, setSavedId] = useState(null);
    const [queueCount, setQueueCount] = useState(0);
    const [appVersion, setAppVersion] = useState('1.0.0');

    // Auto-load data every time the tab is opened
    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [])
    );

    const loadSettings = async () => {
        try {
            const id = await AsyncStorage.getItem('studentId');
            const q = await AsyncStorage.getItem('offlineQueue');
            
            // Only update input if it's empty (don't overwrite user typing)
            if (!studentId && id) setStudentId(id);
            
            setSavedId(id);
            setQueueCount(q ? JSON.parse(q).length : 0);
        } catch (e) {
            console.log("Error loading settings", e);
        }
    };

    const handleSaveId = async () => {
        if (!studentId.trim()) return Alert.alert('Missing ID', 'Please type a Student ID first.');
        
        try {
            const trimmed = studentId.trim();
            await AsyncStorage.setItem('studentId', trimmed);
            setSavedId(trimmed);
            Alert.alert('Success', 'Student ID saved successfully.');
        } catch (e) {
            Alert.alert('Error', 'Could not save ID.');
        }
    };

    const handleLogout = async () => {
        Alert.alert("Log Out", "This will remove your Student ID from this device.", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: async () => {
                await AsyncStorage.removeItem('studentId');
                setSavedId(null);
                setStudentId('');
            }}
        ]);
    };

    const clearOfflineQueue = async () => {
        if (queueCount === 0) return;
        
        Alert.alert('Clear Queue', `Delete ${queueCount} pending records? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await AsyncStorage.setItem('offlineQueue', '[]');
                    setQueueCount(0);
                    Alert.alert('Cleared', 'Offline queue has been emptied.');
                } catch (e) {
                    Alert.alert('Error', 'Failed to clear queue.');
                }
            } }
        ]);
    };

    const clearHistory = async () => {
        Alert.alert('Clear History', 'Delete all past attendance logs?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                await AsyncStorage.removeItem('attendanceHistory');
                Alert.alert('Done', 'History cleared.');
            }}
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* STUDENT ID SECTION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person-circle-outline" size={24} color="#4f46e5" />
                        <Text style={styles.sectionTitle}>Student Profile</Text>
                    </View>
                    
                    <Text style={styles.label}>Student ID</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 2023-CS-01"
                        placeholderTextColor="#94a3b8"
                        value={studentId}
                        onChangeText={setStudentId}
                        autoCapitalize="characters"
                    />

                    <View style={styles.row}>
                        <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveId}>
                            <Text style={styles.btnText}>Save Changes</Text>
                        </TouchableOpacity>

                        {savedId && (
                            <TouchableOpacity style={styles.btnGhost} onPress={handleLogout}>
                                <Text style={styles.btnGhostText}>Log Out</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <Text style={styles.statusText}>
                        Current Status: {savedId ? <Text style={{color:'#22c55e', fontWeight:'bold'}}>Logged In ({savedId})</Text> : <Text style={{color:'#ef4444'}}>Not Saved</Text>}
                    </Text>
                </View>

                {/* DATA MANAGEMENT SECTION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="server-outline" size={24} color="#f59e0b" />
                        <Text style={styles.sectionTitle}>Data Management</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Offline Queue</Text>
                        <Text style={styles.infoValue}>{queueCount} Records</Text>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity 
                            style={[styles.btnSmall, { opacity: queueCount === 0 ? 0.5 : 1 }]} 
                            onPress={clearOfflineQueue}
                            disabled={queueCount === 0}
                        >
                            <Text style={styles.btnSmallText}>Clear Queue</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.btnSmall, styles.btnSmallDanger]} onPress={clearHistory}>
                            <Text style={[styles.btnSmallText, {color:'#ef4444'}]}>Clear History</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* APP INFO */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Attendance Scanner App</Text>
                    <Text style={styles.footerText}>Version {appVersion}</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    
    // Matches HistoryScreen Header
    header: { height: 100, paddingTop: 40, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
    
    scrollContent: { padding: 20 },

    // Sections
    section: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },

    // Inputs
    label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
    input: { height: 50, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#0f172a', marginBottom: 16 },
    
    // Buttons
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    btnPrimary: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
    btnText: { color: 'white', fontWeight: '600', fontSize: 15 },
    btnGhost: { paddingVertical: 12, paddingHorizontal: 12 },
    btnGhostText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },

    // Status
    statusText: { marginTop: 16, fontSize: 13, color: '#64748b' },

    // Data Management
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
    infoLabel: { fontSize: 15, color: '#64748b' },
    infoValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    
    actionRow: { flexDirection: 'row', gap: 12 },
    btnSmall: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    btnSmallDanger: { borderColor: '#fee2e2', backgroundColor: '#fef2f2' },
    btnSmallText: { fontSize: 14, fontWeight: '600', color: '#475569' },

    // Footer
    footer: { alignItems: 'center', marginTop: 20 },
    footerText: { fontSize: 13, color: '#94a3b8' },
});
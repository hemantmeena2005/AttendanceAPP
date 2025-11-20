import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HistoryScreen() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // FIX: This runs every time you tab into this screen
    useFocusEffect(
        useCallback(() => {
            loadRecords();
        }, [])
    );

    const loadRecords = async () => {
        // Don't set loading true here or it flickers every time you switch tabs
        // Only set it on initial mount if you prefer
        try {
            const offline = await AsyncStorage.getItem('offlineQueue');
            const history = await AsyncStorage.getItem('attendanceHistory');

            const offlineArr = offline ? JSON.parse(offline) : [];
            const historyArr = history ? JSON.parse(history) : [];

            // Identify offline items so we can style them differently
            const offlineWithFlag = offlineArr.map(i => ({...i, isOffline: true}));

            const merged = [...offlineWithFlag, ...historyArr].sort((a, b) => {
                const ta = a.scannedAtUtc ? new Date(a.scannedAtUtc).getTime() : 0;
                const tb = b.scannedAtUtc ? new Date(b.scannedAtUtc).getTime() : 0;
                return tb - ta;
            });

            setRecords(merged);
        } catch (e) {
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRecords();
        setRefreshing(false);
    };

    const clearAll = async () => {
        Alert.alert("Clear History", "Are you sure?", [
            { text: "Cancel" },
            { text: "Clear", style: 'destructive', onPress: async () => {
                await AsyncStorage.removeItem('attendanceHistory');
                loadRecords();
            }}
        ]);
    };

    const renderItem = ({ item }) => {
        const when = item.scannedAtUtc ? new Date(item.scannedAtUtc).toLocaleString() : 'Unknown';
        return (
            <View style={styles.card}>
                <View style={[styles.iconWrap, item.isOffline ? {backgroundColor:'#fffbeb'} : {}]}>
                    <Ionicons 
                        name={item.isOffline ? "cloud-offline" : "checkmark-done"} 
                        size={22} 
                        color={item.isOffline ? "#f59e0b" : "#22c55e"} 
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.studentId || 'Unknown Student'}</Text>
                    <Text style={styles.subtitle}>{when}</Text>
                </View>
                {item.isOffline && <Text style={styles.tag}>Pending</Text>}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>History</Text>
                <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>
            ) : records.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="time-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>No records yet</Text>
                </View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(i) => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { height: 100, paddingTop: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderBottomWidth:1, borderColor:'#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
    clearBtn: { padding: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyText: { marginTop: 12, fontSize: 18, fontWeight: '600', color: '#94a3b8' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
    iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    tag: { fontSize:12, color:'#f59e0b', fontWeight:'600', backgroundColor:'#fffbeb', paddingHorizontal:8, paddingVertical:4, borderRadius:8 }
});
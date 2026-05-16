import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { api } from '../lib/api';

interface SupplierScore {
  supplierId: string;
  totalInspections: number;
  passRate: number;
  grade: string;
  score: number;
  openNCRs: number;
  criticalNCRs: number;
}

export default function QualityScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'scores' | 'inspect'>('scores');
  const [scores, setScores] = useState<SupplierScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [verdict, setVerdict] = useState<'pass' | 'fail'>('pass');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/qms/suppliers/quality-report');
      setScores(res.data || []);
    } catch {
      setScores([
        { supplierId: 'Samsung Vina', totalInspections: 120, passRate: 99.2, grade: 'A', score: 98, openNCRs: 0, criticalNCRs: 0 },
        { supplierId: 'LG Display', totalInspections: 85, passRate: 94.5, grade: 'B', score: 88, openNCRs: 1, criticalNCRs: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordInspection = async () => {
    try {
      setLoading(true);
      await api.post('/qms/inspections', {
        referenceType: 'production',
        referenceId: 'dummy-id',
        verdict,
        notes,
      });
      Alert.alert('Thành công', 'Đã ghi nhận kết quả kiểm tra chất lượng.');
      setNotes('');
      setActiveTab('scores');
      fetchScores();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể ghi nhận kết quả');
    } finally {
      setLoading(false);
    }
  };

  const renderScores = () => (
    <ScrollView style={styles.list}>
      {scores.map((score, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.supplierName}>{score.supplierId}</Text>
            <View style={[styles.badge, { backgroundColor: '#05966920' }]}>
              <Text style={[styles.badgeText, { color: '#059669' }]}>Hạng: {score.grade}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}><Text style={styles.statLabel}>Tỷ lệ đạt</Text><Text style={styles.statValue}>{score.passRate}%</Text></View>
            <View style={styles.statBox}><Text style={styles.statLabel}>NCR</Text><Text style={[styles.statValue, { color: '#dc2626' }]}>{score.openNCRs}</Text></View>
            <View style={styles.statBox}><Text style={styles.statLabel}>Điểm</Text><Text style={styles.statValue}>{score.score}</Text></View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderInspectForm = () => (
    <View style={styles.form}>
      <Text style={styles.label}>Kết luận kiểm tra</Text>
      <View style={styles.verdictRow}>
        <TouchableOpacity 
          style={[styles.verdictBtn, verdict === 'pass' && styles.verdictBtnPass]} 
          onPress={() => setVerdict('pass')}
        >
          <Text style={[styles.verdictBtnText, verdict === 'pass' && styles.verdictBtnTextActive]}>ĐẠT (PASS)</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.verdictBtn, verdict === 'fail' && styles.verdictBtnFail]} 
          onPress={() => setVerdict('fail')}
        >
          <Text style={[styles.verdictBtnText, verdict === 'fail' && styles.verdictBtnTextActive]}>LỖI (FAIL)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Ghi chú / Mô tả lỗi</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
        placeholder="Nhập chi tiết quan sát..."
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleRecordInspection}>
        <Text style={styles.submitBtnText}>Ghi nhận kết quả</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kiểm soát Chất lượng (QC)</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'scores' && styles.tabActive]} 
          onPress={() => setActiveTab('scores')}
        >
          <Text style={[styles.tabText, activeTab === 'scores' && styles.tabTextActive]}>Xếp hạng NCC</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'inspect' && styles.tabActive]} 
          onPress={() => setActiveTab('inspect')}
        >
          <Text style={[styles.tabText, activeTab === 'inspect' && styles.tabTextActive]}>Kiểm tra tại xưởng</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      ) : (
        activeTab === 'scores' ? renderScores() : renderInspectForm()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#2563eb' },
  list: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  supplierName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  verdictRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  verdictBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  verdictBtnPass: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  verdictBtnFail: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  verdictBtnText: { fontWeight: '700', color: '#6b7280' },
  verdictBtnTextActive: { color: '#111827' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 24, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#1e1b4b', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

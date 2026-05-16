import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { api } from '../lib/api';
import { useTranslation } from '@smart-erp/i18n';

export default function TimesheetScreen() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.items || []);
      if (res.items?.length > 0) setSelectedProject(res.items[0].id);
    } catch (err) {
      console.error('Fetch projects failed', err);
    }
  };

  const handleSubmit = async () => {
    if (!hours || !selectedProject) {
      Alert.alert('Lỗi', 'Vui lòng chọn dự án và nhập số giờ');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/projects/${selectedProject}/timesheets`, {
        hours: parseFloat(hours),
        description,
        date: new Date().toISOString(),
      });
      Alert.alert('Thành công', 'Đã ghi nhận giờ làm việc');
      setHours('');
      setDescription('');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi timesheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Ghi nhận Giờ làm việc</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Dự án</Text>
        <View style={styles.projectList}>
          {projects.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.projectCard,
                selectedProject === p.id && styles.projectSelected,
              ]}
              onPress={() => setSelectedProject(p.id)}
            >
              <Text style={[
                styles.projectText,
                selectedProject === p.id && styles.projectTextSelected,
              ]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Số giờ làm việc</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Nhập số giờ (VD: 8)"
          value={hours}
          onChangeText={setHours}
        />

        <Text style={styles.label}>Ghi chú công việc</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          placeholder="Bạn đã làm gì?"
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.disabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Đang gửi...' : 'Gửi Timesheet'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  projectList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  projectCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  projectSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  projectText: { fontSize: 13, color: '#4b5563' },
  projectTextSelected: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});

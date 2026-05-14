import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { api } from '../lib/api';
import { formatVND } from '@smart-erp/utils';

interface AccountingStats {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  cashBalance: number;
  bankBalance: number;
}

export default function AccountingScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<AccountingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<AccountingStats>('/accounting/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to fetch accounting stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('nav.accounting')}</Text>
        <Text style={styles.subtitle}>{t('accounting.financeOverview')}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.revenueCard]}>
          <Text style={styles.statLabel}>{t('dashboard.todayRevenue')}</Text>
          <Text style={styles.statValue}>{formatVND(data?.totalRevenue || 0)}</Text>
        </View>

        <View style={[styles.statCard, styles.expenseCard]}>
          <Text style={styles.statLabel}>{t('accounting.totalExpense')}</Text>
          <Text style={[styles.statValue, styles.textRed]}>{formatVND(data?.totalExpense || 0)}</Text>
        </View>

        <View style={[styles.statCard, styles.incomeCard]}>
          <Text style={styles.statLabel}>{t('accounting.netIncome')}</Text>
          <Text style={[styles.statValue, styles.textBlue]}>{formatVND(data?.netIncome || 0)}</Text>
        </View>

        <View style={[styles.statCard, styles.cashCard]}>
          <Text style={styles.statLabel}>{t('accounting.cashBalance')}</Text>
          <Text style={styles.statValue}>{formatVND(data?.cashBalance || 0)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accounting.bankAccounts')}</Text>
        <View style={styles.bankItem}>
          <View>
            <Text style={styles.bankName}>Vietcombank</Text>
            <Text style={styles.bankAcc}>**** 1234</Text>
          </View>
          <Text style={styles.bankBalance}>{formatVND(data?.bankBalance || 0)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  statsGrid: { padding: 12, gap: 12 },
  statCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  revenueCard: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  expenseCard: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  incomeCard: { borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  cashCard: { borderLeftWidth: 4, borderLeftColor: '#06b6d4' },
  statLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  textRed: { color: '#ef4444' },
  textBlue: { color: '#3b82f6' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  bankItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  bankName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  bankAcc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  bankBalance: { fontSize: 16, fontWeight: '700', color: '#059669' },
});
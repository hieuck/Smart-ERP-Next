import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from '@smart-erp/i18n';
import { syncService } from '../lib/sync-service';

interface SyncStatusProps {
  onPress?: () => void;
}

export function SyncStatusIndicator({ onPress }: SyncStatusProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error' | 'offline'>('idle');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const checkStatus = async () => {
      const isOnline = await syncService.isOnline();
      const pending = await syncService.getPendingCount();
      const lastSync = await syncService.getLastSyncTime();

      setPendingChanges(pending);
      setLastSyncTime(lastSync ? new Date(lastSync) : null);

      if (!isOnline) {
        setStatus('offline');
      } else if (pending > 0) {
        setStatus('syncing');
      } else {
        setStatus('idle');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status === 'syncing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return { color: '#3b82f6', label: t('sync.status.syncing'), icon: '↻' };
      case 'error':
        return { color: '#ef4444', label: t('sync.status.error'), icon: '⚠️' };
      case 'offline':
        return { color: '#6b7280', label: t('sync.status.offline'), icon: '📴' };
      default:
        return { color: '#10b981', label: t('sync.status.idle'), icon: '✓' };
    }
  };

  const config = getStatusConfig();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={!onPress}>
      <Animated.View style={[styles.dot, { backgroundColor: config.color, opacity: pulseAnim }]} />
      <Text style={styles.icon}>{config.icon}</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
        {pendingChanges > 0 && (
          <Text style={styles.pending}>{t('common.sync.pendingChanges', { count: pendingChanges })}</Text>
        )}
        {lastSyncTime && status === 'idle' && (
          <Text style={styles.lastSync}>
            {t('common.sync.lastSync')}: {lastSyncTime.toLocaleTimeString('vi-VN')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  icon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  pending: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 2,
  },
  lastSync: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
});
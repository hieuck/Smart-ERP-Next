import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { syncService } from '../lib/sync-service';

const ACTIONS = [
  { id: 'create_order', icon: '📦', labelKey: 'orders.createOrder', route: 'OrderCreate' },
  { id: 'add_product', icon: '➕', labelKey: 'products.add', route: 'ProductCreate' },
  { id: 'sync', icon: '🔄', labelKey: 'actions.syncNow', action: 'sync' },
];

export function QuickActions() {
  const { t } = useTranslation('common');
  const navigation = useNavigation();

  const handlePress = async (action: any) => {
    if (action.route) {
      navigation.navigate(action.route as never);
    } else if (action.action === 'sync') {
      await syncService.sync();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('dashboard.quickActions')}</Text>
      <View style={styles.row}>
        {ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.button}
            onPress={() => handlePress(action)}
          >
            <Text style={styles.icon}>{action.icon}</Text>
            <Text style={styles.label}>{t(action.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    minWidth: 80,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#374151',
  },
});

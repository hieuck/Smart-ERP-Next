import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { formatVND } from '@smart-erp/utils';

interface DataPoint {
  date: string;
  revenue: number;
}

interface BiChartProps {
  data: DataPoint[];
  title: string;
}

export const BiChart = ({ data, title }: BiChartProps) => {
  const maxVal = Math.max(...data.map(d => d.revenue), 1000000);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartArea}>
        {data.map((item, index) => (
          <View key={index} style={styles.barContainer}>
            <View 
              style={[
                styles.bar, 
                { height: (item.revenue / maxVal) * 120 + 2 }
              ]} 
            />
            <Text style={styles.label}>{item.date}</Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.maxText}>Max: {formatVND(maxVal)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 20,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  label: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 6,
  },
  legend: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  maxText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },
});

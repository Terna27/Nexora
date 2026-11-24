import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { cryptiqApi } from '@cryptiq/api-client';
import { SupportedAsset } from '@cryptiq/types';

export default function MobileCalculatorScreen() {
  const [asset, setAsset] = useState<SupportedAsset>('BTC');
  const [amountStr, setAmountStr] = useState<string>('1.0');

  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountStr);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [amountStr]);

  // Non-compounded simple calculations:
  // Daily = P * 0.03
  // Weekly = P * 0.03 * 7
  // Monthly = P * 0.03 * 30
  const scenario = useMemo(() => {
    return cryptiqApi.calculateScenario({
      asset,
      principalAmount: parsedAmount,
      hypotheticalDailyRate: 0.03,
    });
  }, [asset, parsedAmount]);

  const assets: SupportedAsset[] = ['BTC', 'ETH', 'SOL', 'USDT'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Warning Box */}
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>HYPOTHETICAL SCENARIO ASSUMPTION</Text>
        <Text style={styles.warningBody}>
          The 3% daily return is an illustrative model assumption only. Actual cryptocurrency trading cannot reliably
          generate such returns. Returns are not guaranteed and capital is at risk.
        </Text>
      </View>

      {/* Asset Selector */}
      <Text style={styles.sectionLabel}>SELECT ASSET</Text>
      <View style={styles.assetGrid}>
        {assets.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.assetButton, asset === item && styles.assetButtonActive]}
            onPress={() => setAsset(item)}
          >
            <Text style={[styles.assetText, asset === item && styles.assetTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount Input */}
      <Text style={styles.sectionLabel}>PRINCIPAL AMOUNT</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amountStr}
        onChangeText={setAmountStr}
        placeholder="0.0"
        placeholderTextColor="#64748B"
      />

      {/* Output Results */}
      <View style={styles.resultContainer}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>INITIAL PRINCIPAL</Text>
          <Text style={styles.resultValue}>{scenario.principalAmount.toFixed(4)} {asset}</Text>
        </View>

        <View style={[styles.resultCard, styles.dailyCard]}>
          <Text style={styles.cardHeader}>HYPOTHETICAL DAILY (+3%)</Text>
          <Text style={styles.cyanAmount}>+{scenario.dailyScenarioReturn.toFixed(4)} {asset}</Text>
          <Text style={styles.formulaNote}>Formula: Principal × 0.03</Text>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.cardHeader}>HYPOTHETICAL 7-DAY (21%)</Text>
          <Text style={styles.whiteAmount}>+{scenario.weeklyScenarioReturn.toFixed(4)} {asset}</Text>
          <Text style={styles.formulaNote}>Formula: Principal × 0.03 × 7</Text>
        </View>

        <View style={[styles.resultCard, styles.monthlyCard]}>
          <Text style={styles.magentaHeader}>HYPOTHETICAL 30-DAY (90%)</Text>
          <Text style={styles.magentaAmount}>+{scenario.monthlyScenarioReturn.toFixed(4)} {asset}</Text>
          <Text style={styles.formulaNote}>Formula: Principal × 0.03 × 30</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08090D' },
  content: { padding: 20 },
  warningBox: {
    backgroundColor: '#10131B',
    borderColor: '#FFB800',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  warningTitle: { color: '#FFB800', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  warningBody: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  sectionLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  assetGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  assetButton: {
    flex: 1,
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  assetButtonActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  assetText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  assetTextActive: { color: '#00F0FF' },
  input: {
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 10,
    color: '#F8FAFC',
    fontSize: 18,
    fontFamily: 'System',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  resultContainer: { gap: 12 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomColor: '#252B38',
    borderBottomWidth: 1,
  },
  resultLabel: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  resultValue: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  dailyCard: { borderColor: 'rgba(0, 240, 255, 0.4)' },
  monthlyCard: { borderColor: 'rgba(255, 42, 133, 0.4)' },
  cardHeader: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  magentaHeader: { color: '#FF2A85', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cyanAmount: { color: '#00F0FF', fontSize: 18, fontWeight: '800', marginVertical: 4 },
  whiteAmount: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginVertical: 4 },
  magentaAmount: { color: '#FF2A85', fontSize: 18, fontWeight: '800', marginVertical: 4 },
  formulaNote: { color: '#64748B', fontSize: 10 },
});

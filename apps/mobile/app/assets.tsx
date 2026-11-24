import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ILLUSTRATIVE_ASSET_PRICES } from '@cryptiq/api-client';

export default function MobileAssetsScreen() {
  const assets = Object.values(ILLUSTRATIVE_ASSET_PRICES);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>SUPPORTED DIGITAL ASSETS</Text>
      <Text style={styles.headerSubtitle}>
        Institutional custody liquidity tiers with cold storage isolation and multi-party computation.
      </Text>

      <View style={styles.list}>
        {assets.map((asset) => (
          <View key={asset.symbol} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.symbol}>{asset.symbol}</Text>
                <Text style={styles.name}>{asset.name}</Text>
              </View>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{asset.liquidityTier.replace('_', ' ')}</Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>${asset.unitPriceUsd.toLocaleString()}</Text>
              <Text style={styles.change}>+{asset.dayChangePercent}% (24H)</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08090D' },
  content: { padding: 20 },
  headerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginBottom: 20 },
  list: { gap: 12 },
  card: {
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  symbol: { color: '#00F0FF', fontSize: 18, fontWeight: '800' },
  name: { color: '#94A3B8', fontSize: 12 },
  tierBadge: {
    backgroundColor: '#10131B',
    borderColor: '#252B38',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierText: { color: '#64748B', fontSize: 9, fontWeight: '700' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
  price: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  change: { color: '#10B981', fontSize: 12, fontWeight: '700' },
});

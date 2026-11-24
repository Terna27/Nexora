import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function MobileSecurityScreen() {
  const pillars = [
    { title: 'Air-Gapped Cold Storage', desc: 'Private keys generated and partitioned via HSM in offline vaults.' },
    { title: 'Multi-Party Computation (MPC)', desc: 'Threshold cryptography ensuring no single node controls custody.' },
    { title: 'Heuristic Transaction Screening', desc: 'Real-time telemetry scanning address origins and compliance.' },
    { title: 'Merkle-ZK Auditability', desc: 'Cryptographically verifiable proofs of reserves and operations.' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>SECURITY ARCHITECTURE</Text>
      <Text style={styles.headerSubtitle}>
        Cryptiq adheres to strict institutional zero-trust security controls across all digital custody infrastructure.
      </Text>

      <View style={styles.list}>
        {pillars.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>

      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          Security Notice: Formal third-party audits and certifications are conducted prior to live custody deployment.
        </Text>
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
  cardTitle: { color: '#00F0FF', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  noticeBox: {
    marginTop: 20,
    backgroundColor: '#10131B',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  noticeText: { color: '#64748B', fontSize: 10, lineHeight: 14, textAlign: 'center' },
});

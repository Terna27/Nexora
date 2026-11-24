import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MobileCrawler } from '../components/MobileCrawler';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header & Mobile Scanner Engine */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <View style={styles.pulsingDot} />
            <Text style={styles.badgeText}>CRYPTIQ PROTOCOL // MOBILE v1.0</Text>
          </View>

          {/* Optimized Mobile Robotic Arachnid Scanner */}
          <View style={styles.crawlerWrapper}>
            <MobileCrawler />
          </View>

          <Text style={styles.brandTitle}>CRYPTIQ</Text>
          <Text style={styles.brandSubtitle}>ALGORITHMIC DIGITAL ASSET MANAGEMENT</Text>
        </View>

        {/* Hero Narrative */}
        <View style={styles.heroBox}>
          <Text style={styles.heroHeading}>
            Institutional Liquidity.{'\n'}
            <Text style={styles.cyanText}>Engineered for Mobile Precision.</Text>
          </Text>
          <Text style={styles.heroBody}>
            Access algorithmic liquidity strategies, real-time cryptographic audit proofs, and multi-party cold storage
            directly from your mobile terminal.
          </Text>
        </View>

        {/* Quick Platform Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>P99 EXECUTION</Text>
            <Text style={styles.metricValue}>1.24 ms</Text>
            <Text style={styles.metricSub}>DIRECT DMA</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PROOF SYSTEM</Text>
            <Text style={styles.magentaValue}>MERKLE-ZK</Text>
            <Text style={styles.metricSub}>100% AUDITABLE</Text>
          </View>
        </View>

        {/* Interactive Return Model Link */}
        <TouchableOpacity
          style={styles.calcPromoCard}
          activeOpacity={0.85}
          onPress={() => router.push('/calculator')}
        >
          <View style={styles.calcHeaderRow}>
            <Text style={styles.calcPromoBadge}>HYPOTHETICAL 3% MODEL</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
          <Text style={styles.calcPromoTitle}>Interactive Scenario Calculator</Text>
          <Text style={styles.calcPromoBody}>
            Model illustrative 24h, 7-day, and 30-day projection assumptions for BTC, ETH, SOL, and USDT.
          </Text>
        </TouchableOpacity>

        {/* Feature Navigation Buttons */}
        <View style={styles.navMenu}>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.push('/assets')}
          >
            <Text style={styles.navItemText}>Supported Digital Assets</Text>
            <Text style={styles.navItemArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => router.push('/security')}
          >
            <Text style={styles.navItemText}>Security Architecture</Text>
            <Text style={styles.navItemArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* CTA Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.primaryButtonText}>LAUNCH APPLICATION</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.secondaryButtonText}>CREATE INSTITUTIONAL ACCOUNT</Text>
          </TouchableOpacity>
        </View>

        {/* Risk Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>REGULATORY RISK NOTICE</Text>
          <Text style={styles.disclaimerText}>
            Cryptocurrency assets are volatile and carry high risk of loss. Returns are not guaranteed. Past or
            modeled performance does not guarantee future results.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#08090D',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151923',
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
    marginRight: 8,
  },
  badgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontFamily: 'System',
    fontWeight: '700',
    letterSpacing: 1,
  },
  crawlerWrapper: {
    marginVertical: 6,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 8,
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 2,
    fontWeight: '600',
  },
  heroBox: {
    marginBottom: 20,
  },
  heroHeading: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 8,
  },
  cyanText: {
    color: '#00F0FF',
  },
  heroBody: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 4,
  },
  magentaValue: {
    color: '#FF2A85',
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 4,
  },
  metricSub: {
    color: '#94A3B8',
    fontSize: 9,
  },
  calcPromoCard: {
    backgroundColor: '#10131B',
    borderColor: 'rgba(255, 184, 0, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  calcHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  calcPromoBadge: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  arrowIcon: {
    color: '#FFB800',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calcPromoTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  calcPromoBody: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  navMenu: {
    gap: 10,
    marginBottom: 24,
  },
  navItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navItemText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  navItemArrow: {
    color: '#00F0FF',
    fontSize: 14,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#00F0FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#08090D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disclaimerBox: {
    backgroundColor: '#10131B',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  disclaimerTitle: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  disclaimerText: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 14,
  },
});

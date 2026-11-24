import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, AccessibilityInfo } from 'react-native';

interface MobileCrawlerProps {
  reducedMotion?: boolean;
}

/**
 * Mobile-Optimized Cryptiq Crawler Adaptation:
 * - Battery-efficient animated SVG / View composition
 * - Compact footprint (40px)
 * - Low-frequency breathing & scan pulse
 * - Respects native accessibility reduced-motion settings
 */
export const MobileCrawler: React.FC<MobileCrawlerProps> = ({ reducedMotion = false }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [motionDisabled, setMotionDisabled] = useState(reducedMotion);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (enabled) setMotionDisabled(true);
    });

    if (motionDisabled) return;

    // Gentle mechanical hover loop (subtle and low power overhead)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Occasional subtle micro-rotation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [motionDisabled]);

  const translateY = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '3deg'],
  });

  return (
    <View style={styles.container} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View
        style={[
          styles.chassis,
          !motionDisabled && {
            transform: [{ translateY }, { rotate }],
          },
        ]}
      >
        {/* Core Reactor */}
        <View style={styles.coreReactor}>
          <View style={styles.innerDot} />
        </View>

        {/* 8 Articulated Mini-Legs (Left 4 and Right 4) */}
        <View style={[styles.leg, styles.legL1]} />
        <View style={[styles.leg, styles.legL2]} />
        <View style={[styles.leg, styles.legL3]} />
        <View style={[styles.leg, styles.legL4]} />

        <View style={[styles.leg, styles.legR1]} />
        <View style={[styles.leg, styles.legR2]} />
        <View style={[styles.leg, styles.legR3]} />
        <View style={[styles.leg, styles.legR4]} />

        {/* Front Scanning Optical Sensor */}
        <View style={styles.sensorRow}>
          <View style={styles.sensorEye} />
          <View style={styles.sensorEye} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  chassis: {
    width: 44,
    height: 38,
    backgroundColor: '#08090D',
    borderColor: '#00F0FF',
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  coreReactor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 42, 133, 0.2)',
    borderColor: '#FF2A85',
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
  },
  sensorRow: {
    position: 'absolute',
    top: 3,
    flexDirection: 'row',
    gap: 4,
  },
  sensorEye: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFB800',
  },
  // Articulated legs
  leg: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: '#00F0FF',
  },
  legL1: { width: 14, left: -10, top: 6, transform: [{ rotate: '-35deg' }] },
  legL2: { width: 16, left: -12, top: 14, transform: [{ rotate: '-10deg' }] },
  legL3: { width: 16, left: -12, top: 22, transform: [{ rotate: '15deg' }] },
  legL4: { width: 14, left: -10, top: 29, transform: [{ rotate: '40deg' }] },

  legR1: { width: 14, right: -10, top: 6, transform: [{ rotate: '35deg' }] },
  legR2: { width: 16, right: -12, top: 14, transform: [{ rotate: '10deg' }] },
  legR3: { width: 16, right: -12, top: 22, transform: [{ rotate: '-15deg' }] },
  legR4: { width: 14, right: -10, top: 29, transform: [{ rotate: '-40deg' }] },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';

export default function MobileLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    Alert.alert('Authentication', 'Institutional portal credentials submitted for multi-factor authorization.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>INSTITUTIONAL LOGIN</Text>
      <Text style={styles.subtitle}>Enter authorized credentials to access algorithmic terminals.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>OPERATOR IDENTIFIER / EMAIL</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="operator@cryptiq.internal"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
        />

        <Text style={styles.label}>PASSCODE / TOKEN</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••••••"
          placeholderTextColor="#64748B"
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} activeOpacity={0.85}>
          <Text style={styles.btnText}>VERIFY & ENTER TERMINAL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08090D', padding: 24, justifyContent: 'center' },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 28 },
  form: { gap: 14 },
  label: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#151923',
    borderColor: '#252B38',
    borderWidth: 1,
    borderRadius: 8,
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: { color: '#08090D', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
});

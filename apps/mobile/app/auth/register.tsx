import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';

export default function MobileRegisterScreen() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');

  const handleRegister = () => {
    Alert.alert('Onboarding', 'Institutional onboarding inquiry registered. Compliance desk will dispatch verification packets.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ORGANIZATION ONBOARDING</Text>
      <Text style={styles.subtitle}>Register your fund, office, or institution for Cryptiq access.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>ORGANIZATION ENTITY NAME</Text>
        <TextInput
          style={styles.input}
          value={orgName}
          onChangeText={setOrgName}
          placeholder="Apex Capital Management"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.label}>COMPLIANCE CONTACT EMAIL</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="compliance@firm.com"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} activeOpacity={0.85}>
          <Text style={styles.btnText}>SUBMIT ONBOARDING REQUEST</Text>
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

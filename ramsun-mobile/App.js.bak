import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Image } from 'react-native';

export default function App() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const handleSendOtp = () => {
    if (email.includes('@')) setIsOtpSent(true);
  };
  
  const handleLogin = () => {
    if (otp === '1234') setIsLoggedIn(true);
  };

  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ramsun Solar</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back!</Text>
          <Text style={styles.cardText}>Role: Solar Team</Text>
          <Text style={styles.cardText}>You have 2 pending projects for Site Photo.</Text>
          
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.buttonText}>View Projects</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>R</Text>
          </View>
          <Text style={styles.companyName}>Ramsun<Text style={{color: '#EAB308'}}>Energy</Text></Text>
          <Text style={styles.tagline}>Premium Solar Solutions</Text>
        </View>
        
        {!isOtpSent ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter your Email ID"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp}>
              <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.infoText}>OTP sent to {email}</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 4-digit OTP (hint: 1234)"
              placeholderTextColor="#9ca3af"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={4}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#EAB308',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  companyName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    color: '#334155',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 4,
  }
});

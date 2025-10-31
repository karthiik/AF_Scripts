import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RobloxTheme, Typography, Spacing, BorderRadius } from '../theme/colors';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SON);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    console.log('🚀 Register button clicked!');
    console.log('Form data:', { email, displayName, role, hasPassword: !!password });

    if (!email || !password || !confirmPassword || !displayName) {
      console.error('❌ Validation failed: Missing fields');
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      console.error('❌ Validation failed: Passwords do not match');
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.error('❌ Validation failed: Password too short');
      alert('Password must be at least 6 characters');
      return;
    }

    console.log('✅ Validation passed, starting registration...');
    setLoading(true);
    try {
      console.log('📡 Calling Firebase register...');
      await register(email, password, displayName, role);
      console.log('✅ Registration successful!');
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      alert(`Registration Failed: ${error.message}`);
    } finally {
      setLoading(false);
      console.log('🏁 Registration process complete');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Vocab Streak today!</Text>

          <TextInput
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor={RobloxTheme.textTertiary}
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={RobloxTheme.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={RobloxTheme.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={RobloxTheme.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>I am a:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === UserRole.SON && styles.roleButtonActive,
              ]}
              onPress={() => setRole(UserRole.SON)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === UserRole.SON && styles.roleButtonTextActive,
                ]}
              >
                Learner (Son)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                role === UserRole.PARENT && styles.roleButtonActive,
              ]}
              onPress={() => setRole(UserRole.PARENT)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === UserRole.PARENT && styles.roleButtonTextActive,
                ]}
              >
                Parent
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Register'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RobloxTheme.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1,
    color: RobloxTheme.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: RobloxTheme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    fontSize: 16,
    borderWidth: 2,
    borderColor: RobloxTheme.border,
    color: RobloxTheme.textPrimary,
  },
  label: {
    ...Typography.body,
    color: RobloxTheme.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: RobloxTheme.border,
    backgroundColor: RobloxTheme.backgroundElevated,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: RobloxTheme.primary,
    backgroundColor: RobloxTheme.primary,
  },
  roleButtonText: {
    ...Typography.label,
    color: RobloxTheme.textSecondary,
  },
  roleButtonTextActive: {
    color: RobloxTheme.textPrimary,
  },
  button: {
    backgroundColor: RobloxTheme.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: RobloxTheme.gray600,
    shadowOpacity: 0,
  },
  buttonText: {
    ...Typography.h4,
    color: RobloxTheme.textPrimary,
  },
  linkText: {
    ...Typography.body,
    color: RobloxTheme.primary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default RegisterScreen;

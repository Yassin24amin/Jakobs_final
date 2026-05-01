import { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

type AuthMode = 'sign-in' | 'sign-up' | 'verify';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } =
    useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } =
    useSignUp();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoaded = signInLoaded && signUpLoaded;

  // ── Sign In ──────────────────────────────────────────────────────────

  const handleSignIn = async () => {
    if (!isLoaded || !signIn || !setSignInActive) return;
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        router.back();
      } else {
        // Handle MFA or other flows if needed in the future
        Alert.alert('Error', 'Sign-in could not be completed.');
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        'Failed to sign in. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Sign Up ──────────────────────────────────────────────────────────

  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setMode('verify');
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        'Failed to sign up. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Verify Email ─────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!isLoaded || !signUp || !setSignUpActive) return;
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        router.back();
      } else {
        Alert.alert('Error', 'Verification could not be completed.');
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        'Invalid verification code.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Verification Screen ──────────────────────────────────────────────

  if (mode === 'verify') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ZineText variant="kicker">ALMOST THERE</ZineText>
            <ZineText variant="display" style={styles.title}>
              VERIFY EMAIL
            </ZineText>
            <Rule variant="double" />
          </View>

          <View style={styles.form}>
            <ZineText variant="body" style={styles.verifyHint}>
              We sent a verification code to{'\n'}
              <ZineText variant="mono" style={styles.verifyEmail}>
                {email}
              </ZineText>
            </ZineText>

            <ZineText variant="mono" style={styles.label}>
              VERIFICATION CODE
            </ZineText>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="123456"
              placeholderTextColor={Colors.faint}
              keyboardType="number-pad"
              autoFocus
            />

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <ZineText variant="sectionHeader" style={styles.buttonText}>
                  VERIFY
                </ZineText>
              )}
            </Pressable>

            <Rule variant="ascii" />

            <Pressable
              style={styles.switchLink}
              onPress={() => {
                setMode('sign-up');
                setVerificationCode('');
              }}
            >
              <ZineText variant="mono" style={styles.switchText}>
                BACK
              </ZineText>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Rule variant="single" />
            <ZineText variant="mono" style={styles.footerText}>
              JAKOB'S {'\u00B7'} DEGGENDORF
            </ZineText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Sign In / Sign Up Screen ─────────────────────────────────────────

  const isSignIn = mode === 'sign-in';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ZineText variant="kicker">EST. MMXVII</ZineText>
          <ZineText variant="display" style={styles.title}>
            {isSignIn ? 'SIGN IN' : 'SIGN UP'}
          </ZineText>
          <Rule variant="double" />
        </View>

        <View style={styles.form}>
          <ZineText variant="mono" style={styles.label}>
            EMAIL ADDRESS
          </ZineText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={Colors.faint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ZineText variant="mono" style={styles.label}>
            PASSWORD
          </ZineText>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={isSignIn ? 'enter password' : 'create password'}
            placeholderTextColor={Colors.faint}
            secureTextEntry
          />

          <Pressable
            style={[styles.button, (isSubmitting || !isLoaded) && styles.buttonDisabled]}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            disabled={isSubmitting || !isLoaded}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <ZineText variant="sectionHeader" style={styles.buttonText}>
                {isSignIn ? 'SIGN IN' : 'SIGN UP'}
              </ZineText>
            )}
          </Pressable>

          <Rule variant="ascii" />

          <Pressable
            style={styles.switchLink}
            onPress={() => setMode(isSignIn ? 'sign-up' : 'sign-in')}
          >
            <ZineText variant="mono" style={styles.switchText}>
              {isSignIn
                ? "DON'T HAVE AN ACCOUNT? SIGN UP"
                : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
            </ZineText>
          </Pressable>

          <Pressable style={styles.guestLink} onPress={() => router.back()}>
            <ZineText variant="mono" style={styles.guestText}>
              CONTINUE AS GUEST
            </ZineText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Rule variant="single" />
          <ZineText variant="mono" style={styles.footerText}>
            JAKOB'S {'\u00B7'} DEGGENDORF
          </ZineText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    marginVertical: Spacing.md,
  },
  form: {
    gap: Spacing.md,
  },
  label: {
    color: Colors.faint,
    marginBottom: -Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.surface,
    color: Colors.primary,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    padding: Spacing.md,
    borderRadius: 0,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.black,
  },
  verifyHint: {
    color: Colors.primary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  verifyEmail: {
    color: Colors.accent,
  },
  switchLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchText: {
    color: Colors.accentYellow,
    textDecorationLine: 'underline',
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  guestText: {
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  footerText: {
    color: Colors.faint,
    textAlign: 'center',
    fontSize: FontSizes.xs,
  },
});

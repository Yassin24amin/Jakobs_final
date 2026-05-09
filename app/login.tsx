import { useCallback, useState } from 'react';
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
  Linking,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useSignIn, useSignUp } from '@clerk/expo';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

type AuthMode = 'sign-in' | 'sign-up' | 'verify-sign-in' | 'verify-sign-up';

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy =
    isSubmitting ||
    signInFetchStatus === 'fetching' ||
    signUpFetchStatus === 'fetching';
  const isSignIn = mode === 'sign-in';
  const isSignInVerification = mode === 'verify-sign-in';
  const authUnavailableMessage = 'Authentication is still loading. Please try again.';

  const navigateAfterAuth = useCallback(
    async ({
      session,
      decorateUrl,
    }: {
      session?: { currentTask?: unknown } | null;
      decorateUrl: (url: string) => string;
    }) => {
      if (session?.currentTask) {
        Alert.alert(
          'Action Required',
          'Clerk requires an additional session task before sign-in can be completed.',
        );
        return;
      }

      if (router.canGoBack()) {
        router.back();
        return;
      }

      const url = decorateUrl('/');
      if (url.startsWith('http')) {
        await Linking.openURL(url);
        return;
      }

      router.replace(url as Href);
    },
    [router],
  );

  const finalizeSignIn = useCallback(async () => {
    if (!signIn) {
      return;
    }

    await signIn.finalize({
      navigate: navigateAfterAuth,
    });
  }, [navigateAfterAuth, signIn]);

  const finalizeSignUp = useCallback(async () => {
    if (!signUp) {
      return;
    }

    await signUp.finalize({
      navigate: navigateAfterAuth,
    });
  }, [navigateAfterAuth, signUp]);

  const handleSignIn = async () => {
    if (!signIn) {
      Alert.alert('Error', authUnavailableMessage);
      return;
    }

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
      const { error } = await signIn.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert('Error', getErrorMessage(error, 'Failed to sign in. Please try again.'));
        return;
      }

      if (signIn.status === 'complete') {
        await finalizeSignIn();
        return;
      }

      if (signIn.status === 'needs_client_trust') {
        const emailCodeFactor = signIn.supportedSecondFactors.find(
          (factor) => factor.strategy === 'email_code',
        );

        if (!emailCodeFactor) {
          Alert.alert(
            'Additional Verification Required',
            'This account requires a second factor that this screen does not support yet.',
          );
          return;
        }

        await signIn.mfa.sendEmailCode();
        setVerificationCode('');
        setMode('verify-sign-in');
        return;
      }

      if (signIn.status === 'needs_second_factor') {
        Alert.alert(
          'Additional Verification Required',
          'This account requires a second factor that this screen does not support yet.',
        );
        return;
      }

      Alert.alert('Error', 'Sign-in could not be completed.');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to sign in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUp) {
      Alert.alert('Error', authUnavailableMessage);
      return;
    }

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
      const { error } = await signUp.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert('Error', getErrorMessage(error, 'Failed to sign up. Please try again.'));
        return;
      }

      if (signUp.status === 'complete') {
        await finalizeSignUp();
        return;
      }

      await signUp.verifications.sendEmailCode();
      setVerificationCode('');
      setMode('verify-sign-up');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to sign up. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if ((isSignInVerification && !signIn) || (!isSignInVerification && !signUp)) {
      Alert.alert('Error', authUnavailableMessage);
      return;
    }

    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignInVerification) {
        await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });

        if (signIn.status === 'complete') {
          await finalizeSignIn();
          return;
        }

        Alert.alert('Error', 'Verification could not be completed.');
      } else {
        await signUp.verifications.verifyEmailCode({
          code: verificationCode.trim(),
        });

        if (signUp.status === 'complete') {
          await finalizeSignUp();
          return;
        }

        Alert.alert('Error', 'Verification could not be completed.');
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Invalid verification code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerificationCode = async () => {
    if ((isSignInVerification && !signIn) || (!isSignInVerification && !signUp)) {
      Alert.alert('Error', authUnavailableMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignInVerification) {
        await signIn.mfa.sendEmailCode();
      } else {
        await signUp.verifications.sendEmailCode();
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Could not send a new verification code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnFromVerification = async () => {
    if ((isSignInVerification && !signIn) || (!isSignInVerification && !signUp)) {
      Alert.alert('Error', authUnavailableMessage);
      return;
    }

    setVerificationCode('');

    if (isSignInVerification) {
      await signIn.reset();
      setMode('sign-in');
      return;
    }

    await signUp.reset();
    setMode('sign-up');
  };

  if (mode === 'verify-sign-in' || mode === 'verify-sign-up') {
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
            <ZineText variant="kicker">
              {isSignInVerification ? 'ONE MORE STEP' : 'ALMOST THERE'}
            </ZineText>
            <ZineText variant="display" style={styles.title}>
              {isSignInVerification ? 'VERIFY SIGN IN' : 'VERIFY EMAIL'}
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
              style={[styles.button, isBusy && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={isBusy}
            >
              {isBusy ? (
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
              onPress={resendVerificationCode}
              disabled={isBusy}
            >
              <ZineText variant="mono" style={styles.switchText}>
                I NEED A NEW CODE
              </ZineText>
            </Pressable>

            <Pressable
              style={styles.switchLink}
              onPress={returnFromVerification}
              disabled={isBusy}
            >
              <ZineText variant="mono" style={styles.switchText}>
                START OVER
              </ZineText>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Rule variant="single" />
            <ZineText variant="mono" style={styles.footerText}>
              JAKOB’S {'\u00B7'} DEGGENDORF
            </ZineText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
            style={[styles.button, isBusy && styles.buttonDisabled]}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            disabled={isBusy}
          >
            {isBusy ? (
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
                ? 'DON’T HAVE AN ACCOUNT? SIGN UP'
                : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
            </ZineText>
          </Pressable>

          <Pressable style={styles.guestLink} onPress={() => router.back()}>
            <ZineText variant="mono" style={styles.guestText}>
              CONTINUE AS GUEST
            </ZineText>
          </Pressable>

          {!isSignIn && <View nativeID="clerk-captcha" />}
        </View>

        <View style={styles.footer}>
          <Rule variant="single" />
          <ZineText variant="mono" style={styles.footerText}>
            JAKOB’S {'\u00B7'} DEGGENDORF
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

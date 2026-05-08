import { Rule } from "@/components/rule";
import { ZineText } from "@/components/zine-text";
import { Colors, Fonts, FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter a password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", "Failed to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ZineText variant="kicker">EST. MMXVII</ZineText>
          <ZineText variant="display" style={styles.title}>
            SIGN IN
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
            placeholder="enter password"
            placeholderTextColor={Colors.faint}
            secureTextEntry
          />

          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <ZineText variant="sectionHeader" style={styles.buttonText}>
                SIGN IN
              </ZineText>
            )}
          </Pressable>

          <Rule variant="ascii" />

          <Pressable style={styles.guestLink} onPress={() => router.back()}>
            <ZineText variant="mono" style={styles.guestText}>
              CONTINUE AS GUEST
            </ZineText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Rule variant="single" />
          <ZineText variant="mono" style={styles.footerText}>
            JAKOB'S {"\u00B7"} DEGGENDORF
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
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.black,
  },
  guestLink: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  guestText: {
    color: Colors.accent,
    textDecorationLine: "underline",
  },
  footer: {
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  footerText: {
    color: Colors.faint,
    textAlign: "center",
    fontSize: FontSizes.xs,
  },
});

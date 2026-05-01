import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { useAuth } from '@/contexts/auth-context';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
          <ZineText variant="kicker">JAKOB'S</ZineText>
          <ZineText variant="display" style={styles.title}>SIGN IN</ZineText>
          <Rule variant="double" />

          <View style={styles.benefitsList}>
            <ZineText variant="body" style={styles.benefitItem}>
              {'\u2605'} Track your orders in real time
            </ZineText>
            <ZineText variant="body" style={styles.benefitItem}>
              {'\u2605'} Faster checkout with saved info
            </ZineText>
            <ZineText variant="body" style={styles.benefitItem}>
              {'\u2605'} View your order history
            </ZineText>
            <ZineText variant="body" style={styles.benefitItem}>
              {'\u2605'} Get exclusive offers
            </ZineText>
          </View>

          <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
            <ZineText variant="sectionHeader" style={styles.primaryButtonText}>
              SIGN IN
            </ZineText>
          </Pressable>

          <Rule variant="ascii" style={styles.footerRule} />

          <ZineText variant="mono" style={styles.footerText}>
            JAKOB'S {'\u00B7'} DEGGENDORF
          </ZineText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        <ZineText variant="kicker">YOUR ACCOUNT</ZineText>
        <ZineText variant="display" style={styles.title}>
          {user.name?.toUpperCase() || 'WELCOME'}
        </ZineText>
        <Rule variant="double" />

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <ZineText variant="mono" style={styles.infoLabel}>EMAIL</ZineText>
            <ZineText variant="mono" style={styles.infoValue}>{user.email}</ZineText>
          </View>
          <Rule variant="single" />
          {user.name && (
            <>
              <View style={styles.infoRow}>
                <ZineText variant="mono" style={styles.infoLabel}>NAME</ZineText>
                <ZineText variant="mono" style={styles.infoValue}>{user.name}</ZineText>
              </View>
              <Rule variant="single" />
            </>
          )}
          <View style={styles.infoRow}>
            <ZineText variant="mono" style={styles.infoLabel}>ROLE</ZineText>
            <ZineText variant="mono" style={styles.infoValue}>
              {user.role.toUpperCase()}
            </ZineText>
          </View>
        </View>

        {isAdmin && (
          <Pressable
            style={styles.adminButton}
            onPress={() => router.push('/(admin)')}
          >
            <ZineText variant="sectionHeader" style={styles.adminButtonText}>
              ADMIN DASHBOARD
            </ZineText>
          </Pressable>
        )}

        <Pressable style={styles.signOutButton} onPress={logout}>
          <ZineText variant="sectionHeader" style={styles.signOutButtonText}>
            SIGN OUT
          </ZineText>
        </Pressable>

        <Rule variant="ascii" style={styles.footerRule} />

        <ZineText variant="mono" style={styles.footerText}>
          JAKOB'S {'\u00B7'} DEGGENDORF
        </ZineText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    marginVertical: Spacing.sm,
  },
  benefitsList: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  benefitItem: {
    color: Colors.primary,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  primaryButtonText: {
    color: Colors.black,
  },
  infoSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    color: Colors.faint,
    fontSize: FontSizes.xs,
  },
  infoValue: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
  },
  adminButton: {
    backgroundColor: Colors.accentYellow,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginBottom: Spacing.md,
  },
  adminButtonText: {
    color: Colors.black,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: Colors.rule,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  signOutButtonText: {
    color: Colors.primary,
  },
  footerRule: {
    marginTop: Spacing.xxl,
  },
  footerText: {
    color: Colors.faint,
    textAlign: 'center',
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
  },
});

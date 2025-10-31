import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentStreak, getLongestStreak } from '../services/streakService';
import { getDailyScore, hasCompletedTodayQuiz } from '../services/quizService';
import { getTotalUnpaidAmount } from '../services/rewardService';
import { getLinkedUser } from '../services/authService';
import { isOncePerDayEnforced } from '../services/settingsService';
import { RobloxTheme, Typography, Spacing, BorderRadius } from '../theme/colors';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [dailyScore, setDailyScore] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [unpaidRewards, setUnpaidRewards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quizRestricted, setQuizRestricted] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get linked parent to check settings
      const linkedParent = user.role === UserRole.SON
        ? await getLinkedUser(user.id)
        : null;
      const parentId = user.role === UserRole.PARENT ? user.id : linkedParent?.id;

      const [streak, longest, score, completed, rewards, enforced] = await Promise.all([
        getCurrentStreak(user.id),
        getLongestStreak(user.id),
        getDailyScore(user.id),
        hasCompletedTodayQuiz(user.id),
        getTotalUnpaidAmount(user.id),
        parentId ? isOncePerDayEnforced(parentId) : Promise.resolve(true),
      ]);

      setCurrentStreak(streak);
      setLongestStreak(longest);
      setDailyScore(score);
      setCompletedToday(completed);
      setUnpaidRewards(rewards);

      // Only restrict if both completed today AND restriction is enforced
      setQuizRestricted(completed && enforced);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={RobloxTheme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.displayName}!</Text>
          <Text style={styles.userRole}>
            {user?.role === UserRole.PARENT ? 'Parent Account' : 'Learner Account'}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statSubtext}>days</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
            <Text style={styles.statSubtext}>days</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dailyScore}</Text>
            <Text style={styles.statLabel}>Today's Score</Text>
            <Text style={styles.statSubtext}>points</Text>
          </View>

          {user?.role === UserRole.SON && (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${unpaidRewards.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Rewards Earned</Text>
              <Text style={styles.statSubtext}>pending</Text>
            </View>
          )}
        </View>

        {/* Daily Quiz Button */}
        <TouchableOpacity
          style={[
            styles.quizButton,
            quizRestricted && styles.quizButtonCompleted,
          ]}
          onPress={() => navigation.navigate('Quiz')}
          disabled={quizRestricted}
        >
          <Text style={styles.quizButtonTitle}>
            {quizRestricted ? '✓ Quiz Completed!' : 'Start Daily Quiz'}
          </Text>
          <Text style={styles.quizButtonSubtext}>
            {quizRestricted
              ? 'Come back tomorrow for your next quiz'
              : '5 vocabulary cards waiting for you'}
          </Text>
        </TouchableOpacity>

        {/* Navigation Buttons */}
        <View style={styles.navButtonsContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Text style={styles.navButtonText}>Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.navButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Panel Button (Parent Only) */}
        {user?.role === UserRole.PARENT && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate('AdminPanel')}
          >
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RobloxTheme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RobloxTheme.background,
  },
  content: {
    padding: Spacing.lg,
  },
  welcomeSection: {
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  welcomeText: {
    ...Typography.bodyLarge,
    color: RobloxTheme.textSecondary,
  },
  userName: {
    ...Typography.h1,
    color: RobloxTheme.textPrimary,
    marginTop: Spacing.xs,
  },
  userRole: {
    ...Typography.label,
    color: RobloxTheme.primary,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: RobloxTheme.border,
  },
  statValue: {
    ...Typography.h1,
    color: RobloxTheme.primary,
  },
  statLabel: {
    ...Typography.label,
    color: RobloxTheme.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  statSubtext: {
    ...Typography.labelSmall,
    color: RobloxTheme.textTertiary,
    marginTop: Spacing.xs,
  },
  quizButton: {
    backgroundColor: RobloxTheme.primary,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  quizButtonCompleted: {
    backgroundColor: RobloxTheme.success,
  },
  quizButtonTitle: {
    ...Typography.h3,
    color: RobloxTheme.textPrimary,
  },
  quizButtonSubtext: {
    ...Typography.body,
    color: RobloxTheme.textPrimary,
    marginTop: Spacing.sm,
    opacity: 0.9,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  navButton: {
    flex: 1,
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: RobloxTheme.primary,
  },
  navButtonText: {
    ...Typography.h4,
    color: RobloxTheme.primary,
  },
  adminButton: {
    backgroundColor: RobloxTheme.primaryDark,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  adminButtonText: {
    ...Typography.h4,
    color: RobloxTheme.textPrimary,
  },
  logoutButton: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: RobloxTheme.border,
  },
  logoutButtonText: {
    ...Typography.body,
    color: RobloxTheme.textSecondary,
  },
});

export default HomeScreen;

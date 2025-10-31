import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentStreak, getLongestStreak } from '../services/streakService';
import { getTotalScore } from '../services/quizService';
import { getMasteredCardsCount } from '../services/vocabularyService';
import { getTotalUnpaidAmount, getTotalPaidAmount } from '../services/rewardService';
import { getQuizHistory } from '../services/quizService';
import { RobloxTheme, Typography, Spacing, BorderRadius } from '../theme/colors';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalScore: 0,
    masteredCards: 0,
    totalQuizzes: 0,
    unpaidRewards: 0,
    paidRewards: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [
        currentStreak,
        longestStreak,
        totalScore,
        masteredCards,
        quizHistory,
        unpaidRewards,
        paidRewards,
      ] = await Promise.all([
        getCurrentStreak(user.id),
        getLongestStreak(user.id),
        getTotalScore(user.id),
        getMasteredCardsCount(user.id),
        getQuizHistory(user.id, 1000),
        getTotalUnpaidAmount(user.id),
        getTotalPaidAmount(user.id),
      ]);

      setStats({
        currentStreak,
        longestStreak,
        totalScore,
        masteredCards,
        totalQuizzes: quizHistory.length,
        unpaidRewards,
        paidRewards,
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
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
        {/* User Info */}
        <View style={styles.userInfoCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.displayName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user?.role === 'parent' ? 'Parent' : 'Learner'}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Statistics</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalScore}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalQuizzes}</Text>
            <Text style={styles.statLabel}>Quizzes Taken</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.masteredCards}</Text>
            <Text style={styles.statLabel}>Words Mastered</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.totalQuizzes > 0
                ? Math.round((stats.totalScore / (stats.totalQuizzes * 50)) * 100)
                : 0}
              %
            </Text>
            <Text style={styles.statLabel}>Avg Quiz Score</Text>
          </View>
        </View>

        {/* Rewards Section (for son) */}
        {user?.role === 'son' && (
          <>
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitleText}>Rewards</Text>
            </View>

            <View style={styles.rewardsCard}>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>Pending Rewards</Text>
                <Text style={styles.rewardValue}>
                  ${stats.unpaidRewards.toFixed(2)}
                </Text>
              </View>

              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>Paid Rewards</Text>
                <Text style={styles.rewardValuePaid}>
                  ${stats.paidRewards.toFixed(2)}
                </Text>
              </View>

              <View style={[styles.rewardRow, styles.rewardRowTotal]}>
                <Text style={styles.rewardLabelTotal}>Total Earned</Text>
                <Text style={styles.rewardValueTotal}>
                  ${(stats.unpaidRewards + stats.paidRewards).toFixed(2)}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Achievements Section */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Achievements</Text>
        </View>

        <View style={styles.achievementsContainer}>
          <View
            style={[
              styles.achievementCard,
              stats.currentStreak >= 7 && styles.achievementCardUnlocked,
            ]}
          >
            <Text style={styles.achievementIcon}>🔥</Text>
            <Text style={styles.achievementName}>Week Warrior</Text>
            <Text style={styles.achievementDesc}>7 day streak</Text>
          </View>

          <View
            style={[
              styles.achievementCard,
              stats.masteredCards >= 10 && styles.achievementCardUnlocked,
            ]}
          >
            <Text style={styles.achievementIcon}>📚</Text>
            <Text style={styles.achievementName}>Word Master</Text>
            <Text style={styles.achievementDesc}>10 words mastered</Text>
          </View>

          <View
            style={[
              styles.achievementCard,
              stats.totalQuizzes >= 10 && styles.achievementCardUnlocked,
            ]}
          >
            <Text style={styles.achievementIcon}>⭐</Text>
            <Text style={styles.achievementName}>Quiz Champion</Text>
            <Text style={styles.achievementDesc}>10 quizzes completed</Text>
          </View>

          <View
            style={[
              styles.achievementCard,
              stats.longestStreak >= 30 && styles.achievementCardUnlocked,
            ]}
          >
            <Text style={styles.achievementIcon}>👑</Text>
            <Text style={styles.achievementName}>Streak Legend</Text>
            <Text style={styles.achievementDesc}>30 day streak</Text>
          </View>
        </View>
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
  userInfoCard: {
    backgroundColor: RobloxTheme.backgroundElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: RobloxTheme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: RobloxTheme.textPrimary,
  },
  userName: {
    fontSize: Typography.h3.fontSize,
    fontWeight: Typography.h3.fontWeight,
    color: RobloxTheme.textPrimary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.bodySmall.fontSize,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    backgroundColor: RobloxTheme.backgroundHighlight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  roleBadgeText: {
    fontSize: Typography.labelSmall.fontSize,
    color: RobloxTheme.primary,
    fontWeight: Typography.labelSmall.fontWeight,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionTitleText: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: Typography.h4.fontWeight,
    color: RobloxTheme.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.h2.fontSize,
    fontWeight: Typography.h2.fontWeight,
    color: RobloxTheme.primary,
  },
  statLabel: {
    fontSize: Typography.labelSmall.fontSize,
    color: RobloxTheme.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  rewardsCard: {
    backgroundColor: RobloxTheme.backgroundElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: RobloxTheme.border,
  },
  rewardRowTotal: {
    borderBottomWidth: 0,
    marginTop: Spacing.xs,
  },
  rewardLabel: {
    fontSize: Typography.body.fontSize,
    color: RobloxTheme.textSecondary,
  },
  rewardLabelTotal: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: Typography.h3.fontWeight,
    color: RobloxTheme.textPrimary,
  },
  rewardValue: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: Typography.h3.fontWeight,
    color: RobloxTheme.warning,
  },
  rewardValuePaid: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: Typography.h3.fontWeight,
    color: RobloxTheme.success,
  },
  rewardValueTotal: {
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    color: RobloxTheme.primary,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    opacity: 0.4,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderWidth: 2,
    borderColor: RobloxTheme.success,
  },
  achievementIcon: {
    fontSize: Typography.h1.fontSize,
    marginBottom: Spacing.sm,
  },
  achievementName: {
    fontSize: Typography.label.fontSize,
    fontWeight: Typography.label.fontWeight,
    color: RobloxTheme.textPrimary,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: Typography.labelSmall.fontSize,
    color: RobloxTheme.textSecondary,
    marginTop: Spacing.xs,
  },
});

export default ProfileScreen;

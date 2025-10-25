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
        <ActivityIndicator size="large" color="#6366f1" />
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  sectionTitle: {
    marginBottom: 15,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  rewardsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rewardRowTotal: {
    borderBottomWidth: 0,
    marginTop: 5,
  },
  rewardLabel: {
    fontSize: 16,
    color: '#666',
  },
  rewardLabelTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  rewardValuePaid: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  rewardValueTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    opacity: 0.4,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  achievementIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
});

export default ProfileScreen;

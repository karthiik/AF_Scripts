import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, LeaderboardEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  getLeaderboard,
  getDailyLeaderboard,
  getWeeklyLeaderboard,
  getStreakLeaderboard,
} from '../services/leaderboardService';
import { RobloxTheme, Typography, Spacing, BorderRadius } from '../theme/colors';

type LeaderboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Leaderboard'>;
};

type LeaderboardTab = 'daily' | 'weekly' | 'total' | 'streak';

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<LeaderboardTab>('total');

  useEffect(() => {
    loadLeaderboard();
  }, [selectedTab]);

  const loadLeaderboard = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let data: LeaderboardEntry[] = [];

      switch (selectedTab) {
        case 'daily':
          data = await getDailyLeaderboard(user.id);
          break;
        case 'weekly':
          data = await getWeeklyLeaderboard(user.id);
          break;
        case 'total':
          data = await getLeaderboard(user.id);
          break;
        case 'streak':
          data = await getStreakLeaderboard(user.id);
          break;
      }

      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreForTab = (entry: LeaderboardEntry): number => {
    switch (selectedTab) {
      case 'daily':
        return entry.dailyScore;
      case 'weekly':
        return entry.weeklyScore;
      case 'total':
        return entry.totalScore;
      case 'streak':
        return entry.currentStreak;
    }
  };

  const getScoreLabel = (): string => {
    switch (selectedTab) {
      case 'daily':
        return 'points today';
      case 'weekly':
        return 'points this week';
      case 'total':
        return 'total points';
      case 'streak':
        return 'day streak';
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
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'daily' && styles.tabActive]}
          onPress={() => setSelectedTab('daily')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'daily' && styles.tabTextActive,
            ]}
          >
            Daily
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'weekly' && styles.tabActive]}
          onPress={() => setSelectedTab('weekly')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'weekly' && styles.tabTextActive,
            ]}
          >
            Weekly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'total' && styles.tabActive]}
          onPress={() => setSelectedTab('total')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'total' && styles.tabTextActive,
            ]}
          >
            Total
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'streak' && styles.tabActive]}
          onPress={() => setSelectedTab('streak')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'streak' && styles.tabTextActive,
            ]}
          >
            Streak
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard */}
      <ScrollView style={styles.content}>
        {leaderboard.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No data available yet. Complete a quiz to get started!
            </Text>
          </View>
        ) : (
          leaderboard.map((entry, index) => (
            <View
              key={entry.userId}
              style={[
                styles.leaderboardItem,
                entry.userId === user?.id && styles.leaderboardItemHighlight,
              ]}
            >
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{entry.displayName}</Text>
                <Text style={styles.userRole}>
                  {entry.role === 'parent' ? 'Parent' : 'Learner'}
                </Text>
              </View>

              <View style={styles.scoreContainer}>
                <Text style={styles.scoreValue}>{getScoreForTab(entry)}</Text>
                <Text style={styles.scoreLabel}>{getScoreLabel()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: RobloxTheme.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: RobloxTheme.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: RobloxTheme.primary,
  },
  tabText: {
    ...Typography.label,
    color: RobloxTheme.textSecondary,
  },
  tabTextActive: {
    color: RobloxTheme.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: RobloxTheme.textSecondary,
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leaderboardItemHighlight: {
    borderWidth: 2,
    borderColor: RobloxTheme.primary,
    backgroundColor: RobloxTheme.backgroundHighlight,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: RobloxTheme.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    ...Typography.body,
    fontWeight: '600',
    color: RobloxTheme.textPrimary,
  },
  userRole: {
    ...Typography.labelSmall,
    color: RobloxTheme.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    ...Typography.h3,
    color: RobloxTheme.primary,
  },
  scoreLabel: {
    fontSize: 11,
    color: RobloxTheme.textSecondary,
    marginTop: 2,
  },
});

export default LeaderboardScreen;

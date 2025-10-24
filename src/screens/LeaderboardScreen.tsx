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
        <ActivityIndicator size="large" color="#6366f1" />
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leaderboardItemHighlight: {
    borderWidth: 2,
    borderColor: '#6366f1',
    backgroundColor: '#ede9fe',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});

export default LeaderboardScreen;

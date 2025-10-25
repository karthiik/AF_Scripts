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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [streak, longest, score, completed, rewards] = await Promise.all([
        getCurrentStreak(user.id),
        getLongestStreak(user.id),
        getDailyScore(user.id),
        hasCompletedTodayQuiz(user.id),
        getTotalUnpaidAmount(user.id),
      ]);

      setCurrentStreak(streak);
      setLongestStreak(longest);
      setDailyScore(score);
      setCompletedToday(completed);
      setUnpaidRewards(rewards);
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
        <ActivityIndicator size="large" color="#6366f1" />
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
            completedToday && styles.quizButtonCompleted,
          ]}
          onPress={() => navigation.navigate('Quiz')}
          disabled={completedToday}
        >
          <Text style={styles.quizButtonTitle}>
            {completedToday ? '✓ Quiz Completed!' : 'Start Daily Quiz'}
          </Text>
          <Text style={styles.quizButtonSubtext}>
            {completedToday
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
  welcomeSection: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#6366f1',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  quizButton: {
    backgroundColor: '#6366f1',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizButtonCompleted: {
    backgroundColor: '#22c55e',
  },
  quizButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  quizButtonSubtext: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    opacity: 0.9,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  navButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    backgroundColor: '#8b5cf6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoutButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default HomeScreen;

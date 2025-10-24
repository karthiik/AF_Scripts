import { LeaderboardEntry, User } from '../types';
import { getDailyScore, getWeeklyScore, getTotalScore } from './quizService';
import { getCurrentStreak } from './streakService';
import { getLinkedUser, getCurrentUser } from './authService';
import { auth } from './firebase';

/**
 * Get leaderboard for a user and their linked user (parent/son)
 */
export const getLeaderboard = async (currentUserId: string): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboard: LeaderboardEntry[] = [];

    // Get current user data
    const currentFirebaseUser = auth.currentUser;
    if (!currentFirebaseUser) {
      throw new Error('No authenticated user');
    }

    const currentUser = await getCurrentUser(currentFirebaseUser);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Get linked user (if any)
    const linkedUser = await getLinkedUser(currentUserId);

    // Get scores and streak for current user
    const [dailyScore, weeklyScore, totalScore, currentStreak] = await Promise.all([
      getDailyScore(currentUserId),
      getWeeklyScore(currentUserId),
      getTotalScore(currentUserId),
      getCurrentStreak(currentUserId),
    ]);

    leaderboard.push({
      userId: currentUser.id,
      displayName: currentUser.displayName,
      role: currentUser.role,
      dailyScore,
      weeklyScore,
      totalScore,
      currentStreak,
    });

    // Get scores and streak for linked user (if exists)
    if (linkedUser) {
      const [linkedDailyScore, linkedWeeklyScore, linkedTotalScore, linkedCurrentStreak] = await Promise.all([
        getDailyScore(linkedUser.id),
        getWeeklyScore(linkedUser.id),
        getTotalScore(linkedUser.id),
        getCurrentStreak(linkedUser.id),
      ]);

      leaderboard.push({
        userId: linkedUser.id,
        displayName: linkedUser.displayName,
        role: linkedUser.role,
        dailyScore: linkedDailyScore,
        weeklyScore: linkedWeeklyScore,
        totalScore: linkedTotalScore,
        currentStreak: linkedCurrentStreak,
      });
    }

    // Sort by total score (descending)
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    return leaderboard;
  } catch (error: any) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

/**
 * Get leaderboard sorted by daily score
 */
export const getDailyLeaderboard = async (currentUserId: string): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboard = await getLeaderboard(currentUserId);
    return leaderboard.sort((a, b) => b.dailyScore - a.dailyScore);
  } catch (error: any) {
    console.error('Error getting daily leaderboard:', error);
    return [];
  }
};

/**
 * Get leaderboard sorted by weekly score
 */
export const getWeeklyLeaderboard = async (currentUserId: string): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboard = await getLeaderboard(currentUserId);
    return leaderboard.sort((a, b) => b.weeklyScore - a.weeklyScore);
  } catch (error: any) {
    console.error('Error getting weekly leaderboard:', error);
    return [];
  }
};

/**
 * Get leaderboard sorted by current streak
 */
export const getStreakLeaderboard = async (currentUserId: string): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboard = await getLeaderboard(currentUserId);
    return leaderboard.sort((a, b) => b.currentStreak - a.currentStreak);
  } catch (error: any) {
    console.error('Error getting streak leaderboard:', error);
    return [];
  }
};

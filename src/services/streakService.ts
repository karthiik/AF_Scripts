import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Streak } from '../types';

/**
 * Get user's streak
 */
export const getUserStreak = async (userId: string): Promise<Streak | null> => {
  try {
    const streakQuery = query(
      collection(db, 'streaks'),
      where('userId', '==', userId)
    );

    const streakSnapshot = await getDocs(streakQuery);

    if (streakSnapshot.empty) {
      return null;
    }

    const data = streakSnapshot.docs[0].data();
    return {
      id: streakSnapshot.docs[0].id,
      userId: data.userId,
      currentStreak: data.currentStreak,
      longestStreak: data.longestStreak,
      lastCompletedDate: data.lastCompletedDate?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    console.error('Error getting user streak:', error);
    return null;
  }
};

/**
 * Update user's streak after completing a quiz
 */
export const updateStreak = async (userId: string): Promise<Streak> => {
  try {
    const existingStreak = await getUserStreak(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (existingStreak) {
      const lastCompleted = new Date(existingStreak.lastCompletedDate);
      lastCompleted.setHours(0, 0, 0, 0);

      // Check if already completed today
      if (lastCompleted.getTime() === today.getTime()) {
        return existingStreak;
      }

      // Calculate days between last completion and today
      const daysDiff = Math.floor((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));

      let newCurrentStreak: number;
      if (daysDiff === 1) {
        // Consecutive day - increment streak
        newCurrentStreak = existingStreak.currentStreak + 1;
      } else {
        // Streak broken - reset to 1
        newCurrentStreak = 1;
      }

      const newLongestStreak = Math.max(existingStreak.longestStreak, newCurrentStreak);

      await updateDoc(doc(db, 'streaks', existingStreak.id), {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastCompletedDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: existingStreak.id,
        userId,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastCompletedDate: today,
        updatedAt: today,
      };
    } else {
      // Create new streak
      const streakRef = doc(collection(db, 'streaks'));
      const newStreak = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(streakRef, newStreak);

      return {
        id: streakRef.id,
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedDate: today,
        updatedAt: today,
      };
    }
  } catch (error: any) {
    throw new Error(`Failed to update streak: ${error.message}`);
  }
};

/**
 * Check if user's streak is active (completed yesterday or today)
 */
export const isStreakActive = async (userId: string): Promise<boolean> => {
  try {
    const streak = await getUserStreak(userId);

    if (!streak) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const lastCompleted = new Date(streak.lastCompletedDate);
    lastCompleted.setHours(0, 0, 0, 0);

    return lastCompleted.getTime() === today.getTime() ||
           lastCompleted.getTime() === yesterday.getTime();
  } catch (error: any) {
    console.error('Error checking streak active:', error);
    return false;
  }
};

/**
 * Get current streak count
 */
export const getCurrentStreak = async (userId: string): Promise<number> => {
  try {
    const streak = await getUserStreak(userId);

    if (!streak) {
      return 0;
    }

    // Check if streak is still active
    const active = await isStreakActive(userId);

    return active ? streak.currentStreak : 0;
  } catch (error: any) {
    console.error('Error getting current streak:', error);
    return 0;
  }
};

/**
 * Get longest streak count
 */
export const getLongestStreak = async (userId: string): Promise<number> => {
  try {
    const streak = await getUserStreak(userId);
    return streak?.longestStreak || 0;
  } catch (error: any) {
    console.error('Error getting longest streak:', error);
    return 0;
  }
};

/**
 * Delete streak for a specific user (admin only)
 */
export const deleteUserStreak = async (userId: string): Promise<number> => {
  try {
    console.log(`🗑️ Deleting streak for user: ${userId}`);
    const q = query(
      collection(db, 'streaks'),
      where('userId', '==', userId)
    );

    const streakSnapshot = await getDocs(q);
    const deletePromises = streakSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    const deletedCount = streakSnapshot.size;
    console.log(`✅ Deleted ${deletedCount} streak records`);
    return deletedCount;
  } catch (error: any) {
    console.error('❌ Failed to delete user streak:', error);
    throw new Error(`Failed to delete user streak: ${error.message}`);
  }
};

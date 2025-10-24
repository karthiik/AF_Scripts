import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { RewardRule, RewardEarned } from '../types';
import { getCurrentStreak } from './streakService';
import { getMasteredCardsCount } from './vocabularyService';
import { getTotalScore } from './quizService';

/**
 * Create a new reward rule (parent only)
 */
export const createRewardRule = async (
  rule: Omit<RewardRule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RewardRule> => {
  try {
    const ruleRef = doc(collection(db, 'rewardRules'));
    const newRule = {
      ...rule,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ruleRef, newRule);

    return {
      id: ruleRef.id,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error: any) {
    throw new Error(`Failed to create reward rule: ${error.message}`);
  }
};

/**
 * Get all reward rules for a parent
 */
export const getRewardRules = async (parentId: string): Promise<RewardRule[]> => {
  try {
    const rulesQuery = query(
      collection(db, 'rewardRules'),
      where('parentId', '==', parentId),
      orderBy('createdAt', 'desc')
    );

    const rulesSnapshot = await getDocs(rulesQuery);
    return rulesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        parentId: data.parentId,
        title: data.title,
        description: data.description,
        condition: data.condition,
        amount: data.amount,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error: any) {
    console.error('Error getting reward rules:', error);
    return [];
  }
};

/**
 * Update a reward rule
 */
export const updateRewardRule = async (
  ruleId: string,
  updates: Partial<Omit<RewardRule, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'rewardRules', ruleId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(`Failed to update reward rule: ${error.message}`);
  }
};

/**
 * Delete a reward rule
 */
export const deleteRewardRule = async (ruleId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'rewardRules', ruleId));
  } catch (error: any) {
    throw new Error(`Failed to delete reward rule: ${error.message}`);
  }
};

/**
 * Check if user has earned any rewards based on active rules
 */
export const checkRewardEligibility = async (
  userId: string,
  parentId: string
): Promise<RewardRule[]> => {
  try {
    // Get all active reward rules
    const rules = await getRewardRules(parentId);
    const activeRules = rules.filter(rule => rule.isActive);

    // Get user's current stats
    const [currentStreak, masteredCards, totalScore] = await Promise.all([
      getCurrentStreak(userId),
      getMasteredCardsCount(userId),
      getTotalScore(userId),
    ]);

    // Check which rules are met
    const earnedRules: RewardRule[] = [];

    for (const rule of activeRules) {
      let eligible = false;

      switch (rule.condition.type) {
        case 'streak':
          eligible = currentStreak >= rule.condition.target;
          break;
        case 'mastery':
          eligible = masteredCards >= rule.condition.target;
          break;
        case 'score':
          eligible = totalScore >= rule.condition.target;
          break;
      }

      if (eligible) {
        earnedRules.push(rule);
      }
    }

    return earnedRules;
  } catch (error: any) {
    console.error('Error checking reward eligibility:', error);
    return [];
  }
};

/**
 * Award a reward to a user
 */
export const awardReward = async (
  userId: string,
  ruleId: string,
  amount: number
): Promise<RewardEarned> => {
  try {
    const rewardRef = doc(collection(db, 'rewardsEarned'));
    const reward = {
      userId,
      ruleId,
      amount,
      earnedAt: serverTimestamp(),
      isPaid: false,
    };

    await setDoc(rewardRef, reward);

    return {
      id: rewardRef.id,
      userId,
      ruleId,
      amount,
      earnedAt: new Date(),
      isPaid: false,
    };
  } catch (error: any) {
    throw new Error(`Failed to award reward: ${error.message}`);
  }
};

/**
 * Get all rewards earned by a user
 */
export const getUserRewards = async (userId: string): Promise<RewardEarned[]> => {
  try {
    const rewardsQuery = query(
      collection(db, 'rewardsEarned'),
      where('userId', '==', userId),
      orderBy('earnedAt', 'desc')
    );

    const rewardsSnapshot = await getDocs(rewardsQuery);
    return rewardsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        ruleId: data.ruleId,
        amount: data.amount,
        earnedAt: data.earnedAt?.toDate() || new Date(),
        paidAt: data.paidAt?.toDate(),
        isPaid: data.isPaid,
      };
    });
  } catch (error: any) {
    console.error('Error getting user rewards:', error);
    return [];
  }
};

/**
 * Get unpaid rewards for a user
 */
export const getUnpaidRewards = async (userId: string): Promise<RewardEarned[]> => {
  try {
    const rewardsQuery = query(
      collection(db, 'rewardsEarned'),
      where('userId', '==', userId),
      where('isPaid', '==', false),
      orderBy('earnedAt', 'desc')
    );

    const rewardsSnapshot = await getDocs(rewardsQuery);
    return rewardsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        ruleId: data.ruleId,
        amount: data.amount,
        earnedAt: data.earnedAt?.toDate() || new Date(),
        paidAt: data.paidAt?.toDate(),
        isPaid: data.isPaid,
      };
    });
  } catch (error: any) {
    console.error('Error getting unpaid rewards:', error);
    return [];
  }
};

/**
 * Mark a reward as paid (parent only)
 */
export const markRewardAsPaid = async (rewardId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'rewardsEarned', rewardId), {
      isPaid: true,
      paidAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(`Failed to mark reward as paid: ${error.message}`);
  }
};

/**
 * Get total unpaid reward amount for a user
 */
export const getTotalUnpaidAmount = async (userId: string): Promise<number> => {
  try {
    const unpaidRewards = await getUnpaidRewards(userId);
    return unpaidRewards.reduce((total, reward) => total + reward.amount, 0);
  } catch (error: any) {
    console.error('Error getting total unpaid amount:', error);
    return 0;
  }
};

/**
 * Get total paid reward amount for a user
 */
export const getTotalPaidAmount = async (userId: string): Promise<number> => {
  try {
    const allRewards = await getUserRewards(userId);
    const paidRewards = allRewards.filter(r => r.isPaid);
    return paidRewards.reduce((total, reward) => total + reward.amount, 0);
  } catch (error: any) {
    console.error('Error getting total paid amount:', error);
    return 0;
  }
};

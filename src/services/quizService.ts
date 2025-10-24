import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { QuizAttempt, QuizQuestion, VocabularyCard } from '../types';

/**
 * Generate quiz questions from vocabulary cards
 * Creates multiple choice questions with one correct answer and 3 distractors
 */
export const generateQuizQuestions = async (
  cards: VocabularyCard[],
  allCards: VocabularyCard[]
): Promise<QuizQuestion[]> => {
  return cards.map(card => {
    // Get 3 random wrong answers from other cards
    const otherCards = allCards.filter(c => c.id !== card.id);
    const shuffledOthers = otherCards.sort(() => Math.random() - 0.5);
    const wrongAnswers = shuffledOthers.slice(0, 3).map(c => c.back);

    // Combine correct answer with wrong answers and shuffle
    const options = [card.back, ...wrongAnswers].sort(() => Math.random() - 0.5);

    return {
      card,
      options,
      correctAnswer: card.back,
    };
  });
};

/**
 * Calculate quiz score based on answers
 * - Base points: 10 points per correct answer
 * - Speed bonus: Up to 5 extra points if answered quickly (under 10 seconds)
 */
export const calculateQuizScore = (
  answers: QuizAttempt['answers']
): { score: number; totalPoints: number } => {
  let totalPoints = 0;

  answers.forEach(answer => {
    if (answer.isCorrect) {
      // Base points
      let points = 10;

      // Speed bonus: 5 points if under 5 seconds, 3 points if under 10 seconds
      if (answer.timeSpent < 5) {
        points += 5;
      } else if (answer.timeSpent < 10) {
        points += 3;
      }

      totalPoints += points;
    }
  });

  const score = Math.round((answers.filter(a => a.isCorrect).length / answers.length) * 100);

  return { score, totalPoints };
};

/**
 * Save a quiz attempt to Firestore
 */
export const saveQuizAttempt = async (
  userId: string,
  cards: VocabularyCard[],
  answers: QuizAttempt['answers']
): Promise<QuizAttempt> => {
  try {
    const { score, totalPoints } = calculateQuizScore(answers);

    const attemptRef = doc(collection(db, 'quizAttempts'));
    const attempt: Omit<QuizAttempt, 'id'> = {
      userId,
      date: new Date(),
      cards: cards.map(c => c.id),
      answers,
      score,
      totalPoints,
      completedAt: new Date(),
      createdAt: new Date(),
    };

    await setDoc(attemptRef, {
      ...attempt,
      date: serverTimestamp(),
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return {
      id: attemptRef.id,
      ...attempt,
    };
  } catch (error: any) {
    throw new Error(`Failed to save quiz attempt: ${error.message}`);
  }
};

/**
 * Get user's quiz attempts for a specific date range
 */
export const getUserQuizAttempts = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<QuizAttempt[]> => {
  try {
    let q = query(
      collection(db, 'quizAttempts'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const attemptsSnapshot = await getDocs(q);

    let attempts = attemptsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        date: data.date?.toDate() || new Date(),
        cards: data.cards,
        answers: data.answers,
        score: data.score,
        totalPoints: data.totalPoints,
        completedAt: data.completedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });

    // Filter by date range if provided
    if (startDate || endDate) {
      attempts = attempts.filter(attempt => {
        const attemptDate = attempt.date;
        if (startDate && attemptDate < startDate) return false;
        if (endDate && attemptDate > endDate) return false;
        return true;
      });
    }

    return attempts;
  } catch (error: any) {
    console.error('Error getting user quiz attempts:', error);
    return [];
  }
};

/**
 * Check if user has completed today's quiz
 */
export const hasCompletedTodayQuiz = async (userId: string): Promise<boolean> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attempts = await getUserQuizAttempts(userId, today, tomorrow);
    return attempts.length > 0;
  } catch (error: any) {
    console.error('Error checking today quiz completion:', error);
    return false;
  }
};

/**
 * Get user's daily score (total points earned today)
 */
export const getDailyScore = async (userId: string): Promise<number> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attempts = await getUserQuizAttempts(userId, today, tomorrow);
    return attempts.reduce((total, attempt) => total + attempt.totalPoints, 0);
  } catch (error: any) {
    console.error('Error getting daily score:', error);
    return 0;
  }
};

/**
 * Get user's weekly score (total points earned this week)
 */
export const getWeeklyScore = async (userId: string): Promise<number> => {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const attempts = await getUserQuizAttempts(userId, weekStart, weekEnd);
    return attempts.reduce((total, attempt) => total + attempt.totalPoints, 0);
  } catch (error: any) {
    console.error('Error getting weekly score:', error);
    return 0;
  }
};

/**
 * Get user's total score (all time)
 */
export const getTotalScore = async (userId: string): Promise<number> => {
  try {
    const attempts = await getUserQuizAttempts(userId);
    return attempts.reduce((total, attempt) => total + attempt.totalPoints, 0);
  } catch (error: any) {
    console.error('Error getting total score:', error);
    return 0;
  }
};

/**
 * Get user's quiz history
 */
export const getQuizHistory = async (
  userId: string,
  limitCount: number = 10
): Promise<QuizAttempt[]> => {
  try {
    const q = query(
      collection(db, 'quizAttempts'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    const attemptsSnapshot = await getDocs(q);
    return attemptsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        date: data.date?.toDate() || new Date(),
        cards: data.cards,
        answers: data.answers,
        score: data.score,
        totalPoints: data.totalPoints,
        completedAt: data.completedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
  } catch (error: any) {
    console.error('Error getting quiz history:', error);
    return [];
  }
};

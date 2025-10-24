// User Types
export enum UserRole {
  PARENT = 'parent',
  SON = 'son',
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  linkedUserId?: string; // For linking parent and son accounts
  createdAt: Date;
  updatedAt: Date;
}

// Vocabulary Types
export enum VocabularyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}

export interface VocabularyCard {
  id: string;
  front: string; // The word
  back: string; // The definition
  example?: string; // Optional usage example
  difficulty?: number; // 1-5 scale
  level: VocabularyLevel; // Beginner, Intermediate, or Expert
  createdAt: Date;
  createdBy: string; // User ID who created it
}

export interface UserVocabularyProgress {
  id: string;
  userId: string;
  cardId: string;
  masteryLevel: number; // 0-100
  lastReviewedAt?: Date;
  correctCount: number;
  incorrectCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Quiz Types
export interface QuizQuestion {
  card: VocabularyCard;
  options: string[]; // For multiple choice
  correctAnswer: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  date: Date;
  cards: string[]; // Array of card IDs
  answers: {
    cardId: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpent: number; // seconds
  }[];
  score: number;
  totalPoints: number;
  completedAt?: Date;
  createdAt: Date;
}

// Streak Types
export interface Streak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: Date;
  updatedAt: Date;
}

// Leaderboard Types
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  role: UserRole;
  dailyScore: number;
  weeklyScore: number;
  totalScore: number;
  currentStreak: number;
}

// Reward Types
export interface RewardRule {
  id: string;
  parentId: string;
  title: string;
  description: string;
  condition: {
    type: 'streak' | 'mastery' | 'score';
    target: number; // e.g., 7 days for streak, 50 words for mastery, 1000 for score
  };
  amount: number; // Dollar amount
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardEarned {
  id: string;
  userId: string;
  ruleId: string;
  amount: number;
  earnedAt: Date;
  paidAt?: Date;
  isPaid: boolean;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Quiz: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  AdminPanel: undefined;
  VocabularyManager: undefined;
};

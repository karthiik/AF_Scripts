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
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { VocabularyCard, UserVocabularyProgress } from '../types';

/**
 * Create a new vocabulary card
 */
export const createVocabularyCard = async (
  card: Omit<VocabularyCard, 'id' | 'createdAt'>
): Promise<VocabularyCard> => {
  try {
    const cardRef = doc(collection(db, 'vocabularyCards'));
    const newCard = {
      ...card,
      createdAt: serverTimestamp(),
    };

    await setDoc(cardRef, newCard);

    return {
      id: cardRef.id,
      ...card,
      createdAt: new Date(),
    };
  } catch (error: any) {
    throw new Error(`Failed to create vocabulary card: ${error.message}`);
  }
};

/**
 * Get a vocabulary card by ID
 */
export const getVocabularyCard = async (cardId: string): Promise<VocabularyCard | null> => {
  try {
    const cardDoc = await getDoc(doc(db, 'vocabularyCards', cardId));

    if (!cardDoc.exists()) {
      return null;
    }

    const data = cardDoc.data();
    return {
      id: cardDoc.id,
      front: data.front,
      back: data.back,
      example: data.example,
      difficulty: data.difficulty,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy,
    };
  } catch (error: any) {
    console.error('Error getting vocabulary card:', error);
    return null;
  }
};

/**
 * Get all vocabulary cards
 */
export const getAllVocabularyCards = async (): Promise<VocabularyCard[]> => {
  try {
    const cardsSnapshot = await getDocs(collection(db, 'vocabularyCards'));
    return cardsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        front: data.front,
        back: data.back,
        example: data.example,
        difficulty: data.difficulty,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy,
      };
    });
  } catch (error: any) {
    throw new Error(`Failed to get vocabulary cards: ${error.message}`);
  }
};

/**
 * Update a vocabulary card
 */
export const updateVocabularyCard = async (
  cardId: string,
  updates: Partial<Omit<VocabularyCard, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'vocabularyCards', cardId), updates);
  } catch (error: any) {
    throw new Error(`Failed to update vocabulary card: ${error.message}`);
  }
};

/**
 * Delete a vocabulary card
 */
export const deleteVocabularyCard = async (cardId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'vocabularyCards', cardId));
  } catch (error: any) {
    throw new Error(`Failed to delete vocabulary card: ${error.message}`);
  }
};

/**
 * Get user's progress for a specific card
 */
export const getUserCardProgress = async (
  userId: string,
  cardId: string
): Promise<UserVocabularyProgress | null> => {
  try {
    const progressQuery = query(
      collection(db, 'userVocabularyProgress'),
      where('userId', '==', userId),
      where('cardId', '==', cardId),
      limit(1)
    );

    const progressSnapshot = await getDocs(progressQuery);

    if (progressSnapshot.empty) {
      return null;
    }

    const data = progressSnapshot.docs[0].data();
    return {
      id: progressSnapshot.docs[0].id,
      userId: data.userId,
      cardId: data.cardId,
      masteryLevel: data.masteryLevel,
      lastReviewedAt: data.lastReviewedAt?.toDate(),
      correctCount: data.correctCount,
      incorrectCount: data.incorrectCount,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    console.error('Error getting user card progress:', error);
    return null;
  }
};

/**
 * Update user's progress for a card
 */
export const updateUserCardProgress = async (
  userId: string,
  cardId: string,
  isCorrect: boolean
): Promise<void> => {
  try {
    // Get existing progress
    const existingProgress = await getUserCardProgress(userId, cardId);

    if (existingProgress) {
      // Update existing progress
      const correctCount = isCorrect
        ? existingProgress.correctCount + 1
        : existingProgress.correctCount;
      const incorrectCount = isCorrect
        ? existingProgress.incorrectCount
        : existingProgress.incorrectCount + 1;

      // Calculate mastery level (simple algorithm: correct / total * 100)
      const total = correctCount + incorrectCount;
      const masteryLevel = Math.min(100, Math.round((correctCount / total) * 100));

      await updateDoc(doc(db, 'userVocabularyProgress', existingProgress.id), {
        masteryLevel,
        correctCount,
        incorrectCount,
        lastReviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new progress entry
      const progressRef = doc(collection(db, 'userVocabularyProgress'));
      await setDoc(progressRef, {
        userId,
        cardId,
        masteryLevel: isCorrect ? 100 : 0,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1,
        lastReviewedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to update user card progress: ${error.message}`);
  }
};

/**
 * Get cards for daily quiz (3 random cards that user hasn't mastered)
 */
export const getDailyQuizCards = async (userId: string): Promise<VocabularyCard[]> => {
  try {
    // Get all vocabulary cards
    const allCards = await getAllVocabularyCards();

    // Get user's progress for all cards
    const progressQuery = query(
      collection(db, 'userVocabularyProgress'),
      where('userId', '==', userId)
    );
    const progressSnapshot = await getDocs(progressQuery);

    const progressMap = new Map<string, UserVocabularyProgress>();
    progressSnapshot.docs.forEach(doc => {
      const data = doc.data();
      progressMap.set(data.cardId, {
        id: doc.id,
        userId: data.userId,
        cardId: data.cardId,
        masteryLevel: data.masteryLevel,
        lastReviewedAt: data.lastReviewedAt?.toDate(),
        correctCount: data.correctCount,
        incorrectCount: data.incorrectCount,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    // Filter cards that are not yet mastered (mastery level < 80)
    const unmasteredCards = allCards.filter(card => {
      const progress = progressMap.get(card.id);
      return !progress || progress.masteryLevel < 80;
    });

    // If we have less than 3 unmastered cards, include some mastered ones for review
    let quizCards = unmasteredCards;
    if (unmasteredCards.length < 3) {
      const masteredCards = allCards.filter(card => {
        const progress = progressMap.get(card.id);
        return progress && progress.masteryLevel >= 80;
      });
      quizCards = [...unmasteredCards, ...masteredCards];
    }

    // Shuffle and take 3 cards
    const shuffled = quizCards.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  } catch (error: any) {
    throw new Error(`Failed to get daily quiz cards: ${error.message}`);
  }
};

/**
 * Get user's mastered cards count
 */
export const getMasteredCardsCount = async (userId: string): Promise<number> => {
  try {
    const progressQuery = query(
      collection(db, 'userVocabularyProgress'),
      where('userId', '==', userId),
      where('masteryLevel', '>=', 80)
    );

    const progressSnapshot = await getDocs(progressQuery);
    return progressSnapshot.size;
  } catch (error: any) {
    console.error('Error getting mastered cards count:', error);
    return 0;
  }
};

/**
 * Bulk import vocabulary cards from array
 */
export const bulkImportVocabularyCards = async (
  cards: Omit<VocabularyCard, 'id' | 'createdAt'>[],
  createdBy: string
): Promise<void> => {
  try {
    const promises = cards.map(card =>
      createVocabularyCard({ ...card, createdBy })
    );
    await Promise.all(promises);
  } catch (error: any) {
    throw new Error(`Failed to bulk import vocabulary cards: ${error.message}`);
  }
};

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, QuizQuestion } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getDailyQuizCards, getAllVocabularyCards } from '../services/vocabularyService';
import { generateQuizQuestions, saveQuizAttempt, hasCompletedTodayQuiz } from '../services/quizService';
import { updateStreak } from '../services/streakService';
import { updateUserCardProgress } from '../services/vocabularyService';

type QuizScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
};

const QuizScreen: React.FC<QuizScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    if (!user) return;

    console.log('🎯 Loading quiz for user:', user.id);
    setLoading(true);
    try {
      // Check if quiz already completed today
      console.log('🔍 Checking if quiz completed today...');
      const completed = await hasCompletedTodayQuiz(user.id);
      console.log('Quiz completed today?', completed);

      if (completed) {
        alert('You have already completed today\'s quiz. Come back tomorrow!');
        navigation.goBack();
        return;
      }

      // Get quiz cards
      console.log('📚 Getting daily quiz cards...');
      const cards = await getDailyQuizCards(user.id);
      console.log(`Found ${cards.length} cards for quiz`);

      if (cards.length === 0) {
        alert('No vocabulary cards available. Please ask a parent to add some vocabulary words.');
        navigation.goBack();
        return;
      }

      // Get all cards for generating distractors
      console.log('🎲 Getting all cards for multiple choice options...');
      const allCards = await getAllVocabularyCards();
      console.log(`Total vocabulary: ${allCards.length} cards`);

      // Generate questions
      console.log('🎨 Generating quiz questions...');
      const quizQuestions = await generateQuizQuestions(cards, allCards);
      console.log('Quiz questions generated:', quizQuestions.length);

      setQuestions(quizQuestions);
      setQuestionStartTime(Date.now());
      console.log('✅ Quiz loaded successfully!');
    } catch (error) {
      console.error('❌ Error loading quiz:', error);
      alert('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    console.log('✅ Answer selected:', answer);
    setSelectedAnswer(answer);
  };

  const handleNext = async () => {
    console.log('⏭️ Next button clicked');
    console.log('Selected answer:', selectedAnswer);
    console.log('User:', user?.id);

    if (!selectedAnswer || !user) {
      console.warn('❌ Cannot proceed: missing answer or user');
      return;
    }

    console.log('🎯 Processing answer...');
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    console.log(`Answer is ${isCorrect ? 'CORRECT ✅' : 'WRONG ❌'}`);
    console.log(`Time spent: ${timeSpent} seconds`);

    // Save answer
    const newAnswers = [
      ...answers,
      {
        cardId: currentQuestion.card.id,
        userAnswer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        timeSpent,
      },
    ];
    setAnswers(newAnswers);

    console.log('💾 Updating user progress...');
    // Update user's progress for this card
    await updateUserCardProgress(user.id, currentQuestion.card.id, isCorrect);

    // Move to next question or finish quiz
    if (currentQuestionIndex < questions.length - 1) {
      console.log(`➡️ Moving to question ${currentQuestionIndex + 2}/${questions.length}`);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setQuestionStartTime(Date.now());
    } else {
      console.log('🏁 Finishing quiz...');
      // Quiz completed
      await finishQuiz(newAnswers);
    }
  };

  const finishQuiz = async (finalAnswers: any[]) => {
    if (!user) return;

    try {
      // Save quiz attempt
      const attempt = await saveQuizAttempt(
        user.id,
        questions.map(q => q.card),
        finalAnswers
      );

      // Update streak
      await updateStreak(user.id);

      setScore(attempt.score);
      setQuizCompleted(true);
    } catch (error) {
      console.error('Error finishing quiz:', error);
      Alert.alert('Error', 'Failed to save quiz results. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (quizCompleted) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    return (
      <View style={styles.container}>
        <View style={styles.completedContainer}>
          <Text style={styles.completedTitle}>Quiz Completed!</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{score}%</Text>
          </View>
          <Text style={styles.completedSubtext}>
            You got {correctCount} out of {questions.length} correct!
          </Text>

          <View style={styles.resultsContainer}>
            {answers.map((answer, index) => (
              <View
                key={index}
                style={[
                  styles.resultItem,
                  answer.isCorrect ? styles.resultCorrect : styles.resultIncorrect,
                ]}
              >
                <Text style={styles.resultWord}>
                  {questions[index].card.front}
                </Text>
                <Text style={styles.resultStatus}>
                  {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.finishButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.finishButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No questions available</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionLabel}>What does this word mean?</Text>
          <Text style={styles.questionWord}>{currentQuestion.card.front}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && styles.optionButtonSelected,
              ]}
              onPress={() => handleAnswerSelect(option)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedAnswer === option && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.nextButton, !selectedAnswer && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedAnswer}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  questionContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  questionWord: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  optionsContainer: {
    flex: 1,
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  optionButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#ede9fe',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#6366f1',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonDisabled: {
    backgroundColor: '#a5a7f7',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  completedSubtext: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  resultsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultCorrect: {
    backgroundColor: '#dcfce7',
  },
  resultIncorrect: {
    backgroundColor: '#fee2e2',
  },
  resultWord: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultStatus: {
    fontSize: 14,
    color: '#666',
  },
  finishButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QuizScreen;

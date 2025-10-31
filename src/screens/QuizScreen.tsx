import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, QuizQuestion } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RobloxTheme, Typography, Spacing, BorderRadius } from '../theme/colors';
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
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
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

    setLoading(true);
    try {
      // Check if quiz already completed today
      const completed = await hasCompletedTodayQuiz(user.id);

      if (completed) {
        alert('You have already completed today\'s quiz. Come back tomorrow!');
        navigation.goBack();
        return;
      }

      // Get quiz cards
      const cards = await getDailyQuizCards(user.id);

      if (cards.length === 0) {
        alert('No vocabulary cards available. Please ask a parent to add some vocabulary words.');
        navigation.goBack();
        return;
      }

      // Get all cards for generating distractors
      const allCards = await getAllVocabularyCards();

      // Generate questions
      const quizQuestions = await generateQuizQuestions(cards, allCards);

      setQuestions(quizQuestions);
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    if (isCorrect) return; // Don't allow changing after correct answer

    setSelectedAnswer(answer);

    // Automatically check the answer immediately
    await checkAnswer(answer);
  };

  const checkAnswer = async (answer: string) => {
    if (!answer || !user) return;

    const currentQuestion = questions[currentQuestionIndex];
    const correct = answer === currentQuestion.correctAnswer;

    setIsAnswered(true);
    setIsCorrect(correct);
    setAttempts(attempts + 1);

    if (correct) {
      // Update user's progress
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      await updateUserCardProgress(user.id, currentQuestion.card.id, true);

      // Save this answer
      const newAnswers = [
        ...answers,
        {
          cardId: currentQuestion.card.id,
          userAnswer: answer,
          correctAnswer: currentQuestion.correctAnswer,
          isCorrect: true,
          timeSpent,
        },
      ];
      setAnswers(newAnswers);
    }
  };

  const handleContinue = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setAttempts(0);
      setQuestionStartTime(Date.now());
    } else {
      // Finish quiz
      await finishQuiz(answers);
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
      alert('Failed to save quiz results. Please try again.');
    }
  };

  const getHint = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.correctAnswer;

    if (attempts === 1) {
      // First hint: show first letter
      return `Hint: The answer starts with "${correctAnswer.charAt(0)}..."`;
    } else if (attempts === 2) {
      // Second hint: show first word or half the answer
      const words = correctAnswer.split(' ');
      if (words.length > 1) {
        return `Hint: It starts with "${words[0]}..."`;
      } else {
        const halfLength = Math.ceil(correctAnswer.length / 2);
        return `Hint: "${correctAnswer.substring(0, halfLength)}..."`;
      }
    } else {
      // Final hint: show most of the answer
      const revealLength = Math.ceil(correctAnswer.length * 0.7);
      return `Hint: "${correctAnswer.substring(0, revealLength)}..."`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={RobloxTheme.primary} />
      </View>
    );
  }

  if (quizCompleted) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    return (
      <View style={styles.container}>
        <View style={styles.completedContainer}>
          <Text style={styles.completedTitle}>🎉 Quiz Completed!</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{score}%</Text>
          </View>
          <Text style={styles.completedSubtext}>
            You got {correctCount} out of {questions.length} correct!
          </Text>

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
    <ScrollView style={styles.container}>
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

        {/* Show hint if wrong answer */}
        {isAnswered && !isCorrect && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintTitle}>❌ Not quite!</Text>
            <Text style={styles.hintText}>{getHint()}</Text>
            <Text style={styles.hintSubtext}>Try again!</Text>
          </View>
        )}

        {/* Show result card if correct */}
        {isAnswered && isCorrect && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✅ Correct!</Text>
            <View style={styles.resultContent}>
              <Text style={styles.resultWord}>{currentQuestion.card.front}</Text>
              <Text style={styles.resultDefinition}>{currentQuestion.card.back}</Text>

              {currentQuestion.card.example && (
                <View style={styles.examplesContainer}>
                  {currentQuestion.card.example.split('\n\n').map((example, index) => (
                    <Text key={index} style={styles.exampleText}>
                      {example}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Options */}
        {(!isAnswered || !isCorrect) && (
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
        )}

        {/* Continue Button - Only show when correct */}
        {isCorrect && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleContinue}
          >
            <Text style={styles.actionButtonText}>
              {currentQuestionIndex < questions.length - 1 ? 'Continue →' : 'Finish Quiz'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressText: {
    ...Typography.labelSmall,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: RobloxTheme.gray700,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: RobloxTheme.primary,
    shadowColor: RobloxTheme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  questionContainer: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: RobloxTheme.border,
  },
  questionLabel: {
    ...Typography.label,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  questionWord: {
    ...Typography.h1,
    color: RobloxTheme.textPrimary,
  },
  hintContainer: {
    backgroundColor: RobloxTheme.warningBg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: RobloxTheme.warning,
  },
  hintTitle: {
    ...Typography.h4,
    color: RobloxTheme.warning,
    marginBottom: Spacing.sm,
  },
  hintText: {
    ...Typography.body,
    color: RobloxTheme.textPrimary,
    marginBottom: Spacing.sm,
  },
  hintSubtext: {
    ...Typography.bodySmall,
    color: RobloxTheme.textSecondary,
    fontStyle: 'italic',
  },
  resultCard: {
    backgroundColor: RobloxTheme.successBg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: RobloxTheme.success,
  },
  resultTitle: {
    ...Typography.h3,
    color: RobloxTheme.success,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  resultContent: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  resultWord: {
    ...Typography.h2,
    color: RobloxTheme.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  resultDefinition: {
    ...Typography.body,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  examplesContainer: {
    borderTopWidth: 1,
    borderTopColor: RobloxTheme.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  exampleText: {
    ...Typography.bodySmall,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionButton: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: RobloxTheme.border,
  },
  optionButtonSelected: {
    borderColor: RobloxTheme.primary,
    backgroundColor: RobloxTheme.backgroundHighlight,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  optionText: {
    ...Typography.body,
    color: RobloxTheme.textPrimary,
  },
  optionTextSelected: {
    color: RobloxTheme.primary,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: RobloxTheme.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonDisabled: {
    backgroundColor: RobloxTheme.gray600,
    shadowOpacity: 0,
  },
  actionButtonText: {
    ...Typography.h4,
    color: RobloxTheme.textPrimary,
  },
  completedContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    ...Typography.h1,
    color: RobloxTheme.textPrimary,
    marginBottom: Spacing.xl,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: RobloxTheme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 4,
    borderColor: RobloxTheme.primaryLight,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
    color: RobloxTheme.textPrimary,
  },
  completedSubtext: {
    ...Typography.bodyLarge,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.xl,
  },
  finishButton: {
    backgroundColor: RobloxTheme.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  finishButtonText: {
    ...Typography.h4,
    color: RobloxTheme.textPrimary,
  },
});

export default QuizScreen;

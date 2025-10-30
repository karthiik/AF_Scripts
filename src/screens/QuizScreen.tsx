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

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered && isCorrect) return; // Don't allow changing after correct answer
    setSelectedAnswer(answer);
  };

  const handleCheckAnswer = async () => {
    if (!selectedAnswer || !user) return;

    const currentQuestion = questions[currentQuestionIndex];
    const correct = selectedAnswer === currentQuestion.correctAnswer;

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
          userAnswer: selectedAnswer,
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

  const handleTryAgain = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
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
        <ActivityIndicator size="large" color="#6366f1" />
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

        {/* Action Button */}
        {!isAnswered ? (
          <TouchableOpacity
            style={[styles.actionButton, !selectedAnswer && styles.actionButtonDisabled]}
            onPress={handleCheckAnswer}
            disabled={!selectedAnswer}
          >
            <Text style={styles.actionButtonText}>Check Answer</Text>
          </TouchableOpacity>
        ) : isCorrect ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleContinue}
          >
            <Text style={styles.actionButtonText}>
              {currentQuestionIndex < questions.length - 1 ? 'Continue →' : 'Finish Quiz'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.tryAgainButton}
            onPress={handleTryAgain}
          >
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
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
    marginBottom: 20,
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
  hintContainer: {
    backgroundColor: '#fef3c7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  hintTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 16,
    color: '#78350f',
    marginBottom: 8,
  },
  hintSubtext: {
    fontSize: 14,
    color: '#92400e',
    fontStyle: 'italic',
  },
  resultCard: {
    backgroundColor: '#dcfce7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
  },
  resultWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultDefinition: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  examplesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
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
  actionButton: {
    backgroundColor: '#6366f1',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#a5a7f7',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tryAgainButton: {
    backgroundColor: '#f97316',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  tryAgainButtonText: {
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

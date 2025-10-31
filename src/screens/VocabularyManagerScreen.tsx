import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, VocabularyCard, UserRole, VocabularyLevel } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RobloxTheme, Typography, Spacing, BorderRadius } from '../theme/colors';
import {
  getAllVocabularyCards,
  createVocabularyCard,
  updateVocabularyCard,
  deleteVocabularyCard,
  deleteAllVocabularyCards,
  parseExcelFile,
  bulkImportVocabularyCards,
} from '../services/vocabularyService';

type VocabularyManagerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'VocabularyManager'>;
};

const VocabularyManagerScreen: React.FC<VocabularyManagerScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<VocabularyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);

  // New card form
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('1');
  const [newLevel, setNewLevel] = useState<VocabularyLevel>(VocabularyLevel.BEGINNER);

  // Excel import
  const [importing, setImporting] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<VocabularyLevel>(VocabularyLevel.BEGINNER);

  // Edit mode
  const [editingCard, setEditingCard] = useState<VocabularyCard | null>(null);

  useEffect(() => {
    if (user?.role !== UserRole.PARENT) {
      alert('Access Denied: Only parents can manage vocabulary');
      navigation.goBack();
      return;
    }

    loadCards();
  }, []);

  const loadCards = async () => {
    setLoading(true);
    try {
      const allCards = await getAllVocabularyCards();
      setCards(allCards);
    } catch (error) {
      console.error('Error loading cards:', error);
      alert('Failed to load vocabulary cards');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!user) return;

    if (!newFront || !newBack) {
      alert('Please fill in word and definition');
      return;
    }

    try {
      await createVocabularyCard({
        front: newFront,
        back: newBack,
        example: newExample || undefined,
        difficulty: parseInt(newDifficulty) || 1,
        level: newLevel,
        createdBy: user.id,
      });

      setNewFront('');
      setNewBack('');
      setNewExample('');
      setNewDifficulty('1');
      setNewLevel(VocabularyLevel.BEGINNER);
      setShowAddCard(false);

      await loadCards();
      alert('Vocabulary card added!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;

    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📂 Excel file selected:', file.name);

    setImporting(true);
    try {
      // Parse Excel file
      const parsedCards = await parseExcelFile(file, selectedLevel);
      console.log(`✅ Parsed ${parsedCards.length} cards from Excel`);

      if (parsedCards.length === 0) {
        alert('No vocabulary cards found in Excel file. Please check the format.');
        return;
      }

      // Confirm import
      const confirmImport = confirm(
        `Import ${parsedCards.length} vocabulary cards at ${selectedLevel} level?\n\nExpected format:\nColumn A: Word\nColumn B: Definition\nColumn C: Example (optional)\nColumn D: Difficulty 1-5 (optional)`
      );

      if (!confirmImport) {
        console.log('❌ Import cancelled by user');
        return;
      }

      // Bulk import to Firestore
      await bulkImportVocabularyCards(parsedCards, user.id);

      alert(`Successfully imported ${parsedCards.length} vocabulary cards!`);
      await loadCards();

      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      console.error('❌ Excel import error:', error);
      alert(`Failed to import Excel file: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    try {
      await updateVocabularyCard(editingCard.id, {
        front: editingCard.front,
        back: editingCard.back,
        example: editingCard.example,
        difficulty: editingCard.difficulty,
      });

      setEditingCard(null);
      await loadCards();
      alert('Card updated!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const confirmed = confirm('Are you sure you want to delete this card?');
    if (!confirmed) return;

    try {
      await deleteVocabularyCard(cardId);
      await loadCards();
      alert('Card deleted!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteAll = async () => {
    const confirmDelete = confirm(
      `⚠️ WARNING: Delete ALL ${cards.length} vocabulary cards?\n\nThis action CANNOT be undone!\n\nType 'DELETE' to confirm.`
    );

    if (!confirmDelete) {
      console.log('❌ Mass delete cancelled');
      return;
    }

    setLoading(true);
    try {
      const deletedCount = await deleteAllVocabularyCards();
      await loadCards();
      alert(`✅ Successfully deleted ${deletedCount} vocabulary cards!`);
    } catch (error: any) {
      console.error('❌ Delete all error:', error);
      alert(`Failed to delete all cards: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={RobloxTheme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vocabulary Cards ({cards.length})</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setShowAddCard(!showAddCard)}>
            <Text style={styles.addButton}>
              {showAddCard ? '− Cancel' : '+ Add Card'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete All Button (for troubleshooting) */}
      {cards.length > 0 && (
        <View style={styles.deleteAllContainer}>
          <TouchableOpacity
            style={styles.deleteAllButton}
            onPress={handleDeleteAll}
          >
            <Text style={styles.deleteAllButtonText}>
              🗑️ Delete All ({cards.length} cards)
            </Text>
          </TouchableOpacity>
          <Text style={styles.deleteAllWarning}>
            Use this to reset and troubleshoot import issues
          </Text>
        </View>
      )}

      {/* Add Card Form */}
      {showAddCard && (
        <View style={styles.addCardForm}>
          <TextInput
            style={styles.input}
            placeholder="Word or Phrase"
            placeholderTextColor={RobloxTheme.textTertiary}
            value={newFront}
            onChangeText={setNewFront}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Definition"
            placeholderTextColor={RobloxTheme.textTertiary}
            value={newBack}
            onChangeText={setNewBack}
            multiline
            numberOfLines={3}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Example (optional)"
            placeholderTextColor={RobloxTheme.textTertiary}
            value={newExample}
            onChangeText={setNewExample}
            multiline
            numberOfLines={2}
          />

          <View style={styles.difficultyContainer}>
            <Text style={styles.label}>Difficulty:</Text>
            <View style={styles.difficultyButtons}>
              {[1, 2, 3, 4, 5].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.difficultyButton,
                    newDifficulty === level.toString() &&
                      styles.difficultyButtonActive,
                  ]}
                  onPress={() => setNewDifficulty(level.toString())}
                >
                  <Text
                    style={[
                      styles.difficultyButtonText,
                      newDifficulty === level.toString() &&
                        styles.difficultyButtonTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.levelContainer}>
            <Text style={styles.label}>Level:</Text>
            <View style={styles.levelButtons}>
              {Object.values(VocabularyLevel).map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    newLevel === level && styles.levelButtonActive,
                  ]}
                  onPress={() => setNewLevel(level)}
                >
                  <Text
                    style={[
                      styles.levelButtonText,
                      newLevel === level && styles.levelButtonTextActive,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleAddCard}>
            <Text style={styles.createButtonText}>Add Card</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Excel Import Section */}
      <View style={styles.importSection}>
        <Text style={styles.sectionTitle}>Import from Excel</Text>

        <View style={styles.levelSelectContainer}>
          <Text style={styles.label}>Import Level:</Text>
          <View style={styles.levelButtons}>
            {Object.values(VocabularyLevel).map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelButton,
                  selectedLevel === level && styles.levelButtonActive,
                ]}
                onPress={() => setSelectedLevel(level)}
                disabled={importing}
              >
                <Text
                  style={[
                    styles.levelButtonText,
                    selectedLevel === level && styles.levelButtonTextActive,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.importButtonContainer}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelImport}
            style={{ display: 'none' }}
            id="excel-upload"
            disabled={importing}
          />
          <TouchableOpacity
            style={[styles.importButton, importing && styles.importButtonDisabled]}
            onPress={() => document.getElementById('excel-upload')?.click()}
            disabled={importing}
          >
            <Text style={styles.importButtonText}>
              {importing ? 'Importing...' : '📤 Import Excel File'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.helpText}>
          Excel format: Column A: Word | Column B: Definition | Column C: Example (optional) | Column D: Difficulty 1-5 (optional)
        </Text>
      </View>

      {/* Cards List */}
      <ScrollView style={styles.cardsList}>
        {cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No vocabulary cards yet. Add some to get started!
            </Text>
          </View>
        ) : (
          cards.map(card => (
            <View key={card.id} style={styles.card}>
              {editingCard?.id === card.id ? (
                // Edit Mode
                <View style={styles.editForm}>
                  <TextInput
                    style={styles.input}
                    placeholderTextColor={RobloxTheme.textTertiary}
                    value={editingCard.front}
                    onChangeText={text =>
                      setEditingCard({ ...editingCard, front: text })
                    }
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholderTextColor={RobloxTheme.textTertiary}
                    value={editingCard.back}
                    onChangeText={text =>
                      setEditingCard({ ...editingCard, back: text })
                    }
                    multiline
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholderTextColor={RobloxTheme.textTertiary}
                    value={editingCard.example || ''}
                    onChangeText={text =>
                      setEditingCard({ ...editingCard, example: text })
                    }
                    placeholder="Example (optional)"
                    multiline
                  />

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleUpdateCard}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setEditingCard(null)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // View Mode
                <>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardFront}>{card.front}</Text>
                    <View style={styles.difficultyBadge}>
                      <Text style={styles.difficultyBadgeText}>
                        Level {card.difficulty || 1}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardBack}>{card.back}</Text>

                  {card.example && (
                    <Text style={styles.cardExample}>
                      Example: {card.example}
                    </Text>
                  )}

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setEditingCard(card)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCard(card.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: RobloxTheme.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: RobloxTheme.border,
  },
  headerTitle: {
    ...Typography.h4,
    color: RobloxTheme.textPrimary,
  },
  addButton: {
    ...Typography.body,
    color: RobloxTheme.primary,
    fontWeight: '600',
  },
  addCardForm: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: RobloxTheme.border,
  },
  input: {
    backgroundColor: RobloxTheme.backgroundHighlight,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: RobloxTheme.border,
    ...Typography.body,
    color: RobloxTheme.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    ...Typography.label,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.sm,
  },
  difficultyContainer: {
    marginBottom: Spacing.md,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  difficultyButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: RobloxTheme.border,
    backgroundColor: RobloxTheme.backgroundElevated,
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: RobloxTheme.primary,
    borderColor: RobloxTheme.primary,
  },
  difficultyButtonText: {
    ...Typography.label,
    color: RobloxTheme.textSecondary,
  },
  difficultyButtonTextActive: {
    color: RobloxTheme.textPrimary,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: RobloxTheme.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: RobloxTheme.textPrimary,
    ...Typography.body,
    fontWeight: '600',
  },
  cardsList: {
    flex: 1,
    padding: Spacing.lg,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: RobloxTheme.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardFront: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: RobloxTheme.textPrimary,
    flex: 1,
  },
  difficultyBadge: {
    backgroundColor: RobloxTheme.backgroundHighlight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: RobloxTheme.primary,
  },
  difficultyBadgeText: {
    ...Typography.labelSmall,
    color: RobloxTheme.primary,
    fontWeight: '600',
  },
  cardBack: {
    ...Typography.body,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.sm,
  },
  cardExample: {
    ...Typography.bodySmall,
    color: RobloxTheme.textTertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: RobloxTheme.backgroundHighlight,
    borderWidth: 1,
    borderColor: RobloxTheme.primary,
    alignItems: 'center',
  },
  editButtonText: {
    ...Typography.label,
    color: RobloxTheme.primary,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: RobloxTheme.errorBg,
    borderWidth: 1,
    borderColor: RobloxTheme.error,
    alignItems: 'center',
  },
  deleteButtonText: {
    ...Typography.label,
    color: RobloxTheme.error,
    fontWeight: '600',
  },
  editForm: {
    gap: Spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: RobloxTheme.success,
    alignItems: 'center',
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    ...Typography.label,
    color: RobloxTheme.textPrimary,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: RobloxTheme.backgroundHighlight,
    borderWidth: 1,
    borderColor: RobloxTheme.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.label,
    color: RobloxTheme.textSecondary,
    fontWeight: '600',
  },
  levelContainer: {
    marginBottom: Spacing.md,
  },
  levelButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  levelButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: RobloxTheme.border,
    backgroundColor: RobloxTheme.backgroundElevated,
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: RobloxTheme.primary,
    borderColor: RobloxTheme.primary,
  },
  levelButtonText: {
    ...Typography.bodySmall,
    color: RobloxTheme.textSecondary,
  },
  levelButtonTextActive: {
    color: RobloxTheme.textPrimary,
    fontWeight: '600',
  },
  importSection: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: RobloxTheme.border,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: RobloxTheme.textPrimary,
    marginBottom: Spacing.md,
  },
  levelSelectContainer: {
    marginBottom: Spacing.md,
  },
  importButtonContainer: {
    marginBottom: Spacing.sm,
  },
  importButton: {
    backgroundColor: RobloxTheme.success,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  importButtonDisabled: {
    backgroundColor: RobloxTheme.gray600,
  },
  importButtonText: {
    color: RobloxTheme.textPrimary,
    ...Typography.body,
    fontWeight: '600',
  },
  helpText: {
    ...Typography.bodySmall,
    color: RobloxTheme.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  deleteAllContainer: {
    backgroundColor: RobloxTheme.errorBg,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: RobloxTheme.errorBorder,
  },
  deleteAllButton: {
    backgroundColor: RobloxTheme.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: RobloxTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteAllButtonText: {
    color: RobloxTheme.textPrimary,
    ...Typography.body,
    fontWeight: '600',
  },
  deleteAllWarning: {
    ...Typography.labelSmall,
    color: RobloxTheme.error,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VocabularyManagerScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, VocabularyCard, UserRole, VocabularyLevel } from '../types';
import { useAuth } from '../contexts/AuthContext';
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
      Alert.alert('Access Denied', 'Only parents can manage vocabulary', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
      Alert.alert('Error', 'Failed to load vocabulary cards');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!user) return;

    if (!newFront || !newBack) {
      Alert.alert('Error', 'Please fill in word and definition');
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
      Alert.alert('Success', 'Card updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    Alert.alert('Delete Card', 'Are you sure you want to delete this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVocabularyCard(cardId);
            await loadCards();
            Alert.alert('Success', 'Card deleted!');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
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
        <ActivityIndicator size="large" color="#6366f1" />
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
            value={newFront}
            onChangeText={setNewFront}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Definition"
            value={newBack}
            onChangeText={setNewBack}
            multiline
            numberOfLines={3}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Example (optional)"
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
                    value={editingCard.front}
                    onChangeText={text =>
                      setEditingCard({ ...editingCard, front: text })
                    }
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editingCard.back}
                    onChangeText={text =>
                      setEditingCard({ ...editingCard, back: text })
                    }
                    multiline
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  addCardForm: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  input: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  difficultyContainer: {
    marginBottom: 15,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  difficultyButtonText: {
    fontSize: 14,
    color: '#666',
  },
  difficultyButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardsList: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardFront: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  difficultyBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyBadgeText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
  },
  cardBack: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  cardExample: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
  editForm: {
    gap: 10,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  levelContainer: {
    marginBottom: 15,
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  levelButtonText: {
    fontSize: 13,
    color: '#666',
  },
  levelButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  importSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  levelSelectContainer: {
    marginBottom: 15,
  },
  importButtonContainer: {
    marginBottom: 10,
  },
  importButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteAllContainer: {
    backgroundColor: '#fef2f2',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  deleteAllButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteAllWarning: {
    fontSize: 11,
    color: '#991b1b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VocabularyManagerScreen;

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
import { RootStackParamList, RewardRule, RewardEarned, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  getRewardRules,
  createRewardRule,
  updateRewardRule,
  deleteRewardRule,
  getUnpaidRewards,
  markRewardAsPaid,
} from '../services/rewardService';
import { getLinkedUser } from '../services/authService';

type AdminPanelScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;
};

const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [rewardRules, setRewardRules] = useState<RewardRule[]>([]);
  const [unpaidRewards, setUnpaidRewards] = useState<RewardEarned[]>([]);
  const [linkedUser, setLinkedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddReward, setShowAddReward] = useState(false);

  // New reward form
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDescription, setNewRewardDescription] = useState('');
  const [newRewardType, setNewRewardType] = useState<'streak' | 'mastery' | 'score'>('streak');
  const [newRewardTarget, setNewRewardTarget] = useState('');
  const [newRewardAmount, setNewRewardAmount] = useState('');

  useEffect(() => {
    if (user?.role !== UserRole.PARENT) {
      Alert.alert('Access Denied', 'Only parents can access the admin panel', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [rules, linked] = await Promise.all([
        getRewardRules(user.id),
        getLinkedUser(user.id),
      ]);

      setRewardRules(rules);
      setLinkedUser(linked);

      if (linked) {
        const rewards = await getUnpaidRewards(linked.id);
        setUnpaidRewards(rewards);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReward = async () => {
    if (!user) return;

    if (!newRewardTitle || !newRewardTarget || !newRewardAmount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await createRewardRule({
        parentId: user.id,
        title: newRewardTitle,
        description: newRewardDescription,
        condition: {
          type: newRewardType,
          target: parseInt(newRewardTarget),
        },
        amount: parseFloat(newRewardAmount),
        isActive: true,
      });

      setNewRewardTitle('');
      setNewRewardDescription('');
      setNewRewardTarget('');
      setNewRewardAmount('');
      setShowAddReward(false);

      await loadAdminData();
      Alert.alert('Success', 'Reward rule created!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleRule = async (rule: RewardRule) => {
    try {
      await updateRewardRule(rule.id, { isActive: !rule.isActive });
      await loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    Alert.alert('Delete Rule', 'Are you sure you want to delete this reward rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRewardRule(ruleId);
            await loadAdminData();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleMarkAsPaid = async (rewardId: string) => {
    try {
      await markRewardAsPaid(rewardId);
      await loadAdminData();
      Alert.alert('Success', 'Reward marked as paid!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Linked Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Account</Text>
          {linkedUser ? (
            <View style={styles.linkedUserCard}>
              <Text style={styles.linkedUserName}>{linkedUser.displayName}</Text>
              <Text style={styles.linkedUserEmail}>{linkedUser.email}</Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>
              No linked account. Ask your son to share their user ID to link accounts.
            </Text>
          )}
        </View>

        {/* Vocabulary Manager */}
        <TouchableOpacity
          style={styles.manageVocabButton}
          onPress={() => navigation.navigate('VocabularyManager')}
        >
          <Text style={styles.manageVocabButtonText}>Manage Vocabulary</Text>
        </TouchableOpacity>

        {/* Unpaid Rewards */}
        {linkedUser && unpaidRewards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Rewards</Text>
            {unpaidRewards.map(reward => (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardAmount}>${reward.amount.toFixed(2)}</Text>
                  <Text style={styles.rewardDate}>
                    Earned: {reward.earnedAt.toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.markPaidButton}
                  onPress={() => handleMarkAsPaid(reward.id)}
                >
                  <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Reward Rules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reward Rules</Text>
            <TouchableOpacity onPress={() => setShowAddReward(!showAddReward)}>
              <Text style={styles.addButton}>
                {showAddReward ? '− Cancel' : '+ Add Rule'}
              </Text>
            </TouchableOpacity>
          </View>

          {showAddReward && (
            <View style={styles.addRewardForm}>
              <TextInput
                style={styles.input}
                placeholder="Title (e.g., Week Warrior)"
                value={newRewardTitle}
                onChangeText={setNewRewardTitle}
              />

              <TextInput
                style={styles.input}
                placeholder="Description"
                value={newRewardDescription}
                onChangeText={setNewRewardDescription}
              />

              <Text style={styles.label}>Reward Type:</Text>
              <View style={styles.typeContainer}>
                {(['streak', 'mastery', 'score'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newRewardType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewRewardType(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newRewardType === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder={`Target (e.g., ${
                  newRewardType === 'streak'
                    ? '7 days'
                    : newRewardType === 'mastery'
                    ? '10 words'
                    : '100 points'
                })`}
                value={newRewardTarget}
                onChangeText={setNewRewardTarget}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Amount ($)"
                value={newRewardAmount}
                onChangeText={setNewRewardAmount}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateReward}
              >
                <Text style={styles.createButtonText}>Create Reward Rule</Text>
              </TouchableOpacity>
            </View>
          )}

          {rewardRules.length === 0 ? (
            <Text style={styles.noDataText}>
              No reward rules yet. Create one to motivate your learner!
            </Text>
          ) : (
            rewardRules.map(rule => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleAmount}>${rule.amount.toFixed(2)}</Text>
                </View>
                <Text style={styles.ruleDescription}>{rule.description}</Text>
                <Text style={styles.ruleCondition}>
                  Target: {rule.condition.target}{' '}
                  {rule.condition.type === 'streak'
                    ? 'days'
                    : rule.condition.type === 'mastery'
                    ? 'words'
                    : 'points'}
                </Text>

                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      rule.isActive && styles.toggleButtonActive,
                    ]}
                    onPress={() => handleToggleRule(rule)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        rule.isActive && styles.toggleButtonTextActive,
                      ]}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRule(rule.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
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
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  linkedUserCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  linkedUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  linkedUserEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  manageVocabButton: {
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  manageVocabButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rewardCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  rewardDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  markPaidButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  markPaidButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addRewardForm: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  ruleCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ruleAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  ruleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  ruleCondition: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
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
});

export default AdminPanelScreen;

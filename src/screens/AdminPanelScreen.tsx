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
import { RootStackParamList, RewardRule, RewardEarned, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RobloxTheme, Typography, Spacing, BorderRadius } from '../theme/colors';
import {
  getRewardRules,
  createRewardRule,
  updateRewardRule,
  deleteRewardRule,
  getUnpaidRewards,
  markRewardAsPaid,
  deleteAllUserRewards,
} from '../services/rewardService';
import { getLinkedUser } from '../services/authService';
import { deleteAllQuizAttempts } from '../services/quizService';
import { deleteAllUserProgress } from '../services/vocabularyService';
import { deleteUserStreak } from '../services/streakService';
import { getSettings, updateSettings } from '../services/settingsService';

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
  const [enforceOncePerDay, setEnforceOncePerDay] = useState(true);

  // New reward form
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDescription, setNewRewardDescription] = useState('');
  const [newRewardType, setNewRewardType] = useState<'streak' | 'mastery' | 'score'>('streak');
  const [newRewardTarget, setNewRewardTarget] = useState('');
  const [newRewardAmount, setNewRewardAmount] = useState('');

  useEffect(() => {
    if (user?.role !== UserRole.PARENT) {
      alert('Access Denied: Only parents can access the admin panel');
      navigation.goBack();
      return;
    }

    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [rules, linked, settings] = await Promise.all([
        getRewardRules(user.id),
        getLinkedUser(user.id),
        getSettings(user.id),
      ]);

      setRewardRules(rules);
      setLinkedUser(linked);
      setEnforceOncePerDay(settings?.enforceOncePerDay ?? true);

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
      alert('Please fill in all fields');
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
      alert('Reward rule created!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleRule = async (rule: RewardRule) => {
    try {
      await updateRewardRule(rule.id, { isActive: !rule.isActive });
      await loadAdminData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const confirmed = confirm('Are you sure you want to delete this reward rule?');
    if (!confirmed) return;

    try {
      await deleteRewardRule(ruleId);
      await loadAdminData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleMarkAsPaid = async (rewardId: string) => {
    try {
      await markRewardAsPaid(rewardId);
      await loadAdminData();
      alert('Reward marked as paid!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleOncePerDay = async () => {
    if (!user) return;

    try {
      const newValue = !enforceOncePerDay;
      await updateSettings(user.id, { enforceOncePerDay: newValue });
      setEnforceOncePerDay(newValue);
      alert(
        newValue
          ? '✅ Quiz restriction enabled: 1 quiz per day'
          : '✅ Quiz restriction disabled: Unlimited quizzes'
      );
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleResetUserStats = async () => {
    if (!linkedUser) {
      alert('No linked user to reset stats for');
      return;
    }

    const confirmed = confirm(
      `⚠️ WARNING: Reset ALL stats and rewards for ${linkedUser.displayName}?\n\nThis will delete:\n• All quiz attempts\n• All vocabulary progress\n• All earned rewards\n• Current streak\n\nThis action CANNOT be undone!\n\nType 'RESET' to confirm.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const [quizCount, progressCount, rewardsCount, streakCount] = await Promise.all([
        deleteAllQuizAttempts(linkedUser.id),
        deleteAllUserProgress(linkedUser.id),
        deleteAllUserRewards(linkedUser.id),
        deleteUserStreak(linkedUser.id),
      ]);

      await loadAdminData();

      alert(
        `✅ Successfully reset stats for ${linkedUser.displayName}!\n\n` +
        `Deleted:\n` +
        `• ${quizCount} quiz attempts\n` +
        `• ${progressCount} progress records\n` +
        `• ${rewardsCount} rewards\n` +
        `• ${streakCount} streak record(s)`
      );
    } catch (error: any) {
      console.error('❌ Reset stats error:', error);
      alert(`Failed to reset stats: ${error.message}`);
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Linked Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Account</Text>
          {linkedUser ? (
            <>
              <View style={styles.linkedUserCard}>
                <Text style={styles.linkedUserName}>{linkedUser.displayName}</Text>
                <Text style={styles.linkedUserEmail}>{linkedUser.email}</Text>
              </View>

              {/* Reset Stats Button */}
              <View style={styles.resetContainer}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetUserStats}
                >
                  <Text style={styles.resetButtonText}>
                    🔄 Reset All Stats & Rewards
                  </Text>
                </TouchableOpacity>
                <Text style={styles.resetWarning}>
                  Deletes all quiz attempts, progress, rewards, and streaks
                </Text>
              </View>
            </>
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

        {/* Quiz Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiz Settings</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>1 Quiz Per Day Restriction</Text>
              <Text style={styles.settingDescription}>
                {enforceOncePerDay
                  ? 'Enabled: Users can only take quiz once per day'
                  : 'Disabled: Users can take unlimited quizzes (for practice)'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                enforceOncePerDay && styles.toggleButtonActive,
              ]}
              onPress={handleToggleOncePerDay}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  enforceOncePerDay && styles.toggleButtonTextActive,
                ]}
              >
                {enforceOncePerDay ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
                placeholderTextColor={RobloxTheme.textTertiary}
                value={newRewardTitle}
                onChangeText={setNewRewardTitle}
              />

              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor={RobloxTheme.textTertiary}
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
                placeholderTextColor={RobloxTheme.textTertiary}
                value={newRewardTarget}
                onChangeText={setNewRewardTarget}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Amount ($)"
                placeholderTextColor={RobloxTheme.textTertiary}
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
    backgroundColor: RobloxTheme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RobloxTheme.background,
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    color: RobloxTheme.textPrimary,
  },
  addButton: {
    fontSize: Typography.body.fontSize,
    color: RobloxTheme.primary,
    fontWeight: '600',
  },
  linkedUserCard: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  linkedUserName: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: RobloxTheme.textPrimary,
  },
  linkedUserEmail: {
    fontSize: Typography.bodySmall.fontSize,
    color: RobloxTheme.textSecondary,
    marginTop: 4,
  },
  noDataText: {
    fontSize: Typography.bodySmall.fontSize,
    color: RobloxTheme.textSecondary,
    fontStyle: 'italic',
  },
  manageVocabButton: {
    backgroundColor: RobloxTheme.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: RobloxTheme.shadow,
  },
  manageVocabButtonText: {
    color: RobloxTheme.textPrimary,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  rewardCard: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardAmount: {
    fontSize: Typography.h4.fontSize,
    fontWeight: 'bold',
    color: RobloxTheme.primary,
  },
  rewardDate: {
    fontSize: Typography.labelSmall.fontSize,
    color: RobloxTheme.textSecondary,
    marginTop: 4,
  },
  markPaidButton: {
    backgroundColor: RobloxTheme.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    shadowColor: RobloxTheme.shadow,
  },
  markPaidButtonText: {
    color: RobloxTheme.textPrimary,
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
  },
  addRewardForm: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: RobloxTheme.backgroundHighlight,
    color: RobloxTheme.textPrimary,
    padding: Spacing.md / 1.33,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: RobloxTheme.border,
  },
  label: {
    fontSize: Typography.label.fontSize,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: RobloxTheme.border,
    backgroundColor: RobloxTheme.backgroundElevated,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: RobloxTheme.primary,
    borderColor: RobloxTheme.primary,
  },
  typeButtonText: {
    fontSize: Typography.labelSmall.fontSize,
    color: RobloxTheme.textSecondary,
  },
  typeButtonTextActive: {
    color: RobloxTheme.textPrimary,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: RobloxTheme.primary,
    padding: Spacing.md / 1.33,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: RobloxTheme.shadow,
  },
  createButtonText: {
    color: RobloxTheme.textPrimary,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  ruleCard: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ruleTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: 'bold',
    color: RobloxTheme.textPrimary,
  },
  ruleAmount: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: 'bold',
    color: RobloxTheme.primary,
  },
  ruleDescription: {
    fontSize: Typography.bodySmall.fontSize,
    color: RobloxTheme.textSecondary,
    marginBottom: 6,
  },
  ruleCondition: {
    fontSize: Typography.labelSmall.fontSize,
    color: RobloxTheme.textSecondary,
    marginBottom: Spacing.sm,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: RobloxTheme.border,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: RobloxTheme.success,
    borderColor: RobloxTheme.success,
  },
  toggleButtonText: {
    fontSize: Typography.label.fontSize,
    color: RobloxTheme.textSecondary,
  },
  toggleButtonTextActive: {
    color: RobloxTheme.textPrimary,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: RobloxTheme.errorBg,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: Typography.label.fontSize,
    color: RobloxTheme.error,
    fontWeight: '600',
  },
  resetContainer: {
    backgroundColor: RobloxTheme.errorBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: RobloxTheme.errorBorder,
  },
  resetButton: {
    backgroundColor: RobloxTheme.warning,
    padding: Spacing.md / 1.33,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: RobloxTheme.shadow,
  },
  resetButtonText: {
    color: RobloxTheme.textPrimary,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  resetWarning: {
    fontSize: 11,
    color: RobloxTheme.error,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  settingCard: {
    backgroundColor: RobloxTheme.backgroundElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: RobloxTheme.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: Typography.labelSmall.fontSize,
    color: RobloxTheme.textSecondary,
  },
});

export default AdminPanelScreen;

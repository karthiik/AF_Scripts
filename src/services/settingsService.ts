import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export interface AppSettings {
  id: string;
  parentId: string;
  enforceOncePerDay: boolean; // If true, users can only take quiz once per day
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get settings for a parent
 */
export const getSettings = async (parentId: string): Promise<AppSettings | null> => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', parentId));

    if (!settingsDoc.exists()) {
      return null;
    }

    const data = settingsDoc.data();
    return {
      id: settingsDoc.id,
      parentId: data.parentId,
      enforceOncePerDay: data.enforceOncePerDay ?? true, // Default to true
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    console.error('Error getting settings:', error);
    return null;
  }
};

/**
 * Create or update settings
 */
export const updateSettings = async (
  parentId: string,
  updates: Partial<Pick<AppSettings, 'enforceOncePerDay'>>
): Promise<void> => {
  try {
    const settingsRef = doc(db, 'settings', parentId);
    const existingSettings = await getDoc(settingsRef);

    if (existingSettings.exists()) {
      // Update existing settings
      await updateDoc(settingsRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } else {
      // Create new settings
      await setDoc(settingsRef, {
        parentId,
        enforceOncePerDay: updates.enforceOncePerDay ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('✅ Settings updated:', updates);
  } catch (error: any) {
    console.error('❌ Failed to update settings:', error);
    throw new Error(`Failed to update settings: ${error.message}`);
  }
};

/**
 * Check if once-per-day quiz restriction is enforced
 */
export const isOncePerDayEnforced = async (parentId: string): Promise<boolean> => {
  try {
    const settings = await getSettings(parentId);
    // Default to true if no settings exist
    return settings?.enforceOncePerDay ?? true;
  } catch (error: any) {
    console.error('Error checking once per day enforcement:', error);
    return true; // Default to enforcing restriction on error
  }
};

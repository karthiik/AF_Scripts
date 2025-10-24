import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole } from '../types';

/**
 * Register a new user
 */
export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<User> => {
  try {
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name
    await updateProfile(firebaseUser, { displayName });

    // Create user document in Firestore
    const userData: Omit<User, 'id'> = {
      email,
      displayName,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: firebaseUser.uid,
      ...userData,
    };
  } catch (error: any) {
    throw new Error(`Registration failed: ${error.message}`);
  }
};

/**
 * Sign in existing user
 */
export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data();
    return {
      id: firebaseUser.uid,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      linkedUserId: userData.linkedUserId,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    throw new Error(`Sign in failed: ${error.message}`);
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
};

/**
 * Get current user data from Firestore
 */
export const getCurrentUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return {
      id: firebaseUser.uid,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      linkedUserId: userData.linkedUserId,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Link parent and son accounts
 * This should be called by the parent to link their account with their son's
 */
export const linkAccounts = async (
  parentId: string,
  sonEmail: string
): Promise<void> => {
  try {
    // Find son's user document by email
    // Note: In production, you might want to use a Cloud Function for this
    // to avoid security issues with querying user data
    const usersSnapshot = await getDoc(doc(db, 'users', parentId));

    if (!usersSnapshot.exists()) {
      throw new Error('Parent account not found');
    }

    const parentData = usersSnapshot.data();
    if (parentData.role !== UserRole.PARENT) {
      throw new Error('Only parent accounts can link to son accounts');
    }

    // For now, we'll require the parent to know the son's user ID
    // In a real app, you'd implement this more securely
    throw new Error('Please implement account linking with son user ID');
  } catch (error: any) {
    throw new Error(`Account linking failed: ${error.message}`);
  }
};

/**
 * Link accounts by user IDs (to be called after parent has son's ID)
 */
export const linkAccountsByIds = async (
  parentId: string,
  sonId: string
): Promise<void> => {
  try {
    // Update parent's document
    await updateDoc(doc(db, 'users', parentId), {
      linkedUserId: sonId,
      updatedAt: serverTimestamp(),
    });

    // Update son's document
    await updateDoc(doc(db, 'users', sonId), {
      linkedUserId: parentId,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(`Account linking failed: ${error.message}`);
  }
};

/**
 * Get linked user data
 */
export const getLinkedUser = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const linkedUserId = userData.linkedUserId;

    if (!linkedUserId) {
      return null;
    }

    const linkedUserDoc = await getDoc(doc(db, 'users', linkedUserId));

    if (!linkedUserDoc.exists()) {
      return null;
    }

    const linkedUserData = linkedUserDoc.data();
    return {
      id: linkedUserId,
      email: linkedUserData.email,
      displayName: linkedUserData.displayName,
      role: linkedUserData.role,
      linkedUserId: linkedUserData.linkedUserId,
      createdAt: linkedUserData.createdAt?.toDate() || new Date(),
      updatedAt: linkedUserData.updatedAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    console.error('Error getting linked user:', error);
    return null;
  }
};

# Vocab Streak - Gamified Vocabulary Learning App

A mobile application for iOS and Android that turns vocabulary learning into an engaging daily quiz game with competitive and reward-based elements.

## Features

### Core Features (P0)
- **User Accounts**: Parent and Son accounts with account linking
- **Vocabulary Database**: Cloud-synced vocabulary cards with CRUD operations
- **Daily Quiz**: 3 random vocabulary cards per day
- **Scoring System**: Points for correct answers with speed bonuses
- **Competitive Leaderboard**: Daily, weekly, and all-time scores
- **Daily Streaks**: Track consecutive days of quiz completion

### Additional Features (P1)
- **Daily Reminders**: Push notifications to maintain streaks
- **Monetary Reward System**: Parent-controlled reward tracking
- **Admin Panel**: Parent dashboard for managing vocabulary and rewards
- **Vocabulary Manager**: Add, edit, and delete vocabulary cards

## Tech Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **Backend**: Firebase (Firestore, Authentication, Cloud Messaging)
- **Navigation**: React Navigation
- **State Management**: React Context API

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase account (free tier is sufficient)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd AF_Scripts
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard to create your project

#### Enable Firebase Services

1. **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" authentication

2. **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in "production mode" (we'll add security rules later)
   - Choose a location closest to your users

3. **Cloud Messaging** (for push notifications):
   - Go to Project Settings > Cloud Messaging
   - Note your Server Key (you'll need this later)

#### Get Firebase Configuration

1. Go to Project Settings > General
2. Scroll down to "Your apps"
3. Click the Web icon (</>)
4. Register your app with a nickname
5. Copy the configuration object

#### Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase credentials:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

### 4. Firestore Security Rules

Set up security rules in Firestore to protect your data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Vocabulary cards - anyone can read, only parents can write
    match /vocabularyCards/{cardId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent';
    }

    // User vocabulary progress
    match /userVocabularyProgress/{progressId} {
      allow read, write: if request.auth != null &&
                            resource.data.userId == request.auth.uid;
    }

    // Quiz attempts
    match /quizAttempts/{attemptId} {
      allow read, write: if request.auth != null &&
                            resource.data.userId == request.auth.uid;
    }

    // Streaks
    match /streaks/{streakId} {
      allow read, write: if request.auth != null &&
                            resource.data.userId == request.auth.uid;
    }

    // Reward rules - only parents can manage
    match /rewardRules/{ruleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent';
    }

    // Rewards earned
    match /rewardsEarned/{rewardId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent';
    }
  }
}
```

### 5. Run the App

#### Start the Development Server

```bash
npm start
```

#### Run on Different Platforms

- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal
- **Web Browser**: Press `w` in the terminal
- **Physical Device**: Scan the QR code with Expo Go app

## Project Structure

```
AF_Scripts/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React Context providers
│   │   └── AuthContext.tsx
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/          # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── QuizScreen.tsx
│   │   ├── LeaderboardScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── AdminPanelScreen.tsx
│   │   └── VocabularyManagerScreen.tsx
│   ├── services/         # Firebase and API services
│   │   ├── firebase.ts
│   │   ├── authService.ts
│   │   ├── vocabularyService.ts
│   │   ├── quizService.ts
│   │   ├── streakService.ts
│   │   ├── leaderboardService.ts
│   │   └── rewardService.ts
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   └── utils/            # Helper functions
├── assets/               # Images, fonts, etc.
├── App.tsx               # Main app entry point
├── package.json
└── tsconfig.json
```

## Usage Guide

### For Parents

1. **Register**: Create an account with role "Parent"
2. **Add Vocabulary**: Navigate to Admin Panel > Manage Vocabulary
3. **Create Rewards**: Set up reward rules in the Admin Panel
4. **Link Accounts**: Share your user ID with your son to link accounts
5. **Monitor Progress**: View leaderboard and son's quiz history
6. **Mark Rewards**: Mark earned rewards as paid in Admin Panel

### For Learners (Son)

1. **Register**: Create an account with role "Learner"
2. **Daily Quiz**: Complete 3 vocabulary cards every day
3. **Build Streaks**: Don't miss a day to maintain your streak
4. **Earn Points**: Answer correctly and quickly for bonus points
5. **Compete**: Check the leaderboard to compete with your parent
6. **Track Rewards**: View your pending and paid rewards in your profile

## Scoring System

- **Correct Answer**: 10 points
- **Speed Bonus**:
  - Under 5 seconds: +5 points
  - Under 10 seconds: +3 points
- **Maximum per question**: 15 points
- **Maximum per day**: 45 points (3 questions)

## Data Models

### User
- Display name, email, role (parent/son)
- Linked user ID for parent-son connection

### Vocabulary Card
- Front (word), Back (definition)
- Example sentence (optional)
- Difficulty level (1-5)

### Quiz Attempt
- User, date, cards
- Answers with time spent
- Score and total points

### Streak
- Current streak, longest streak
- Last completed date

### Reward Rule
- Title, description, amount
- Condition type (streak/mastery/score)
- Target value

## Push Notifications (Optional)

To enable push notifications:

1. Install Expo Notifications:
   ```bash
   npx expo install expo-notifications
   ```

2. Configure notification permissions in your app

3. Set up Firebase Cloud Messaging in your Firebase project

4. Implement notification scheduling for daily reminders

## Building for Production

### iOS

```bash
npx expo build:ios
```

### Android

```bash
npx expo build:android
```

For more details, see [Expo Build Documentation](https://docs.expo.dev/build/introduction/)

## Troubleshooting

### Firebase Connection Issues
- Verify your `.env` file has correct credentials
- Check Firebase project settings
- Ensure Authentication and Firestore are enabled

### App Won't Start
- Clear cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Update Expo: `npm install -g expo-cli`

### Quiz Not Loading
- Ensure vocabulary cards exist in Firestore
- Check parent has added words in Vocabulary Manager
- Verify Firestore security rules allow read access

## Contributing

This is a private family project, but suggestions are welcome!

## License

MIT License - Feel free to use this for your own family learning projects!

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review Firebase Console for errors
3. Check Expo logs for detailed error messages

## Roadmap

### Future Enhancements
- [ ] Spaced repetition algorithm
- [ ] Image support for vocabulary cards
- [ ] Audio pronunciation
- [ ] Multiple choice variations
- [ ] Progress charts and analytics
- [ ] Social features (share achievements)
- [ ] Dark mode
- [ ] Offline mode with sync

---

Built with ❤️ for family vocabulary learning

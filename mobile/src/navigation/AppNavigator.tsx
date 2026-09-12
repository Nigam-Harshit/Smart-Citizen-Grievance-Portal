import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { RootScreen } from '../types/navigation';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SubmitGrievanceScreen } from '../screens/SubmitGrievanceScreen';
import { MyGrievancesScreen } from '../screens/MyGrievancesScreen';
import { GrievanceDetailScreen } from '../screens/GrievanceDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { StaffDirectoryScreen } from '../screens/StaffDirectoryScreen';
import { AuditLogsScreen } from '../screens/AuditLogsScreen';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<RootScreen>('Splash');
  const [previousScreen, setPreviousScreen] = useState<RootScreen>('Home');
  const [selectedGrievanceId, setSelectedGrievanceId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);

  const handleNavigate = (screen: RootScreen, params?: any) => {
    if (params?.id) {
      setSelectedGrievanceId(params.id);
    }
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('Login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Splash':
        return (
          <SplashScreen
            onNavigate={handleNavigate}
            onUserLoaded={(u) => setUser(u)}
          />
        );
      case 'Login':
        return (
          <LoginScreen
            onNavigate={handleNavigate}
            onLoginSuccess={(u) => {
              setUser(u);
              setCurrentScreen('Home');
            }}
          />
        );
      case 'Register':
        return (
          <RegisterScreen
            onNavigate={handleNavigate}
            onRegisterSuccess={(u) => {
              setUser(u);
              setCurrentScreen('Home');
            }}
          />
        );
      case 'Home':
        return (
          <HomeScreen
            user={user}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        );
      case 'SubmitGrievance':
        return (
          <SubmitGrievanceScreen
            user={user}
            onNavigate={handleNavigate}
          />
        );
      case 'MyGrievances':
        return (
          <MyGrievancesScreen
            user={user}
            onNavigate={handleNavigate}
          />
        );
      case 'GrievanceDetail':
        return (
          <GrievanceDetailScreen
            user={user}
            onNavigate={handleNavigate}
            grievanceId={selectedGrievanceId}
            fromScreen={previousScreen}
          />
        );
      case 'Profile':
        return (
          <ProfileScreen
            user={user}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        );
      case 'StaffDirectory':
        return (
          <StaffDirectoryScreen
            user={user}
            onNavigate={handleNavigate}
          />
        );
      case 'AuditLogs':
        return (
          <AuditLogsScreen
            user={user}
            onNavigate={handleNavigate}
          />
        );
      default:
        return (
          <HomeScreen
            user={user}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        );
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});

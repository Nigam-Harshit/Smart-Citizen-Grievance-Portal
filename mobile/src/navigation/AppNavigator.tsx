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

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<RootScreen>('Splash');
  const [selectedGrievanceId, setSelectedGrievanceId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>({
    _id: 'mock_citizen_1',
    name: 'Rajesh Kumar',
    email: 'citizen.rajesh@gmail.com',
    role: 'citizen',
    phone: '+91 98100 12345',
  });

  const handleNavigate = (screen: RootScreen, params?: any) => {
    if (params?.id) {
      setSelectedGrievanceId(params.id);
    }
    setCurrentScreen(screen);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('Login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Splash':
        return <SplashScreen onNavigate={handleNavigate} />;
      case 'Login':
        return <LoginScreen onNavigate={handleNavigate} onLoginSuccess={(u) => { setUser(u); setCurrentScreen('Home'); }} />;
      case 'Register':
        return <RegisterScreen onNavigate={handleNavigate} onRegisterSuccess={(u) => { setUser(u); setCurrentScreen('Home'); }} />;
      case 'Home':
        return <HomeScreen user={user} onNavigate={handleNavigate} onLogout={handleLogout} />;
      case 'SubmitGrievance':
        return <SubmitGrievanceScreen user={user} onNavigate={handleNavigate} />;
      case 'MyGrievances':
        return <MyGrievancesScreen onNavigate={handleNavigate} />;
      case 'GrievanceDetail':
        return <GrievanceDetailScreen onNavigate={handleNavigate} grievanceId={selectedGrievanceId} />;
      case 'Profile':
        return <ProfileScreen user={user} onNavigate={handleNavigate} onLogout={handleLogout} />;
      default:
        return <HomeScreen user={user} onNavigate={handleNavigate} onLogout={handleLogout} />;
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

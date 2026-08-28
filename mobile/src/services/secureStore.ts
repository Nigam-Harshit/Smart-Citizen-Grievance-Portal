import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'smart_citizen_jwt_token';
const USER_KEY = 'smart_citizen_user_data';

export const setSecureToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store secure token:', error);
  }
};

export const getSecureToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to fetch secure token:', error);
    return null;
  }
};

export const removeSecureToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error('Failed to delete secure token:', error);
  }
};

export const setSecureUser = async (user: any): Promise<void> => {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store secure user data:', error);
  }
};

export const getSecureUser = async (): Promise<any | null> => {
  try {
    const data = await SecureStore.getItemAsync(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to fetch secure user data:', error);
    return null;
  }
};

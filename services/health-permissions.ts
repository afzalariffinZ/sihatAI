import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';

export interface HealthPermissions {
  steps: boolean;
  activity: boolean;
  heartRate: boolean;
}

export class HealthPermissionManager {
  
  /**
   * Request health-related permissions
   */
  static async requestHealthPermissions(): Promise<HealthPermissions> {
    const permissions: HealthPermissions = {
      steps: false,
      activity: false,
      heartRate: false
    };

    if (Platform.OS === 'ios') {
      // iOS permissions
      permissions.steps = await this.requestIOSHealthPermissions();
    } else if (Platform.OS === 'android') {
      // Android permissions
      permissions.steps = await this.requestAndroidHealthPermissions();
    } else {
      // Web/other platforms - no health data available
      permissions.steps = false;
    }

    return permissions;
  }

  /**
   * Request iOS HealthKit permissions
   */
  private static async requestIOSHealthPermissions(): Promise<boolean> {
    try {
      // For now, return true as Expo doesn't have built-in HealthKit
      // In a production app, you'd use expo-health or react-native-health
      console.log('iOS health permissions would be requested here');
      return true;
    } catch (error) {
      console.error('Error requesting iOS health permissions:', error);
      return false;
    }
  }

  /**
   * Request Android health permissions (Google Fit, Samsung Health, etc.)
   */
  private static async requestAndroidHealthPermissions(): Promise<boolean> {
    try {
      // For now, return true as Expo doesn't have built-in Google Fit integration
      // In a production app, you'd use @react-native-google-fit/google-fit or similar
      console.log('Android health permissions would be requested here');
      return true;
    } catch (error) {
      console.error('Error requesting Android health permissions:', error);
      return false;
    }
  }

  /**
   * Check if health data is available on this device
   */
  static async isHealthDataAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return false;
      }

      // Check if device has health capabilities
      const isDevice = Device.isDevice;
      if (!isDevice) {
        return false; // Simulator/emulator doesn't have real health data
      }

      return true;
    } catch (error) {
      console.error('Error checking health data availability:', error);
      return false;
    }
  }

  /**
   * Show permission explanation dialog
   */
  static showPermissionExplanation(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Health Data Access',
        'SihatAI would like to access your step count data to provide accurate fitness tracking. This data stays on your device and is used only for your personal health insights.',
        [
          {
            text: 'Don\'t Allow',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Allow',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Get device-specific health data source name
   */
  static getHealthDataSourceName(): string {
    if (Platform.OS === 'ios') {
      return 'Apple Health';
    } else if (Platform.OS === 'android') {
      return 'Google Fit';
    } else {
      return 'Device Sensors';
    }
  }

  /**
   * Check if user has previously granted health permissions
   */
  static async hasHealthPermissions(): Promise<boolean> {
    // In a real implementation, you'd check the actual permission status
    // For now, we'll assume permissions are granted if the device supports health data
    return await this.isHealthDataAvailable();
  }

  /**
   * Guide user to device health settings if permissions are denied
   */
  static showHealthSettingsGuide(): void {
    const sourceName = this.getHealthDataSourceName();
    
    Alert.alert(
      'Enable Health Data Access',
      `To get accurate step counts, please enable health data access in your device settings:\n\n` +
      `1. Open ${sourceName} app\n` +
      `2. Go to Data Access & Devices\n` +
      `3. Allow SihatAI to read step count data`,
      [{ text: 'OK' }]
    );
  }
}

export default HealthPermissionManager;
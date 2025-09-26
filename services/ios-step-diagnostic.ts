import { Platform, Alert } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Device from 'expo-device';

export interface IOSDiagnosticResult {
  platform: string;
  isDevice: boolean;
  deviceType: string;
  accelerometerAvailable: boolean;
  permissionStatus: string;
  permissionGranted: boolean;
  canRequestPermission: boolean;
  errors: string[];
  recommendations: string[];
}

export class IOSStepDiagnostic {
  
  /**
   * Comprehensive iOS step counter diagnostic
   */
  public static async runDiagnostic(): Promise<IOSDiagnosticResult> {
    const result: IOSDiagnosticResult = {
      platform: Platform.OS,
      isDevice: Device.isDevice ?? false,
      deviceType: Device.deviceType?.toString() ?? 'unknown',
      accelerometerAvailable: false,
      permissionStatus: 'unknown',
      permissionGranted: false,
      canRequestPermission: false,
      errors: [],
      recommendations: []
    };

    try {
      // 1. Platform check
      if (Platform.OS !== 'ios') {
        result.errors.push(`Platform is ${Platform.OS}, not iOS`);
        result.recommendations.push('iOS step counter only works on iOS devices');
        return result;
      }

      // 2. Device check
      if (!Device.isDevice) {
        result.errors.push('Running on iOS Simulator');
        result.recommendations.push('iOS step counting requires a real device with motion sensors');
        return result;
      }

      // 3. Accelerometer availability
      try {
        const isAvailable = await Accelerometer.isAvailableAsync();
        result.accelerometerAvailable = isAvailable;
        
        if (!isAvailable) {
          result.errors.push('Accelerometer not available on this device');
          result.recommendations.push('This iOS device does not support motion sensors');
          return result;
        }
      } catch (error) {
        result.errors.push(`Accelerometer check failed: ${error}`);
        result.recommendations.push('Unable to check accelerometer availability');
        return result;
      }

      // 4. Permission status check
      try {
        const permissions = await Accelerometer.getPermissionsAsync();
        result.permissionStatus = permissions.status;
        result.permissionGranted = permissions.granted;
        result.canRequestPermission = permissions.canAskAgain;

        if (!permissions.granted && !permissions.canAskAgain) {
          result.errors.push('Motion permissions permanently denied');
          result.recommendations.push('Go to Settings > Privacy & Security > Motion & Fitness > SihatAI and enable access');
          return result;
        }

        if (!permissions.granted && permissions.canAskAgain) {
          result.recommendations.push('Motion permission can be requested from user');
        }

      } catch (error) {
        result.errors.push(`Permission check failed: ${error}`);
        result.recommendations.push('Unable to check motion permissions');
      }

      // 5. Success case
      if (result.accelerometerAvailable && (result.permissionGranted || result.canRequestPermission)) {
        result.recommendations.push('iOS step counter should work on this device');
      }

    } catch (error) {
      result.errors.push(`Diagnostic failed: ${error}`);
    }

    return result;
  }

  /**
   * Show diagnostic results to user
   */
  public static async showDiagnosticDialog(): Promise<void> {
    const diagnostic = await this.runDiagnostic();
    
    let message = `Platform: ${diagnostic.platform}\\n`;
    message += `Device: ${diagnostic.isDevice ? 'Real Device' : 'Simulator'}\\n`;
    message += `Device Type: ${diagnostic.deviceType}\\n`;
    message += `Accelerometer: ${diagnostic.accelerometerAvailable ? 'Available' : 'Not Available'}\\n`;
    message += `Permission: ${diagnostic.permissionStatus}\\n`;
    
    if (diagnostic.errors.length > 0) {
      message += `\\n❌ Issues:\\n${diagnostic.errors.join('\\n')}`;
    }
    
    if (diagnostic.recommendations.length > 0) {
      message += `\\n💡 Recommendations:\\n${diagnostic.recommendations.join('\\n')}`;
    }

    Alert.alert(
      'iOS Step Counter Diagnostic',
      message,
      [
        { text: 'OK' },
        diagnostic.errors.length > 0 && diagnostic.recommendations.includes('Go to Settings > Privacy & Security > Motion & Fitness > SihatAI and enable access')
          ? { text: 'Open Settings', onPress: () => {
              Alert.alert(
                'Enable Motion Access',
                'Go to Settings > Privacy & Security > Motion & Fitness > SihatAI and turn on access.',
                [{ text: 'Got it' }]
              );
            }}
          : null
      ].filter(Boolean) as any
    );
  }

  /**
   * Test basic accelerometer functionality
   */
  public static async testAccelerometer(): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        // Request permissions first
        const permissions = await Accelerometer.requestPermissionsAsync();
        if (!permissions.granted) {
          console.log('Accelerometer permissions denied');
          resolve(false);
          return;
        }

        // Set up test listener
        let dataReceived = false;
        const subscription = Accelerometer.addListener(({ x, y, z }) => {
          console.log(`Accelerometer data: x=${x.toFixed(2)}, y=${y.toFixed(2)}, z=${z.toFixed(2)}`);
          dataReceived = true;
        });

        // Set update interval
        Accelerometer.setUpdateInterval(1000); // 1 second

        // Wait 3 seconds for data
        setTimeout(() => {
          subscription.remove();
          console.log(`Accelerometer test result: ${dataReceived ? 'SUCCESS' : 'FAILED'}`);
          resolve(dataReceived);
        }, 3000);

      } catch (error) {
        console.error('Accelerometer test error:', error);
        resolve(false);
      }
    });
  }
}
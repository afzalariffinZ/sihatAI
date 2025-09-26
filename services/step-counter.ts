import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { HealthPermissionManager } from './health-permissions';
import { IOSStepCounterHelper } from './ios-step-helper';
import { iosHealthService, type HealthData } from './ios-health-service';

interface StepData {
  steps: number;
  date: string;
  lastUpdate: number;
}

class StepCounterService {
  private subscription: any = null;
  private isListening = false;
  private stepCount = 0;
  private lastMagnitude = 0;
  private stepThreshold = 1.2; // Sensitivity threshold for step detection
  private lastStepTime = 0;
  private minStepInterval = 200; // Minimum time between steps in milliseconds
  private onStepCountUpdate: ((steps: number) => void) | null = null;
  private iosHelper: IOSStepCounterHelper | null = null;
  private iosHealthService: typeof iosHealthService | null = null;

  private readonly STORAGE_KEY = 'daily_steps';

  constructor() {
    this.loadTodaysSteps();
    
    // Initialize iOS helper if on iOS
    if (Platform.OS === 'ios') {
      this.iosHelper = IOSStepCounterHelper.getInstance();
      this.iosHealthService = iosHealthService;
    }
  }

  // Load today's step count from storage
  private async loadTodaysSteps(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${today}`);
      
      if (stored) {
        const stepData: StepData = JSON.parse(stored);
        this.stepCount = stepData.steps;
      } else {
        this.stepCount = 0;
      }
    } catch (error) {
      console.error('Error loading step data:', error);
      this.stepCount = 0;
    }
  }

  // Save today's step count to storage
  private async saveTodaysSteps(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stepData: StepData = {
        steps: this.stepCount,
        date: today,
        lastUpdate: Date.now()
      };
      
      await AsyncStorage.setItem(`${this.STORAGE_KEY}_${today}`, JSON.stringify(stepData));
    } catch (error) {
      console.error('Error saving step data:', error);
    }
  }

  // Start listening to accelerometer for step detection
  public async startStepCounting(): Promise<void> {
    if (this.isListening) return;

    try {
      // Check if accelerometer is available
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (!isAvailable) {
        console.warn('Accelerometer not available on this device');
        return;
      }

      // Request permissions first on iOS
      if (Platform.OS === 'ios') {
        const hasPermission = await Accelerometer.requestPermissionsAsync();
        if (!hasPermission.granted) {
          console.warn('Motion permissions not granted on iOS');
          throw new Error('Motion permissions required for step counting');
        }
      }

      // Set update interval (adjust as needed)
      Accelerometer.setUpdateInterval(100); // 10 times per second

      this.subscription = Accelerometer.addListener(({ x, y, z }) => {
        if (Platform.OS === 'ios' && this.iosHelper) {
          // Use iOS-specific step detection
          const stepDetected = this.iosHelper.detectStepFromAcceleration(x, y, z);
          if (stepDetected) {
            this.stepCount = this.iosHelper.getStepCount();
            
            // Notify listener
            if (this.onStepCountUpdate) {
              this.onStepCountUpdate(this.stepCount);
            }

            // Save periodically (every 10 steps)
            if (this.stepCount % 10 === 0) {
              this.saveTodaysSteps();
            }
          }
        } else {
          // Use generic step detection for Android and other platforms
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          this.detectStep(magnitude);
        }
      });

      this.isListening = true;
      console.log('Step counter started with accelerometer');
    } catch (error) {
      console.error('Error starting step counter:', error);
      throw error; // Re-throw to let caller handle the error
    }
  }

  // Stop listening to accelerometer
  public stopStepCounting(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isListening = false;
    this.saveTodaysSteps(); // Save when stopping
    console.log('Step counter stopped');
  }

  // Simple step detection algorithm based on acceleration magnitude
  private detectStep(magnitude: number): void {
    const currentTime = Date.now();
    
    // Check if magnitude crosses threshold and enough time has passed since last step
    if (
      magnitude > this.stepThreshold &&
      this.lastMagnitude <= this.stepThreshold &&
      (currentTime - this.lastStepTime) > this.minStepInterval
    ) {
      this.stepCount++;
      this.lastStepTime = currentTime;
      
      // Notify listener
      if (this.onStepCountUpdate) {
        this.onStepCountUpdate(this.stepCount);
      }

      // Save periodically (every 10 steps)
      if (this.stepCount % 10 === 0) {
        this.saveTodaysSteps();
      }
    }
    
    this.lastMagnitude = magnitude;
  }

  // Get current step count
  public getCurrentStepCount(): number {
    if (Platform.OS === 'ios' && this.iosHelper) {
      return this.iosHelper.getStepCount();
    }
    return this.stepCount;
  }

  // Set callback for step count updates
  public setStepCountUpdateListener(callback: (steps: number) => void): void {
    this.onStepCountUpdate = callback;
  }

  // Remove step count update listener
  public removeStepCountUpdateListener(): void {
    this.onStepCountUpdate = null;
  }

  // Manually add steps (for testing or manual entry)
  public addSteps(steps: number): void {
    if (Platform.OS === 'ios' && this.iosHelper) {
      this.iosHelper.addSteps(steps);
      this.stepCount = this.iosHelper.getStepCount();
    } else {
      this.stepCount += steps;
    }
    
    this.saveTodaysSteps();
    
    if (this.onStepCountUpdate) {
      this.onStepCountUpdate(this.stepCount);
    }
  }

  // Sync with iOS Health app if available
  public async syncWithHealthApp(): Promise<{
    success: boolean;
    healthAppSteps?: number;
    accelerometerSteps: number;
    source: 'health_app' | 'accelerometer' | 'unavailable';
    message: string;
  }> {
    const result = {
      success: false,
      accelerometerSteps: this.stepCount,
      source: 'accelerometer' as 'health_app' | 'accelerometer' | 'unavailable',
      message: 'Health app integration not available'
    };

    if (Platform.OS !== 'ios' || !this.iosHealthService) {
      result.source = 'unavailable';
      result.message = 'iOS Health integration only available on iOS devices';
      return result;
    }

    try {
      // Check if Health service is available
      const healthAvailable = await this.iosHealthService.isAvailable();
      if (!healthAvailable) {
        result.source = 'unavailable';
        result.message = 'iOS Health app not available on this device';
        return result;
      }

      // Try to get steps from Health app
      const healthAppSteps = await this.iosHealthService.getStepsFromHealthApp();
      
      if (healthAppSteps !== null) {
        // Use Health app data if available
        this.stepCount = healthAppSteps;
        this.saveTodaysSteps();
        
        if (this.onStepCountUpdate) {
          this.onStepCountUpdate(this.stepCount);
        }

        return {
          success: true,
          healthAppSteps: healthAppSteps,
          accelerometerSteps: this.stepCount,
          source: 'health_app',
          message: `Synced ${healthAppSteps} steps from iOS Health app`
        };
      } else {
        result.message = 'Health app data not accessible. Using motion sensors.';
      }

    } catch (error) {
      console.error('Error syncing with iOS Health app:', error);
      result.message = `Health app sync failed: ${error}`;
    }

    return result;
  }

  // Compare with iOS Health app data
  public async compareWithHealthApp(): Promise<{
    accelerometerSteps: number;
    healthAppSteps: number | null;
    accuracy: string;
    recommendation: string;
  }> {
    if (Platform.OS !== 'ios' || !this.iosHealthService) {
      return {
        accelerometerSteps: this.stepCount,
        healthAppSteps: null,
        accuracy: 'unknown',
        recommendation: 'iOS Health comparison only available on iOS devices'
      };
    }

    try {
      const healthAppSteps = await this.iosHealthService.getStepsFromHealthApp();
      let accuracy = 'unknown';
      let recommendation = 'Health app data not available';

      if (healthAppSteps !== null) {
        const difference = Math.abs(this.stepCount - healthAppSteps);
        const percentageDiff = (difference / Math.max(this.stepCount, healthAppSteps)) * 100;

        if (percentageDiff <= 10) {
          accuracy = 'similar';
          recommendation = 'Motion sensor and Health app data are similar. Good accuracy!';
        } else {
          accuracy = 'different';
          recommendation = `Motion sensors: ${this.stepCount}, Health app: ${healthAppSteps}. Consider calibration.`;
        }
      }

      return {
        accelerometerSteps: this.stepCount,
        healthAppSteps,
        accuracy,
        recommendation
      };
    } catch (error) {
      console.error('Error comparing with Health app:', error);
      return {
        accelerometerSteps: this.stepCount,
        healthAppSteps: null,
        accuracy: 'error',
        recommendation: `Comparison failed: ${error}`
      };
    }
  }

  // Reset daily steps (called at midnight or manually)
  public resetDailySteps(): void {
    if (Platform.OS === 'ios' && this.iosHelper) {
      this.iosHelper.resetStepCount();
    }
    
    this.stepCount = 0;
    this.saveTodaysSteps();
    
    if (this.onStepCountUpdate) {
      this.onStepCountUpdate(this.stepCount);
    }
  }

  // Get step history for the last N days
  public async getStepHistory(days: number = 7): Promise<StepData[]> {
    const history: StepData[] = [];
    
    try {
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${dateStr}`);
        if (stored) {
          history.push(JSON.parse(stored));
        } else {
          history.push({
            steps: 0,
            date: dateStr,
            lastUpdate: 0
          });
        }
      }
    } catch (error) {
      console.error('Error getting step history:', error);
    }
    
    return history.reverse(); // Return in chronological order
  }

  // Check if step counter is available on this platform
  public static async isAvailable(): Promise<boolean> {
    try {
      // Check if we're on web
      if (Platform.OS === 'web') {
        console.log('Web platform - step counter not available');
        return false;
      }

      // Check if accelerometer is available
      const available = await Accelerometer.isAvailableAsync();
      if (!available) {
        console.log('Accelerometer not available on this device');
        return false;
      }

      // On iOS, check basic permissions (simplified approach)
      if (Platform.OS === 'ios') {
        try {
          const permissions = await Accelerometer.getPermissionsAsync();
          console.log('iOS motion permissions status:', permissions);
          
          if (permissions.granted) {
            return true;
          } else if (permissions.canAskAgain) {
            return true; // We can request permission
          } else {
            console.log('Motion permissions permanently denied');
            return false;
          }
        } catch (permissionError) {
          console.log('Error checking iOS motion permissions:', permissionError);
          // Even if permission check fails, accelerometer might still work
          return available;
        }
      }

      // For Android and other platforms, just return accelerometer availability
      return available;
    } catch (error) {
      console.error('Error checking step counter availability:', error);
      return false;
    }
  }

  // Request permissions for step counting
  public static async requestPermissions(): Promise<boolean> {
    try {
      // First check if accelerometer is available
      const available = await Accelerometer.isAvailableAsync();
      if (!available) {
        console.log('Accelerometer not available on this device');
        return false;
      }

      // Handle iOS motion permissions
      if (Platform.OS === 'ios') {
        try {
          console.log('Requesting iOS motion permissions...');
          const result = await Accelerometer.requestPermissionsAsync();
          console.log('iOS permission result:', result);
          
          if (!result.granted) {
            console.log('iOS motion permissions denied by user');
            return false;
          }
          
          console.log('iOS motion permissions granted successfully');
          return true;
        } catch (error) {
          console.error('Error requesting iOS motion permissions:', error);
          return false;
        }
      }

      // For Android and other platforms, accelerometer permissions are usually granted by default
      console.log('Platform permissions granted (non-iOS)');
      return true;
    } catch (error) {
      console.error('Error requesting step counter permissions:', error);
      return false;
    }
  }

  // Get step detection sensitivity
  public getStepThreshold(): number {
    return this.stepThreshold;
  }

  // Set step detection sensitivity (lower = more sensitive)
  public setStepThreshold(threshold: number): void {
    this.stepThreshold = Math.max(0.5, Math.min(3.0, threshold)); // Clamp between 0.5 and 3.0
  }

  // Calibrate step detection based on user's walking pattern
  public async calibrateStepDetection(): Promise<void> {
    return new Promise((resolve) => {
      console.log('Starting step detection calibration...');
      
      // Simple calibration: track acceleration variance over 30 seconds
      let samples: number[] = [];
      let calibrationSubscription: any = null;
      
      const startTime = Date.now();
      const calibrationDuration = 30000; // 30 seconds
      
      try {
        Accelerometer.setUpdateInterval(50); // 20 times per second for calibration
        
        calibrationSubscription = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          samples.push(magnitude);
          
          // Check if calibration is complete
          if (Date.now() - startTime > calibrationDuration) {
            if (calibrationSubscription) {
              calibrationSubscription.remove();
            }
            
            // Calculate optimal threshold based on samples
            if (samples.length > 0) {
              const avgMagnitude = samples.reduce((a, b) => a + b, 0) / samples.length;
              const variance = samples.reduce((acc, val) => acc + Math.pow(val - avgMagnitude, 2), 0) / samples.length;
              const stdDev = Math.sqrt(variance);
              
              // Set threshold to average + 1.5 * standard deviation
              this.stepThreshold = avgMagnitude + (1.5 * stdDev);
              
              // Clamp the threshold to reasonable bounds
              this.stepThreshold = Math.max(0.8, Math.min(2.0, this.stepThreshold));
              
              console.log(`Calibration complete. New threshold: ${this.stepThreshold.toFixed(2)}`);
            }
            
            resolve();
          }
        });
      } catch (error) {
        console.error('Error during calibration:', error);
        if (calibrationSubscription) {
          calibrationSubscription.remove();
        }
        resolve();
      }
    });
  }

  // Get calibration status
  public isCalibrated(): boolean {
    // Consider calibrated if threshold has been changed from default
    return this.stepThreshold !== 1.2;
  }

  // Get step counting accuracy (estimated)
  public getAccuracyEstimate(): number {
    if (Platform.OS === 'ios' && this.iosHelper) {
      return this.iosHelper.getAccuracyEstimate();
    }
    
    // Generic estimate for other platforms
    let accuracy = 0.7; // Base accuracy for accelerometer-based counting
    
    if (this.isCalibrated()) {
      accuracy += 0.2; // Boost for calibration
    }
    
    if (Platform.OS === 'android') {
      accuracy += 0.1; // Native platform bonus
    }
    
    return Math.min(0.95, accuracy); // Cap at 95%
  }
}

// Create singleton instance
export const stepCounter = new StepCounterService();

// Export the class for direct instantiation if needed
export default StepCounterService;
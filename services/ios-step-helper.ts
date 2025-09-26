import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';

export interface IOSStepDetection {
  isAvailable: boolean;
  permissionGranted: boolean;
  stepCount: number;
}

export class IOSStepCounterHelper {
  private static instance: IOSStepCounterHelper;
  private stepBuffer: number[] = [];
  private readonly bufferSize = 20; // Keep last 20 readings
  private lastStepTime = 0;
  private stepThreshold = 0.3; // iOS-specific threshold
  private stepCount = 0;

  private constructor() {}

  public static getInstance(): IOSStepCounterHelper {
    if (!IOSStepCounterHelper.instance) {
      IOSStepCounterHelper.instance = new IOSStepCounterHelper();
    }
    return IOSStepCounterHelper.instance;
  }

  /**
   * Check if iOS step detection is available and permissions are granted
   */
  public async checkAvailability(): Promise<IOSStepDetection> {
    const result: IOSStepDetection = {
      isAvailable: false,
      permissionGranted: false,
      stepCount: this.stepCount
    };

    if (Platform.OS !== 'ios') {
      return result;
    }

    try {
      // Check if accelerometer is available
      const available = await Accelerometer.isAvailableAsync();
      result.isAvailable = available;

      if (available) {
        // Check permissions
        const permissions = await Accelerometer.getPermissionsAsync();
        result.permissionGranted = permissions.granted;

        // If not granted, try to request
        if (!permissions.granted && permissions.canAskAgain) {
          const requestResult = await Accelerometer.requestPermissionsAsync();
          result.permissionGranted = requestResult.granted;
        }
      }
    } catch (error) {
      console.error('Error checking iOS accelerometer availability:', error);
    }

    return result;
  }

  /**
   * iOS-optimized step detection algorithm
   * Uses a more sophisticated approach than simple threshold crossing
   */
  public detectStepFromAcceleration(x: number, y: number, z: number): boolean {
    const currentTime = Date.now();
    
    // Calculate vertical acceleration (assuming phone is held upright)
    // On iOS, z-axis is typically vertical when phone is held normally
    const verticalAcceleration = Math.abs(z);
    
    // Add to buffer
    this.stepBuffer.push(verticalAcceleration);
    if (this.stepBuffer.length > this.bufferSize) {
      this.stepBuffer.shift();
    }

    // Need enough samples to detect patterns
    if (this.stepBuffer.length < this.bufferSize) {
      return false;
    }

    // Calculate moving average and detect peaks
    const average = this.stepBuffer.reduce((a, b) => a + b, 0) / this.stepBuffer.length;
    const current = this.stepBuffer[this.stepBuffer.length - 1];
    const previous = this.stepBuffer[this.stepBuffer.length - 2];

    // Look for peak detection pattern
    const isPeak = current > previous && 
                   current > average + this.stepThreshold &&
                   (currentTime - this.lastStepTime) > 300; // Minimum 300ms between steps

    if (isPeak) {
      this.lastStepTime = currentTime;
      this.stepCount++;
      console.log(`iOS Step detected: ${this.stepCount} (threshold: ${this.stepThreshold.toFixed(2)})`);
      return true;
    }

    return false;
  }

  /**
   * Get current step count
   */
  public getStepCount(): number {
    return this.stepCount;
  }

  /**
   * Reset step count
   */
  public resetStepCount(): void {
    this.stepCount = 0;
    this.stepBuffer = [];
  }

  /**
   * Add manual steps (for testing)
   */
  public addSteps(steps: number): void {
    this.stepCount += steps;
  }

  /**
   * Calibrate threshold based on user's movement patterns
   */
  public calibrateForUser(samples: number[]): void {
    if (samples.length < 10) return;

    // Calculate standard deviation of samples
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const squareDiffs = samples.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / samples.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    // Set threshold to 1.5 standard deviations above mean
    this.stepThreshold = Math.max(0.2, Math.min(0.8, stdDev * 1.5));
    
    console.log(`iOS step threshold calibrated to: ${this.stepThreshold.toFixed(3)}`);
  }

  /**
   * Get current threshold
   */
  public getThreshold(): number {
    return this.stepThreshold;
  }

  /**
   * Set threshold manually
   */
  public setThreshold(threshold: number): void {
    this.stepThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  /**
   * Get detection accuracy estimate
   */
  public getAccuracyEstimate(): number {
    // Base accuracy for iOS accelerometer-based detection
    let accuracy = 0.75;

    // Boost for calibration
    if (this.stepThreshold !== 0.3) { // Default threshold
      accuracy += 0.15;
    }

    // Boost for sufficient buffer data
    if (this.stepBuffer.length >= this.bufferSize) {
      accuracy += 0.05;
    }

    return Math.min(0.95, accuracy);
  }
}

export default IOSStepCounterHelper;
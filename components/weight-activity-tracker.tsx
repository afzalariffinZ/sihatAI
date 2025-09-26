import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { stepCounter } from '@/services/step-counter';
import StepCounterService from '@/services/step-counter';
import { IOSStepDiagnostic } from '@/services/ios-step-diagnostic';

const screenWidth = Dimensions.get('window').width;

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  time: string;
}

interface ActivityEntry {
  id: string;
  activity: string;
  duration: number; // minutes
  calories_burned: number;
  date: string;
  time: string;
}

interface UserProfile {
  height: number; // inches
  target_weight: number;
  daily_steps_goal: number;
}

export default function WeightActivityTracker() {
  const { user } = useAuth();
  
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([
    {
      id: '1',
      weight: 73.6,
      date: '2025-09-26',
      time: '08:00'
    }
  ]);
  
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([
    {
      id: '1',
      activity: 'Morning Walk',
      duration: 30,
      calories_burned: 150,
      date: '2025-09-26',
      time: '07:00'
    }
  ]);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    height: 70, // inches
    target_weight: 60,
    daily_steps_goal: 10000
  });

  const [dailySteps, setDailySteps] = useState(7542);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStepHistoryModal, setShowStepHistoryModal] = useState(false);
  const [stepHistory, setStepHistory] = useState<any[]>([]);
  
  // Form states
  const [newWeight, setNewWeight] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newHeight, setNewHeight] = useState(userProfile.height.toString());
  const [newTargetWeight, setNewTargetWeight] = useState(userProfile.target_weight.toString());

  // Load data and start step counter when component mounts and user is available
  useEffect(() => {
    if (user?.id) {
      loadUserData();
      initializeStepCounter();
    }

    return () => {
      // Cleanup step counter when component unmounts
      stepCounter.stopStepCounting();
      stepCounter.removeStepCountUpdateListener();
    };
  }, [user?.id]);

  const initializeStepCounter = async () => {
    try {
      // Check if step counter is available
      const isAvailable = await StepCounterService.isAvailable();
      if (!isAvailable) {
        console.log('Step counter not available on this platform');
        Alert.alert(
          'Step Counter Unavailable',
          'Step counting is not available on this device. You can still manually track your activities.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions
      const hasPermissions = await StepCounterService.requestPermissions();
      if (!hasPermissions) {
        console.log('Step counter permissions not granted');
        Alert.alert(
          'Permissions Required',
          'Motion permissions are required for step counting. Please enable them in device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // On iOS, guide user to Settings
              Alert.alert(
                'Enable Motion Access',
                'Please go to Settings > Privacy & Security > Motion & Fitness > SihatAI and enable access.',
                [{ text: 'OK' }]
              );
            }}
          ]
        );
        return;
      }

      // Set up step count update listener
      stepCounter.setStepCountUpdateListener((steps) => {
        setDailySteps(steps);
        // Optionally save to Supabase in real-time or batch
        saveStepsToDatabase(steps);
      });

      // Get current step count
      const currentSteps = stepCounter.getCurrentStepCount();
      setDailySteps(currentSteps);

      // Start step counting
      try {
        await stepCounter.startStepCounting();
        console.log('Step counter initialized successfully');
      } catch (startError) {
        console.error('Error starting step counter:', startError);
        Alert.alert(
          'Step Counter Error',
          'Failed to start step counting. Please check your device permissions.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Error initializing step counter:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize step counter. You can still manually track activities.',
        [{ text: 'OK' }]
      );
    }
  };

  const saveStepsToDatabase = async (steps: number) => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Upsert step data (insert or update)
      const { error } = await supabase
        .from('step_data')
        .upsert({
          user_id: user.id,
          steps: steps,
          date: today
        })
        .select();

      if (error) {
        console.error('Error saving steps to database:', error);
      }
    } catch (error) {
      console.error('Error saving steps:', error);
    }
  };

  const handleCalibrateSteps = async () => {
    Alert.alert(
      'Step Counter Calibration',
      'This will help improve step detection accuracy. Walk for 30 seconds when you tap "Start".',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Calibration', onPress: startCalibration }
      ]
    );
  };

  const startCalibration = async () => {
    try {
      await stepCounter.calibrateStepDetection();
      Alert.alert('Calibration Complete', 'Step detection has been calibrated for your walking pattern.');
    } catch (error) {
      Alert.alert('Calibration Error', 'Failed to calibrate step detection.');
    }
  };

  const handleAddTestSteps = (steps: number) => {
    stepCounter.addSteps(steps);
    Alert.alert('Test Steps Added', `Added ${steps} steps for testing purposes.`);
  };

  const handleIOSDiagnostic = async () => {
    await IOSStepDiagnostic.showDiagnosticDialog();
  };

  const handleSyncWithHealthApp = async () => {
    try {
      const result = await stepCounter.syncWithHealthApp();
      
      Alert.alert(
        'iOS Health Sync',
        result.message,
        [
          { text: 'OK' },
          result.source === 'unavailable' ? {
            text: 'Learn More',
            onPress: () => {
              Alert.alert(
                'iOS Health Integration',
                'To access Apple Health data:\\n\\n1. SihatAI needs HealthKit permissions\\n2. Requires native iOS build\\n3. App Store approval process\\n\\nCurrently using motion sensors for step counting.',
                [{ text: 'Got it' }]
              );
            }
          } : null
        ].filter(Boolean) as any
      );

      if (result.success && result.healthAppSteps) {
        setDailySteps(result.healthAppSteps);
      }
      
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync with iOS Health app');
    }
  };

  const handleResetSteps = () => {
    Alert.alert(
      'Reset Daily Steps',
      'This will reset your step count for today. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            stepCounter.resetDailySteps();
            Alert.alert('Steps Reset', 'Daily step count has been reset to 0.');
          }
        }
      ]
    );
  };

  const handleViewStepHistory = async () => {
    try {
      const history = await stepCounter.getStepHistory(7); // Get last 7 days
      setStepHistory(history);
      setShowStepHistoryModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load step history');
    }
  };

  const loadUserData = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    try {
      // Load weight entries
      const { data: weights, error: weightError } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (weightError) {
        console.error('Error loading weights:', weightError);
      } else if (weights && weights.length > 0) {
        const formattedWeights = weights.map(w => ({
          id: w.id,
          weight: w.weight,
          date: new Date(w.recorded_at).toISOString().split('T')[0],
          time: new Date(w.recorded_at).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }));
        setWeightEntries(formattedWeights);
      }

      // Load activity entries
      const { data: activities, error: activityError } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (activityError) {
        console.error('Error loading activities:', activityError);
      } else if (activities && activities.length > 0) {
        const formattedActivities = activities.map(a => ({
          id: a.id,
          activity: a.activity_name,
          duration: a.duration_minutes,
          calories_burned: a.calories_burned,
          date: new Date(a.recorded_at).toISOString().split('T')[0],
          time: new Date(a.recorded_at).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }));
        setActivityEntries(formattedActivities);
      }

      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.log('No user profile found, using defaults');
      } else if (profile) {
        setUserProfile({
          height: profile.height_inches || 70,
          target_weight: profile.target_weight_kg || 60,
          daily_steps_goal: profile.daily_steps_goal || 10000
        });
        setNewHeight((profile.height_inches || 70).toString());
        setNewTargetWeight((profile.target_weight_kg || 60).toString());
      }

      // Load today's step data from database
      const today = new Date().toISOString().split('T')[0];
      const { data: stepData, error: stepError } = await supabase
        .from('step_data')
        .select('steps')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (stepError) {
        console.log('No step data for today in database, using device counter');
        // Use step counter's current count if no database record
        const deviceSteps = stepCounter.getCurrentStepCount();
        setDailySteps(deviceSteps);
      } else if (stepData) {
        // Use the maximum of database steps and device steps to handle app restarts
        const deviceSteps = stepCounter.getCurrentStepCount();
        const maxSteps = Math.max(stepData.steps, deviceSteps);
        setDailySteps(maxSteps);
        
        // Update device counter if database has more steps
        if (stepData.steps > deviceSteps) {
          stepCounter.addSteps(stepData.steps - deviceSteps);
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const calculateCaloriesBurned = (activity: string, duration: number): number => {
    // MET values for different activities (approximate)
    const metValues: { [key: string]: number } = {
      'walking': 3.5,
      'running': 8.0,
      'cycling': 6.0,
      'swimming': 6.0,
      'yoga': 2.5,
      'weightlifting': 6.0,
      'dancing': 4.5,
      'basketball': 8.0,
      'tennis': 7.0,
      'hiking': 6.0,
      'stairs': 8.0,
      'cleaning': 3.0,
      'gardening': 4.0
    };

    // Find matching activity or default to moderate activity
    const activityLower = activity.toLowerCase();
    let met = 4.0; // default moderate activity
    
    for (const [key, value] of Object.entries(metValues)) {
      if (activityLower.includes(key)) {
        met = value;
        break;
      }
    }

    // Assuming average weight of 70kg for calorie calculation
    const weight = 70;
    const calories = (met * weight * duration) / 60;
    return Math.round(calories);
  };

  const saveToSupabase = async (data: any, table: string) => {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
      
      if (error) {
        console.error(`Error saving to ${table}:`, error);
        throw error;
      }
      
      console.log(`Successfully saved to ${table}:`, result);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error saving to ${table}:`, error);
      throw error;
    }
  };

  const handleAddWeight = async () => {
    if (!newWeight.trim()) {
      Alert.alert('Error', 'Please enter a weight value');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    try {
      const newEntry: WeightEntry = {
        id: Date.now().toString(),
        weight: weight,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      };

      // Save to Supabase
      await saveToSupabase({
        user_id: user.id,
        weight: weight,
        recorded_at: new Date().toISOString()
      }, 'weight_entries');

      setWeightEntries(prev => [newEntry, ...prev]);
      setNewWeight('');
      setShowWeightModal(false);
      Alert.alert('Success', 'Weight entry added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save weight entry');
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.trim() || !newDuration.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const duration = parseInt(newDuration);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }

    try {
      const caloriesBurned = calculateCaloriesBurned(newActivity, duration);
      
      const newEntry: ActivityEntry = {
        id: Date.now().toString(),
        activity: newActivity,
        duration: duration,
        calories_burned: caloriesBurned,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      };

      // Save to Supabase
      await saveToSupabase({
        user_id: user.id,
        activity_name: newActivity,
        duration_minutes: duration,
        calories_burned: caloriesBurned,
        recorded_at: new Date().toISOString()
      }, 'activity_entries');

      setActivityEntries(prev => [newEntry, ...prev]);
      setNewActivity('');
      setNewDuration('');
      setShowActivityModal(false);
      Alert.alert('Success', `Activity added! You burned ${caloriesBurned} calories.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save activity entry');
    }
  };

  const handleUpdateProfile = async () => {
    const height = parseFloat(newHeight);
    const targetWeight = parseFloat(newTargetWeight);

    if (isNaN(height) || isNaN(targetWeight) || height <= 0 || targetWeight <= 0) {
      Alert.alert('Error', 'Please enter valid values');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      const updatedProfile = {
        height: height,
        target_weight: targetWeight,
        daily_steps_goal: userProfile.daily_steps_goal
      };

      // Save to Supabase (upsert to handle insert or update)
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          height_inches: height,
          target_weight_kg: targetWeight,
          daily_steps_goal: userProfile.daily_steps_goal,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      setUserProfile(updatedProfile);
      setShowProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const getStepsProgress = () => {
    return Math.min((dailySteps / userProfile.daily_steps_goal) * 100, 100);
  };

  const getCurrentWeight = () => {
    return weightEntries.length > 0 ? weightEntries[0].weight : 0;
  };

  const getTotalCaloriesBurned = () => {
    const today = new Date().toISOString().split('T')[0];
    return activityEntries
      .filter(entry => entry.date === today)
      .reduce((total, entry) => total + entry.calories_burned, 0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Health Tracker</Text>
          <Text style={styles.headerSubtitle}>Weight • Activity • Steps</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.statCard}
          >
            <Text style={styles.statLabel}>Current Weight</Text>
            <Text style={styles.statValue}>{getCurrentWeight()} kg</Text>
            <Text style={styles.statSubtext}>Target: {userProfile.target_weight} kg</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.statCard}
          >
            <Text style={styles.statLabel}>Calories Burned</Text>
            <Text style={styles.statValue}>{getTotalCaloriesBurned()}</Text>
            <Text style={styles.statSubtext}>Today</Text>
          </LinearGradient>
        </View>

        {/* Daily Steps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepsIcon}>
              <Text style={styles.stepsIconText}>STEPS</Text>
            </View>
            <Text style={styles.sectionTitle}>Daily Steps</Text>
            <TouchableOpacity 
              style={styles.calibrateButton}
              onPress={() => handleCalibrateSteps()}
            >
              <Text style={styles.calibrateButtonText}>Calibrate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.calibrateButton}
              onPress={() => handleViewStepHistory()}
            >
              <Text style={styles.calibrateButtonText}>History</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsCount}>{dailySteps.toLocaleString()}</Text>
            <Text style={styles.stepsGoal}>of {userProfile.daily_steps_goal.toLocaleString()} goal</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${getStepsProgress()}%` }]} 
                />
              </View>
              <Text style={styles.progressPercentage}>{Math.round(getStepsProgress())}%</Text>
            </View>

            {/* Step Counter Test Buttons */}
            <View style={styles.stepTestButtons}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => handleAddTestSteps(10)}
              >
                <Text style={styles.testButtonText}>+10 Steps</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => handleAddTestSteps(100)}
              >
                <Text style={styles.testButtonText}>+100 Steps</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => handleResetSteps()}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <>
                  <TouchableOpacity 
                    style={[styles.testButton, { backgroundColor: '#FF6B35' }]}
                    onPress={() => handleIOSDiagnostic()}
                  >
                    <Text style={styles.testButtonText}>iOS Diagnostic</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.testButton, { backgroundColor: '#007AFF' }]}
                    onPress={() => handleSyncWithHealthApp()}
                  >
                    <Text style={styles.testButtonText}>Sync Health App</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* iOS Status Info */}
            {Platform.OS === 'ios' && (
              <View style={styles.statusInfo}>
                <Text style={styles.statusText}>
                  📱 iOS Step Detection: {stepCounter.getAccuracyEstimate() > 0.8 ? 'High Accuracy' : 'Standard'}
                </Text>
                <Text style={styles.statusSubtext}>
                  Accuracy: {Math.round(stepCounter.getAccuracyEstimate() * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Weight Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.weightIcon}>
              <Text style={styles.weightIconText}>WEIGHT</Text>
            </View>
            <Text style={styles.sectionTitle}>Weight Tracking</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowWeightModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {weightEntries.slice(0, 3).map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryValue}>{entry.weight} kg</Text>
                <Text style={styles.entryTime}>{entry.time}</Text>
              </View>
              <Text style={styles.entryDate}>{entry.date}</Text>
            </View>
          ))}
        </View>

        {/* Activity Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityIconText}>ACTIVITY</Text>
            </View>
            <Text style={styles.sectionTitle}>Activities</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowActivityModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {activityEntries.slice(0, 3).map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryActivity}>{entry.activity}</Text>
                <Text style={styles.entryDetails}>
                  {entry.duration} min • {entry.calories_burned} cal burned
                </Text>
              </View>
              <Text style={styles.entryTime}>{entry.time}</Text>
            </View>
          ))}
        </View>

        {/* Profile Settings */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => setShowProfileModal(true)}
          >
            <Text style={styles.profileButtonText}>Update Profile Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Weight Entry Modal */}
      <Modal
        visible={showWeightModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Weight Entry</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.modalInput}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="Enter weight"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowWeightModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddWeight}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Entry Modal */}
      <Modal
        visible={showActivityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActivityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Activity</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Activity</Text>
              <TextInput
                style={styles.modalInput}
                value={newActivity}
                onChangeText={setNewActivity}
                placeholder="e.g., Running, Walking, Swimming"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.modalInput}
                value={newDuration}
                onChangeText={setNewDuration}
                placeholder="Enter duration"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowActivityModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddActivity}
              >
                <Text style={styles.saveButtonText}>Add Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Settings Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Profile</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (inches)</Text>
              <TextInput
                style={styles.modalInput}
                value={newHeight}
                onChangeText={setNewHeight}
                placeholder="Enter height"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Weight (kg)</Text>
              <TextInput
                style={styles.modalInput}
                value={newTargetWeight}
                onChangeText={setNewTargetWeight}
                placeholder="Enter target weight"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Step History Modal */}
      <Modal
        visible={showStepHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStepHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Step History (Last 7 Days)</Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {stepHistory.map((day, index) => (
                <View key={day.date} style={styles.historyItem}>
                  <Text style={styles.historyDate}>
                    {new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.historySteps}>
                    {day.steps.toLocaleString()} steps
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => setShowStepHistoryModal(false)}
            >
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stepsIcon: {
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  stepsIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  weightIcon: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  weightIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activityIcon: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  activityIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  stepsCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  stepsGoal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C27B0',
    minWidth: 35,
  },
  entryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryInfo: {
    flex: 1,
  },
  entryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entryTime: {
    fontSize: 12,
    color: '#666',
  },
  entryDate: {
    fontSize: 12,
    color: '#666',
  },
  entryActivity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  entryDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  profileButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: screenWidth - 40,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  calibrateButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  calibrateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stepTestButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  historyDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  historySteps: {
    fontSize: 14,
    color: '#666',
  },
  statusInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  statusSubtext: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});
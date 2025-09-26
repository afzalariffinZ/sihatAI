import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';

const screenWidth = Dimensions.get('window').width;

interface MealEntry {
  id: string;
  name: string;
  calories: number;
  time: string;
  image?: string;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function SihatAIDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Week' | 'Month' | 'Year'>('Week');
  const [currentCalories, setCurrentCalories] = useState(1350);
  const [todaysMeals, setTodaysMeals] = useState<MealEntry[]>([
    {
      id: '1',
      name: 'Oatmeal with Berries',
      calories: 320,
      time: '08:30',
      macros: { protein: 12, carbs: 58, fat: 8 }
    },
    {
      id: '2', 
      name: 'Grilled Chicken Salad',
      calories: 450,
      time: '12:45',
      macros: { protein: 35, carbs: 15, fat: 28 }
    }
  ]);
  
  // Mock data for demo
  const currentWeight = 73.6;
  const projectedWeight = 60.0;
  const targetCalories = 2200;
  const projectedDate = "Sep 26, 2026";

  // Add function to update calories from logged meals
  const updateCaloriesFromMeal = (mealData: any) => {
    const newMeal: MealEntry = {
      id: Date.now().toString(),
      name: mealData.food_item,
      calories: mealData.calories,
      time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      macros: {
        protein: mealData.protein_g || 0,
        carbs: mealData.carbs_g || 0,
        fat: mealData.fat_g || 0
      }
    };
    
    setTodaysMeals(prev => [...prev, newMeal]);
    setCurrentCalories(prev => prev + mealData.calories);
  };

  // Make this function available globally (you can use Context or props instead)
  useEffect(() => {
    // This is a simple way to expose the function globally
    // In production, use proper state management (Context, Redux, etc.)
    (global as any).updateDashboardCalories = updateCaloriesFromMeal;
  }, []);

  const getCalorieProgress = () => {
    return (currentCalories / targetCalories) * 100;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.appName}>SihatAI</ThemedText>
            <ThemedText type="default" style={styles.subtitle}>Track • Analyze • Achieve</ThemedText>
          </View>
          <View style={styles.todayContainer}>
            <ThemedText type="subtitle" style={styles.todayText}>Today</ThemedText>
            <ThemedText type="title" style={styles.calorieCount}>{currentCalories}/{targetCalories}</ThemedText>
          </View>
        </View>

        {/* Weight Progress Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.weightCard}
          >
            <View style={styles.weightHeader}>
              <View style={styles.weightTitleContainer}>
                <View style={styles.progressIcon}>
                  <Text style={styles.progressIconText}>PROGRESS</Text>
                </View>
                <Text style={styles.weightTitle}>Weight Progress</Text>
              </View>
            </View>
            
            <View style={styles.weightContent}>
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Current Weight</Text>
                <Text style={styles.weightValue}>{currentWeight} kg</Text>
                <Text style={styles.weightDate}>Today</Text>
              </View>
              
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Projected Weight</Text>
                <Text style={styles.weightValue}>{projectedWeight} kg</Text>
                <Text style={styles.weightDate}>{projectedDate}</Text>
              </View>
            </View>

            {/* Time Selector */}
            <View style={styles.timeSelector}>
              {(['Week', 'Month', 'Year'] as const).map((timeframe) => (
                <TouchableOpacity
                  key={timeframe}
                  style={[
                    styles.timeButton,
                    selectedTimeframe === timeframe && styles.timeButtonActive
                  ]}
                  onPress={() => setSelectedTimeframe(timeframe)}
                >
                  <Text 
                    style={[
                      styles.timeButtonText,
                      selectedTimeframe === timeframe && styles.timeButtonTextActive
                    ]}
                  >
                    {timeframe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Calorie Progress */}
        <View style={styles.calorieSection}>
          <View style={styles.calorieSectionHeader}>
            <View style={styles.calorieIcon}>
              <Text style={styles.calorieIconText}>CAL</Text>
            </View>
            <Text style={styles.calorieSectionTitle}>Calorie Progress</Text>
            <Text style={styles.calorieCount}>{currentCalories}</Text>
            <Text style={styles.calorieTarget}>of {targetCalories}</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(getCalorieProgress(), 100)}%` }
                ]} 
              />
            </View>
          </View>
          
          <TouchableOpacity style={styles.moreDetailsButton}>
            <Text style={styles.moreDetailsText}>More Details ▼</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.takePhotoButton]}>
            <Text style={styles.actionButtonIcon}>📷</Text>
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.uploadButton]}>
            <Text style={styles.actionButtonIcon}>⬆️</Text>
            <Text style={styles.actionButtonText}>Upload Image</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Meals */}
        <View style={styles.mealsSection}>
          <View style={styles.mealsSectionHeader}>
            <View style={styles.mealsIcon}>
              <Text style={styles.mealsIconText}>MEALS</Text>
            </View>
            <Text style={styles.mealsSectionTitle}>Today's Meals</Text>
          </View>
          
          {todaysMeals.map((meal) => (
            <View key={meal.id} style={styles.mealItem}>
              <View style={styles.mealIcon}>
                <Text style={styles.mealIconText}>🥗</Text>
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time} • 1 {meal.name.includes('bowl') ? 'bowl' : meal.name.includes('Salad') ? 'large plate' : 'serving'}</Text>
              </View>
              <View style={styles.mealCalories}>
                <Text style={styles.mealCalorieNumber}>{meal.calories} cal</Text>
                <Text style={styles.mealMacros}>
                  {meal.macros.protein}p • {meal.macros.carbs}c • {meal.macros.fat}f
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Demo Note */}
        <View style={styles.demoNote}>
          <Text style={styles.demoText}>
            🚀 Demo Mode: This is a sample dashboard with mock data. 
            In production, this would sync with your real nutrition data.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  todayContainer: {
    alignItems: 'flex-end',
  },
  todayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  calorieCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 2,
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  weightCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 200,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weightTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  weightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  weightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weightItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 15,
    flex: 0.48,
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  weightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  weightDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  timeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  calorieSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  calorieSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  calorieSectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  calorieSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  calorieTarget: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  progressBarContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  moreDetailsButton: {
    alignItems: 'center',
  },
  moreDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  takePhotoButton: {
    backgroundColor: '#007AFF',
  },
  uploadButton: {
    backgroundColor: '#34C759',
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mealsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  mealsSectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  mealsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealIconText: {
    fontSize: 18,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  mealTime: {
    fontSize: 14,
    color: '#666',
  },
  mealCalories: {
    alignItems: 'flex-end',
  },
  mealCalorieNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  mealMacros: {
    fontSize: 12,
    color: '#666',
  },
  // New icon styles
  progressIcon: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  progressIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  calorieIcon: {
    backgroundColor: '#FF5722',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  calorieIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mealsIcon: {
    backgroundColor: '#2196F3',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  mealsIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  demoNote: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 15,
    margin: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  demoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
    textAlign: 'center',
  },
});
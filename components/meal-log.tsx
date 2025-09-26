import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import FoodCamera from './food-camera';
import { apiService, AnalyzeFoodResponse } from '../lib/api';
import { Meal } from '../lib/supabase';

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
}

function MealCard({ meal, onDelete }: MealCardProps) {
  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View>
          <Text style={styles.foodName}>{meal.food_item}</Text>
          <Text style={styles.portion}>{meal.portion}</Text>
          <Text style={styles.mealTime}>{formatTime(meal.datetime)}</Text>
        </View>
        <View style={styles.caloriesContainer}>
          <Text style={styles.calories}>{meal.calories}</Text>
          <Text style={styles.caloriesLabel}>cal</Text>
        </View>
      </View>
      
      <View style={styles.macrosRow}>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{meal.protein_g}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{meal.carbs_g}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{meal.fat_g}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

      {meal.confidence_score && meal.confidence_score < 0.8 && (
        <View style={styles.confidenceWarning}>
          <Text style={styles.warningText}>
            Low confidence - please verify accuracy
          </Text>
        </View>
      )}

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Delete Meal',
              'Are you sure you want to delete this meal entry?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => onDelete(meal.id)
                },
              ]
            );
          }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface DailySummaryProps {
  summary: {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    goal_calories: number;
    goal_protein: number;
    goal_carbs: number;
    goal_fat: number;
    meal_count: number;
  };
}

function DailySummary({ summary }: DailySummaryProps) {
  const calorieProgress = summary.goal_calories > 0 
    ? (summary.total_calories / summary.goal_calories) * 100 
    : 0;
  
  const proteinProgress = summary.goal_protein > 0 
    ? (summary.total_protein / summary.goal_protein) * 100 
    : 0;
  
  const carbProgress = summary.goal_carbs > 0 
    ? (summary.total_carbs / summary.goal_carbs) * 100 
    : 0;
  
  const fatProgress = summary.goal_fat > 0 
    ? (summary.total_fat / summary.goal_fat) * 100 
    : 0;

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Today's Summary</Text>
      
      <View style={styles.caloriesSummary}>
        <Text style={styles.caloriesRemaining}>
          {Math.max(0, summary.goal_calories - summary.total_calories)} cal remaining
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(100, calorieProgress)}%`,
                backgroundColor: calorieProgress > 100 ? '#FF3B30' : '#007AFF'
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {summary.total_calories} / {summary.goal_calories} cal
        </Text>
      </View>

      <View style={styles.macrosSummary}>
        <View style={styles.macroSummaryItem}>
          <Text style={styles.macroSummaryLabel}>Protein</Text>
          <Text style={styles.macroSummaryValue}>
            {summary.total_protein}g / {summary.goal_protein}g
          </Text>
          <View style={styles.miniProgressBar}>
            <View 
              style={[
                styles.miniProgressFill,
                { 
                  width: `${Math.min(100, proteinProgress)}%`,
                  backgroundColor: '#34C759'
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.macroSummaryItem}>
          <Text style={styles.macroSummaryLabel}>Carbs</Text>
          <Text style={styles.macroSummaryValue}>
            {summary.total_carbs}g / {summary.goal_carbs}g
          </Text>
          <View style={styles.miniProgressBar}>
            <View 
              style={[
                styles.miniProgressFill,
                { 
                  width: `${Math.min(100, carbProgress)}%`,
                  backgroundColor: '#FF9500'
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.macroSummaryItem}>
          <Text style={styles.macroSummaryLabel}>Fat</Text>
          <Text style={styles.macroSummaryValue}>
            {summary.total_fat}g / {summary.goal_fat}g
          </Text>
          <View style={styles.miniProgressBar}>
            <View 
              style={[
                styles.miniProgressFill,
                { 
                  width: `${Math.min(100, fatProgress)}%`,
                  backgroundColor: '#FF3B30'
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MealLog() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [summaryData, mealsData] = await Promise.all([
        apiService.getDailySummary(today),
        apiService.getMeals(today, today)
      ]);
      
      setDailySummary(summaryData);
      setMeals(mealsData);
    } catch (error) {
      console.error('Error loading meal data:', error);
      Alert.alert('Error', 'Failed to load meal data. Please try again.');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const handleAnalysisComplete = async (result: AnalyzeFoodResponse) => {
    setShowCamera(false);
    // Refresh the meal list after successful analysis
    await loadData();
    
    Alert.alert(
      'Food Analyzed!',
      `Added ${result.food_item} (${result.calories} cal) to your meal log.`,
      [{ text: 'OK' }]
    );
  };

  const deleteMeal = async (mealId: string) => {
    try {
      // This would be implemented in your API
      // await apiService.deleteMeal(mealId);
      await loadData(); // Refresh after deletion
    } catch (error) {
      console.error('Error deleting meal:', error);
      Alert.alert('Error', 'Failed to delete meal. Please try again.');
    }
  };

  if (loading && !refreshing) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Loading your meals...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {dailySummary && <DailySummary summary={dailySummary} />}

        <View style={styles.mealsSection}>
          <View style={styles.mealsSectionHeader}>
            <Text style={styles.mealsTitle}>Today's Meals ({meals.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCamera(true)}
            >
              <Text style={styles.addButtonText}>+ Add Food</Text>
            </TouchableOpacity>
          </View>

          {meals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No meals logged today</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowCamera(true)}
              >
                <Text style={styles.primaryButtonText}>Take Your First Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onDelete={deleteMeal}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FoodCamera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onAnalysisComplete={handleAnalysisComplete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  summaryContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  caloriesSummary: {
    marginBottom: 20,
  },
  caloriesRemaining: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  macrosSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroSummaryItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  macroSummaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  macroSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  mealsSection: {
    paddingHorizontal: 16,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mealCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  portion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  mealTime: {
    fontSize: 12,
    color: '#999',
  },
  caloriesContainer: {
    alignItems: 'center',
  },
  calories: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  caloriesLabel: {
    fontSize: 12,
    color: '#666',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  confidenceWarning: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
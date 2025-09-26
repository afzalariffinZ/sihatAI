import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

interface MealEntry {
  id: string;
  foodItem: FoodItem;
  quantity: number;
  timestamp: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

// Mock food database for demo purposes
const FOOD_DATABASE: FoodItem[] = [
  { id: '1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g' },
  { id: '2', name: 'Brown Rice', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, serving: '100g' },
  { id: '3', name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, serving: '100g' },
  { id: '4', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, serving: '1 medium' },
  { id: '5', name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, serving: '100g' },
  { id: '6', name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, serving: '100g' },
  { id: '7', name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, serving: '100g' },
  { id: '8', name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, serving: '100g' },
];

export default function MealTracker() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [showAddFood, setShowAddFood] = useState(false);

  const filteredFoods = FOOD_DATABASE.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addMeal = (foodItem: FoodItem, quantity: number = 1) => {
    const newMeal: MealEntry = {
      id: Date.now().toString(),
      foodItem,
      quantity,
      timestamp: new Date(),
      mealType: selectedMealType,
    };
    setMeals([...meals, newMeal]);
    setShowAddFood(false);
    setSearchQuery('');
    Alert.alert('Success', `Added ${foodItem.name} to ${selectedMealType}`);
  };

  const removeMeal = (mealId: string) => {
    setMeals(meals.filter(meal => meal.id !== mealId));
  };

  const getMealsByType = (type: string) => {
    return meals.filter(meal => meal.mealType === type);
  };

  const getTotalCalories = () => {
    return meals.reduce((total, meal) => total + (meal.foodItem.calories * meal.quantity), 0);
  };

  const getTotalMacros = () => {
    return meals.reduce(
      (totals, meal) => ({
        protein: totals.protein + (meal.foodItem.protein * meal.quantity),
        carbs: totals.carbs + (meal.foodItem.carbs * meal.quantity),
        fat: totals.fat + (meal.foodItem.fat * meal.quantity),
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Meal Tracker</ThemedText>
        <ThemedText type="subtitle">Demo Mode - Track your nutrition</ThemedText>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Daily Summary */}
        <ThemedView style={styles.summaryCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Daily Summary</ThemedText>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText type="default" style={styles.summaryNumber}>
                {getTotalCalories().toFixed(0)}
              </ThemedText>
              <ThemedText type="default" style={styles.summaryLabel}>Calories</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="default" style={styles.summaryNumber}>
                {getTotalMacros().protein.toFixed(1)}g
              </ThemedText>
              <ThemedText type="default" style={styles.summaryLabel}>Protein</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="default" style={styles.summaryNumber}>
                {getTotalMacros().carbs.toFixed(1)}g
              </ThemedText>
              <ThemedText type="default" style={styles.summaryLabel}>Carbs</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="default" style={styles.summaryNumber}>
                {getTotalMacros().fat.toFixed(1)}g
              </ThemedText>
              <ThemedText type="default" style={styles.summaryLabel}>Fat</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Add Food Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddFood(!showAddFood)}
        >
          <ThemedText type="default" style={styles.addButtonText}>
            {showAddFood ? 'Cancel' : '+ Add Food'}
          </ThemedText>
        </TouchableOpacity>

        {/* Add Food Section */}
        {showAddFood && (
          <ThemedView style={styles.addFoodCard}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Add Food</ThemedText>
            
            {/* Meal Type Selector */}
            <View style={styles.mealTypeSelector}>
              {mealTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeButton,
                    selectedMealType === type && styles.mealTypeButtonActive
                  ]}
                  onPress={() => setSelectedMealType(type as any)}
                >
                  <Text style={[
                    styles.mealTypeButtonText,
                    selectedMealType === type && styles.mealTypeButtonTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />

            {/* Food List */}
            <ScrollView style={styles.foodList} nestedScrollEnabled>
              {filteredFoods.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={styles.foodItem}
                  onPress={() => addMeal(food)}
                >
                  <View style={styles.foodInfo}>
                    <ThemedText type="default" style={styles.foodName}>{food.name}</ThemedText>
                    <ThemedText type="default" style={styles.foodDetails}>
                      {food.calories} cal • {food.protein}g protein • {food.serving}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        )}

        {/* Meals by Type */}
        {mealTypes.map((type) => {
          const typeMeals = getMealsByType(type);
          if (typeMeals.length === 0) return null;
          
          return (
            <ThemedView key={type} style={styles.mealCard}>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </ThemedText>
              {typeMeals.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  <View style={styles.mealInfo}>
                    <ThemedText type="default" style={styles.mealName}>
                      {meal.foodItem.name}
                    </ThemedText>
                    <ThemedText type="default" style={styles.mealDetails}>
                      {(meal.foodItem.calories * meal.quantity).toFixed(0)} cal • 
                      {meal.quantity > 1 ? ` ${meal.quantity}x` : ''} {meal.foodItem.serving}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMeal(meal.id)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ThemedView>
          );
        })}

        {/* Demo Note */}
        <ThemedView style={styles.demoNote}>
          <ThemedText type="default" style={styles.demoText}>
            🚀 Demo Mode: This is offline data for demonstration purposes.
            In production, this would sync with your Supabase backend.
          </ThemedText>
        </ThemedView>
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
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    marginBottom: 15,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addFoodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealTypeSelector: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  mealTypeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mealTypeButtonTextActive: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  foodList: {
    maxHeight: 200,
  },
  foodItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  foodDetails: {
    fontSize: 14,
    color: '#666',
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  mealDetails: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoNote: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  demoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});
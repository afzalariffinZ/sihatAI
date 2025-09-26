import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  foodEntry?: FoodEntry;
  showActions?: boolean;
}

interface EditModalData {
  messageId: string;
  foodItem: string;
  portion: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

interface FoodEntry {
  food: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// Quick suggestion phrases for food input
const quickSuggestions = [
  "I ate 2 fried chicken pieces",
  "Had a large pizza for lunch", 
  "I drank a protein shake",
  "Ate 1 cup of rice with beef"
];

// API function to log meals (placeholder for real implementation)
const logMealToDatabase = async (mealData: any) => {
  try {
    // For production, replace this with actual API call
    // const response = await fetch('/api/meals', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(mealData)
    // });
    // return response.json();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Meal logged successfully:', mealData);
    return { success: true, id: Date.now().toString() };
  } catch (error) {
    console.error('Failed to log meal:', error);
    throw error;
  }
};

export default function SihatAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [dailyCalories, setDailyCalories] = useState(1350);
  const [targetCalories] = useState(2200);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isInputFocused]);

  const handleInputFocus = () => {
    setIsInputFocused(true);
    // Delay scrolling to allow keyboard to appear
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  // Enhanced food database for better recognition
  const analyzeFoodText = async (text: string, imageUri?: string): Promise<FoodEntry | null> => {
    try {
      if (imageUri) {
        // Use Gemini AI for image analysis
        return await analyzeWithGemini(text, imageUri);
      } else {
        // Fallback to local database for text-only
        return analyzeLocalFood(text);
      }
    } catch (error) {
      console.error('Food analysis error:', error);
      return analyzeLocalFood(text);
    }
  };

  const analyzeWithGemini = async (text: string, imageUri: string): Promise<FoodEntry | null> => {
    try {
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });

      // Call your backend API
      const apiResponse = await fetch('YOUR_BACKEND_URL/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_AUTH_TOKEN',
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${base64}`,
          metadata: { userInput: text },
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('API request failed');
      }

      const result = await apiResponse.json();
      
      return {
        food: result.food_item,
        calories: result.calories,
        protein: result.protein_g,
        carbs: result.carbs_g,
        fat: result.fat_g,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return null;
    }
  };

  const analyzeLocalFood = (text: string): FoodEntry | null => {
    const lowercaseText = text.toLowerCase();
    
    const foodDatabase = [
      { keywords: ['fried chicken', 'chicken pieces', 'fried chicken pieces'], food: 'Fried Chicken Pieces (2)', calories: 480, protein: 35, carbs: 15, fat: 28 },
      { keywords: ['pizza', 'large pizza', 'pizza slice'], food: 'Large Pizza Slice', calories: 320, protein: 14, carbs: 38, fat: 12 },
      { keywords: ['protein shake', 'protein drink'], food: 'Protein Shake', calories: 150, protein: 25, carbs: 8, fat: 3 },
      { keywords: ['rice with beef', 'beef rice', 'rice and beef'], food: '1 Cup Rice with Beef', calories: 420, protein: 28, carbs: 45, fat: 15 },
      { keywords: ['burger', 'hamburger', 'cheeseburger'], food: 'Burger', calories: 540, protein: 22, carbs: 45, fat: 31 },
      { keywords: ['apple', 'apples'], food: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
      { keywords: ['banana', 'bananas'], food: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
      { keywords: ['salad', 'chicken salad', 'green salad'], food: 'Chicken Salad', calories: 280, protein: 26, carbs: 12, fat: 16 },
      { keywords: ['coffee', 'coffee with milk'], food: 'Coffee with Milk', calories: 35, protein: 2, carbs: 4, fat: 1.5 },
      { keywords: ['pasta', 'spaghetti', 'pasta with sauce'], food: 'Pasta with Sauce', calories: 350, protein: 12, carbs: 58, fat: 8 },
    ];

    for (const item of foodDatabase) {
      if (item.keywords.some(keyword => lowercaseText.includes(keyword))) {
        return {
          food: item.food,
          calories: item.calories,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
        };
      }
    }

    return null;
  };

  const handleSendMessage = async (messageText?: string, imageUri?: string) => {
    const textToSend = messageText || inputText;
    if (!textToSend.trim() && !imageUri) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Check if this is an edit request for existing food entry
    const isEditRequest = messages.some(msg => msg.showActions) && (
      textToSend.toLowerCase().includes('make it') ||
      textToSend.toLowerCase().includes('change') ||
      textToSend.toLowerCase().includes('edit') ||
      textToSend.toLowerCase().includes('actually') ||
      textToSend.toLowerCase().includes('no,') ||
      textToSend.toLowerCase().includes('not ') ||
      textToSend.toLowerCase().includes('pieces') ||
      textToSend.toLowerCase().includes('instead') ||
      /\b\d+\s*pieces?\b/i.test(textToSend) || // "3 pieces", "5 piece"
      /\b\d+\s*cal/i.test(textToSend) || // "500 cal", "300 calories"
      /^\s*\d+\s*$/i.test(textToSend) // Just a number like "3"
    );

    if (isEditRequest) {
      // Handle smart edit request
      handleSmartEdit(textToSend);
    } else {
      // Analyze the food normally
      try {
        const foodEntry = await analyzeFoodText(textToSend);
        
        let botResponse: Message;
        
        if (foodEntry) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            text: "Is this what you ate?",
            isUser: false,
            timestamp: new Date(),
            foodEntry: foodEntry,
            showActions: true,
          };
        } else {
          botResponse = {
            id: (Date.now() + 1).toString(),
            text: "I didn't recognize that food item. Could you be more specific? Try:\n\n• \"I ate 2 fried chicken pieces\"\n• \"Had a burger for lunch\"\n• \"Drank a protein shake\"\n\nWhat did you eat?",
            isUser: false,
            timestamp: new Date(),
          };
        }
        
        setTimeout(() => {
          setMessages(prev => [...prev, botResponse]);
          setIsLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Food analysis failed:', error);
        setIsLoading(false);
      }
    }
  };

  const handleSmartEdit = (editRequest: string) => {
    // Find the most recent food entry card that has actions
    const lastFoodMessage = [...messages].reverse().find(msg => msg.showActions && msg.foodEntry);
    
    if (!lastFoodMessage || !lastFoodMessage.foodEntry) {
      setIsLoading(false);
      return;
    }

    // Expire/disable the previous food entry card
    setMessages(prev => prev.map(msg => 
      msg.id === lastFoodMessage.id 
        ? { ...msg, showActions: false }
        : msg
    ));

    // Parse the edit request and create updated food entry
    const currentFood = lastFoodMessage.foodEntry;
    const updatedFood = parseEditRequest(editRequest, currentFood);

    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Got it! Is this what you meant?",
        isUser: false,
        timestamp: new Date(),
        foodEntry: updatedFood,
        showActions: true,
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const parseEditRequest = (request: string, currentFood: FoodEntry): FoodEntry => {
    const lowerRequest = request.toLowerCase();
    let updatedFood = { ...currentFood };

    // Extract current quantity from food name (e.g., "Fried Chicken Pieces (2)" -> 2)
    const currentQuantityMatch = currentFood.food.match(/\((\d+)\)|(\d+)\s*pieces?/i);
    const currentQuantity = currentQuantityMatch ? parseInt(currentQuantityMatch[1] || currentQuantityMatch[2]) : 1;

    // Parse various quantity change patterns
    const quantityPatterns = [
      /(?:make it|change (?:to|it to)|edit to)\s*(\d+)/i,  // "make it 3", "change to 5"
      /(?:actually|no,?)\s*(\d+)\s*pieces?/i,              // "actually 3 pieces", "no, 5 pieces" 
      /(\d+)\s*pieces?\s*(?:actually|instead)/i,           // "3 pieces actually", "5 pieces instead"
      /(?:no,?\s*)?(\d+)\s*pieces?\s*fried/i,              // "no, 3 pieces fried chicken"
      /^\s*(\d+)\s*$/,                                      // Just "3"
      /(\d+)\s*pieces?\s*$/i,                              // "3 pieces"
    ];

    let newQuantity = null;
    for (const pattern of quantityPatterns) {
      const match = lowerRequest.match(pattern);
      if (match) {
        newQuantity = parseInt(match[1]);
        break;
      }
    }

    if (newQuantity && newQuantity !== currentQuantity) {
      const multiplier = newQuantity / currentQuantity;
      
      // Update food name to reflect new quantity
      let newFoodName = currentFood.food;
      if (currentQuantityMatch) {
        newFoodName = currentFood.food.replace(/\(\d+\)/, `(${newQuantity})`).replace(/\d+\s*pieces?/i, `${newQuantity} pieces`);
      } else {
        // Add quantity info if not present
        newFoodName = `${currentFood.food} (${newQuantity})`;
      }
      
      updatedFood = {
        food: newFoodName,
        calories: Math.round(currentFood.calories * multiplier),
        protein: Math.round((currentFood.protein || 0) * multiplier),
        carbs: Math.round((currentFood.carbs || 0) * multiplier),
        fat: Math.round((currentFood.fat || 0) * multiplier),
      };
    }

    // Parse calorie changes like "make it 500 calories" or "500 cal"
    const calorieMatch = lowerRequest.match(/(\d+)\s*(?:cal|calorie)/i);
    if (calorieMatch) {
      const newCalories = parseInt(calorieMatch[1]);
      const multiplier = newCalories / currentFood.calories;
      
      updatedFood = {
        ...updatedFood,
        calories: newCalories,
        protein: Math.round((currentFood.protein || 0) * multiplier),
        carbs: Math.round((currentFood.carbs || 0) * multiplier),
        fat: Math.round((currentFood.fat || 0) * multiplier),
      };
    }

    // Parse specific nutrient changes like "more protein" or "less carbs"
    const proteinMatch = lowerRequest.match(/(\d+)g?\s*protein/i);
    if (proteinMatch) {
      updatedFood.protein = parseInt(proteinMatch[1]);
    }

    const carbsMatch = lowerRequest.match(/(\d+)g?\s*carbs?/i);
    if (carbsMatch) {
      updatedFood.carbs = parseInt(carbsMatch[1]);
    }

    const fatMatch = lowerRequest.match(/(\d+)g?\s*fat/i);
    if (fatMatch) {
      updatedFood.fat = parseInt(fatMatch[1]);
    }

    return updatedFood;
  };

  const handleAcceptFood = async (messageId: string, foodEntry: FoodEntry) => {
    try {
      // Update the message to show accepted state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, showActions: false }
          : msg
      ));

      // Show loading state
      const loadingMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Logging your meal...",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Prepare meal data for database
      const mealData = {
        food_item: foodEntry.food,
        calories: foodEntry.calories,
        protein_g: foodEntry.protein || 0,
        carbs_g: foodEntry.carbs || 0,
        fat_g: foodEntry.fat || 0,
        datetime: new Date().toISOString(),
        user_id: 'demo-user', // Replace with actual user ID
      };

      // Log the food entry to database
      const result = await logMealToDatabase(mealData);

      // Update dashboard calories if function is available
      if ((global as any).updateDashboardCalories) {
        (global as any).updateDashboardCalories(mealData);
      }

      // Update local calorie counter
      setDailyCalories(prev => prev + mealData.calories);

      // Remove loading message and add success message
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));

      const confirmMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `✅ Added ${foodEntry.food} (${foodEntry.calories} cal) to your daily log!\n\nYour meal has been saved with:\n• Protein: ${foodEntry.protein}g\n• Carbs: ${foodEntry.carbs}g\n• Fat: ${foodEntry.fat}g\n\nTell me what else you ate today.`,
        isUser: false,
        timestamp: new Date(),
      };

      setTimeout(() => {
        setMessages(prev => [...prev, confirmMessage]);
      }, 500);

    } catch (error) {
      console.error('Failed to log meal:', error);
      
      // Remove loading message and show error message
      setMessages(prev => prev.filter(msg => msg.text === "Logging your meal..."));

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `❌ Sorry, I couldn't save that meal right now. Please try again later.`,
        isUser: false,
        timestamp: new Date(),
      };

      setTimeout(() => {
        setMessages(prev => [...prev, errorMessage]);
      }, 500);
    }
  };

  const handleEditFood = (messageId: string, foodEntry: FoodEntry) => {
    // Extract food name without quantity/portion info
    const foodName = foodEntry.food.replace(/\s*\(\d+\)|\s*\d+\s*pieces?/gi, '').trim();
    
    // Extract portion info
    const portionMatch = foodEntry.food.match(/\((\d+)\)|(\d+)\s*pieces?/i);
    const portion = portionMatch ? `${portionMatch[1] || portionMatch[2]} pieces` : '1 serving';
    
    // Open edit modal with current food data
    setEditModal({
      messageId,
      foodItem: foodName,
      portion: portion,
      calories: foodEntry.calories.toString(),
      protein: (foodEntry.protein || 0).toString(),
      carbs: (foodEntry.carbs || 0).toString(),
      fat: (foodEntry.fat || 0).toString(),
    });
  };

  const handleSaveChanges = () => {
    if (!editModal) return;

    // Reconstruct food name with portion
    const foodName = editModal.portion.includes('pieces') 
      ? `${editModal.foodItem} Pieces (${editModal.portion.match(/\d+/)?.[0] || '1'})`
      : `${editModal.foodItem} - ${editModal.portion}`;

    // Create updated food entry
    const updatedFoodEntry: FoodEntry = {
      food: foodName,
      calories: parseInt(editModal.calories) || 0,
      protein: parseFloat(editModal.protein) || 0,
      carbs: parseFloat(editModal.carbs) || 0,
      fat: parseFloat(editModal.fat) || 0,
    };

    // Update the message to show the updated food entry card
    setMessages(prev => prev.map(msg => 
      msg.id === editModal.messageId 
        ? { 
            ...msg, 
            foodEntry: updatedFoodEntry,
            showActions: true,
            text: "Is this what you ate?" 
          }
        : msg
    ));

    setEditModal(null);
  };

  const handleCancelEdit = () => {
    setEditModal(null);
  };

  const handleImageCapture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      handleSendMessage("Analyzing your food photo...", result.assets[0].uri);
    }
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      handleSendMessage("Analyzing your food photo...", result.assets[0].uri);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SihatAI</Text>
          <Text style={styles.headerSubtitle}>Track • Analyze • Achieve</Text>
        </View>
        <View style={styles.calorieDisplay}>
          <Text style={styles.todayText}>Today</Text>
          <Text style={styles.calorieCount}>{dailyCalories}/{targetCalories}</Text>
        </View>
      </View>

      {/* Main Content */}
      {messages.length === 0 ? (
        // Welcome Screen
        <ScrollView style={styles.welcomeScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Tell me what you ate and I'll log it for you!</Text>
            <Text style={styles.exampleText}>
              Try: "I ate 2 fried chicken" or "Had a burger for lunch"
            </Text>

            {/* Quick Suggestions */}
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try saying...</Text>
              {quickSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionButton}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <Text style={styles.suggestionText}>"{suggestion}"</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        // Messages
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.messagesContainer}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.botMessage,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser ? styles.userText : styles.botText,
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text
                    style={[
                      styles.timestamp,
                      message.isUser ? styles.userTimestamp : styles.botTimestamp,
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </View>

                {/* Food Entry Card with Actions */}
                {message.foodEntry && message.showActions && (
                  <View style={styles.foodEntryCard}>
                    <Text style={styles.foodEntryName}>
                      {message.foodEntry.food}<Text style={styles.calorieText}> {message.foodEntry.calories} cal</Text>
                    </Text>
                    
                    <Text style={styles.nutritionSummary}>
                      Protein: {message.foodEntry.protein}g    Carbs: {message.foodEntry.carbs}g    Fat: {message.foodEntry.fat}g
                    </Text>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptFood(message.id, message.foodEntry!)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditFood(message.id, message.foodEntry!)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
            
            {isLoading && (
              <View style={[styles.messageContainer, styles.botMessage]}>
                <View style={[styles.messageBubble, styles.botBubble, styles.loadingBubble]}>
                  <Text style={styles.loadingText}>AI is analyzing...</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Tell me what you ate..."
              placeholderTextColor="#b0b0b0"
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleImageCapture}
            >
              <Text style={styles.cameraButtonText}>CAM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={handleImagePicker}
            >
              <Text style={styles.galleryButtonText}>GAL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Edit Modal */}
      {editModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Meal Details</Text>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Food Item</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editModal.foodItem}
                  onChangeText={(text) => setEditModal({...editModal, foodItem: text})}
                  placeholder="Food item name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Portion</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editModal.portion}
                  onChangeText={(text) => setEditModal({...editModal, portion: text})}
                  placeholder="Portion size"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Calories</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editModal.calories}
                    onChangeText={(text) => setEditModal({...editModal, calories: text})}
                    placeholder="540"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editModal.protein}
                    onChangeText={(text) => setEditModal({...editModal, protein: text})}
                    placeholder="38"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editModal.carbs}
                    onChangeText={(text) => setEditModal({...editModal, carbs: text})}
                    placeholder="12"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editModal.fat}
                    onChangeText={(text) => setEditModal({...editModal, fat: text})}
                    placeholder="34"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveChanges}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Done Button */}
            <View style={styles.doneButtonContainer}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  calorieDisplay: {
    alignItems: 'flex-end',
  },
  todayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  calorieCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 2,
  },
  welcomeScrollView: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    padding: 30,
    paddingTop: 60,
    minHeight: height * 0.6,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 20,
  },
  suggestionsContainer: {
    marginTop: 20,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  suggestionButton: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  suggestionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    lineHeight: 22,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  botBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loadingBubble: {
    backgroundColor: '#f8f9fa',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#333',
  },
  loadingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#999',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  keyboardAvoidingView: {
    // No additional styling needed, just for reference
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 120,
    paddingVertical: 8,
    paddingRight: 12,
    lineHeight: 22,
  },
  cameraButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#28a745',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  galleryButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6c757d',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Food Entry Card Styles
  foodEntryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    maxWidth: '85%',
  },
  foodEntryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  calorieText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  foodEntryPortion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  nutritionSummary: {
    fontSize: 12,
    color: '#333',
    marginBottom: 16,
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff3cd',
    margin: 20,
    borderRadius: 12,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
  modalContent: {
    padding: 20,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#f0d875',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButtonContainer: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0d875',
  },
  doneButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
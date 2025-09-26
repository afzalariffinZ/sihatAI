import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  weight?: number;
  height?: number;
  goal_calories?: number;
  goal_protein?: number;
  goal_carbs?: number;
  goal_fat?: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        // If profile doesn't exist, create a default one
        const defaultProfile: Partial<UserProfile> = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          goal_calories: 2000,
          goal_protein: 150,
          goal_carbs: 250,
          goal_fat: 67,
        };
        setProfile(defaultProfile as UserProfile);
        setEditedProfile(defaultProfile);
      } else {
        setProfile(data);
        setEditedProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    if (!user || !profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          ...editedProfile,
          id: user.id,
          email: user.email,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setProfile({ ...profile, ...editedProfile });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const addWeight = async () => {
    Alert.prompt(
      'Add Weight Entry',
      'Enter your current weight (lbs):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (weightStr?: string) => {
            const weight = parseFloat(weightStr || '0');
            if (weight > 0) {
              try {
                const { error } = await supabase
                  .from('weights')
                  .insert({
                    user_id: user?.id,
                    date: new Date().toISOString().split('T')[0],
                    weight,
                  });

                if (error) throw error;
                Alert.alert('Success', 'Weight entry added!');
              } catch (error) {
                console.error('Error adding weight:', error);
                Alert.alert('Error', 'Failed to add weight entry.');
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  if (!profile) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>
              {profile.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity
              onPress={() => {
                if (editing) {
                  setEditedProfile(profile);
                }
                setEditing(!editing);
              }}
            >
              <Text style={styles.editButton}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.name || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
                placeholder="Enter your name"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Current Weight (lbs)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.weight?.toString() || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, weight: parseFloat(text) || 0 })}
                placeholder="Enter weight"
                keyboardType="numeric"
              />
            ) : (
              <View style={styles.weightContainer}>
                <Text style={styles.fieldValue}>
                  {profile.weight ? `${profile.weight} lbs` : 'Not set'}
                </Text>
                <TouchableOpacity style={styles.addWeightButton} onPress={addWeight}>
                  <Text style={styles.addWeightButtonText}>+ Add Entry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Height (inches)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.height?.toString() || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, height: parseFloat(text) || 0 })}
                placeholder="Enter height"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile.height ? `${profile.height} inches` : 'Not set'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goals</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Calories</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.goal_calories?.toString() || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, goal_calories: parseInt(text) || 0 })}
                placeholder="2000"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile.goal_calories || 2000} cal
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Protein (g)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.goal_protein?.toString() || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, goal_protein: parseInt(text) || 0 })}
                placeholder="150"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile.goal_protein || 150}g
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Carbs (g)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.goal_carbs?.toString() || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, goal_carbs: parseInt(text) || 0 })}
                placeholder="250"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile.goal_carbs || 250}g
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fat (g)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.goal_fat?.toString() || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, goal_fat: parseInt(text) || 0 })}
                placeholder="67"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile.goal_fat || 67}g
              </Text>
            )}
          </View>

          {editing && (
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  weightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addWeightButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addWeightButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
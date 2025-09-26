import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { apiService, AnalyzeFoodResponse } from '../lib/api';

interface FoodCameraProps {
  onAnalysisComplete: (result: AnalyzeFoodResponse) => void;
  onClose: () => void;
  visible: boolean;
}

export default function FoodCamera({ onAnalysisComplete, onClose, visible }: FoodCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, setMediaPermission] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        if (photo) {
          setCapturedImage(photo.uri);
          
          if (photo.base64) {
            await analyzeFood(photo.base64);
          }
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedImage(asset.uri);
        
        if (asset.base64) {
          await analyzeFood(asset.base64);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const analyzeFood = async (base64Image: string) => {
    setIsAnalyzing(true);
    try {
      const result = await apiService.analyzeFood({
        image: base64Image,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
      
      onAnalysisComplete(result);
    } catch (error) {
      console.error('Error analyzing food:', error);
      Alert.alert('Error', 'Failed to analyze food. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setCapturedImage(null);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <ThemedView style={styles.container}>
          <ThemedText>Requesting camera permission...</ThemedText>
        </ThemedView>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>
            Camera access is required to capture food photos.
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={requestPermission}>
            <Text style={styles.closeButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </ThemedView>
      </Modal>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {capturedImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            {isAnalyzing ? (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.analyzingText}>Analyzing food...</Text>
              </View>
            ) : (
              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
                  <Text style={styles.buttonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={() => analyzeFood(capturedImage)}
                >
                  <Text style={styles.buttonText}>Analyze</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
            <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
              <View style={styles.cameraOverlay}>
                <View style={styles.topBar}>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.centerGuide}>
                  <View style={styles.foodFrame} />
                  <Text style={styles.guideText}>Center your food in the frame</Text>
                </View>

                <View style={styles.bottomBar}>
                  <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                    <Text style={styles.buttonText}>Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.flipButton}
                    onPress={toggleCameraFacing}
                  >
                    <Text style={styles.buttonText}>Flip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 125,
    borderStyle: 'dashed',
  },
  guideText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
    paddingBottom: 50,
  },
  galleryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
    width: 80,
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
  },
  flipButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
    width: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    resizeMode: 'contain',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  retakeButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    width: 120,
    alignItems: 'center',
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: 120,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
});
// App.js
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  PanResponder,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import ViewShot from "react-native-view-shot";

const FIELD_IMAGES = [
  require('./assets/lacrosse_field.png'),
  require('./assets/lacrosse_field2.png'),
  require('./assets/lacrosse_field3.png'),
];

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Removed scribble from boardState
const initialBoardState = {
  markers: [],
  lines: [],
};

const STORAGE_KEY = '@LacrosseBoard';
const SAVED_PLAYS_KEY = '@SavedPlaysList';

export default function App() {
  // Reference to the board view for capturing screenshots
  const boardRef = useRef();

  // ----- Field Layout -----
  const [fieldIndex, setFieldIndex] = useState(0);

  // ----- Mode Management -----
  // Allowed modes: 'addX', 'addO', 'remove', 'line', 'arrow'
  const [mode, setMode] = useState('addX');
  const [isDashed, setIsDashed] = useState(false);

  // ----- Board State & History for Undo/Redo -----
  const [boardState, setBoardState] = useState(initialBoardState);
  const [history, setHistory] = useState([initialBoardState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = (newState) => {
    const truncated = history.slice(0, historyIndex + 1);
    const updated = [...truncated, newState];
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
  };

  const updateBoardState = (newState, pushToStack = true) => {
    setBoardState(newState);
    if (pushToStack) {
      pushHistory(newState);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBoardState(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBoardState(history[newIndex]);
    }
  };

  // ----- Markers & Lines -----
  const [tempLineStart, setTempLineStart] = useState(null);

  // ----- Pinch/Zoom (No Pan) with Reanimated -----
  const scale = useSharedValue(1);
  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = event.scale;
    },
  });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // ----- Async Storage Save/Load for Current Board State -----
  const saveBoard = async () => {
    try {
      const jsonValue = JSON.stringify(boardState);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
      Alert.alert('Saved', 'Current board state saved.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save board state.');
    }
  };

  const loadBoard = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue) {
        const loadedState = JSON.parse(jsonValue);
        updateBoardState(loadedState, false);
        Alert.alert('Loaded', 'Board state loaded.');
      } else {
        Alert.alert('No Data', 'No board state found.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load board state.');
    }
  };

  const clearBoard = () => {
    updateBoardState(initialBoardState);
    setTempLineStart(null);
  };

  // ----- Share Board as an Image using view-shot -----
  const shareBoardImage = async () => {
    try {
      if (!boardRef.current) {
        Alert.alert("Error", "Board reference not found.");
        return;
      }
      // Use the capture method of ViewShot
      const uri = await boardRef.current.capture({ format: 'png', quality: 0.8 });
      console.log('Captured URI:', uri);
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.log('Share error:', e);
      Alert.alert('Error', 'Failed to share board image.');
    }
  };



  // ----- Permanent Saved Plays -----
  const [savedPlays, setSavedPlays] = useState([]);
  const [isSavedPlaysModalVisible, setIsSavedPlaysModalVisible] = useState(false);
  const [isSavePlayModalVisible, setIsSavePlayModalVisible] = useState(false);
  const [newPlayName, setNewPlayName] = useState('');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(SAVED_PLAYS_KEY);
      if (stored) setSavedPlays(JSON.parse(stored));
    })();
  }, []);

  const saveCurrentPlay = async () => {
    if (!newPlayName) {
      Alert.alert('Name Required', 'Please enter a name for your play.');
      return;
    }
    const newPlay = {
      id: Date.now().toString(),
      name: newPlayName,
      boardState: boardState,
    };
    const newSavedPlays = [...savedPlays, newPlay];
    setSavedPlays(newSavedPlays);
    await AsyncStorage.setItem(SAVED_PLAYS_KEY, JSON.stringify(newSavedPlays));
    setNewPlayName('');
    setIsSavePlayModalVisible(false);
    Alert.alert('Saved', 'Play saved permanently.');
  };

  const loadSavedPlay = (play) => {
    updateBoardState(play.boardState, false);
    setIsSavedPlaysModalVisible(false);
  };

  const deleteSavedPlay = async (playId) => {
    const newSavedPlays = savedPlays.filter((play) => play.id !== playId);
    setSavedPlays(newSavedPlays);
    await AsyncStorage.setItem(SAVED_PLAYS_KEY, JSON.stringify(newSavedPlays));
  };

  // ----- Field Touch Handling -----
  const handleFieldPress = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    if (mode === 'addX' || mode === 'addO') {
      const newMarker = {
        id: Date.now().toString(),
        type: mode === 'addX' ? 'X' : 'O',
        x: locationX,
        y: locationY,
      };
      const newState = { ...boardState, markers: [...boardState.markers, newMarker] };
      updateBoardState(newState);
    } else if (mode === 'line' || mode === 'arrow') {
      if (!tempLineStart) {
        setTempLineStart({ x: locationX, y: locationY });
      } else {
        const newLine = {
          id: Date.now().toString(),
          start: tempLineStart,
          end: { x: locationX, y: locationY },
          type: mode,
          dashed: isDashed,
        };
        const newState = { ...boardState, lines: [...boardState.lines, newLine] };
        updateBoardState(newState);
        setTempLineStart(null);
      }
    }
  };

  // ----- Removing Markers & Lines -----
  const handleMarkerPress = (markerId) => {
    if (mode === 'remove') {
      const newMarkers = boardState.markers.filter((m) => m.id !== markerId);
      const newState = { ...boardState, markers: newMarkers };
      updateBoardState(newState);
    }
  };

  const removeClosestLine = (x, y) => {
    let closestId = null;
    let closestDist = 20;
    boardState.lines.forEach((line) => {
      const distStart = distance(x, y, line.start.x, line.start.y);
      const distEnd = distance(x, y, line.end.x, line.end.y);
      const minD = Math.min(distStart, distEnd);
      if (minD < closestDist) {
        closestDist = minD;
        closestId = line.id;
      }
    });
    if (closestId) {
      const newLines = boardState.lines.filter((l) => l.id !== closestId);
      const newState = { ...boardState, lines: newLines };
      updateBoardState(newState);
    }
  };

  const distance = (x1, y1, x2, y2) =>
    Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

  const handleRemovePress = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    removeClosestLine(locationX, locationY);
  };

  // ----- Marker Dragging -----
  const createMarkerPanResponder = (marker) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newX = marker.x + gestureState.dx;
        const newY = marker.y + gestureState.dy;
        updateMarkerPosition(marker.id, newX, newY, false);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newX = marker.x + gestureState.dx;
        const newY = marker.y + gestureState.dy;
        updateMarkerPosition(marker.id, newX, newY, true);
      },
    });
  };

  const updateMarkerPosition = (markerId, x, y, pushToHistory = false) => {
    const newMarkers = boardState.markers.map((m) =>
      m.id === markerId ? { ...m, x, y } : m
    );
    const newState = { ...boardState, markers: newMarkers };
    updateBoardState(newState, pushToHistory);
  };

  // ----- Rendering -----
  const renderMarkers = () =>
    boardState.markers.map((marker) => {
      const panResponder = createMarkerPanResponder(marker);
      const style = {
        position: 'absolute',
        left: marker.x - 16,
        top: marker.y - 16,
      };
      return (
        <View
          key={marker.id}
          style={[styles.markerContainer, style]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity onPress={() => handleMarkerPress(marker.id)}>
            <Text
              style={[
                styles.markerText,
                marker.type === 'X' ? { color: 'red' } : { color: 'blue' },
              ]}
            >
              {marker.type}
            </Text>
          </TouchableOpacity>
        </View>
      );
    });

  const renderLines = () =>
    boardState.lines.map((line) => {
      const { id, start, end, type, dashed } = line;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const angle = Math.atan2(dy, dx);
      const arrowLength = 12;
      const arrowPoint1 = {
        x: end.x - arrowLength * Math.cos(angle - Math.PI / 6),
        y: end.y - arrowLength * Math.sin(angle - Math.PI / 6),
      };
      const arrowPoint2 = {
        x: end.x - arrowLength * Math.cos(angle + Math.PI / 6),
        y: end.y - arrowLength * Math.sin(angle + Math.PI / 6),
      };
      const arrowPoints = `${end.x},${end.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`;
      const strokeDash = dashed ? [6, 6] : null;
      return (
        <React.Fragment key={id}>
          <Line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="black"
            strokeWidth={2}
            strokeDasharray={strokeDash}
          />
          {type === 'arrow' && <Polygon points={arrowPoints} fill="black" />}
        </React.Fragment>
      );
    });

  // Render Content: Always wrap in PinchGestureHandler for zoom
  const renderContent = () => {
    return (
      <PinchGestureHandler onGestureEvent={pinchHandler}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          {renderField()}
        </Animated.View>
      </PinchGestureHandler>
    );
  };

  // ... inside your renderField function:
  const renderField = () => {
    return (
      <ViewShot ref={boardRef} style={styles.fieldContainer}>
        <ImageBackground
          source={FIELD_IMAGES[fieldIndex]}
          style={styles.fieldBackground}
          resizeMode="stretch"
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.8}
            onPress={handleFieldPress}
            onPressOut={handleRemovePress}
          >
            <Svg style={StyleSheet.absoluteFill}>{renderLines()}</Svg>
            {renderMarkers()}
          </TouchableOpacity>
        </ImageBackground>
      </ViewShot>
    );
  };


  const switchField = () => {
    setFieldIndex((prev) => (prev + 1) % FIELD_IMAGES.length);
  };

  // ----- Top Bar with Icons -----
  const renderTopBar = () => {
    return (
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={handleUndo}>
          <Ionicons name="arrow-undo" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleRedo}>
          <Ionicons name="arrow-redo" size={32} color="#fff" />
        </TouchableOpacity>
        {/* Open Save Play Modal */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsSavePlayModalVisible(true)}
        >
          <Ionicons name="save" size={32} color="#fff" />
        </TouchableOpacity>
        {/* Open Saved Plays Modal */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsSavedPlaysModalVisible(true)}
        >
          <Ionicons name="folder-open" size={32} color="#fff" />
        </TouchableOpacity>
        {/* Share Board as Image */}
        <TouchableOpacity style={styles.iconButton} onPress={shareBoardImage}>
          <Ionicons name="share-social" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={clearBoard}>
          <Ionicons name="trash" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={switchField}>
          <Ionicons name="images" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // ----- Bottom Bar with Modes (scribble removed) -----
  const renderBottomBar = () => {
    return (
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'addX' && styles.activeMode]}
          onPress={() => {
            setMode('addX');
            setTempLineStart(null);
          }}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'addO' && styles.activeMode]}
          onPress={() => {
            setMode('addO');
            setTempLineStart(null);
          }}
        >
          <Ionicons name="ellipse" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'remove' && styles.activeMode]}
          onPress={() => {
            setMode('remove');
            setTempLineStart(null);
          }}
        >
          <Ionicons name="remove-circle" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'line' && styles.activeMode]}
          onPress={() => {
            setMode('line');
            setTempLineStart(null);
          }}
        >
          <Ionicons name="remove" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'arrow' && styles.activeMode]}
          onPress={() => {
            setMode('arrow');
            setTempLineStart(null);
          }}
        >
          <Ionicons name="arrow-forward" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modeButton}
          onPress={() => setIsDashed((prev) => !prev)}
        >
          <Ionicons name="reorder-three" size={32} color={isDashed ? 'yellow' : '#fff'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {renderTopBar()}
      {renderContent()}
      {renderBottomBar()}

      {/* Modal for Saved Plays */}
      <Modal
        visible={isSavedPlaysModalVisible}
        animationType="slide"
        onRequestClose={() => setIsSavedPlaysModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Saved Plays</Text>
          <FlatList
            data={savedPlays}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.savedPlayRow}>
                <TouchableOpacity
                  style={styles.savedPlayItem}
                  onPress={() => loadSavedPlay(item)}
                >
                  <Text style={styles.savedPlayText}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteSavedPlay(item.id)}
                >
                  <Ionicons name="trash" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setIsSavedPlaysModalVisible(false)}
          >
            <Text style={styles.closeModalText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal for Saving Current Play */}
      <Modal
        visible={isSavePlayModalVisible}
        animationType="slide"
        onRequestClose={() => setIsSavePlayModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Save Current Play</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter play name"
            value={newPlayName}
            onChangeText={setNewPlayName}
          />
          <TouchableOpacity style={styles.saveButton} onPress={saveCurrentPlay}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setIsSavePlayModalVisible(false)}
          >
            <Text style={styles.closeModalText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    width: screenWidth,
    height: screenHeight,
  },
  fieldBackground: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 32,
    height: 32,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  topBar: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  iconButton: {
    marginHorizontal: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modeButton: {
    padding: 10,
    marginHorizontal: 6,
  },
  activeMode: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  savedPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  savedPlayItem: {
    flex: 1,
    padding: 15,
  },
  savedPlayText: {
    fontSize: 18,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: 'red',
    borderRadius: 4,
    marginLeft: 10,
  },
  closeModalButton: {
    padding: 15,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginVertical: 10,
  },
  closeModalText: {
    color: '#fff',
    fontSize: 18,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    fontSize: 18,
    marginBottom: 20,
  },
  saveButton: {
    padding: 15,
    backgroundColor: 'green',
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
  },
});

// components/Marker.js
import React, { useRef, useEffect } from 'react';
import { Text, PanResponder, Animated, StyleSheet, TouchableOpacity } from 'react-native';

const Marker = ({ id, type, x, y, updatePosition, onPress, isSelected }) => {
    const pan = useRef(new Animated.ValueXY({ x, y })).current;

    // Update animated position when the parent state changes.
    useEffect(() => {
        pan.setValue({ x, y });
    }, [x, y]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                // Update position while dragging.
                pan.setValue({ x: x + gestureState.dx, y: y + gestureState.dy });
            },
            onPanResponderRelease: (evt, gestureState) => {
                const newX = x + gestureState.dx;
                const newY = y + gestureState.dy;
                updatePosition(id, newX, newY);
            },
        })
    ).current;

    return (
        <Animated.View
            style={[
                styles.marker,
                {
                    transform: pan.getTranslateTransform(),
                    borderColor: isSelected ? 'red' : 'transparent',
                },
            ]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity onPress={() => onPress(id)}>
                <Text style={styles.markerText}>{type}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    marker: {
        position: 'absolute',
        padding: 5,
        borderWidth: 2,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    markerText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default Marker;

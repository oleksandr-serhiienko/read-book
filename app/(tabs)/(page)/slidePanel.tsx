import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';

interface SlidePanelProps {
  isVisible: boolean;
  initialContent: string;
  fullContent: string;
  onClose: () => void;
  onAddToDictionary: () => void;
}

const SlidePanel: React.FC<SlidePanelProps> = ({ 
  isVisible, 
  initialContent, 
  fullContent, 
  onClose, 
  onAddToDictionary 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Animated.View 
      style={[
        styles.panel, 
        { transform: [{ translateY }] },
        !isVisible && styles.hidden
      ]}
    >
      <ScrollView>
        <Text>{expanded ? fullContent : initialContent}</Text>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text>{expanded ? 'Show Less' : 'Show More'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAddToDictionary}>
          <Text>Add to Dictionary</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  hidden: {
    display: 'none',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default SlidePanel;
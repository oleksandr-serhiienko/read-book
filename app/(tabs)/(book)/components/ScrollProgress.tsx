import React from 'react';
import { View } from 'react-native';

const ScrollProgress = () => {
  return (
    <View style={{ 
      position: 'absolute',
      right: 4,
      top: 60,
      bottom: 4,
      width: 3,
      backgroundColor: '#e5e5e5',
      borderRadius: 1.5,
    }}>
      <View 
        style={{
          position: 'absolute',
          width: '100%',
          height: 40,
          backgroundColor: '#3498db',
          borderRadius: 1.5,
          top: '0%',
        }}
      />
    </View>
  );
};

export default ScrollProgress;
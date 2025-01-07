import React from 'react';
import { View } from 'react-native';

const ProgressBar = ({ progress }: { progress: number }) => {
  const width = Math.max(0, Math.min(100, progress));
  
  return (
    <View style={{ 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      height: 3, 
      backgroundColor: '#e5e5e5' 
    }}>
      <View 
        style={{
          height: '100%',
          width: `${width}%`,
          backgroundColor: '#3498db',
        }}
      />
    </View>
  );
};

export default ProgressBar;
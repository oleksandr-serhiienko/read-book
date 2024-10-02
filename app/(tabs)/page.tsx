import * as React from 'react';
import { SafeAreaView } from 'react-native';
import { Reader, useReader } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import { ReaderProvider } from '@epubjs-react-native/core';

export default function HomeScreen() {
  const handleSelected = (selection:string) => {
    console.log('Selected text:', selection);
    // You can add more logic here to handle the selected text
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ReaderProvider>
        <Reader
          src="https://s3.amazonaws.com/moby-dick/OPS/package.opf"
          fileSystem={useFileSystem}
          enableSelection={true}
          onSelected={handleSelected}
        />
      </ReaderProvider>
    </SafeAreaView>
  );
}
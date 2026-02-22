module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/react-native-skia|react-native-skia-gesture|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-safe-area-context|expo-haptics|expo-clipboard|react-native-keyboard-controller)',
  ],
};

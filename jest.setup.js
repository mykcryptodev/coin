jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

jest.mock('react-native-keyboard-controller', () => ({
  useReanimatedKeyboardAnimation: () => ({
    height: { value: 0 },
    progress: { value: 0 },
  }),
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const Fragment = React.Fragment;
  const MockComponent = ({ children }: any) => React.createElement(Fragment, null, children);

  return {
    Skia: {
      Path: {
        MakeFromSVGString: jest.fn(() => ({ mock: 'path' })),
        Make: jest.fn(() => ({ addRect: jest.fn(), addCircle: jest.fn() })),
      },
    },
    rect: jest.fn((x, y, w, h) => ({ x, y, width: w, height: h })),
    Blur: MockComponent,
    Circle: MockComponent,
    ColorMatrix: MockComponent,
    FitBox: MockComponent,
    Group: MockComponent,
    Paint: MockComponent,
    Path: MockComponent,
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file:///mock/image.jpg', mimeType: 'image/jpeg' }],
    })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri) =>
    Promise.resolve({ uri: uri + '_resized' })
  ),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

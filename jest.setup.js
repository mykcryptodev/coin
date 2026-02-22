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

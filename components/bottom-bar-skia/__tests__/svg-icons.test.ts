jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Path: {
      MakeFromSVGString: jest.fn(() => ({ mock: 'path' })),
      Make: jest.fn(() => ({ addRect: jest.fn(), addCircle: jest.fn() })),
    },
  },
  rect: jest.fn((x, y, w, h) => ({ x, y, width: w, height: h })),
  Blur: jest.fn(),
  Circle: jest.fn(),
  ColorMatrix: jest.fn(),
  FitBox: jest.fn(),
  Group: jest.fn(),
  Paint: jest.fn(),
  Path: jest.fn(),
}));

import { BOTTOM_BAR_ICONS } from '../svg-icons';

describe('BOTTOM_BAR_ICONS', () => {
  it('should have exactly 3 icons', () => {
    expect(BOTTOM_BAR_ICONS).toHaveLength(3);
  });

  it('should contain HOME_ICON, PAY_ICON, and USER_ICON', () => {
    expect(BOTTOM_BAR_ICONS[0]).toBeDefined();
    expect(BOTTOM_BAR_ICONS[1]).toBeDefined();
    expect(BOTTOM_BAR_ICONS[2]).toBeDefined();
  });

  it('each icon should have a path property', () => {
    BOTTOM_BAR_ICONS.forEach((icon) => {
      expect(icon).toHaveProperty('path');
      expect(icon.path).toBeDefined();
    });
  });

  it('each icon should have a src property', () => {
    BOTTOM_BAR_ICONS.forEach((icon) => {
      expect(icon).toHaveProperty('src');
      expect(icon.src).toBeDefined();
    });
  });

  it('should have correct src dimensions for HOME and PAY icons', () => {
    expect(BOTTOM_BAR_ICONS[0].src).toHaveProperty('width', 24);
    expect(BOTTOM_BAR_ICONS[0].src).toHaveProperty('height', 24);
    expect(BOTTOM_BAR_ICONS[1].src).toHaveProperty('width', 24);
    expect(BOTTOM_BAR_ICONS[1].src).toHaveProperty('height', 24);
  });

  it('should have correct src dimensions for USER icon', () => {
    expect(BOTTOM_BAR_ICONS[2].src).toHaveProperty('width', 1024);
    expect(BOTTOM_BAR_ICONS[2].src).toHaveProperty('height', 1024);
  });
});

import { BOTTOM_BAR_ICONS } from '../svg-icons';

describe('BOTTOM_BAR_ICONS', () => {
  it('has exactly 3 icons', () => {
    expect(BOTTOM_BAR_ICONS).toHaveLength(3);
  });

  it('each icon is defined', () => {
    expect(BOTTOM_BAR_ICONS[0]).toBeDefined();
    expect(BOTTOM_BAR_ICONS[1]).toBeDefined();
    expect(BOTTOM_BAR_ICONS[2]).toBeDefined();
  });

  it('each icon has a path property', () => {
    BOTTOM_BAR_ICONS.forEach((icon) => {
      expect(icon).toHaveProperty('path');
      expect(icon.path).toBeDefined();
    });
  });

  it('each icon has a src property', () => {
    BOTTOM_BAR_ICONS.forEach((icon) => {
      expect(icon).toHaveProperty('src');
      expect(icon.src).toBeDefined();
    });
  });

  it('HOME and PAY icons use 24x24 viewBox', () => {
    expect(BOTTOM_BAR_ICONS[0].src).toHaveProperty('width', 24);
    expect(BOTTOM_BAR_ICONS[0].src).toHaveProperty('height', 24);
    expect(BOTTOM_BAR_ICONS[1].src).toHaveProperty('width', 24);
    expect(BOTTOM_BAR_ICONS[1].src).toHaveProperty('height', 24);
  });

  it('USER icon uses 1024x1024 viewBox', () => {
    expect(BOTTOM_BAR_ICONS[2].src).toHaveProperty('width', 1024);
    expect(BOTTOM_BAR_ICONS[2].src).toHaveProperty('height', 1024);
  });
});

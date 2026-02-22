import { BottomTabBar } from '../BottomTabBar';

describe('BottomTabBar Module', () => {
  it('exports BottomTabBar as a defined value', () => {
    expect(BottomTabBar).toBeDefined();
  });

  it('exports BottomTabBar as a function', () => {
    expect(typeof BottomTabBar).toBe('function');
  });
});

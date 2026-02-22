describe('BottomTabBar Module', () => {
  it('should export BottomTabBar', () => {
    const module = require('../BottomTabBar');
    expect(module.BottomTabBar).toBeDefined();
    expect(typeof module.BottomTabBar).toBe('function');
  });

  it('should export BottomTabBar as a React component', () => {
    const module = require('../BottomTabBar');
    const displayName = module.BottomTabBar.displayName || module.BottomTabBar.name;
    expect(displayName).toBeDefined();
  });
});

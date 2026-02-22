import { ScreenNames } from '../constants';

describe('ScreenNames', () => {
  it('should have exactly 3 keys', () => {
    const keys = Object.keys(ScreenNames);
    expect(keys).toHaveLength(3);
  });

  it('should have correct expo-router file names as values', () => {
    expect(ScreenNames.Home).toBe('index');
    expect(ScreenNames.Pay).toBe('pay');
    expect(ScreenNames.Me).toBe('me');
  });

  it('should not contain old demo screen names', () => {
    const values = Object.values(ScreenNames);
    expect(values).not.toContain('Home');
    expect(values).not.toContain('Search');
    expect(values).not.toContain('User');
  });

  it('should have correct keys structure', () => {
    expect(ScreenNames).toHaveProperty('Home');
    expect(ScreenNames).toHaveProperty('Pay');
    expect(ScreenNames).toHaveProperty('Me');
  });
});

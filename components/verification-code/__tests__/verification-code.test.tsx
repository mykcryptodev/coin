import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useAnimatedShake } from '../hooks/use-animated-shake';
import { AnimatedCodeNumber } from '../AnimatedCodeNumber';
import { VerificationCode } from '../VerificationCode';

function TestWrapper({ code, highlighted = false }: { code?: number; highlighted?: boolean }) {
  const status = useSharedValue<'inProgress' | 'correct' | 'wrong'>('inProgress');
  return <AnimatedCodeNumber code={code} highlighted={highlighted} status={status} />;
}

function VerificationCodeTestWrapper({ 
  code = [], 
  maxLength = 6, 
  onCodeChange = jest.fn(), 
  onCodeComplete = jest.fn(),
  editable = true 
}: Partial<{code: number[], maxLength: number, onCodeChange: (c: number[]) => void, onCodeComplete: (s: string) => void, editable: boolean}>) {
  const status = useSharedValue<'inProgress' | 'correct' | 'wrong'>('inProgress');
  return <VerificationCode code={code} maxLength={maxLength} status={status} onCodeChange={onCodeChange} onCodeComplete={onCodeComplete} editable={editable} />;
}

describe('useAnimatedShake', () => {
  it('exports shake function and rShakeStyle animated style', () => {
    const { result } = renderHook(() => useAnimatedShake());
    expect(result.current.shake).toBeDefined();
    expect(typeof result.current.shake).toBe('function');
    expect(result.current.rShakeStyle).toBeDefined();
  });

  it('shake is callable without error', () => {
    const { result } = renderHook(() => useAnimatedShake());
    expect(() => result.current.shake()).not.toThrow();
  });
});

describe('AnimatedCodeNumber', () => {
  it('renders without crashing when code is undefined', () => {
    const { toJSON } = render(<TestWrapper code={undefined} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the digit text when code is provided', () => {
    const { getByText } = render(<TestWrapper code={5} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('renders with highlighted prop without crashing', () => {
    const { toJSON } = render(<TestWrapper code={3} highlighted={true} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('VerificationCode', () => {
  it('renders 6 digit boxes by default', () => {
    const { getByTestId } = render(<VerificationCodeTestWrapper />);
    expect(getByTestId('digit-box-0')).toBeTruthy();
    expect(getByTestId('digit-box-1')).toBeTruthy();
    expect(getByTestId('digit-box-2')).toBeTruthy();
    expect(getByTestId('digit-box-3')).toBeTruthy();
    expect(getByTestId('digit-box-4')).toBeTruthy();
    expect(getByTestId('digit-box-5')).toBeTruthy();
  });

  it('contains a hidden TextInput for keyboard capture', () => {
    const { getByTestId } = render(<VerificationCodeTestWrapper />);
    expect(getByTestId('hidden-input')).toBeTruthy();
  });

  it('hidden TextInput has keyboardType number-pad prop', () => {
    const { getByTestId } = render(<VerificationCodeTestWrapper />);
    const input = getByTestId('hidden-input');
    expect(input.props.keyboardType).toBe('number-pad');
  });

  it('fires onCodeChange callback when text is entered', () => {
    const onCodeChange = jest.fn();
    const { getByTestId } = render(<VerificationCodeTestWrapper onCodeChange={onCodeChange} />);
    fireEvent.changeText(getByTestId('hidden-input'), '1');
    expect(onCodeChange).toHaveBeenCalled();
  });

  it('fires onCodeComplete when code reaches maxLength', () => {
    const onCodeComplete = jest.fn();
    const { getByTestId } = render(<VerificationCodeTestWrapper onCodeComplete={onCodeComplete} />);
    fireEvent.changeText(getByTestId('hidden-input'), '123456');
    expect(onCodeComplete).toHaveBeenCalledWith('123456');
  });
});

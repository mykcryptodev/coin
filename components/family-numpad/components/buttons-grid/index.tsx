import { StyleSheet, Text, View } from 'react-native';
import { type FC, memo } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { InputButton } from './input-button';

const items = [
  { label: 1 },
  { label: 2 },
  { label: 3 },
  { label: 4 },
  { label: 5 },
  { label: 6 },
  { label: 7 },
  { label: 8 },
  { label: 9 },
  { label: '.' },
  { label: 0 },
  { label: 'backspace' },
];

type ButtonsGridProps = {
  input: string;
  onUpdate: (value: string) => void;
  onBackspace: (value: string) => void;
  onReset: () => void;
  onMaxReached?: () => void;
};

export const ButtonsGrid: FC<ButtonsGridProps> = memo(
  ({ input, onReset, onUpdate, onBackspace, onMaxReached }) => {
    return (
      <View style={styles.container}>
        {items.map(({ label }, index) => {
          return (
            <InputButton
              key={index}
              style={styles.inputBtn}
              onLongPress={() => {
                if (label === 'backspace') {
                  onReset();
                }
              }}
              onPress={() => {
                if (typeof label === 'number') {
                  if (input === '0' && label !== 0) {
                    onUpdate(label.toString());
                    return;
                  }
                  if (input === '0' && label === 0) {
                    return;
                  }

                  const decimalIndex = input.indexOf('.');
                  if (decimalIndex !== -1) {
                    const decimalPart = input.slice(decimalIndex + 1);
                    if (decimalPart.length >= 2) {
                      onMaxReached?.();
                      return;
                    }
                  }

                  const newValue = input + label.toString();
                  const digitCount = newValue.replace('.', '').length;
                  if (digitCount > 11) {
                    onMaxReached?.();
                    return;
                  }

                  onUpdate(newValue);
                  return;
                }

                if (label === '.') {
                  if (input.includes('.')) {
                    return;
                  }
                  if (input === '' || input === '0') {
                    onUpdate('0.');
                    return;
                  }
                  onUpdate(input + '.');
                  return;
                }

                if (label === 'backspace') {
                  const newValue = input.slice(0, -1);
                  onBackspace(newValue);
                }
              }}>
              {typeof label === 'number' && (
                <Text style={styles.number}>{label}</Text>
              )}
              {label === '.' && (
                <Text style={styles.dot}>.</Text>
              )}
              {label === 'backspace' && (
                <FontAwesome5 name="backspace" size={24} color="#11181C" />
              )}
            </InputButton>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inputBtn: {
    alignItems: 'center',
    height: '20%',
    justifyContent: 'center',
    marginBottom: `${7 / 3}%` as unknown as number,
    marginLeft: `${7 / 3}%` as unknown as number,
    width: '30%',
  },
  number: {
    color: '#11181C',
    fontSize: 30,
    fontWeight: '500',
    fontFamily: 'Segment-Medium',
    textAlign: 'center',
  },
  dot: {
    color: '#11181C',
    fontSize: 36,
    fontWeight: '300',
    fontFamily: 'Segment-Medium',
    textAlign: 'center',
  },
});

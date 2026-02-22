import { StyleSheet, View } from 'react-native';
import { type FC, useCallback } from 'react';
import { AnimatedNumber } from './components/animated-number';
import { ButtonsGrid } from './components/buttons-grid';

type NumberInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onMaxReached?: () => void;
};

export const NumberInput: FC<NumberInputProps> = ({
  value,
  onValueChange,
  onMaxReached,
}) => {
  const reset = useCallback(() => {
    onValueChange('');
  }, [onValueChange]);

  return (
    <View style={styles.container}>
      <View style={styles.displayArea}>
        <AnimatedNumber value={value || '0'} />
      </View>
      <View style={styles.gridArea}>
        <ButtonsGrid
          input={value}
          onUpdate={onValueChange}
          onBackspace={onValueChange}
          onReset={reset}
          onMaxReached={onMaxReached}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  displayArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridArea: {
    flex: 2,
  },
});

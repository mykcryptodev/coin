import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { AnimatedCodeNumber, type StatusType } from './AnimatedCodeNumber';
import { useAnimatedShake } from './hooks/use-animated-shake';

export type VerificationCodeRef = {
  clear: () => void;
  shake: () => void;
  focus: () => void;
};

type VerificationCodeProps = {
  code: number[];
  maxLength?: number;
  status: SharedValue<StatusType>;
  onCodeChange: (code: number[]) => void;
  onCodeComplete: (codeString: string) => void;
  editable?: boolean;
};

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    bottom: -50,
    opacity: 0,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  digitWrapper: {
    flex: 1,
  },
});

export const VerificationCode = forwardRef<VerificationCodeRef, VerificationCodeProps>(
  function VerificationCode({ code, maxLength = 6, status, onCodeChange, onCodeComplete, editable = true }, ref) {
    const textInputRef = useRef<TextInput>(null);
    const { shake, rShakeStyle } = useAnimatedShake();

    useImperativeHandle(ref, () => ({
      clear: () => {
        textInputRef.current?.clear();
        onCodeChange([]);
      },
      shake,
      focus: () => {
        textInputRef.current?.focus();
      },
    }));

    const handleChangeText = useCallback(
      (text: string) => {
        const digits = text.replace(/\D/g, '');
        const newCode = digits.split('').map(Number);
        if (newCode.length > maxLength) return;

        onCodeChange(newCode);

        if (newCode.length === maxLength) {
          onCodeComplete(digits.slice(0, maxLength));
        }
      },
      [maxLength, onCodeChange, onCodeComplete],
    );

    const handleTouchEnd = useCallback(() => {
      textInputRef.current?.focus();
    }, []);

    return (
      <View>
        <TextInput
          testID="hidden-input"
          ref={textInputRef}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={maxLength}
          autoFocus
          editable={editable}
          style={styles.hiddenInput}
        />
        <Animated.View
          style={[styles.codeContainer, rShakeStyle]}
          onTouchEnd={handleTouchEnd}
        >
          {new Array(maxLength).fill(0).map((_, index) => (
            <View key={index} testID={`digit-box-${index}`} style={styles.digitWrapper}>
              <AnimatedCodeNumber
                code={code[index]}
                status={status}
                highlighted={index === code.length && editable}
              />
            </View>
          ))}
        </Animated.View>
      </View>
    );
  },
);

import { StyleSheet, View } from 'react-native';
import { type FC, useCallback, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { AnimatedSingleNumber } from './individual-number';
import { getCommasArray } from '../../utils/get-commas-array';

type AnimatedNumberProps = {
  value: string;
};

export const AnimatedNumber: FC<AnimatedNumberProps> = ({ value }) => {
  // Strip leading non-numeric prefix (e.g. "$") for parsing
  const prefixMatch = value.match(/^([^0-9]*)/);
  const prefix = prefixMatch?.[1] || '';
  const numericValue = value.slice(prefix.length);

  const integerPart = numericValue.includes('.') ? numericValue.split('.')[0] : numericValue;
  const decimalPart = numericValue.includes('.') ? numericValue.split('.')[1] : undefined;
  const hasDecimal = decimalPart !== undefined;

  const splittedInteger = useMemo(() => {
    return (integerPart || '0').split('');
  }, [integerPart]);

  const commas = useMemo(() => {
    return getCommasArray(parseInt(integerPart || '0', 10));
  }, [integerPart]);

  const splittedDecimal = useMemo(() => {
    return decimalPart !== undefined ? decimalPart.split('') : [];
  }, [decimalPart]);

  const ITEM_WIDTH = 55;
  const ITEM_HEIGHT = 100;
  // Unified total: prefix + integer digits + (dot + decimal digits if present)
  const fullLength = prefix.length + splittedInteger.length + (hasDecimal ? 1 + splittedDecimal.length : 0);
  const SCALE = 1 - fullLength * 0.05;
  const SCALE_WIDTH_OFFSET = 0.08;
  const SCALED_WIDTH = ITEM_WIDTH * (SCALE + SCALE_WIDTH_OFFSET);
  const COMMA_SPACE = 10 * (1 - splittedInteger.length * 0.025);

  const DOT_TIGHTEN = SCALED_WIDTH * 0.4;

  const buildIndividualNumber = useCallback(
    (params: {
      index: number;
      item: string;
      containerStyle?: StyleProp<ViewStyle>;
      style?: object;
      extraOffset?: number;
    }) => {
      return (
        <AnimatedSingleNumber
          index={params.index}
          value={params.item}
          scale={SCALE}
          scaleWidthOffset={SCALE_WIDTH_OFFSET}
          key={`${params.index}-${params.item}`}
          rightSpace={
            commas.slice(0, Math.max(0, params.index - prefix.length)).filter(v => v === ',').length *
            COMMA_SPACE +
            (params.extraOffset ?? 0)
          }
          totalNumbersLength={fullLength}
          itemWidth={ITEM_WIDTH}
          itemHeight={ITEM_HEIGHT}
          containerStyle={[styles.itemContainer, params.containerStyle ?? {}]}
          style={params.style ?? styles.item}
        />
      );
    },
    [COMMA_SPACE, DOT_TIGHTEN, SCALE, commas, fullLength, prefix.length],
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        right: commas.filter(v => v === ',').length * COMMA_SPACE,
        top: 10,
        backgroundColor: 'transparent',
        alignItems: 'flex-end',
      }}>
      {prefix.split('').map((char, index) =>
        buildIndividualNumber({
          index,
          item: char,
          style: styles.prefixItem,
        }),
      )}
      {splittedInteger.map((item, index) => {
        return buildIndividualNumber({ index: index + prefix.length, item });
      })}
      {commas.map((item, index) => {
        if (item === '') return null;

        return buildIndividualNumber({
          index: index + prefix.length,
          item,
          containerStyle: {
            marginLeft: SCALED_WIDTH / 2 + COMMA_SPACE / 2,
          },
        });
      })}
      {hasDecimal &&
        buildIndividualNumber({
          index: splittedInteger.length + prefix.length,
          item: '.',
          style: styles.dotItem,
          extraOffset: -DOT_TIGHTEN,
        })
      }
      {splittedDecimal.map((item, index) =>
        buildIndividualNumber({
          index: splittedInteger.length + prefix.length + 1 + index,
          item,
          extraOffset: -DOT_TIGHTEN * 2,
        }),
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    color: '#11181C',
    fontSize: 90,
    fontWeight: 'bold',
    fontFamily: 'Segment-Bold',
    textAlign: 'center',
    width: 60,
  },
  prefixItem: {
    color: '#11181C',
    fontSize: 90,
    fontWeight: 'bold',
    fontFamily: 'Segment-Bold',
    textAlign: 'center',
    width: 60,
  },
  dotItem: {
    color: '#11181C',
    fontSize: 90,
    fontWeight: '300',
    fontFamily: 'Segment-Medium',
    textAlign: 'center',
    width: 40,
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

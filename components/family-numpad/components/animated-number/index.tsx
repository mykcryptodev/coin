import { StyleSheet, View } from 'react-native';
import { type FC, useCallback, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { AnimatedSingleNumber } from './individual-number';
import { getCommasArray } from '../../utils/get-commas-array';

type AnimatedNumberProps = {
  value: string;
};

export const AnimatedNumber: FC<AnimatedNumberProps> = ({ value }) => {
  const integerPart = value.includes('.') ? value.split('.')[0] : value;
  const decimalPart = value.includes('.') ? value.split('.')[1] : undefined;

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
  const totalDigits = value.replace('.', '').length || 1;
  const SCALE = 1 - totalDigits * 0.05;
  const SCALE_WIDTH_OFFSET = 0.08;
  const SCALED_WIDTH = ITEM_WIDTH * (SCALE + SCALE_WIDTH_OFFSET);
  const COMMA_SPACE = 10 * (1 - splittedInteger.length * 0.025);

  const buildIndividualNumber = useCallback(
    (params: {
      index: number;
      item: string;
      containerStyle?: StyleProp<ViewStyle>;
    }) => {
      return (
        <AnimatedSingleNumber
          index={params.index}
          value={params.item}
          scale={SCALE}
          scaleWidthOffset={SCALE_WIDTH_OFFSET}
          key={`${params.index}-${params.item}`}
          rightSpace={
            commas.slice(0, params.index).filter(v => v === ',').length *
            COMMA_SPACE
          }
          totalNumbersLength={splittedInteger.length}
          itemWidth={ITEM_WIDTH}
          itemHeight={ITEM_HEIGHT}
          containerStyle={[styles.itemContainer, params.containerStyle ?? {}]}
          style={styles.item}
        />
      );
    },
    [COMMA_SPACE, SCALE, commas, splittedInteger.length],
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
      {splittedInteger.map((item, index) => {
        return buildIndividualNumber({ index, item });
      })}
      {commas.map((item, index) => {
        if (item === '') return null;

        return buildIndividualNumber({
          index,
          item,
          containerStyle: {
            marginLeft: SCALED_WIDTH / 2 + COMMA_SPACE / 2,
          },
        });
      })}
      {decimalPart !== undefined && (
        <View style={[styles.itemContainer, { width: ITEM_WIDTH * SCALE, height: ITEM_HEIGHT }]}>
          <AnimatedSingleNumber
            index={splittedInteger.length}
            value="."
            scale={SCALE}
            scaleWidthOffset={SCALE_WIDTH_OFFSET}
            key="decimal-dot"
            totalNumbersLength={splittedInteger.length + 1}
            itemWidth={ITEM_WIDTH}
            itemHeight={ITEM_HEIGHT}
            containerStyle={styles.itemContainer}
            style={styles.dotItem}
          />
        </View>
      )}
      {splittedDecimal.map((item, index) => (
        <AnimatedSingleNumber
          key={`decimal-${index}-${item}`}
          index={splittedInteger.length + 1 + index}
          value={item}
          scale={SCALE}
          scaleWidthOffset={SCALE_WIDTH_OFFSET}
          totalNumbersLength={splittedInteger.length + 1 + splittedDecimal.length}
          itemWidth={ITEM_WIDTH}
          itemHeight={ITEM_HEIGHT}
          containerStyle={styles.itemContainer}
          style={styles.item}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    color: '#11181C',
    fontSize: 90,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 60,
  },
  dotItem: {
    color: '#11181C',
    fontSize: 90,
    fontWeight: '300',
    textAlign: 'center',
    width: 40,
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

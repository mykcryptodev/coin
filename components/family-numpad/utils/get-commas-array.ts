export function getCommasArray(number: number): (',' | '')[] {
  const numberString = number.toString().split('').reverse();
  const result: string[] = [];

  for (let i = 0; i < numberString.length; i++) {
    if (i > 0 && i % 3 === 0) {
      result.push(',');
      continue;
    }
    result.push('');
  }

  return result.reverse() as (',' | '')[];
}

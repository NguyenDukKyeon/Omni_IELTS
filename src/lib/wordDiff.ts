export interface WordDiffToken {
  expected: string;
  user?: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
}
const normalize = (word: string) => word.toLocaleLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '');

export function diffWords(expectedText: string, userText: string): {
  distance: number;
  accuracy: number;
  tokens: WordDiffToken[];
} {
  const expected = expectedText.trim().split(/\s+/).filter(Boolean);
  const user = userText.trim().split(/\s+/).filter(Boolean);
  const matrix = Array.from({ length: expected.length + 1 }, () => Array(user.length + 1).fill(0));
  for (let i = 0; i <= expected.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= user.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= expected.length; i += 1) {
    for (let j = 1; j <= user.length; j += 1) {
      const substitution = normalize(expected[i - 1]) === normalize(user[j - 1]) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitution,
      );
    }
  }

  const tokens: WordDiffToken[] = [];
  let i = expected.length;
  let j = user.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = normalize(expected[i - 1]) === normalize(user[j - 1]);
      if (matrix[i][j] === matrix[i - 1][j - 1] + (same ? 0 : 1)) {
        tokens.unshift({ expected: expected[i - 1], user: user[j - 1], status: same ? 'correct' : 'incorrect' });
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && matrix[i][j] === matrix[i - 1][j] + 1) {
      tokens.unshift({ expected: expected[i - 1], status: 'missing' });
      i -= 1;
    } else {
      tokens.unshift({ expected: '', user: user[j - 1], status: 'extra' });
      j -= 1;
    }
  }
  const distance = matrix[expected.length][user.length];
  return {
    distance,
    accuracy: expected.length ? Math.max(0, Math.round((1 - distance / expected.length) * 100)) : 0,
    tokens,
  };
}

export type ForecastSearchInput = {
  skill?: string;
  council?: string;
  customQuery?: string;
  timeframe?: string;
};

export function buildForecastSearchQueries(
  input: ForecastSearchInput,
  now = new Date(),
): string[] {
  const skillLabels: Record<string, string> = {
    writing_task2: 'IELTS Writing Task 2',
    writing_task1: 'IELTS Writing Task 1',
    speaking_part1: 'IELTS Speaking Part 1',
    speaking_part2: 'IELTS Speaking Part 2 cue card',
    speaking_part3: 'IELTS Speaking Part 3',
  };
  const councilLabels: Record<string, string> = {
    idp_vietnam: 'IDP Vietnam',
    bc_vietnam: 'British Council Vietnam',
    both_vietnam: 'IDP and British Council Vietnam',
    international: 'IDP and British Council international',
  };
  const skill = skillLabels[input.skill || ''] || 'IELTS Speaking and Writing';
  const council = councilLabels[input.council || ''] || 'Vietnam and international';
  const year = now.getUTCFullYear();
  const period = input.timeframe === 'week' ? 'this week' : String(year);
  const customQuery = String(input.customQuery || '').trim();
  const primary = customQuery || `${skill} recent reported questions ${council} ${period}`;
  const targetedFallback = `${skill} topic recall reports ${council} ${year}`;
  const officialFallback = `${skill} sample questions and topic guidance from official IELTS preparation sources`;

  return [...new Set([primary, targetedFallback, officialFallback])];
}

export async function runForecastQueryVariants<T>(
  queries: string[],
  run: (query: string) => Promise<T>,
  failureCategory: (error: unknown) => string | undefined,
): Promise<{ value: T; query: string }> {
  let lastFailure: unknown;
  for (const query of queries) {
    try {
      return { value: await run(query), query };
    } catch (error) {
      lastFailure = error;
      if (failureCategory(error) !== 'no_results') throw error;
    }
  }
  throw lastFailure || Object.assign(new Error('NO_RESULTS: no Forecast queries configured'), {
    category: 'no_results',
  });
}

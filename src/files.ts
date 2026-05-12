import { globSync } from 'glob';

export function expandFilePatterns(patterns: string[] | undefined): string[] | undefined {
  if (!patterns) {
    return undefined;
  }

  return patterns.flatMap(pattern =>
    globSync(pattern, {
      nodir: true
    })
  );
}

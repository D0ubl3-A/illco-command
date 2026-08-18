export type TimedWord = { word: string; start: number; end: number };

function normalizeToken(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}']/gu, "").replace(/^'+|'+$/g, "");
}

/** Keep accurate transcript text while inheriting real Whisper timestamps. */
export function alignTranscriptToWordTimestamps(transcriptText: string, timingWords: TimedWord[]) {
  const transcriptWords = transcriptText.match(/\S+/g) || [];
  const cleanTiming = timingWords
    .filter((word) => word.word && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  if (!transcriptWords.length || !cleanTiming.length) return { words: [] as TimedWord[], coverage: 0 };

  const left = transcriptWords.map(normalizeToken);
  const right = cleanTiming.map((word) => normalizeToken(word.word));
  const dp = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      dp[i][j] = left[i - 1] && left[i - 1] === right[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const anchors = new Map<number, TimedWord>();
  let i = left.length;
  let j = right.length;
  while (i > 0 && j > 0) {
    if (left[i - 1] && left[i - 1] === right[j - 1]) {
      anchors.set(i - 1, cleanTiming[j - 1]);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i -= 1;
    else j -= 1;
  }

  const anchorIndexes = [...anchors.keys()].sort((a, b) => a - b);
  const songStart = cleanTiming[0].start;
  const songEnd = cleanTiming[cleanTiming.length - 1].end;
  const output: TimedWord[] = [];
  for (let index = 0; index < transcriptWords.length; index += 1) {
    const anchored = anchors.get(index);
    if (anchored) {
      output.push({ word: transcriptWords[index], start: anchored.start, end: anchored.end });
      continue;
    }
    let previousIndex: number | undefined;
    for (let anchorPosition = anchorIndexes.length - 1; anchorPosition >= 0; anchorPosition -= 1) {
      const candidate = anchorIndexes[anchorPosition];
      if (candidate < index) {
        previousIndex = candidate;
        break;
      }
    }
    const nextIndex = anchorIndexes.find((value) => value > index);
    const rangeStart = previousIndex === undefined ? songStart : anchors.get(previousIndex)!.end;
    const rangeEnd = nextIndex === undefined ? songEnd : anchors.get(nextIndex)!.start;
    const slotStart = previousIndex === undefined ? 0 : previousIndex + 1;
    const slotEnd = nextIndex === undefined ? transcriptWords.length : nextIndex;
    const slotCount = Math.max(1, slotEnd - slotStart);
    const duration = Math.max(0, rangeEnd - rangeStart);
    const position = index - slotStart;
    output.push({
      word: transcriptWords[index],
      start: rangeStart + duration * (position / slotCount),
      end: rangeStart + duration * ((position + 1) / slotCount),
    });
  }

  let cursor = songStart;
  for (const word of output) {
    word.start = Math.max(cursor, word.start);
    word.end = Math.max(word.start + 0.04, word.end);
    cursor = word.end;
  }
  return { words: output, coverage: anchors.size / transcriptWords.length };
}
import { useEffect, useState } from 'react';
import { MOODS, pickLine, type Mood } from './lines';
import type { Reaction } from './react';

export type Speech = { id: number; text: string; mood: Mood };

const IDLE_MIN_MS = 45_000;
const IDLE_MAX_MS = 120_000;

let nextId = 0;
const toSpeech = ({ event, vars }: Reaction): Speech => ({
  id: nextId++,
  text: pickLine(event, vars),
  mood: MOODS[event],
});

/** Kira's current line. `say` replaces it; after a quiet spell she pipes up on her own. */
export function useKira(opening: () => Reaction) {
  const [speech, setSpeech] = useState(() => toSpeech(opening()));
  const say = (reaction: Reaction) => setSpeech(toSpeech(reaction));

  useEffect(() => {
    const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
    const timer = setTimeout(() => setSpeech(toSpeech({ event: 'idle' })), delay);
    return () => clearTimeout(timer);
  }, [speech.id]); // any new line restarts the quiet timer

  return { speech, say };
}

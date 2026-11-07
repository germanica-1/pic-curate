// Kira: a cozy, gentle bunny with a cocoa habit, and occasionally a bit of a snob.
// Lowercase, short, soft "~", the odd ☕. Placeholders: {n} photos, {streak} days, {title} achievement.

export type KiraEvent =
  | 'intro'
  | 'welcomeBack'
  | 'streakAtRisk'
  | 'streakBroken'
  | 'added'
  | 'addedMany'
  | 'addedCamera'
  | 'removed'
  | 'undo'
  | 'unarchived'
  | 'binFull'
  | 'streakUp'
  | 'unlocked'
  | 'idle'
  | 'tapped';

/** How Kira moves when she says the line. */
export type Mood = 'hop' | 'tilt' | 'wiggle' | 'none';

export const MOODS: Record<KiraEvent, Mood> = {
  intro: 'hop',
  welcomeBack: 'hop',
  streakAtRisk: 'tilt',
  streakBroken: 'tilt',
  added: 'hop',
  addedMany: 'hop',
  addedCamera: 'hop',
  removed: 'tilt',
  undo: 'hop',
  unarchived: 'hop',
  binFull: 'tilt',
  streakUp: 'wiggle',
  unlocked: 'wiggle',
  idle: 'none',
  tapped: 'hop',
};

export const LINES: Record<KiraEvent, string[]> = {
  intro: [
    "oh. hello. I'm Kira~ this bin is mine, but I'll let you fill it ☕",
    "hi~ I'm Kira. bring me photos and I'll keep them cozy. and judge them, a little",
  ],
  welcomeBack: [
    "you're back~ I kept the cocoa warm ☕",
    'ah, it’s you. the photos missed you. I was indifferent. mostly',
    "welcome back~ everything's right where you threw it",
  ],
  streakAtRisk: [
    "{streak} days in a row… it'd be a shame to stop now. just saying ☕",
    'no photo today yet? your {streak}-day streak is looking at me nervously',
    'one little photo keeps the {streak}-day streak going~ no pressure. some pressure',
  ],
  streakBroken: [
    'the streak took a little nap. we can start a new one today~',
    "hm. a gap in the calendar. I won't mention it. again",
  ],
  added: [
    "ooh, a new one~ it's actually rather nice",
    "hm. I'd have framed it differently, but fine ☕",
    'into the bin it goes~ cozy',
    'acceptable. more than acceptable, honestly',
    "oh, I like this one. don't tell the others",
  ],
  addedMany: [
    "{n} at once? someone's been busy~",
    "{n} new photos. I'll need a second cocoa for this",
    '{n} photos! the bin is getting lively',
  ],
  addedCamera: [
    'fresh off the lens~ still warm',
    'you took that just now? bold. I respect it',
    'a brand new photo~ my favourite kind',
  ],
  removed: [
    'out it goes. I never liked that one anyway. …probably',
    'a little tidying~ very curatorial of you',
    'farewell, little photo',
  ],
  undo: ['changed your mind? good. it was growing on me', 'back in the bin~ I knew it'],
  unarchived: ['ah, an old favourite returns~', 'dusted off and back in. nostalgic, are we?'],
  binFull: [
    "the bin's full, so the oldest went to the archive. very gently",
    'no room~ the oldest one is resting in the archive now',
  ],
  streakUp: [
    "{streak} days in a row~ I'm almost impressed ☕",
    'day {streak}! consistency is so rare these days',
    "{streak} days. fine. you have taste. I've said it",
  ],
  unlocked: [
    'oh! you unlocked “{title}”~ I’ll pretend I’m not proud',
    '“{title}”… well. look at you ☕',
    'achievement: “{title}”. I always believed in you. since just now',
  ],
  idle: [
    '*sips cocoa*',
    'do you ever rearrange them just to watch them tumble? I do',
    'tilt the phone, if you dare~',
    "I'd rate this collection… a solid “cozy”",
    "shake the phone if you want chaos. I won't stop you",
    "any photos from today? I'm asking for a friend. the friend is me",
    'this scarf is hand-knit, by the way. not that anyone asked',
  ],
  tapped: ['yes? ☕', "careful, the cocoa's hot", 'boop received', "I'm curating. very busy. …what is it?"],
};

const recentLines: string[] = [];
const RECENT_LIMIT = 6;

/** Picks a line for the event, avoiding recently used ones, and fills in placeholders. */
export function pickLine(
  event: KiraEvent,
  vars: Record<string, string | number> = {},
  recent: string[] = recentLines,
  random: () => number = Math.random,
): string {
  const all = LINES[event];
  const fresh = all.filter((l) => !recent.includes(l));
  const pool = fresh.length ? fresh : all;
  const line = pool[Math.floor(random() * pool.length)];
  recent.push(line);
  if (recent.length > RECENT_LIMIT) recent.shift();
  return line.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

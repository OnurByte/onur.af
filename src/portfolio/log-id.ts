import { randomInt } from 'node:crypto';

// Consistent, pronounceable Masonic / esoteric three-word phrases.
// Only pair nouns with verbs that produce a coherent miniature sentence.
export const adjectives = [
  'ancient',
  'ashen',
  'black',
  'blind',
  'buried',
  'cloaked',
  'cryptic',
  'dark',
  'distant',
  'dormant',
  'eclipsed',
  'eternal',
  'forbidden',
  'forgotten',
  'fractured',
  'hidden',
  'hollow',
  'invisible',
  'last',
  'lost',
  'midnight',
  'obscure',
  'occult',
  'pale',
  'phantom',
  'quiet',
  'sealed',
  'secret',
  'shadowed',
  'silent',
  'silver',
  'solitary',
  'sunken',
  'third',
  'unknown',
  'unseen',
  'veiled',
  'vigilant',
  'waning',
  'weathered',
] as const;

export const subjects = [
  ['archive', ['opens', 'whispers', 'remembers']],
  ['bell', ['tolls', 'echoes', 'awakens']],
  ['chamber', ['opens', 'echoes', 'waits']],
  ['cipher', ['unravels', 'awakens', 'reveals']],
  ['compass', ['turns', 'points', 'aligns']],
  ['council', ['convenes', 'watches', 'gathers']],
  ['eye', ['watches', 'opens', 'remembers']],
  ['gate', ['opens', 'closes', 'waits']],
  ['lantern', ['glows', 'flickers', 'fades']],
  ['lodge', ['convenes', 'gathers', 'waits']],
  ['manuscript', ['unfolds', 'reveals', 'survives']],
  ['mask', ['falls', 'cracks', 'remains']],
  ['monolith', ['stands', 'awakens', 'waits']],
  ['order', ['gathers', 'convenes', 'endures']],
  ['oath', ['binds', 'echoes', 'endures']],
  ['oracle', ['speaks', 'watches', 'waits']],
  ['pillar', ['stands', 'falls', 'endures']],
  ['ritual', ['begins', 'ends', 'returns']],
  ['seal', ['breaks', 'holds', 'remains']],
  ['shadow', ['moves', 'watches', 'returns']],
  ['sigil', ['glows', 'fades', 'awakens']],
  ['temple', ['stands', 'awakens', 'waits']],
  ['threshold', ['opens', 'shifts', 'waits']],
  ['vault', ['opens', 'closes', 'endures']],
  ['veil', ['falls', 'lifts', 'remains']],
  ['watchtower', ['watches', 'stands', 'falls']],
] as const;

export function generateLogId(
  reserved: ReadonlySet<string>,
  pick: (max: number) => number = randomInt,
): string {
  for (let attempt = 0; attempt < 256; attempt++) {
    const adjective = adjectives[pick(adjectives.length)];
    const [subject, verbs] = subjects[pick(subjects.length)]!;
    const verb = verbs[pick(verbs.length)];
    const id = `${adjective}-${subject}-${verb}`;
    if (!reserved.has(id)) return id;
  }
  throw new Error('Unable to generate an unused Log ID');
}

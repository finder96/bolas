// Legenda + hashtags (usada pela interface e pelo modo automático).
import { textsFor } from './sims.js';
import { MELODIES } from './audio.js';

export const BASE_TAGS = '#satisfying #oddlysatisfying #asmr #relaxing #physics #simulation #fyp #viral';

export function suggestCaption(c) {
  const m = MELODIES[c.music];
  return `${c.hook}\n\n🎵 ${m.name}${m.gen ? '' : ' — ' + m.credit}\n\n${BASE_TAGS} ${textsFor(c.sim, c.opts).tags}`;
}

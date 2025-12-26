import { VisemeData, VisemeName } from '../types';

/**
 * Phoneme to Viseme Mapping
 * Maps common English phonemes to VRM viseme blend shapes
 */
const PHONEME_TO_VISEME: Record<string, VisemeName> = {
  // Vowels
  'a': 'aa', 'e': 'E', 'i': 'ih', 'o': 'oh', 'u': 'ou',
  'A': 'aa', 'E': 'E', 'I': 'ih', 'O': 'oh', 'U': 'ou',
  // Consonants - Bilabial
  'b': 'PP', 'p': 'PP', 'm': 'PP',
  'B': 'PP', 'P': 'PP', 'M': 'PP',
  // Consonants - Labiodental
  'f': 'FF', 'v': 'FF',
  'F': 'FF', 'V': 'FF',
  // Consonants - Interdental
  'th': 'TH', 'TH': 'TH',
  // Consonants - Alveolar
  'd': 'DD', 't': 'DD', 'n': 'nn', 'l': 'nn', 's': 'SS', 'z': 'SS',
  'D': 'DD', 'T': 'DD', 'N': 'nn', 'L': 'nn', 'S': 'SS', 'Z': 'SS',
  // Consonants - Alveopalatal
  'sh': 'CH', 'ch': 'CH', 'j': 'CH',
  'SH': 'CH', 'CH': 'CH', 'J': 'CH',
  // Consonants - Velar
  'k': 'kk', 'g': 'kk', 'ng': 'kk',
  'K': 'kk', 'G': 'kk', 'NG': 'kk',
  // Consonants - Palatal
  'y': 'ih', 'Y': 'ih',
  // Consonants - Glottal
  'h': 'aa', 'H': 'aa',
  // Consonants - Rhotic
  'r': 'RR', 'R': 'RR',
  // Consonants - Alveolar lateral
  'w': 'ou', 'W': 'ou',
};

/**
 * Vowel combinations that should be treated as single phonemes
 */
const VOWEL_COMBINATIONS: Record<string, VisemeName> = {
  'ai': 'ih', 'ay': 'ih', 'ea': 'E', 'ee': 'ih', 'ei': 'E', 'ey': 'E',
  'ie': 'ih', 'oa': 'ou', 'oe': 'ou', 'oo': 'ou', 'ou': 'ou', 'ow': 'ou',
  'ue': 'ou', 'ui': 'ih',
  'AI': 'ih', 'AY': 'ih', 'EA': 'E', 'EE': 'ih', 'EI': 'E', 'EY': 'E',
  'IE': 'ih', 'OA': 'ou', 'OE': 'ou', 'OO': 'ou', 'OU': 'ou', 'OW': 'ou',
  'UE': 'ou', 'UI': 'ih',
};

/**
 * Get viseme for a single character
 */
function getVisemeForChar(char: string): VisemeName {
  return PHONEME_TO_VISEME[char] || 'sil';
}

/**
 * Convert text to viseme data with timing
 * @param text - The text to convert
 * @param duration - Total duration in seconds (optional, defaults to estimated)
 * @returns Array of viseme data with timing
 */
export function textToVisemes(text: string, duration?: number): VisemeData[] {
  if (!text || text.trim().length === 0) {
    return [{ name: 'sil', weight: 1 }];
  }

  const visemes: VisemeData[] = [];
  const words = text.split(/\s+/);
  
  // Estimate duration if not provided (roughly 0.15s per character)
  const estimatedDuration = duration ?? (text.length * 0.15);
  const timePerChar = estimatedDuration / text.length;

  // Process each word
  for (const word of words) {
    if (word.length === 0) continue;

    // Add silence before word (short pause)
    visemes.push({ name: 'sil', weight: 1, duration: timePerChar * 0.5 });

    // Process characters in the word
    let i = 0;
    while (i < word.length) {
      // Check for vowel combinations first
      let found = false;
      for (const combo of Object.keys(VOWEL_COMBINATIONS)) {
        if (word.substr(i, combo.length).toLowerCase() === combo.toLowerCase()) {
          visemes.push({
            name: VOWEL_COMBINATIONS[combo],
            weight: 1,
            duration: timePerChar * combo.length
          });
          i += combo.length;
          found = true;
          break;
        }
      }

      if (!found) {
        const char = word[i];
        const viseme = getVisemeForChar(char);
        
        // Skip adding viseme for silence to reduce noise
        if (viseme !== 'sil') {
          visemes.push({
            name: viseme,
            weight: 1,
            duration: timePerChar
          });
        }
        
        i++;
      }
    }

    // Add silence after word (short pause)
    visemes.push({ name: 'sil', weight: 1, duration: timePerChar * 0.5 });
  }

  // Add final silence
  visemes.push({ name: 'sil', weight: 1 });

  return visemes;
}

/**
 * Get current viseme based on time
 * @param visemes - Array of viseme data
 * @param currentTime - Current playback time in seconds
 * @returns Current viseme name or 'sil' if no match
 */
export function getCurrentViseme(visemes: VisemeData[], currentTime: number): VisemeName {
  if (!visemes || visemes.length === 0) {
    return 'sil';
  }

  let accumulatedTime = 0;
  for (const viseme of visemes) {
    accumulatedTime += viseme.duration ?? 0.1;
    if (currentTime <= accumulatedTime) {
      return viseme.name;
    }
  }

  return 'sil';
}

/**
 * Interpolate between visemes for smooth transitions
 * @param currentViseme - Current viseme name
 * @param targetViseme - Target viseme name
 * @param progress - Interpolation progress (0-1)
 * @returns Object with viseme weights
 */
export function interpolateVisemes(
  currentViseme: VisemeName,
  targetViseme: VisemeName,
  progress: number
): Record<VisemeName, number> {
  const weights: Record<VisemeName, number> = {
    'sil': 0, 'PP': 0, 'FF': 0, 'TH': 0, 'DD': 0,
    'kk': 0, 'CH': 0, 'SS': 0, 'nn': 0, 'RR': 0,
    'aa': 0, 'E': 0, 'ih': 0, 'oh': 0, 'ou': 0
  };

  if (progress < 0.5) {
    weights[currentViseme] = 1 - (progress * 2);
    weights[targetViseme] = progress * 2;
  } else {
    weights[currentViseme] = (1 - progress) * 2;
    weights[targetViseme] = 1 - ((1 - progress) * 2);
  }

  return weights;
}

/**
 * VRM blend shape name mapping
 * Maps viseme names to common VRM blend shape names
 */
export const VRM_VISEME_MAPPING: Record<VisemeName, string[]> = {
  'sil': ['neutral', 'mouth_close'],
  'PP': ['aa', 'mouth_a'], // Bilabial - open mouth slightly
  'FF': ['ih', 'mouth_i'], // Labiodental - teeth visible
  'TH': ['ih', 'mouth_i'], // Interdental - tongue between teeth
  'DD': ['aa', 'mouth_a'], // Alveolar - tongue touches teeth
  'kk': ['aa', 'mouth_a'], // Velar - back of tongue
  'CH': ['ou', 'mouth_u'], // Alveopalatal
  'SS': ['ih', 'mouth_i'], // Alveolar - teeth close
  'nn': ['aa', 'mouth_a'], // Alveolar nasal
  'RR': ['ou', 'mouth_u'], // Rhotic
  'aa': ['aa', 'mouth_a'], // Open A
  'E': ['E', 'mouth_e'],   // E sound
  'ih': ['ih', 'mouth_i'], // I sound
  'oh': ['oh', 'mouth_o'], // O sound
  'ou': ['ou', 'mouth_u'], // U sound
};

/**
 * Get VRM blend shape names for a viseme
 * @param viseme - Viseme name
 * @returns Array of possible VRM blend shape names
 */
export function getVRMBlendShapes(viseme: VisemeName): string[] {
  return VRM_VISEME_MAPPING[viseme] || VRM_VISEME_MAPPING['sil'];
}

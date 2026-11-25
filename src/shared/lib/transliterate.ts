/** Cyrillic to Latin, by the Ukrainian official rules; the few Russian-only letters are covered too. */
const LETTERS: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  ё: 'yo',
  ы: 'y',
  э: 'e',
  ъ: '',
}
/** These sound different at the start of a word. */
const WORD_START: Record<string, string> = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' }
/** An apostrophe inside a Cyrillic word is part of the word, not a break between two. */
const INNER_APOSTROPHE = /(?<=\p{Script=Cyrillic})['’ʼ](?=\p{Script=Cyrillic})/gu
const WORD = /\p{Script=Cyrillic}+/gu

function transliterateWord(word: string): string {
  let result = ''
  let previous = ''
  for (const [index, letter] of [...word].entries()) {
    const lower = letter.toLowerCase()
    // «зг» is written «zgh», so that it is not read as «ж» (zh).
    const latin =
      lower === 'г' && previous === 'з'
        ? 'gh'
        : ((index === 0 ? WORD_START[lower] : undefined) ?? LETTERS[lower] ?? letter)
    result += letter === lower ? latin : latin.charAt(0).toUpperCase() + latin.slice(1)
    previous = lower
  }
  return result
}

/** «Мої замовлення» becomes «Moi zamovlennia». Text that is not Cyrillic stays as it is. */
export const transliterate = (text: string) =>
  text.normalize('NFC').replace(INNER_APOSTROPHE, '').replace(WORD, transliterateWord)

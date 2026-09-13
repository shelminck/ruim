/** Fixed palette for avatarKleur — a small, deliberate set beats a free-form color picker. */
export const AVATAR_KLEUREN = [
  'accent-300',
  'accent-400',
  'accent-2-300',
  'accent-2-400',
  'neutral-300',
  'neutral-400',
] as const

export type AvatarKleur = (typeof AVATAR_KLEUREN)[number]

export function initiaal(naam: string): string {
  return naam.trim().charAt(0).toUpperCase()
}

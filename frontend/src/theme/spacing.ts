/** 4pt tabanlı boşluk ölçeği */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

/**
 * Yarıçap ölçeği. Kartlar (lg) daha yumuşak köşelere taşındı;
 * ara basamaklar da orantılı büyütüldü ki iç içe kutular
 * (kart > iç bölüm > ikon kutusu) aynı dili konuşsun.
 */
export const radius = {
  xs: 8,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const layout = {
  screenPadding: spacing.xl,
  cardPadding: spacing.lg,
  /** Kart içi bölümler arası dikey ritim */
  cardGap: spacing.md,
  tabBarHeight: 62,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export type Spacing = keyof typeof spacing;

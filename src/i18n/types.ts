import type { he } from './he';

// Hebrew defines the keys. Other languages must have the same keys, except Hebrew's dual-number plurals
// (`_two`), which languages without a dual never use.
type WithoutDual<T> = {
  [K in keyof T as K extends `${string}_two` ? never : K]: T[K] extends string ? string : WithoutDual<T[K]>;
};

export type Translation = WithoutDual<typeof he>;
export type Language = 'he' | 'en';

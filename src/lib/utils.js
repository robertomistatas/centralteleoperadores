/**
 * Utilidades para crear clases CSS con variantes
 * Compatible con shadcn/ui
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
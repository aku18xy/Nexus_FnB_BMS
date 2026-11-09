import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard utility to merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric currency value into standard Malaysian Ringgit (MYR) format
 * Example: 12.5 -> "RM 12.50"
 */
export function formatMYR(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

/**
 * Formats standard sen representation
 */
export function formatSen(amount: number): string {
  const sen = Math.round(amount * 100);
  return `${sen} sen`;
}

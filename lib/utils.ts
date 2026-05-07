import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(myr: number): string {
  return `RM ${myr.toLocaleString("en-MY")}`;
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

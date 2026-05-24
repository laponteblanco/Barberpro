/**
 * Type-safe Supabase query helpers.
 *
 * Because we use hand-written Database types (not generated via `supabase gen types`),
 * the Supabase JS client infers `never` for table rows. These helpers provide
 * convenient `as` casts to our domain types without scattering `as any` everywhere.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asRow<T>(data: any): T {
  return data as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asRows<T>(data: any): T[] {
  return (data ?? []) as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unwrap<T>(data: any): T {
  if (data === null || data === undefined) {
    throw new Error("Expected data but got null");
  }
  return data as T;
}

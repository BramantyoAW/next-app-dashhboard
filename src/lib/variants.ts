export interface AttributeRow {
  name: string;
  value: string;
}

/**
 * Generate SEMUA kombinasi varian (cartesian product) dari daftar atribut.
 * Atribut dikelompokkan per `name`; opsi = nilai unik per name.
 *
 * Contoh: [{Ukuran:250g},{Ukuran:500g},{Kemasan:Biji},{Kemasan:Bubuk}]
 *   → ["Ukuran:250g|Kemasan:Biji", "Ukuran:250g|Kemasan:Bubuk",
 *      "Ukuran:500g|Kemasan:Biji", "Ukuran:500g|Kemasan:Bubuk"]
 */
export function buildVariantCombinations(attributes: AttributeRow[]): string[] {
  const groups = new Map<string, string[]>();
  for (const a of attributes ?? []) {
    if (!a?.name || !a?.value) continue;
    const list = groups.get(a.name) ?? [];
    if (!list.includes(a.value)) list.push(a.value);
    groups.set(a.name, list);
  }

  const names = Array.from(groups.keys());
  if (names.length === 0) return [];

  let combos: string[][] = [[]];
  for (const name of names) {
    const values = groups.get(name)!;
    const next: string[][] = [];
    for (const prefix of combos) {
      for (const v of values) {
        next.push([...prefix, `${name}:${v}`]);
      }
    }
    combos = next;
  }

  return combos.map(parts => parts.join('|'));
}

/** Label ramah tampilan dari variant_key, mis. "Ukuran: 250g, Kemasan: Biji". */
export function formatVariantKey(key: string): string {
  return key
    .split('|')
    .map(p => p.replace(':', ': '))
    .join(', ');
}

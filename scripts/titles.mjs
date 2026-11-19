// Display titles for Fairshop packages (Kurt, 18 Nov 2026: the package words in title case, acronyms upper case).
export const ACR = { fba: 'FBA', map: 'MAP', sku: 'SKU', po: 'PO', '3pl': '3PL', gtin: 'GTIN' };
export const titleOf = (n) => n.split('-').map((w) => ACR[w] || w[0].toUpperCase() + w.slice(1)).join(' ');

// Run directly: set every agent README's first heading to "# <Title> (`<package>`)".
if (process.argv[1] && process.argv[1].endsWith('titles.mjs')) {
  const { readdirSync, readFileSync, writeFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages'); let n = 0;
  for (const p of readdirSync(PK).filter((x) => /^fairshop-(?!core$)/.test(x))) {
    const f = join(PK, p, 'README.md'); const s = readFileSync(f, 'utf8'); const next = s.replace(/^# .*$/m, `# ${titleOf(p)} (\`${p}\`)`);
    if (next !== s) { writeFileSync(f, next); n++; }
  }
  console.log(`${n} README title(s) updated`);
}

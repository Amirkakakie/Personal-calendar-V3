import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const localesDir = path.join(root, 'src', 'i18n', 'locales');
const sourceDir = path.join(root, 'src');
const locales = {
  fa: JSON.parse(fs.readFileSync(path.join(localesDir, 'fa.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8')),
};

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const fullKey = prefix ? prefix + '.' + key : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? flattenKeys(child, fullKey)
      : [fullKey];
  });
}

function collectSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [fullPath] : [];
  });
}

const localeKeys = Object.fromEntries(
  Object.entries(locales).map(([locale, dictionary]) => [locale, new Set(flattenKeys(dictionary))])
);
const faOnly = [...localeKeys.fa].filter((key) => !localeKeys.en.has(key));
const enOnly = [...localeKeys.en].filter((key) => !localeKeys.fa.has(key));
const errors = [];

if (faOnly.length || enOnly.length) {
  errors.push('Locale dictionaries do not have matching keys.');
  for (const key of faOnly) errors.push('  Missing from en.json: ' + key);
  for (const key of enOnly) errors.push('  Missing from fa.json: ' + key);
}

const keyPatterns = [
  /\bt\(\s*(['"])([^'"\n]+)\1/g,
  /\b(?:labelKey|titleKey|descriptionKey|subtitleKey)\s*:\s*(['"])([^'"\n]+)\1/g,
];

for (const file of collectSourceFiles(sourceDir)) {
  const source = fs.readFileSync(file, 'utf8');
  const referencedKeys = new Set();

  for (const pattern of keyPatterns) {
    for (const match of source.matchAll(pattern)) referencedKeys.add(match[2]);
  }

  for (const key of referencedKeys) {
    for (const locale of ['fa', 'en']) {
      if (!localeKeys[locale].has(key)) {
        errors.push(path.relative(root, file) + ': missing "' + key + '" in ' + locale + '.json');
      }
    }
  }
}

if (errors.length) {
  console.error('Translation validation failed:\n' + errors.join('\n'));
  process.exit(1);
}

console.log('Translation validation passed: ' + localeKeys.fa.size + ' matching keys; all static UI references exist in fa/en.');

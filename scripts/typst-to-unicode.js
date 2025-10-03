import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mapping of common Typst math symbols to Unicode
const typstToUnicode = {
  // Greek letters
  'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε',
  'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'iota': 'ι', 'kappa': 'κ',
  'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ', 'pi': 'π',
  'rho': 'ρ', 'sigma': 'σ', 'tau': 'τ', 'upsilon': 'υ', 'phi': 'φ',
  'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',

  // Capital Greek
  'Alpha': 'Α', 'Beta': 'Β', 'Gamma': 'Γ', 'Delta': 'Δ', 'Epsilon': 'Ε',
  'Zeta': 'Ζ', 'Eta': 'Η', 'Theta': 'Θ', 'Iota': 'Ι', 'Kappa': 'Κ',
  'Lambda': 'Λ', 'Mu': 'Μ', 'Nu': 'Ν', 'Xi': 'Ξ', 'Pi': 'Π',
  'Rho': 'Ρ', 'Sigma': 'Σ', 'Tau': 'Τ', 'Upsilon': 'Υ', 'Phi': 'Φ',
  'Chi': 'Χ', 'Psi': 'Ψ', 'Omega': 'Ω',

  // Common math sets
  'NN': 'ℕ', 'ZZ': 'ℤ', 'QQ': 'ℚ', 'RR': 'ℝ', 'CC': 'ℂ',

  // Operators and symbols
  'times': '×', 'div': '÷', 'pm': '±', 'mp': '∓',
  'sum': '∑', 'prod': '∏', 'integral': '∫',
  'partial': '∂', 'infinity': '∞', 'infty': '∞',
  'forall': '∀', 'exists': '∃', 'nexists': '∄',
  'emptyset': '∅', 'in': '∈', 'notin': '∉',
  'subset': '⊂', 'supset': '⊃', 'subseteq': '⊆', 'supseteq': '⊇',
  'cup': '∪', 'cap': '∩', 'setminus': '∖',
  'wedge': '∧', 'vee': '∨', 'neg': '¬',
  'implies': '⇒', 'iff': '⇔', 'therefore': '∴', 'because': '∵',
  'approx': '≈', 'equiv': '≡', 'neq': '≠', 'leq': '≤', 'geq': '≥',
  'll': '≪', 'gg': '≫', 'prec': '≺', 'succ': '≻',
  'sim': '∼', 'simeq': '≃', 'cong': '≅', 'propto': '∝',
  'perp': '⊥', 'parallel': '∥',
  'angle': '∠', 'triangle': '△', 'square': '□', 'diamond': '⋄',
  'star': '⋆', 'circ': '∘', 'bullet': '•',
  'nabla': '∇', 'sqrt': '√', 'cbrt': '∛',
  'degree': '°', 'prime': '′', 'dprime': '″',
  'aleph': 'ℵ', 'beth': 'ℶ', 'gimel': 'ℷ',

  // Arrows
  'arrow.r': '→', 'arrow.l': '←', 'arrow.t': '↑', 'arrow.b': '↓',
  'arrow.l.r': '↔', 'arrow.t.b': '↕',
  'Arrow.r': '⇒', 'Arrow.l': '⇐', 'Arrow.t': '⇑', 'Arrow.b': '⇓',
  'Arrow.l.r': '⇔', 'Arrow.t.b': '⇕',
  'arrow': '→', 'larr': '←', 'uarr': '↑', 'darr': '↓',
  'harr': '↔', 'lArr': '⇐', 'rArr': '⇒', 'hArr': '⇔',

  // Modifiers
  'tilde': '~', 'hat': '^', 'bar': '‾', 'dot': '·', 'ddot': '¨',
};

// Find all MDX files
async function findMdxFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMdxFiles(fullPath));
    } else if (entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Convert Typst math in headings to Unicode
function convertTypstInHeadings(content) {
  let modified = false;

  // Match headings (## text or ### text, etc.)
  const converted = content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, heading) => {
    // Check if heading contains Typst math $...$
    if (!heading.includes('$')) {
      return match;
    }

    let newHeading = heading;

    // Replace $...$ with Unicode equivalents
    newHeading = newHeading.replace(/\$([^$]+)\$/g, (mathMatch, mathContent) => {
      let unicode = mathContent.trim();

      // Try direct replacement from our mapping
      if (typstToUnicode[unicode]) {
        modified = true;
        return typstToUnicode[unicode];
      }

      // Try to replace parts of the content
      for (const [typst, uni] of Object.entries(typstToUnicode)) {
        // Match whole words or with common separators
        const regex = new RegExp(`\\b${typst.replace(/\./g, '\\.')}\\b`, 'g');
        if (regex.test(unicode)) {
          unicode = unicode.replace(regex, uni);
          modified = true;
        }
      }

      // If we modified it, return the unicode version, otherwise keep the $...$
      return modified ? unicode : mathMatch;
    });

    return `${hashes} ${newHeading}`;
  });

  return { converted, modified };
}

// Process a single file
async function processFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const { converted, modified } = convertTypstInHeadings(content);

  if (modified) {
    await writeFile(filePath, converted);
    return true;
  }

  return false;
}

// Main function
async function main() {
  console.log('🔍 Finding MDX files...');
  const contentDir = join(__dirname, '../src/content/docs');
  const mdxFiles = await findMdxFiles(contentDir);
  console.log(`Found ${mdxFiles.length} MDX files\n`);

  let modifiedCount = 0;

  for (const file of mdxFiles) {
    console.log(`📄 Processing: ${file}`);
    const modified = await processFile(file);

    if (modified) {
      modifiedCount++;
      console.log('  ✅ Converted Typst math to Unicode in headings');
    } else {
      console.log('  ⏭️  No Typst math in headings');
    }
  }

  console.log(`\n✨ Done! Modified ${modifiedCount} file(s)`);
}

main().catch(console.error);

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mapping of LaTeX commands to Unicode characters
const latexToUnicode = {
  // Greek letters (lowercase)
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\epsilon': 'ε',
  '\\zeta': 'ζ',
  '\\eta': 'η',
  '\\theta': 'θ',
  '\\iota': 'ι',
  '\\kappa': 'κ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\xi': 'ξ',
  '\\pi': 'π',
  '\\rho': 'ρ',
  '\\sigma': 'σ',
  '\\tau': 'τ',
  '\\upsilon': 'υ',
  '\\phi': 'φ',
  '\\chi': 'χ',
  '\\psi': 'ψ',
  '\\omega': 'ω',

  // Greek letters (uppercase)
  '\\Gamma': 'Γ',
  '\\Delta': 'Δ',
  '\\Theta': 'Θ',
  '\\Lambda': 'Λ',
  '\\Xi': 'Ξ',
  '\\Pi': 'Π',
  '\\Sigma': 'Σ',
  '\\Upsilon': 'Υ',
  '\\Phi': 'Φ',
  '\\Psi': 'Ψ',
  '\\Omega': 'Ω',

  // Arrows
  '\\rightarrow': '→',
  '\\leftarrow': '←',
  '\\leftrightarrow': '↔',
  '\\Rightarrow': '⇒',
  '\\Leftarrow': '⇐',
  '\\Leftrightarrow': '⇔',
  '\\to': '→',

  // Math operators
  '\\times': '×',
  '\\div': '÷',
  '\\pm': '±',
  '\\mp': '∓',
  '\\cdot': '·',

  // Relations
  '\\leq': '≤',
  '\\geq': '≥',
  '\\neq': '≠',
  '\\approx': '≈',
  '\\equiv': '≡',
  '\\sim': '∼',
  '\\cong': '≅',
  '\\in': '∈',
  '\\notin': '∉',
  '\\subset': '⊂',
  '\\supset': '⊃',
  '\\subseteq': '⊆',
  '\\supseteq': '⊇',

  // Logic
  '\\forall': '∀',
  '\\exists': '∃',
  '\\neg': '¬',
  '\\land': '∧',
  '\\lor': '∨',
  '\\implies': '⇒',
  '\\iff': '⇔',

  // Sets
  '\\emptyset': '∅',
  '\\cup': '∪',
  '\\cap': '∩',

  // Other
  '\\infty': '∞',
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\sum': '∑',
  '\\prod': '∏',
  '\\int': '∫',
  '\\sqrt': '√',
};

// Find all MDX files
async function findMdxFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMdxFiles(fullPath));
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Convert LaTeX in heading to Unicode
function convertHeadingLatex(line) {
  // Only process lines that are headings (start with #)
  if (!line.match(/^#{1,6}\s/)) {
    return line;
  }

  let converted = line;
  let changed = false;

  // Find all $...$ patterns in the heading
  const mathMatches = [...line.matchAll(/\$([^$]+)\$/g)];

  for (const match of mathMatches) {
    const mathContent = match[1];
    let unicodeContent = mathContent;

    // Replace each LaTeX command with Unicode
    for (const [latex, unicode] of Object.entries(latexToUnicode)) {
      if (unicodeContent.includes(latex)) {
        unicodeContent = unicodeContent.replaceAll(latex, unicode);
        changed = true;
      }
    }

    // Remove extra spaces and braces
    unicodeContent = unicodeContent.replace(/\{|\}/g, '').trim();

    // Replace the entire $...$ with the Unicode version
    converted = converted.replace(match[0], unicodeContent);
  }

  if (changed) {
    console.log(`  ✏️  ${line.trim()} → ${converted.trim()}`);
  }

  return converted;
}

// Process a single file
async function processFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;

  const newLines = lines.map(line => {
    const converted = convertHeadingLatex(line);
    if (converted !== line) {
      modified = true;
    }
    return converted;
  });

  if (modified) {
    await writeFile(filePath, newLines.join('\n'));
    return true;
  }

  return false;
}

// Main function
async function main() {
  console.log('🔍 Finding MDX/MD files...');
  const contentDir = join(__dirname, '../src/content/docs');
  const files = await findMdxFiles(contentDir);
  console.log(`Found ${files.length} files\n`);

  let modifiedCount = 0;

  for (const file of files) {
    console.log(`📄 Processing: ${file}`);
    const modified = await processFile(file);

    if (modified) {
      modifiedCount++;
      console.log('  ✅ Modified');
    } else {
      console.log('  ⏭️  No LaTeX in headings');
    }
    console.log();
  }

  console.log(`\n✨ Done! Modified ${modifiedCount} file(s)`);
}

main().catch(console.error);

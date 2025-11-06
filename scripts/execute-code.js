import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

// LaTeX to Unicode conversion map for Lean
const latexToUnicode = {
  // Greek letters
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
  '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
  '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  // Capital Greek letters
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
  '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  // Mathematical operators
  '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
  '\\cdot': '·', '\\circ': '∘', '\\ast': '∗', '\\star': '⋆',
  // Relations
  '\\le': '≤', '\\ge': '≥', '\\leq': '≤', '\\geq': '≥',
  '\\ne': '≠', '\\neq': '≠', '\\equiv': '≡', '\\approx': '≈',
  '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅', '\\propto': '∝',
  // Arrows
  '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←', '\\leftrightarrow': '↔',
  '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
  '\\mapsto': '↦', '\\longrightarrow': '⟶', '\\longleftarrow': '⟵',
  // Set theory
  '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
  '\\subseteq': '⊆', '\\supseteq': '⊇', '\\cup': '∪', '\\cap': '∩',
  '\\emptyset': '∅', '\\varnothing': '∅',
  // Logic
  '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄',
  '\\land': '∧', '\\lor': '∨', '\\lnot': '¬', '\\neg': '¬',
  '\\top': '⊤', '\\bot': '⊥',
  // Quantifiers and other
  '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
  '\\sum': '∑', '\\prod': '∏', '\\int': '∫',
  '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥',
  // Brackets
  '\\langle': '⟨', '\\rangle': '⟩', '\\lceil': '⌈', '\\rceil': '⌉',
  '\\lfloor': '⌊', '\\rfloor': '⌋',
  // Miscellaneous
  '\\ell': 'ℓ', '\\hbar': 'ℏ', '\\wp': '℘',
  '\\Re': 'ℜ', '\\Im': 'ℑ', '\\aleph': 'ℵ',
  '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮', '\\ddots': '⋱',
};

// Convert LaTeX symbols to Unicode
function convertLatexToUnicode(code) {
  let result = code;
  for (const [latex, unicode] of Object.entries(latexToUnicode)) {
    // Match latex command followed by space, non-letter, or end of string
    // We need to escape the backslash properly for regex
    const escapedLatex = latex.replace(/\\/g, '\\\\');
    const regex = new RegExp(escapedLatex + '(?![a-zA-Z])', 'g');
    result = result.replace(regex, unicode);
  }
  return result;
}

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

// Extract ExecutableCode blocks from MDX content
function extractCodeBlocks(content, filepath) {
  const blocks = [];

  // Get filename for auto-generated IDs
  const getFilename = () => {
    if (filepath) {
      const parts = filepath.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace(/\.mdx?$/, '');
    }
    return 'code';
  };

  let codeBlockCounter = 0;

  // Method 1: Match ExecutableCode components including attributes across multiple lines
  const componentRegex = /<ExecutableCode[\s\S]*?\/>/g;
  let match;

  while ((match = componentRegex.exec(content)) !== null) {
    const component = match[0];

    // Extract attributes
    const idMatch = component.match(/\bid=["']([^"']+)["']/);
    const langMatch = component.match(/\blanguage=["']([^"']+)["']/);
    const sessionMatch = component.match(/\bsession=["']([^"']+)["']/);
    const evalMatch = component.match(/\beval=["']([^"']+)["']/);
    const codeMatch = component.match(/code=\{`([\s\S]*?)`\}/);

    // Skip blocks with eval="false"
    if (evalMatch && evalMatch[1] === 'false') {
      continue;
    }

    if (idMatch && langMatch && codeMatch) {
      // Don't trim - preserve indentation
      const code = codeMatch[1];
      blocks.push({
        id: idMatch[1],
        language: langMatch[1],
        code: code,
        session: sessionMatch ? sessionMatch[1] : null,
        position: match.index
      });
    }
  }

  // Method 1.5: Match CodeWithOutput components wrapping code blocks
  const codeWithOutputRegex = /<CodeWithOutput[^>]*>([\s\S]*?)<\/CodeWithOutput>/g;

  while ((match = codeWithOutputRegex.exec(content)) !== null) {
    const wrapper = match[0];
    const innerContent = match[1];

    // Extract wrapper attributes
    const idMatch = wrapper.match(/\bid=["']([^"']+)["']/);
    const evalMatch = wrapper.match(/\beval=["']([^"']+)["']/);

    // Skip if eval="false"
    if (evalMatch && evalMatch[1] === 'false') {
      continue;
    }

    // Extract code block from inner content (it's a regular markdown code block)
    const codeBlockMatch = innerContent.match(/```(\w+)(?:\s+[^\n]*)?\n([\s\S]*?)```/);

    if (idMatch && codeBlockMatch) {
      const language = codeBlockMatch[1];
      const code = codeBlockMatch[2];
      // Remove only trailing newline, preserve indentation
      const cleanCode = code.replace(/\n$/, '');

      blocks.push({
        id: idMatch[1],
        language: language,
        code: cleanCode,
        session: null,
        position: match.index
      });
    }
  }

  // Method 2: Match ```code blocks with :language :id :session syntax
  const codeBlockRegex = /```code\s+([^\n]+)\n([\s\S]*?)```/g;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const meta = match[1];
    // Remove only trailing newline, preserve indentation
    const code = match[2].replace(/\n$/, '');

    // Extract :key value or :key "value" pairs
    const attributes = {};
    const attrRegex = /:(\w+)\s+"([^"]+)"|:(\w+)\s+(\S+)/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(meta)) !== null) {
      const key = attrMatch[1] || attrMatch[3];
      const value = attrMatch[2] || attrMatch[4];
      attributes[key] = value;
    }

    // Skip blocks with eval=false
    if (attributes.eval === 'false') {
      continue;
    }

    const language = attributes.language || 'python';
    const session = attributes.session || null;

    // Always auto-generate ID (same logic as remark plugin)
    codeBlockCounter++;
    const filename = getFilename();
    const id = `${filename}-${codeBlockCounter}`;

    blocks.push({
      id,
      language,
      code,
      session,
      position: match.index
    });
  }

  // Sort blocks by position to maintain order
  blocks.sort((a, b) => a.position - b.position);

  return blocks;
}

// Execute Python code
async function executePython(code) {
  try {
    // Create temporary file to handle multiline code properly
    const tmpFile = `/tmp/temp_${Date.now()}.py`;
    await writeFile(tmpFile, code);
    const { stdout, stderr } = await execAsync(`python3 ${tmpFile}`);
    return stdout || stderr;
  } catch (error) {
    return `Error: ${error.stderr || error.message}`;
  }
}

// Split Lean code into statements intelligently
function splitLeanStatements(code) {
  const lines = code.split('\n');
  const statements = [];
  let currentStatement = [];
  let inMultiLineStatement = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine.length === 0) {
      continue;
    }

    // Check if this line starts a multi-line statement
    // (def, theorem, example, inductive, structure, class, instance, etc.)
    const startsStatement = /^(def|theorem|example|lemma|axiom|inductive|structure|class|instance|namespace|section|variable|open)\s/.test(trimmedLine);

    // Check if this line is a command (#check, #eval, etc.)
    const isCommand = /^#/.test(trimmedLine);

    if (isCommand) {
      // Commands are single-line statements
      if (currentStatement.length > 0) {
        statements.push(currentStatement.join('\n'));
        currentStatement = [];
      }
      statements.push(line);
      inMultiLineStatement = false;
    } else if (startsStatement) {
      // Save previous statement if exists
      if (currentStatement.length > 0) {
        statements.push(currentStatement.join('\n'));
        currentStatement = [];
      }
      currentStatement.push(line);
      inMultiLineStatement = true;
    } else if (inMultiLineStatement) {
      // Continue multi-line statement
      currentStatement.push(line);

      // Check if this line ends the statement (not indented or starts new statement)
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const endsStatement = nextLine.length === 0 || /^(def|theorem|example|lemma|#|axiom|inductive|structure|class|instance)/.test(nextLine);

      if (endsStatement) {
        statements.push(currentStatement.join('\n'));
        currentStatement = [];
        inMultiLineStatement = false;
      }
    } else {
      // Standalone line (continuation or expression)
      currentStatement.push(line);
    }
  }

  // Add any remaining statement
  if (currentStatement.length > 0) {
    statements.push(currentStatement.join('\n'));
  }

  return statements.filter(s => s.trim().length > 0);
}

// Execute Lean4 code statement by statement
// skipStatements: number of statements from the beginning to skip in output (for session continuations)
async function executeLean4(code, skipStatements = 0) {
  try {
    // Convert LaTeX symbols to Unicode
    const convertedCode = convertLatexToUnicode(code);

    // Split code into statements intelligently
    const statements = splitLeanStatements(convertedCode);

    // If there's only one statement and nothing to skip, execute as before
    if (statements.length === 1 && skipStatements === 0) {
      const tmpFile = `/tmp/temp_${Date.now()}.lean`;
      const codeWithOptions = 'set_option linter.all false\n' + convertedCode;
      await writeFile(tmpFile, codeWithOptions);
      const { stdout, stderr } = await execAsync(`lean ${tmpFile} 2>&1`);
      return (stderr || stdout || '').trim();
    }

    // Execute statements cumulatively and collect individual outputs
    const results = [];
    let accumulatedCode = '';
    let previousOutput = '';

    // Prepend option to disable all linter warnings
    const linterDisable = 'set_option linter.all false';

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      // Add this statement to accumulated code
      accumulatedCode += (accumulatedCode ? '\n' : '') + statement;

      // Execute the accumulated code with linter disabled
      const tmpFile = `/tmp/temp_${Date.now()}.lean`;
      const codeWithOptions = linterDisable + '\n' + accumulatedCode;
      await writeFile(tmpFile, codeWithOptions);

      try {
        const { stdout, stderr } = await execAsync(`lean ${tmpFile} 2>&1`);
        const currentOutput = (stderr || stdout || '').trim();

        // Extract only the new output (difference from previous execution)
        let newOutput = null;
        if (i === 0) {
          // First statement - use all output
          newOutput = currentOutput || null;
        } else if (currentOutput) {
          // For statements after the first, we need to extract only relevant output
          const prevLines = previousOutput.split('\n');
          const currLines = currentOutput.split('\n');

          const newLines = [];
          let j = 0; // Index for current output
          let k = 0; // Index for previous output

          // Compare line by line
          while (j < currLines.length) {
            const currLine = currLines[j];

            // Check if this line references a specific line number
            const lineNumMatch = currLine.match(/\.lean:(\d+):/);

            if (lineNumMatch) {
              const lineNum = parseInt(lineNumMatch[1]);
              // Only include if it references the current statement's line (i+2, because line 1 is set_option)
              if (lineNum === i + 2) {
                newLines.push(currLine);
                // Also capture following lines that are part of the same message
                j++;
                while (j < currLines.length && !currLines[j].match(/\.lean:\d+:/) && !currLines[j].match(/^[a-zA-Z].*:.*:.*$/)) {
                  newLines.push(currLines[j]);
                  j++;
                }
                continue;
              }
            }

            // For lines without line numbers (like #check output), check if it's new
            if (k < prevLines.length && currLine === prevLines[k]) {
              // Line exists in previous output, skip it
              k++;
            } else {
              // This is a new line
              newLines.push(currLine);
            }

            j++;
          }

          newOutput = newLines.length > 0 ? newLines.join('\n').trim() : null;
        }

        results.push({
          statement: statement.trim(),
          output: newOutput
        });

        previousOutput = currentOutput;
      } catch (error) {
        const currentOutput = (error.stderr || error.stdout || error.message).trim();

        // Extract only new errors
        let newOutput = null;
        if (i === 0) {
          // First statement - use all output
          newOutput = currentOutput || null;
        } else if (currentOutput) {
          // For statements after the first, we need to extract only relevant output
          const prevLines = previousOutput.split('\n');
          const currLines = currentOutput.split('\n');

          const newLines = [];
          let j = 0; // Index for current output
          let k = 0; // Index for previous output

          // Compare line by line
          while (j < currLines.length) {
            const currLine = currLines[j];

            // Check if this line references a specific line number
            const lineNumMatch = currLine.match(/\.lean:(\d+):/);

            if (lineNumMatch) {
              const lineNum = parseInt(lineNumMatch[1]);
              // Only include if it references the current statement's line (i+2, because line 1 is set_option)
              if (lineNum === i + 2) {
                newLines.push(currLine);
                // Also capture following lines that are part of the same message
                j++;
                while (j < currLines.length && !currLines[j].match(/\.lean:\d+:/) && !currLines[j].match(/^[a-zA-Z].*:.*:.*$/)) {
                  newLines.push(currLines[j]);
                  j++;
                }
                continue;
              }
            }

            // For lines without line numbers (like #check output), check if it's new
            if (k < prevLines.length && currLine === prevLines[k]) {
              // Line exists in previous output, skip it
              k++;
            } else {
              // This is a new line
              newLines.push(currLine);
            }

            j++;
          }

          newOutput = newLines.length > 0 ? newLines.join('\n').trim() : null;
        }

        results.push({
          statement: statement.trim(),
          output: newOutput
        });

        previousOutput = currentOutput;
      }
    }

    // Return results as JSON, skipping the first N statements if requested
    const resultsToReturn = results.slice(skipStatements);
    return JSON.stringify(resultsToReturn);
  } catch (error) {
    // Return error in the same format
    return JSON.stringify([{
      statement: code.trim(),
      output: (error.stderr || error.stdout || error.message).trim()
    }]);
  }
}

// Execute Rust code
async function executeRust(code) {
  try {
    // Create temporary file
    const tmpFile = `/tmp/temp_${Date.now()}.rs`;
    await writeFile(tmpFile, code);
    const { stdout, stderr } = await execAsync(`rustc ${tmpFile} -o /tmp/rust_out_${Date.now()} && /tmp/rust_out_${Date.now()}`);
    return stdout || stderr;
  } catch (error) {
    return `Error: ${error.stderr || error.message}`;
  }
}

// Execute Nix code
async function executeNix(code) {
  try {
    // Create temporary file
    const tmpFile = `/tmp/temp_${Date.now()}.nix`;
    await writeFile(tmpFile, code);
    // Use --strict to fully evaluate thunks
    const { stdout, stderr } = await execAsync(`nix-instantiate --eval --strict ${tmpFile}`);
    return stdout || stderr;
  } catch (error) {
    return `Error: ${error.stderr || error.message}`;
  }
}

// Execute code based on language
async function executeCode(language, code, skipStatements = 0) {
  switch (language.toLowerCase()) {
    case 'python':
    case 'py':
      return await executePython(code);
    case 'lean4':
    case 'lean':
      return await executeLean4(code, skipStatements);
    case 'rust':
    case 'rs':
      return await executeRust(code);
    case 'nix':
      return await executeNix(code);
    default:
      return `Unsupported language: ${language}`;
  }
}

// Main function
async function main() {
  console.log('🔍 Finding MDX files...');
  const contentDir = join(__dirname, '../src/content/docs');
  const mdxFiles = await findMdxFiles(contentDir);
  console.log(`Found ${mdxFiles.length} MDX files`);

  const outputs = {};
  const sessions = {}; // Track session code accumulation

  for (const file of mdxFiles) {
    console.log(`\n📄 Processing: ${file}`);
    const content = await readFile(file, 'utf-8');
    const blocks = extractCodeBlocks(content, file);

    if (blocks.length === 0) {
      console.log('  No executable code blocks found');
      continue;
    }

    console.log(`  Found ${blocks.length} code block(s)`);

    // Get filename without extension for prefixing
    const filename = file.split('/').pop().replace('.mdx', '');

    // Clear sessions for this file
    const fileSessions = {};
    const sessionStatementCounts = {}; // Track statement counts per session

    for (const block of blocks) {
      // Create prefixed ID with filename
      const prefixedId = `${filename}::${block.id}`;

      console.log(`  ⚙️  Executing block: ${block.id} → ${prefixedId} (${block.language})${block.session ? ` [session: ${block.session}]` : ''}`);

      let codeToExecute = block.code;
      let skipStatements = 0;

      // Handle session accumulation
      if (block.session) {
        const sessionKey = `${file}::${block.session}::${block.language}`;
        if (!fileSessions[sessionKey]) {
          fileSessions[sessionKey] = [];
          sessionStatementCounts[sessionKey] = 0;
        }

        // Track how many statements were in previous blocks
        skipStatements = sessionStatementCounts[sessionKey];

        fileSessions[sessionKey].push(block.code);

        // Concatenate all code in this session
        codeToExecute = fileSessions[sessionKey].join('\n\n');
        console.log(`    📦 Session has ${fileSessions[sessionKey].length} block(s), skipping first ${skipStatements} statement(s)`);

        // Update statement count for this session (for Lean only)
        if (block.language === 'lean4' || block.language === 'lean') {
          const convertedCode = convertLatexToUnicode(block.code);
          const statementsInThisBlock = splitLeanStatements(convertedCode).length;
          sessionStatementCounts[sessionKey] += statementsInThisBlock;
        }
      }

      // Pass skipStatements to executeCode for Lean
      const output = await executeCode(block.language, codeToExecute, skipStatements);
      outputs[prefixedId] = output.trim();
      console.log(`  ✅ Output: ${output.trim().substring(0, 50)}...`);
    }
  }

  // Save outputs to JSON
  const outputFile = join(__dirname, '../src/code-outputs.json');
  await writeFile(outputFile, JSON.stringify(outputs, null, 2));
  console.log(`\n✨ Outputs saved to ${outputFile}`);
  console.log(`📊 Total blocks executed: ${Object.keys(outputs).length}`);
}

main().catch(console.error);

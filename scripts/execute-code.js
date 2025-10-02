import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

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
function extractCodeBlocks(content) {
  const blocks = [];

  // Method 1: Match ExecutableCode components including attributes across multiple lines
  const componentRegex = /<ExecutableCode[\s\S]*?\/>/g;
  let match;

  while ((match = componentRegex.exec(content)) !== null) {
    const component = match[0];

    // Extract attributes
    const idMatch = component.match(/\bid=["']([^"']+)["']/);
    const langMatch = component.match(/\blanguage=["']([^"']+)["']/);
    const sessionMatch = component.match(/\bsession=["']([^"']+)["']/);
    const codeMatch = component.match(/code=\{`([\s\S]*?)`\}/);

    if (idMatch && langMatch && codeMatch) {
      blocks.push({
        id: idMatch[1],
        language: langMatch[1],
        code: codeMatch[1].trim(),
        session: sessionMatch ? sessionMatch[1] : null,
        position: match.index
      });
    }
  }

  // Method 2: Match ```code blocks with :language :id :session syntax
  const codeBlockRegex = /```code\s+([^\n]+)\n([\s\S]*?)```/g;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const meta = match[1];
    const code = match[2].trim();

    // Extract :key value or :key "value" pairs
    const attributes = {};
    const attrRegex = /:(\w+)\s+"([^"]+)"|:(\w+)\s+(\S+)/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(meta)) !== null) {
      const key = attrMatch[1] || attrMatch[3];
      const value = attrMatch[2] || attrMatch[4];
      attributes[key] = value;
    }

    const language = attributes.language || 'python';
    const id = attributes.id || null;
    const session = attributes.session || null;

    if (id) {
      blocks.push({
        id,
        language,
        code,
        session,
        position: match.index
      });
    }
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

// Execute Lean4 code
async function executeLean4(code) {
  try {
    // Create temporary file
    const tmpFile = `/tmp/temp_${Date.now()}.lean`;
    await writeFile(tmpFile, code);
    const { stdout, stderr } = await execAsync(`lean ${tmpFile}`);
    return stderr || stdout;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Execute code based on language
async function executeCode(language, code) {
  switch (language.toLowerCase()) {
    case 'python':
    case 'py':
      return await executePython(code);
    case 'lean4':
    case 'lean':
      return await executeLean4(code);
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
    const blocks = extractCodeBlocks(content);

    if (blocks.length === 0) {
      console.log('  No executable code blocks found');
      continue;
    }

    console.log(`  Found ${blocks.length} code block(s)`);

    // Clear sessions for this file
    const fileSessions = {};

    for (const block of blocks) {
      console.log(`  ⚙️  Executing block: ${block.id} (${block.language})${block.session ? ` [session: ${block.session}]` : ''}`);

      let codeToExecute = block.code;

      // Handle session accumulation
      if (block.session) {
        const sessionKey = `${file}::${block.session}::${block.language}`;
        if (!fileSessions[sessionKey]) {
          fileSessions[sessionKey] = [];
        }
        fileSessions[sessionKey].push(block.code);

        // Concatenate all code in this session
        codeToExecute = fileSessions[sessionKey].join('\n\n');
        console.log(`    📦 Session has ${fileSessions[sessionKey].length} block(s)`);
      }

      const output = await executeCode(block.language, codeToExecute);
      outputs[block.id] = output.trim();
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

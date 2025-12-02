import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

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

// Convert ```code blocks to <ExecutableCode> components
function convertCodeBlocks(content) {
  // Match ```code blocks with attributes
  const regex = /```code\s+([^\n]+)\n([\s\S]*?)```/g;
  let modified = false;

  const converted = content.replace(regex, (match, meta, code) => {
    // Extract attributes
    const attributes = {};
    const attrRegex = /:(\w+)\s+"([^"]+)"|:(\w+)\s+(\S+)/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(meta)) !== null) {
      const key = attrMatch[1] || attrMatch[3];
      const value = attrMatch[2] || attrMatch[4];
      attributes[key] = value;
    }

    const language = attributes.language || 'python';
    const id = attributes.id;
    const session = attributes.session;

    if (!id) {
      // Skip blocks without id
      return match;
    }

    modified = true;

    // Build component
    const props = [`language="${language}"`];
    if (id) props.push(`id="${id}"`);
    if (session) props.push(`session="${session}"`);
    props.push(`code={\`${code}\`}`);

    return `<ExecutableCode\n  ${props.join('\n  ')}\n/>`;
  });

  return { converted, modified };
}

// Calculate relative import path from MDX file to component
function getRelativeImportPath(filePath) {
  // Get the directory of the MDX file
  const fileDir = dirname(filePath);

  // Target component path (absolute)
  const componentPath = join(__dirname, '../src/components/ExecutableCode.astro');

  // Calculate relative path
  let relativePath = relative(fileDir, componentPath);

  // Ensure the path uses forward slashes (for consistency across platforms)
  relativePath = relativePath.replace(/\\/g, '/');

  // Ensure the path starts with './' if it doesn't start with '../'
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  return relativePath;
}

// Process a single file
async function processFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const { converted, modified } = convertCodeBlocks(content);

  if (modified) {
    // Check if import already exists
    const hasImport = content.includes("import ExecutableCode from");

    let finalContent = converted;
    if (!hasImport) {
      // Add import after frontmatter
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        const afterFrontmatter = frontmatterEnd + 3;
        const importPath = getRelativeImportPath(filePath);
        finalContent =
          converted.substring(0, afterFrontmatter) +
          `\nimport ExecutableCode from '${importPath}';\n` +
          converted.substring(afterFrontmatter);
      }
    }

    await writeFile(filePath, finalContent);
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
      console.log('  ✅ Converted ```code blocks to <ExecutableCode>');
    } else {
      console.log('  ⏭️  No ```code blocks found');
    }
  }

  console.log(`\n✨ Done! Modified ${modifiedCount} file(s)`);
}

main().catch(console.error);

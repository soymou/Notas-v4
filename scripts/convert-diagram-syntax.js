import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
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

// Convert ```diagram blocks to <TypstDiagram> components
function convertDiagramBlocks(content) {
  // Match ```diagram blocks with optional attributes
  // But skip if inside ````markdown blocks (4 backticks)
  const regex = /(?<!``)```diagram\s*([^\n]*)\n([\s\S]*?)```(?!``)/g;
  let modified = false;

  const converted = content.replace(regex, (match, meta, code) => {
    // Extract attributes
    const attributes = {};

    // Match attributes like :scale 2 or :nodePadding "(80pt, 60pt)"
    const attrRegex = /:(\w+)\s+"([^"]+)"|:(\w+)\s+(\S+)/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(meta)) !== null) {
      const key = attrMatch[1] || attrMatch[3];
      const value = attrMatch[2] || attrMatch[4];
      attributes[key] = value;
    }

    modified = true;

    // Build component props
    const props = [];

    // Handle numeric props (scale)
    if (attributes.scale) {
      props.push(`scale={${attributes.scale}}`);
    }

    // Handle string props
    if (attributes.width) {
      props.push(`width="${attributes.width}"`);
    }
    if (attributes.height) {
      props.push(`height="${attributes.height}"`);
    }
    if (attributes.nodePadding) {
      props.push(`nodePadding="${attributes.nodePadding}"`);
    }
    if (attributes.arrClearance) {
      props.push(`arrClearance="${attributes.arrClearance}"`);
    }
    if (attributes.padding) {
      props.push(`padding="${attributes.padding}"`);
    }
    if (attributes.debug) {
      props.push(`debug={${attributes.debug}}`);
    }

    // Add code prop
    props.push(`code={\`${code.trim()}\`}`);

    // Build component
    if (props.length === 1) {
      // Only code prop, single line
      return `<TypstDiagram ${props[0]} />`;
    } else {
      // Multiple props, multi-line
      return `<TypstDiagram ${props.join(' ')} />`;
    }
  });

  return { converted, modified };
}

// Process a single file
async function processFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const { converted, modified } = convertDiagramBlocks(content);

  if (modified) {
    // Check if import already exists
    const hasImport = content.includes("import TypstDiagram from");

    let finalContent = converted;
    if (!hasImport) {
      // Add import after frontmatter
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        const afterFrontmatter = frontmatterEnd + 3;
        finalContent =
          converted.substring(0, afterFrontmatter) +
          "\nimport TypstDiagram from '../../../components/TypstDiagram.astro';\n" +
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
      console.log('  ✅ Converted ```diagram blocks to <TypstDiagram>');
    } else {
      console.log('  ⏭️  No ```diagram blocks found');
    }
  }

  console.log(`\n✨ Done! Modified ${modifiedCount} file(s)`);
}

main().catch(console.error);

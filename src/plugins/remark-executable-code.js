import { visit } from 'unist-util-visit';
import { relative, dirname } from 'path';

export function remarkExecutableCode() {
  return (tree, file) => {
    let hasExecutableCode = false;
    const nodesToReplace = [];
    let codeBlockCounter = 0;

    // Extract filename from file path for auto-generated IDs
    const getFilename = () => {
      if (file.history && file.history.length > 0) {
        const path = file.history[0];
        const parts = path.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.mdx?$/, '');
      }
      return 'code';
    };

    // Calculate relative import path from MDX file to component
    const getRelativeImportPath = () => {
      if (file.history && file.history.length > 0) {
        const filePath = file.history[0];
        const fileDir = dirname(filePath);

        // Find the src directory in the path
        const srcIndex = filePath.indexOf('/src/');
        if (srcIndex !== -1) {
          const srcPath = filePath.substring(0, srcIndex + 4); // +4 to include '/src'
          const componentPath = srcPath + '/components/ExecutableCode.astro';

          // Calculate relative path
          let relativePath = relative(fileDir, componentPath);

          // Ensure forward slashes
          relativePath = relativePath.replace(/\\/g, '/');

          // Ensure proper prefix
          if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
          }

          return relativePath;
        }
      }
      // Fallback to original path
      return '../../../components/ExecutableCode.astro';
    };

    visit(tree, 'code', (node, index, parent) => {
      // Check if the code block has lang="code"
      if (node.lang !== 'code') {
        return;
      }

      // Skip if parent is not a valid container
      if (!parent || !Array.isArray(parent.children)) {
        return;
      }

      // Parse the meta string for attributes
      const meta = node.meta || '';
      const attributes = {};

      // Extract :key value or :key "value" pairs
      const attrRegex = /:(\w+)\s+"([^"]+)"|:(\w+)\s+(\S+)/g;
      let match;

      while ((match = attrRegex.exec(meta)) !== null) {
        const key = match[1] || match[3];
        const value = match[2] || match[4];
        // Remove quotes from values if present
        attributes[key] = value.replace(/^["']|["']$/g, '');
      }

      // If language is specified in meta, use it; otherwise default to python
      const language = attributes.language || 'python';

      // Always auto-generate ID (user should not control this)
      codeBlockCounter++;
      const filename = getFilename();
      const id = `${filename}-${codeBlockCounter}`;

      const session = attributes.session || null;
      const filenameAttr = attributes.filename || null;
      const evalCode = attributes.eval !== 'false'; // Default to true unless explicitly set to false

      // Escape special characters for JavaScript string literal
      // We'll use JSON.stringify to properly escape the string while preserving formatting
      const escapedCode = JSON.stringify(node.value);

      // Store the replacement info instead of modifying immediately
      nodesToReplace.push({
        index,
        parent,
        replacement: {
          type: 'mdxJsxFlowElement',
          name: 'ExecutableCode',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'language',
              value: language,
            },
            id && {
              type: 'mdxJsxAttribute',
              name: 'id',
              value: id,
            },
            session && {
              type: 'mdxJsxAttribute',
              name: 'session',
              value: session,
            },
            filenameAttr && {
              type: 'mdxJsxAttribute',
              name: 'filename',
              value: filenameAttr,
            },
            !evalCode && {
              type: 'mdxJsxAttribute',
              name: 'eval',
              value: 'false',
            },
            {
              type: 'mdxJsxAttribute',
              name: 'code',
              value: {
                type: 'mdxJsxAttributeValueExpression',
                value: escapedCode,
                data: {
                  estree: {
                    type: 'Program',
                    sourceType: 'module',
                    body: [
                      {
                        type: 'ExpressionStatement',
                        expression: {
                          type: 'Literal',
                          value: node.value,
                          raw: escapedCode,
                        },
                      },
                    ],
                  },
                },
              },
            },
          ].filter(Boolean),
          children: [],
        }
      });

      hasExecutableCode = true;
    });

    // Only apply replacements if we found executable code blocks
    if (hasExecutableCode) {
      // Replace nodes (in reverse order to maintain indices)
      for (let i = nodesToReplace.length - 1; i >= 0; i--) {
        const { index, parent, replacement } = nodesToReplace[i];
        parent.children[index] = replacement;
      }
    }

    // Add import statement if we found any executable code blocks
    if (hasExecutableCode) {
      const importPath = getRelativeImportPath();
      tree.children.unshift({
        type: 'mdxjsEsm',
        value: `import ExecutableCode from '${importPath}';`,
        data: {
          estree: {
            type: 'Program',
            sourceType: 'module',
            body: [
              {
                type: 'ImportDeclaration',
                specifiers: [
                  {
                    type: 'ImportDefaultSpecifier',
                    local: { type: 'Identifier', name: 'ExecutableCode' },
                  },
                ],
                source: {
                  type: 'Literal',
                  value: importPath,
                  raw: `'${importPath}'`,
                },
              },
            ],
          },
        },
      });
    }
  };
}

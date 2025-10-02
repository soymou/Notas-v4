import { visit } from 'unist-util-visit';

export function remarkExecutableCode() {
  return (tree, file) => {
    let hasExecutableCode = false;
    const nodesToReplace = [];

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
        attributes[key] = value;
      }

      // If language is specified in meta, use it; otherwise default to python
      const language = attributes.language || 'python';
      const id = attributes.id || null;
      const session = attributes.session || null;

      // Escape special characters for JavaScript template literal
      // For raw: escape backslashes and backticks, and ${ to \${
      const rawEscaped = node.value
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');

      // For cooked: just the original value (JavaScript will interpret it)
      const cookedValue = node.value;

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
            {
              type: 'mdxJsxAttribute',
              name: 'code',
              value: {
                type: 'mdxJsxAttributeValueExpression',
                value: `\`${rawEscaped}\``,
                data: {
                  estree: {
                    type: 'Program',
                    sourceType: 'module',
                    body: [
                      {
                        type: 'ExpressionStatement',
                        expression: {
                          type: 'TemplateLiteral',
                          quasis: [
                            {
                              type: 'TemplateElement',
                              value: {
                                raw: rawEscaped,
                                cooked: cookedValue,
                              },
                              tail: true,
                            },
                          ],
                          expressions: [],
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
      tree.children.unshift({
        type: 'mdxjsEsm',
        value: "import ExecutableCode from '../../../components/ExecutableCode.astro';",
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
                  value: '../../../components/ExecutableCode.astro',
                  raw: "'../../../components/ExecutableCode.astro'",
                },
              },
            ],
          },
        },
      });
    }
  };
}

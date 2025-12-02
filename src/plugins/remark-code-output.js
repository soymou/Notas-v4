import { visit } from 'unist-util-visit';

export function remarkCodeOutput() {
  return (tree, file) => {
    let hasCodeWithOutput = false;
    const nodesToWrap = [];
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

    visit(tree, 'code', (node, index, parent) => {
      // Only process code blocks with meta that includes :exec
      const meta = node.meta || '';
      if (!meta.includes(':exec')) {
        return;
      }

      // Skip if parent is not a valid container
      if (!parent || !Array.isArray(parent.children)) {
        return;
      }

      // Parse the meta string for attributes
      const attributes = {};
      const attrRegex = /:(\w+)(?:\s+"([^"]+)"|\s+(\S+))?/g;
      let match;

      while ((match = attrRegex.exec(meta)) !== null) {
        const key = match[1];
        const value = match[2] || match[3] || 'true';
        attributes[key] = value.replace(/^["']|["']$/g, '');
      }

      // Auto-generate ID if not provided
      let id = attributes.id;
      if (!id) {
        codeBlockCounter++;
        const filename = getFilename();
        id = `${filename}-${codeBlockCounter}`;
      }

      const evalCode = attributes.eval !== 'false';

      // Remove :exec and related attributes from meta to clean up the display
      let cleanMeta = meta;
      cleanMeta = cleanMeta.replace(/:exec\s*(\S+)?/g, '');
      cleanMeta = cleanMeta.replace(/:id\s+"[^"]+"/g, '');
      cleanMeta = cleanMeta.replace(/:id\s+\S+/g, '');
      cleanMeta = cleanMeta.replace(/:eval\s+"[^"]+"/g, '');
      cleanMeta = cleanMeta.replace(/:eval\s+\S+/g, '');
      cleanMeta = cleanMeta.trim();

      // Update the node's meta
      node.meta = cleanMeta || null;

      // Store the wrapping info
      nodesToWrap.push({
        index,
        parent,
        id,
        evalCode
      });

      hasCodeWithOutput = true;
    });

    // Wrap nodes (in reverse order to maintain indices)
    for (let i = nodesToWrap.length - 1; i >= 0; i--) {
      const { index, parent, id, evalCode } = nodesToWrap[i];
      const codeNode = parent.children[index];

      // Create wrapper component
      const wrapper = {
        type: 'mdxJsxFlowElement',
        name: 'CodeWithOutput',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'id',
            value: id,
          },
          !evalCode && {
            type: 'mdxJsxAttribute',
            name: 'eval',
            value: 'false',
          },
        ].filter(Boolean),
        children: [codeNode],
      };

      parent.children[index] = wrapper;
    }

    // Add import statement if we found any code blocks with output
    if (hasCodeWithOutput) {
      tree.children.unshift({
        type: 'mdxjsEsm',
        value: "import CodeWithOutput from '../../../components/CodeWithOutput.astro';",
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
                    local: { type: 'Identifier', name: 'CodeWithOutput' },
                  },
                ],
                source: {
                  type: 'Literal',
                  value: '../../../components/CodeWithOutput.astro',
                  raw: "'../../../components/CodeWithOutput.astro'",
                },
              },
            ],
          },
        },
      });
    }
  };
}

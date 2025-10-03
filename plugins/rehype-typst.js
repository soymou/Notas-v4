import { visit } from 'unist-util-visit';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';

let compilerInstance;

async function renderTypstToSVG(code, displayMode = false) {
  const compiler = compilerInstance || (compilerInstance = NodeCompiler.create());

  const template = displayMode
    ? `#set page(height: auto, width: auto, margin: 0pt)\n$ ${code} $`
    : `#set page(height: auto, width: auto, margin: 0pt)\n$${code}$`;

  const docRes = compiler.compile({ mainFileContent: template });

  if (!docRes.result) {
    const diags = compiler.fetchDiagnostics(docRes.takeDiagnostics());
    throw new Error(`Typst compilation failed: ${JSON.stringify(diags)}`);
  }

  const svg = compiler.svg(docRes.result);
  compiler.evictCache(10);

  return svg;
}

export default function rehypeTypstCustom() {
  return async (tree) => {
    const promises = [];

    visit(tree, 'element', (node, index, parent) => {
      // Look for inline code with our class markers
      if (node.tagName === 'code') {
        const classes = node.properties?.className || [];
        const isMathInline = classes.includes('typst-math-inline');
        const isMathDisplay = classes.includes('typst-math-display');

        if (isMathInline || isMathDisplay) {
          const processNode = async () => {
            let code = node.children[0]?.value || '';

            if (!code || code.trim() === '') {
              return;
            }

            // Unescape HTML entities
            code = code
              .replace(/&#123;/g, '{')
              .replace(/&#125;/g, '}');

            // Convert smart quotes to straight quotes
            code = code.replace(/[\u201C\u201D]/g, '"');
            code = code.replace(/[\u2018\u2019]/g, "'");

            const isDisplayMode = isMathDisplay;

            try {
              const svg = await renderTypstToSVG(code, isDisplayMode);
              const root = fromHtmlIsomorphic(svg, { fragment: true });
              const svgNode = root.children[0];

              if (svgNode) {
                const height = parseFloat(svgNode.properties['dataHeight'] || '11');
                const width = parseFloat(svgNode.properties['dataWidth'] || '11');
                const defaultEm = 11;

                svgNode.properties.height = `${height / defaultEm}em`;
                svgNode.properties.width = `${width / defaultEm}em`;

                if (isDisplayMode) {
                  node.tagName = 'div';
                  node.properties = { className: ['typst-display'] };
                  node.children = [svgNode];
                } else {
                  node.tagName = 'span';
                  node.properties = { className: ['typst-inline'] };
                  node.children = [svgNode];
                }
              }
            } catch (error) {
              console.error('Typst rendering error:', error);
              node.children = [{
                type: 'text',
                value: `[Typst Error: ${error.message}]`
              }];
            }
          };

          promises.push(processNode());
        }
      }
    });

    await Promise.all(promises);
  };
}

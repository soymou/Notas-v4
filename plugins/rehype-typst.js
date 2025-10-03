import { visit } from 'unist-util-visit';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';

let compilerInstance;

async function renderTypstToSVG(code, displayMode = false, isCodeBlock = false) {
  const compiler = compilerInstance || (compilerInstance = NodeCompiler.create());

  let template;
  if (isCodeBlock) {
    // For code blocks, don't wrap in $ $, user provides complete Typst code
    template = `#import "@preview/commute:0.3.0": node, arr, commutative-diagram\n#set page(height: auto, width: auto, margin: 0pt)\n${code}`;
  } else if (displayMode) {
    template = `#import "@preview/commute:0.3.0": node, arr, commutative-diagram\n#set page(height: auto, width: auto, margin: 0pt)\n$ ${code} $`;
  } else {
    template = `#import "@preview/commute:0.3.0": node, arr, commutative-diagram\n#set page(height: auto, width: auto, margin: 0pt)\n$${code}$`;
  }

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
      // Look for custom typst block divs
      if (node.tagName === 'div' && node.properties?.dataTypstBlock !== undefined && parent) {
        const processNode = async () => {
          // Get the text content from all text children
          let code = '';
          const collectText = (n) => {
            if (n.type === 'text') {
              code += n.value;
            } else if (n.children) {
              n.children.forEach(collectText);
            }
          };
          node.children.forEach(collectText);

          code = code.trim();
          console.log('Typst block code:', code);

          if (!code) {
            return;
          }

          try {
            const svg = await renderTypstToSVG(code, false, true);
            const root = fromHtmlIsomorphic(svg, { fragment: true });
            const svgNode = root.children[0];

            if (svgNode) {
              const height = parseFloat(svgNode.properties['dataHeight'] || '11');
              const width = parseFloat(svgNode.properties['dataWidth'] || '11');
              const defaultEm = 11;

              svgNode.properties.height = `${height / defaultEm}em`;
              svgNode.properties.width = `${width / defaultEm}em`;

              // Replace the div with a typst-display div containing the SVG
              parent.children[index] = {
                type: 'element',
                tagName: 'div',
                properties: { className: ['typst-display'] },
                children: [svgNode]
              };
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
        return;
      }

      // Look for code blocks with language-typst class (inside pre tags)
      if (node.tagName === 'pre' && parent) {
        const codeNode = node.children?.find(child => child.type === 'element' && child.tagName === 'code');
        if (codeNode) {
          const classes = codeNode.properties?.className || [];
          if (classes.includes('language-typst')) {
            // Process the typst code block
            const processNode = async () => {
              let code = codeNode.children[0]?.value || '';

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

              try {
                const svg = await renderTypstToSVG(code, false, true);
                const root = fromHtmlIsomorphic(svg, { fragment: true });
                const svgNode = root.children[0];

                if (svgNode) {
                  const height = parseFloat(svgNode.properties['dataHeight'] || '11');
                  const width = parseFloat(svgNode.properties['dataWidth'] || '11');
                  const defaultEm = 11;

                  svgNode.properties.height = `${height / defaultEm}em`;
                  svgNode.properties.width = `${width / defaultEm}em`;

                  // Replace the pre node with a div containing the SVG
                  parent.children[index] = {
                    type: 'element',
                    tagName: 'div',
                    properties: { className: ['typst-display'] },
                    children: [svgNode]
                  };
                }
              } catch (error) {
                console.error('Typst rendering error:', error);
                codeNode.children = [{
                  type: 'text',
                  value: `[Typst Error: ${error.message}]`
                }];
              }
            };

            promises.push(processNode());
            return;
          }
        }
      }

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
              const svg = await renderTypstToSVG(code, isDisplayMode, false);
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

import { visit } from 'unist-util-visit';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';

let compilerInstance;

function appendStyle(existing, extra) {
  if (!extra) return existing;
  if (!existing || existing.length === 0) return extra;

  const trimmed = `${existing}`.trim();
  const needsSemicolon = trimmed.length > 0 && !trimmed.endsWith(';');
  return `${trimmed}${needsSemicolon ? ';' : ''}${extra}`;
}

function detectPercentWidth(source = '') {
  // Check for width: X% pattern (for set page or show rules)
  let match = source.match(/width\s*:\s*\(?\s*([0-9]+(?:\.[0-9]+)?)\s*%/i);
  if (match) return match[1];

  // Check for image(..., width: X%) pattern
  match = source.match(/image\s*\([^)]*width\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*%/i);
  if (match) return match[1];

  return null;
}

function formatNumber(value) {
  return Number.isFinite(value) ? Number.parseFloat(value.toFixed(6)) : value;
}

function adjustFontSizes(node, scaleVar) {
  const fontSizeRegex = /font-size\s*:\s*([0-9.]+)([a-z%]+)/i;

  const visitNode = (current) => {
    if (!current || typeof current !== 'object') return;

    const style = current.properties?.style;
    if (style && style.includes('font-size')) {
      current.properties.style = style.replace(fontSizeRegex, (match, value, unit) => {
        if (match.includes('calc(')) return match;
        return `font-size: calc(${value}${unit} / ${scaleVar})`;
      });
    }

    if (current.children) {
      current.children.forEach(visitNode);
    }
  };

  visitNode(node);
}

async function renderTypstToSVG(
  code,
  {
    displayMode = false,
    isCodeBlock = false,
    importsString = '',
    pageWidth = 'auto'
  } = {}
) {
  const compiler = compilerInstance || (compilerInstance = NodeCompiler.create());

  let template;
  // Only add imports to code blocks, not to math expressions (inline/display)
  const imports = (isCodeBlock && importsString) ? `${importsString}\n` : '';

  if (isCodeBlock) {
    // For code blocks, user provides complete Typst code
    // Add margin to prevent cutoff at edges
    template = `${imports}#set page(height: auto, width: ${pageWidth}, margin: (top: 5pt, bottom: 5pt, left: 0pt, right: 0pt))\n${code}`;
  } else if (displayMode) {
    template = `#set page(height: auto, width: ${pageWidth}, margin: (top: 5pt, bottom: 5pt, left: 0pt, right: 0pt))\n$ ${code} $`;
  } else {
    template = `#set page(height: auto, width: ${pageWidth}, margin: (top: 5pt, bottom: 5pt, left: 0pt, right: 0pt))\n$${code}$`;
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

async function compileToSvgNode(code, options, { allowFallback = true } = {}) {
  const firstSvg = await renderTypstToSVG(code, options);
  let root = fromHtmlIsomorphic(firstSvg, { fragment: true });
  let svgNode = root.children?.[0];
  let usedFallback = false;

  const needsFallback = (node) => {
    if (!node || !node.properties) return true;
    const rawWidth = node.properties['dataWidth'] ?? node.properties.width;
    const numericWidth = rawWidth !== undefined ? parseFloat(rawWidth) : NaN;
    return Number.isNaN(numericWidth) || numericWidth <= 0;
  };

  if (allowFallback && needsFallback(svgNode)) {
    const fallbackSvg = await renderTypstToSVG(code, { ...options, pageWidth: '1em' });
    root = fromHtmlIsomorphic(fallbackSvg, { fragment: true });
    svgNode = root.children?.[0];
    usedFallback = true;
  }

  return { svgNode, usedFallback };
}

export default function rehypeTypstCustom() {
  return async (tree, file) => {
    const promises = [];

    // Get Typst imports from frontmatter
    const typstImports = file.data?.astro?.frontmatter?.typstImports || [];
    const importsString = Array.isArray(typstImports) ? typstImports.join('\n') : typstImports;

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
            const percentWidth = detectPercentWidth(code);
            // If we have a percentage width, we need to give Typst a concrete page width in em units
            // Using a larger width to avoid cutting off content like lists
            const pageWidth = percentWidth ? '200em' : 'auto';
            const { svgNode, usedFallback } = await compileToSvgNode(
              code,
              { isCodeBlock: true, importsString, pageWidth }
            );

            if (svgNode) {
              const height = parseFloat(svgNode.properties['dataHeight'] || '11');
              const width = parseFloat(svgNode.properties['dataWidth'] || '11');
              const defaultEm = 11;
              const widthEm = formatNumber(width / defaultEm);
              const heightEm = formatNumber(height / defaultEm);

              let fluid = usedFallback;
              let wrapperStyle = '';
              const scaleVar = 'var(--typst-scale)';

              if (percentWidth) {
                fluid = true;
                svgNode.properties.width = `${widthEm}em`;
                svgNode.properties.height = `${heightEm}em`;
                svgNode.properties.style = appendStyle(
                  svgNode.properties.style,
                  'width:100%;height:auto;max-width:100%;'
                );
                svgNode.properties['data-typst-width-percent'] = percentWidth;
                // Don't adjust font sizes - the image is already rendered at the correct size
                // The wrapper width should be 100% (since the image is already at the desired percentage of the page)
                wrapperStyle = appendStyle(
                  '',
                  `width:100%;`
                );
              } else if (usedFallback) {
                svgNode.properties.width = '100%';
                delete svgNode.properties.height;
                svgNode.properties.style = appendStyle(svgNode.properties.style, 'width:100%;height:auto;');
                svgNode.properties['data-typst-fallback'] = 'page-width-1em';
              } else {
                // Don't set explicit height, let it scale naturally
                svgNode.properties.width = `${widthEm}em`;
                delete svgNode.properties.height;
                svgNode.properties.style = appendStyle(svgNode.properties.style, 'max-width:100%;height:auto;');
              }

              const wrapperClasses = ['typst-display'];
              if (fluid) {
                wrapperClasses.push('typst-fluid');
              }

              // Replace the div with a typst-display div containing the SVG
              const wrapperProperties = { className: wrapperClasses };
              if (wrapperStyle) {
                wrapperProperties.style = wrapperStyle;
              }
              parent.children[index] = {
                type: 'element',
                tagName: 'div',
                properties: wrapperProperties,
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
            // Check if eval is disabled
            if (classes.includes('typst-no-eval')) {
              return; // Skip processing, just show the code
            }

            // Process the typst code block
            const processNode = async () => {
              let code = codeNode.children[0]?.value || '';

              if (!code || code.trim() === '') {
                return;
              }

              // Unescape HTML entities (in reverse order of escaping)
              code = code
                .replace(/&#95;/g, '_')
                .replace(/&quot;/g, '"')
                .replace(/&#123;/g, '{')
                .replace(/&#125;/g, '}')
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&amp;/g, '&');

              // Convert smart quotes to straight quotes
              code = code.replace(/[\u201C\u201D]/g, '"');
              code = code.replace(/[\u2018\u2019]/g, "'");

              // Get alignment from code node properties
              const alignment = codeNode.properties?.dataAlign || 'center';

              try {
                const percentWidth = detectPercentWidth(code);
                // If we have a percentage width, we need to give Typst a concrete page width in em units
                // Using a larger width to avoid cutting off content like lists
                const pageWidth = percentWidth ? '200em' : 'auto';
                const { svgNode, usedFallback } = await compileToSvgNode(
                  code,
                  { isCodeBlock: true, importsString, pageWidth }
                );

                if (svgNode) {
                  const height = parseFloat(svgNode.properties['dataHeight'] || '11');
                  const width = parseFloat(svgNode.properties['dataWidth'] || '11');
                  const defaultEm = 11;
                  const widthEm = formatNumber(width / defaultEm);
                  const heightEm = formatNumber(height / defaultEm);

                  let fluid = usedFallback;
                  let wrapperStyle = '';
                  const scaleVar = 'var(--typst-scale)';

                  if (percentWidth) {
                    fluid = true;
                    svgNode.properties.width = `${widthEm}em`;
                    svgNode.properties.height = `${heightEm}em`;
                    svgNode.properties.style = appendStyle(
                      svgNode.properties.style,
                      'width:100%;height:auto;max-width:100%;'
                    );
                    svgNode.properties['data-typst-width-percent'] = percentWidth;
                    // Don't adjust font sizes - the image is already rendered at the correct size
                    // The wrapper width should be 100% (since the image is already at the desired percentage of the page)
                    wrapperStyle = appendStyle(
                      '',
                      `width:100%;`
                    );
                  } else if (usedFallback) {
                    svgNode.properties.width = '100%';
                    delete svgNode.properties.height;
                    svgNode.properties.style = appendStyle(svgNode.properties.style, 'width:100%;height:auto;');
                    svgNode.properties['data-typst-fallback'] = 'page-width-1em';
                  } else {
                    // Don't set explicit height, let it scale naturally
                    svgNode.properties.width = `${widthEm}em`;
                    delete svgNode.properties.height;
                    svgNode.properties.style = appendStyle(svgNode.properties.style, 'max-width:100%;height:auto;');
                  }

                  const wrapperClasses = ['typst-display', `typst-align-${alignment}`];
                  if (fluid) {
                    wrapperClasses.push('typst-fluid');
                  }

                  // Replace the pre node with a div containing the SVG
                  const wrapperProperties = { className: wrapperClasses };
                  if (wrapperStyle) {
                    wrapperProperties.style = wrapperStyle;
                  }
                  parent.children[index] = {
                    type: 'element',
                    tagName: 'div',
                    properties: wrapperProperties,
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

            // Unescape HTML entities (in reverse order of escaping)
            code = code
              .replace(/&#95;/g, '_')
              .replace(/&quot;/g, '"')
              .replace(/&#123;/g, '{')
              .replace(/&#125;/g, '}')
              .replace(/&gt;/g, '>')
              .replace(/&lt;/g, '<')
              .replace(/&amp;/g, '&');

            // Convert smart quotes to straight quotes
            code = code.replace(/[\u201C\u201D]/g, '"');
            code = code.replace(/[\u2018\u2019]/g, "'");

            const isDisplayMode = isMathDisplay;

            try {
              const svg = await renderTypstToSVG(code, {
                displayMode: isDisplayMode,
                importsString
              });
              const root = fromHtmlIsomorphic(svg, { fragment: true });
              const svgNode = root.children[0];

              if (svgNode) {
                const height = parseFloat(svgNode.properties['dataHeight'] || '11');
                const width = parseFloat(svgNode.properties['dataWidth'] || '11');
                const defaultEm = 11;

                svgNode.properties.height = `${height / defaultEm}em`;
                svgNode.properties.width = `${width / defaultEm}em`;
                if (isDisplayMode) {
                  svgNode.properties.style = appendStyle(svgNode.properties.style, 'max-width:100%;height:auto;');
                }

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

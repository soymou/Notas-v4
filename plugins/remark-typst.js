import { visit } from 'unist-util-visit';

/**
 * Process a single text string and extract math expressions
 */
function processTextNode(text) {
  if (!text.includes('$')) return [{ type: 'text', value: text }];

  const newNodes = [];
  let lastIndex = 0;

  const regex = /\$\$?([\s\S]+?)\$\$?/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const content = match[1];
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatch.length;

    // Add text before match
    if (matchStart > lastIndex) {
      newNodes.push({
        type: 'text',
        value: text.slice(lastIndex, matchStart)
      });
    }

    // Determine if display mode
    const isDoubleDollar = fullMatch.startsWith('$$');
    const hasSpaces = /^\s+[\s\S]*\s+$/.test(content);
    const isDisplay = isDoubleDollar || hasSpaces;
    const cleanContent = content.trim();

    // Escape curly braces for MDX
    const escaped = cleanContent
      .replace(/\{/g, '&#123;')
      .replace(/\}/g, '&#125;');

    // Create inline code node with class marker
    newNodes.push({
      type: 'inlineCode',
      value: escaped,
      data: {
        hProperties: {
          className: [isDisplay ? 'typst-math-display' : 'typst-math-inline']
        }
      }
    });

    lastIndex = matchEnd;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    newNodes.push({
      type: 'text',
      value: text.slice(lastIndex)
    });
  }

  return newNodes;
}

/**
 * Remark plugin to detect Typst math syntax and mark it for processing
 * - $math$ (no spaces) → inline
 * - $ math $ (with spaces) → display
 * - ```typst code ``` → typst code block
 * Handles multi-line by processing at paragraph level
 */
export default function remarkTypstMath() {
  return (tree) => {
    // First pass: process code blocks with language 'typst'
    visit(tree, 'code', (node) => {
      if (node.lang === 'typst' || node.lang?.startsWith('typst')) {
        // Check for eval parameter in meta (e.g., ```typst eval=false)
        const evalParam = node.meta?.match(/eval\s*=\s*(\w+)/);
        const shouldEval = !evalParam || evalParam[1] !== 'false';

        // Mark the code block for Typst processing
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.className = shouldEval ? ['language-typst'] : ['language-typst', 'typst-no-eval'];
      }
    });

    // Second pass: process text nodes inside strong/emphasis
    visit(tree, ['strong', 'emphasis'], (node) => {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === 'text' && child.value.includes('$')) {
          const newNodes = processTextNode(child.value);
          if (newNodes.length > 1) {
            node.children.splice(i, 1, ...newNodes);
            i += newNodes.length - 1;
          }
        }
      }
    });

    // Third pass: process paragraphs to concatenate text across line breaks
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === null) return;

      // Concatenate all text content from the paragraph
      let fullText = '';
      const childMap = [];

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const startPos = fullText.length;

        if (child.type === 'text') {
          fullText += child.value;
          childMap.push({ start: startPos, end: fullText.length, child, index: i });
        } else {
          // Non-text node (like strong, emphasis) - use placeholder
          fullText += '\0';
          childMap.push({ start: startPos, end: startPos + 1, child, index: i });
        }
      }

      // Check if paragraph contains any math
      if (!fullText.includes('$')) return;

      const newChildren = [];
      let lastIndex = 0;

      // Match $...$ patterns (use [\s\S] to match newlines)
      const regex = /\$\$?([\s\S]+?)\$\$?/g;
      let match;

      while ((match = regex.exec(fullText)) !== null) {
        const fullMatch = match[0];
        const content = match[1];
        const matchStart = match.index;
        const matchEnd = matchStart + fullMatch.length;

        // Add all children/text between lastIndex and matchStart
        for (const item of childMap) {
          // Skip if before our window
          if (item.end <= lastIndex) continue;
          // Stop if after our window
          if (item.start >= matchStart) break;

          if (item.child.type === 'text') {
            // Calculate what portion of this text node to include
            const textStart = Math.max(0, lastIndex - item.start);
            const textEnd = Math.min(item.child.value.length, matchStart - item.start);
            const portion = item.child.value.slice(textStart, textEnd);

            if (portion) {
              newChildren.push({ type: 'text', value: portion });
            }
          } else if (fullText[item.start] !== '\0') {
            // Non-text node within range
            newChildren.push(item.child);
          } else if (item.start >= lastIndex && item.end <= matchStart) {
            // Placeholder node fully within range
            newChildren.push(item.child);
          }
        }

        // Determine if display mode (has spaces after $ and before $)
        const isDoubleDollar = fullMatch.startsWith('$$');
        const hasSpaces = /^\s+[\s\S]*\s+$/.test(content);
        const isDisplay = isDoubleDollar || hasSpaces;
        const cleanContent = content.trim();

        // Escape curly braces for MDX
        const escaped = cleanContent
          .replace(/\{/g, '&#123;')
          .replace(/\}/g, '&#125;');

        // Create inline code node with class marker
        newChildren.push({
          type: 'inlineCode',
          value: escaped,
          data: {
            hProperties: {
              className: [isDisplay ? 'typst-math-display' : 'typst-math-inline']
            }
          }
        });

        lastIndex = matchEnd;
      }

      // Add remaining children after last math
      for (const item of childMap) {
        if (item.end <= lastIndex) continue;

        if (item.child.type === 'text') {
          const textStart = Math.max(0, lastIndex - item.start);
          const portion = item.child.value.slice(textStart);

          if (portion) {
            newChildren.push({ type: 'text', value: portion });
          }
        } else if (item.start >= lastIndex) {
          newChildren.push(item.child);
        }
      }

      // Replace paragraph children if we found math
      if (newChildren.length > 0) {
        node.children = newChildren;
      }
    });
  };
}

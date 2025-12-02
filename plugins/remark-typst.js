import { visit } from 'unist-util-visit';

/**
 * Remark plugin to detect Typst math syntax and mark it for processing
 * - $math$ (no spaces) → inline
 * - $ math $ (with spaces) → display
 * - ```typst code ``` → typst code block
 */

function extractParam(meta, paramName, defaultValue) {
  const match = meta?.match(new RegExp(`${paramName}\\s+(\\w+)`));
  return match ? match[1] : defaultValue;
}

function shouldEvaluate(meta) {
  const evalParam = meta?.match(/eval\s+(\w+)/);
  return !evalParam || evalParam[1] !== 'false';
}

function buildTextMap(children) {
  let fullText = '';
  const nodeMap = [];

  for (const child of children) {
    const startPos = fullText.length;
    if (child.type === 'text') {
      fullText += child.value;
      nodeMap.push({ startPos, endPos: fullText.length, node: child, type: 'text' });
    } else {
      fullText += '\uFFFC'; // Object replacement character
      nodeMap.push({ startPos, endPos: fullText.length, node: child, type: 'node' });
    }
  }

  return { fullText, nodeMap };
}

function tokenize(fullText, nodeMap) {
  const tokens = [];
  let i = 0;

  while (i < fullText.length) {
    const char = fullText[i];

    if (char === '$') {
      let dollarCount = 0;
      while (i < fullText.length && fullText[i] === '$') {
        dollarCount++;
        i++;
      }
      tokens.push({ type: 'delim', value: '$'.repeat(dollarCount), pos: i - dollarCount });
    } else if (char === '\uFFFC') {
      const mapping = nodeMap.find(m => m.startPos === i);
      tokens.push({ type: 'node', node: mapping?.node, pos: i });
      i++;
    } else {
      let text = '';
      while (i < fullText.length && fullText[i] !== '$' && fullText[i] !== '\uFFFC') {
        text += fullText[i++];
      }
      tokens.push({ type: 'text', value: text, pos: i - text.length });
    }
  }

  return tokens;
}

function findMatchingDelimiter(tokens, startIdx, delimLen) {
  for (let j = startIdx + 1; j < tokens.length; j++) {
    if (tokens[j].type === 'delim' && tokens[j].value.length === delimLen) {
      return j;
    }
  }
  return -1;
}

function extractTextRecursive(node) {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.type === 'emphasis' || node.type === 'strong') {
    const innerText = node.children.map(extractTextRecursive).join('');
    return node.type === 'emphasis' ? `_${innerText}_` : `**${innerText}**`;
  }
  return '';
}

function collectContent(tokens, startIdx, endIdx, nodeMap) {
  let content = '';
  for (let j = startIdx; j < endIdx; j++) {
    const t = tokens[j];
    if (t.type === 'text' || t.type === 'delim') {
      content += t.value;
    } else if (t.type === 'node') {
      // Check if it's an emphasis or strong node - if so, reconstruct the underscores
      const mapping = nodeMap.find(m => m.startPos === t.pos);
      if (mapping && (mapping.node.type === 'emphasis' || mapping.node.type === 'strong')) {
        content += extractTextRecursive(mapping.node);
      } else {
        return null; // Other non-text nodes inside math are invalid
      }
    }
  }
  return content;
}

function createMathNode(content, delimLen) {
  const isDoubleDollar = delimLen === 2;
  const hasSpaces = /^\s+[\s\S]*\s+$/.test(content);
  const isDisplay = isDoubleDollar || hasSpaces;
  const cleanContent = content.trim();

  // Escape special characters that MDX might interpret
  const escaped = cleanContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/"/g, '&quot;')
    .replace(/_/g, '&#95;');

  return {
    type: 'inlineCode',
    value: escaped,
    data: {
      hProperties: {
        className: [isDisplay ? 'typst-math-display' : 'typst-math-inline']
      }
    }
  };
}

function processTokens(tokens, nodeMap) {
  const newChildren = [];
  let idx = 0;

  while (idx < tokens.length) {
    const token = tokens[idx];

    if (token.type === 'delim') {
      const closeIdx = findMatchingDelimiter(tokens, idx, token.value.length);

      if (closeIdx === -1) {
        newChildren.push({ type: 'text', value: token.value });
        idx++;
        continue;
      }

      const content = collectContent(tokens, idx + 1, closeIdx, nodeMap);

      if (content === null) {
        newChildren.push({ type: 'text', value: token.value });
        idx++;
        continue;
      }

      newChildren.push(createMathNode(content, token.value.length));
      idx = closeIdx + 1;
    } else if (token.type === 'node') {
      newChildren.push(token.node);
      idx++;
    } else {
      newChildren.push({ type: 'text', value: token.value });
      idx++;
    }
  }

  return newChildren;
}

export default function remarkTypstMath() {
  return (tree) => {
    // Process code blocks with language 'typst'
    visit(tree, 'code', (node) => {
      if (node.lang === 'typst' || node.lang?.startsWith('typst')) {
        const shouldEval = shouldEvaluate(node.meta);
        const alignment = extractParam(node.meta, ':align', 'center');

        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.className = shouldEval ? ['language-typst'] : ['language-typst', 'typst-no-eval'];
        node.data.hProperties.dataAlign = alignment;
      }
    });

    // Process paragraphs
    visit(tree, 'paragraph', (node) => {
      const { fullText, nodeMap } = buildTextMap(node.children);

      if (!fullText.includes('$')) return;

      const tokens = tokenize(fullText, nodeMap);
      const newChildren = processTokens(tokens, nodeMap);

      if (newChildren.length > 0) {
        node.children = newChildren;
      }
    });
  };
}

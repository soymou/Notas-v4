# Typst Plugins for Astro/Starlight

This directory contains custom remark and rehype plugins for rendering Typst code and math expressions in Astro/Starlight projects.

## Overview

The Typst integration consists of two plugins that work together to process Typst syntax in markdown files and convert it to SVG:

1. **`remark-typst.js`** - Processes markdown AST to identify Typst code blocks and math expressions
2. **`rehype-typst.js`** - Compiles identified Typst code to SVG using the Typst compiler

## Installation

### Dependencies

```bash
npm install @myriaddreamin/typst-ts-node-compiler unist-util-visit hast-util-from-html-isomorphic
```

### Configuration

Add the plugins to your `astro.config.mjs`:

```js
import remarkTypst from "./plugins/remark-typst.js";
import rehypeTypst from "./plugins/rehype-typst.js";

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkTypst],
    rehypePlugins: [rehypeTypst],
  },
  // ... rest of config
});
```

## Features

### 1. Inline Math

Use `$...$` for inline math (no spaces inside) and `$ ... $` (with spaces) for display math:

```markdown
Inline math: The natural numbers $NN$ and integers $ZZ$.

Display math: $ x = (-b plus.minus sqrt(b^2 - 4a c))/(2a) $
```

### 2. Code Blocks

Use fenced code blocks with the `typst` language to write full Typst code:

````markdown
```typst
#import "@preview/cetz:0.2.2": canvas, draw

#canvas({
  draw.line((0, 0), (1, 1))
  draw.circle((0.5, 0.5), radius: 0.3)
})
```
````

### 3. Disable Execution

Use the `eval=false` parameter to show code without rendering:

````markdown
```typst eval=false
#import "@preview/curryst:0.5.1": rule, prooftree

#prooftree(
  rule(
    $Gamma tack.r f(a): B$,
    $Gamma tack.r a: A$,
    $Gamma tack.r f: A arrow.r B$
  )
)
```
````

### 4. Frontmatter Imports

Add Typst imports to your page frontmatter to avoid repeating them in every code block:

```yaml
---
title: My Page
typstImports:
  - '#import "@preview/commute:0.3.0": node, arr, commutative-diagram'
  - '#import "@preview/cetz:0.2.2": canvas, draw'
---
```

All Typst code blocks on that page will automatically have these imports available.

**Note:** Frontmatter imports only apply to code blocks (` ```typst `), not to inline math expressions.

## How It Works

### remark-typst.js

This plugin runs during the markdown parsing phase and:

1. **Detects Typst code blocks** (` ```typst `) and marks them with the `language-typst` class
2. **Checks for `eval=false`** parameter and adds `typst-no-eval` class if present
3. **Processes inline math** (`$...$`) and display math (`$ ... $`) in paragraphs and text nodes
4. **Escapes curly braces** for MDX compatibility
5. **Marks math expressions** with `typst-math-inline` or `typst-math-display` classes

### rehype-typst.js

This plugin runs during the HTML generation phase and:

1. **Retrieves frontmatter imports** from `file.data.astro.frontmatter.typstImports`
2. **Compiles Typst code** to SVG using `@myriaddreamin/typst-ts-node-compiler`
3. **Skips compilation** for blocks marked with `typst-no-eval`
4. **Prepends imports** to code blocks (not to inline math)
5. **Wraps output** in appropriate containers (`typst-inline`, `typst-display`)
6. **Sets SVG dimensions** based on Typst's output

### Processing Pipeline

```
Markdown → remark-typst → MDAST with markers → rehype-typst → HTML with SVG
```

1. User writes Typst syntax in markdown
2. `remark-typst.js` identifies and marks Typst content
3. Markdown is converted to HTML
4. `rehype-typst.js` compiles marked nodes to SVG
5. Final HTML includes rendered Typst as SVG

## Styling

Add CSS to style the rendered Typst elements:

```css
/* Inline math */
.typst-inline {
  display: inline-block;
  vertical-align: middle;
}

.typst-inline svg {
  display: inline-block;
  width: auto !important;
}

/* Display math */
.typst-display {
  display: block;
  text-align: center;
  margin: 1em 0;
}

.typst-display svg {
  width: auto !important;
  max-width: 100%;
  display: inline-block;
}

/* Dark mode support */
:root[data-theme='dark'] .typst-display > svg,
:root[data-theme='dark'] .typst-inline > svg {
  filter: invert(1);
}
```

## Examples

### Commutative Diagram

````markdown
```typst
#import "@preview/commute:0.3.0": node, arr, commutative-diagram

#commutative-diagram(
  node((0, 0), $A$),
  node((0, 1), $B$),
  node((1, 0), $C$),
  arr((0, 0), (0, 1), $f$),
  arr((0, 0), (1, 0), $g$),
  arr((0, 1), (1, 0), $h$)
)
```
````

### Proof Tree

````markdown
```typst
#import "@preview/curryst:0.5.1": rule, prooftree

#prooftree(
  rule(
    name: "app",
    $Gamma tack.r f(a): B$,
    $Gamma tack.r a: A$,
    $Gamma tack.r f: A arrow.r B$
  )
)
```
````

### Chemical Formulas

```markdown
Water molecule: $H_2 O$

Glucose: $C_6 H_(12) O_6$
```

## Error Handling

Both plugins include error handling:

- **Compilation errors** are caught and displayed as error messages in the output
- **Invalid Typst syntax** will show Typst's diagnostic messages
- **Missing imports** will be reported by the Typst compiler

## Performance

The Typst compiler instance is cached and reused across compilations:

```js
let compilerInstance;
const compiler = compilerInstance || (compilerInstance = NodeCompiler.create());
```

The compiler cache is periodically evicted to prevent memory issues:

```js
compiler.evictCache(10);
```

## Troubleshooting

### Math not rendering

- Check that `$` delimiters are properly closed
- For display math, ensure spaces: `$ expression $` not `$expression$`
- Verify curly braces are being escaped for MDX

### Code blocks not executing

- Ensure the language is specified as `typst`
- Check that `eval=false` is not set when you want execution
- Verify frontmatter imports are formatted correctly (array of strings)

### Import errors

- Frontmatter imports only work for code blocks, not inline math
- Verify package names and versions in imports
- Check that imports are in an array format in YAML

## License

These plugins are part of the project and follow the same license.

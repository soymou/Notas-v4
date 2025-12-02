import { visit } from 'unist-util-visit';

// LaTeX to Unicode conversion map
const latexToUnicode = {
  // Greek letters
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
  '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
  '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  // Capital Greek letters
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
  '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  // Mathematical operators
  '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
  '\\cdot': '·', '\\circ': '∘', '\\ast': '∗', '\\star': '⋆',
  // Relations
  '\\le': '≤', '\\ge': '≥', '\\leq': '≤', '\\geq': '≥',
  '\\ne': '≠', '\\neq': '≠', '\\equiv': '≡', '\\approx': '≈',
  '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅', '\\propto': '∝',
  // Arrows
  '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←', '\\leftrightarrow': '↔',
  '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
  '\\mapsto': '↦', '\\longrightarrow': '⟶', '\\longleftarrow': '⟵',
  // Set theory
  '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
  '\\subseteq': '⊆', '\\supseteq': '⊇', '\\cup': '∪', '\\cap': '∩',
  '\\emptyset': '∅', '\\varnothing': '∅',
  // Logic
  '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄',
  '\\land': '∧', '\\lor': '∨', '\\lnot': '¬', '\\neg': '¬',
  '\\top': '⊤', '\\bot': '⊥',
  // Quantifiers and other
  '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
  '\\sum': '∑', '\\prod': '∏', '\\int': '∫',
  '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥',
  // Brackets
  '\\langle': '⟨', '\\rangle': '⟩', '\\lceil': '⌈', '\\rceil': '⌉',
  '\\lfloor': '⌊', '\\rfloor': '⌋',
  // Miscellaneous
  '\\ell': 'ℓ', '\\hbar': 'ℏ', '\\wp': '℘',
  '\\Re': 'ℜ', '\\Im': 'ℑ', '\\aleph': 'ℵ',
  '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮', '\\ddots': '⋱',
};

// Convert LaTeX symbols to Unicode
function convertLatexToUnicode(text) {
  let result = text;
  for (const [latex, unicode] of Object.entries(latexToUnicode)) {
    // Match latex command followed by space, non-letter, or end of string
    const escapedLatex = latex.replace(/\\/g, '\\\\');
    const regex = new RegExp(escapedLatex + '(?![a-zA-Z])', 'g');
    result = result.replace(regex, unicode);
  }
  return result;
}

/**
 * Remark plugin to convert LaTeX symbols to Unicode in inline code
 */
export default function remarkLatexUnicode() {
  return (tree) => {
    visit(tree, 'inlineCode', (node) => {
      // Convert LaTeX to Unicode in inline code
      node.value = convertLatexToUnicode(node.value);
    });
  };
}

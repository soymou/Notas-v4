// Handle dropdown arrow rotation
function initDropdownArrows() {
  const dropdownLabels = document.querySelectorAll('label.astro-oojz3yon');

  dropdownLabels.forEach(label => {
    const select = label.querySelector('select.astro-oojz3yon');
    const arrow = label.querySelector('svg.icon');

    if (select && arrow) {
      let isRotated = false;

      // Toggle arrow on click/focus
      const rotateArrow = () => {
        arrow.classList.add('rotated');
        isRotated = true;
      };

      const resetArrow = () => {
        arrow.classList.remove('rotated');
        isRotated = false;
      };

      select.addEventListener('mousedown', rotateArrow);
      select.addEventListener('focus', rotateArrow);

      // Rotate back when selection is made
      select.addEventListener('change', () => {
        setTimeout(resetArrow, 150);
      });

      // Rotate back when focus is lost
      select.addEventListener('blur', () => {
        setTimeout(resetArrow, 50);
      });

      // Also reset when clicking outside
      document.addEventListener('click', (e) => {
        if (isRotated && !label.contains(e.target)) {
          resetArrow();
        }
      });
    }
  });
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDropdownArrows);
} else {
  initDropdownArrows();
}

// Re-run after page navigation (for SPA-like behavior)
document.addEventListener('astro:after-swap', initDropdownArrows);

// Custom dropdown implementation to replace native select
function initCustomDropdowns() {
  const dropdownLabels = document.querySelectorAll('label.astro-oojz3yon');

  dropdownLabels.forEach(label => {
    const select = label.querySelector('select.astro-oojz3yon');
    const arrow = label.querySelector('svg.icon');

    if (!select || !arrow) return;

    // Skip if already converted
    if (label.querySelector('.custom-dropdown')) return;

    // Get all options
    const options = Array.from(select.options);
    const selectedIndex = select.selectedIndex;

    // Create custom dropdown structure
    const customDropdown = document.createElement('div');
    customDropdown.className = 'custom-dropdown';

    // Create button that shows selected value
    const dropdownButton = document.createElement('button');
    dropdownButton.className = 'custom-dropdown-button';
    dropdownButton.type = 'button';
    dropdownButton.textContent = options[selectedIndex].textContent;

    // Create dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'custom-dropdown-menu';

    // Create option items
    options.forEach((option, index) => {
      const item = document.createElement('div');
      item.className = 'custom-dropdown-item';
      if (index === selectedIndex) {
        item.classList.add('selected');
      }
      item.textContent = option.textContent;
      item.dataset.value = option.value;
      item.dataset.index = index;

      // Handle click on item
      item.addEventListener('click', () => {
        // Update select value
        select.selectedIndex = index;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        // Update button text
        dropdownButton.textContent = option.textContent;

        // Update selected state
        dropdownMenu.querySelectorAll('.custom-dropdown-item').forEach(i => {
          i.classList.remove('selected');
        });
        item.classList.add('selected');

        // Close dropdown
        closeDropdown();
      });

      dropdownMenu.appendChild(item);
    });

    let isOpen = false;

    const openDropdown = () => {
      isOpen = true;
      customDropdown.classList.add('open');
      arrow.classList.add('rotated');
    };

    const closeDropdown = () => {
      isOpen = false;
      customDropdown.classList.remove('open');
      arrow.classList.remove('rotated');
    };

    const toggleDropdown = () => {
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    };

    // Toggle on button click
    dropdownButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (isOpen && !customDropdown.contains(e.target)) {
        closeDropdown();
      }
    });

    // Assemble custom dropdown
    customDropdown.appendChild(dropdownButton);
    customDropdown.appendChild(dropdownMenu);

    // Hide original select and insert custom dropdown
    select.style.display = 'none';
    label.insertBefore(customDropdown, select);
  });
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomDropdowns);
} else {
  initCustomDropdowns();
}

// Re-run after page navigation (for SPA-like behavior)
document.addEventListener('astro:after-swap', initCustomDropdowns);

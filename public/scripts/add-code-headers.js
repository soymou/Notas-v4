// Add language headers to code blocks
document.addEventListener('DOMContentLoaded', function() {
  // Find all expressive-code frames without titles
  const frames = document.querySelectorAll('.expressive-code .frame:not(.has-title):not(.is-terminal)');

  frames.forEach(frame => {
    const pre = frame.querySelector('pre[data-language]');
    if (pre) {
      const language = pre.getAttribute('data-language');
      if (language && language !== 'plaintext' && language !== 'text') {
        // Create header element
        const header = document.createElement('div');
        header.className = 'code-language-header';
        header.textContent = language;

        // Insert at the beginning of the frame
        frame.insertBefore(header, frame.firstChild);
      }
    }
  });
});

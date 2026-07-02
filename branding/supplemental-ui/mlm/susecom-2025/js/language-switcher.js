// Language switcher for SUSE documentation sites.
// Reads the current page path and redirects to the same page in the selected language.
(function () {
  'use strict';

  function selectLanguage(langCode) {
    var current = window.location.pathname;
    // Replace /en/ segment with selected language code
    var next = current.replace(/\/en\//, '/' + langCode + '/');
    if (next !== current) {
      window.location.pathname = next;
    } else {
      // Fallback: navigate to the language root
      window.location.pathname = '/' + langCode + '/';
    }
  }

  // Expose for onclick handlers in header-content.hbs
  window.selectLanguage = selectLanguage;
})();

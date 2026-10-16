// Qualtrics embedded feedback widget initialisation.
// The actual Qualtrics intercept script is loaded externally by the DSC platform.
// This stub ensures the container element is present and moves it to the bottom
// of the TOC sidebar for consistent placement.
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var toc = document.querySelector('.toc-menu');
    if (!toc) return;

    var container = document.createElement('div');
    container.id = 'qualtrics_container';
    toc.appendChild(container);
  });
})();

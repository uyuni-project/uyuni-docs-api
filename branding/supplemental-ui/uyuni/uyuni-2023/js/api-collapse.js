/**
 * api-collapse.js — Swagger-style collapsible method cards
 *
 * What this script does (DOM manipulation only, no AsciiDoc changes):
 * 1. Finds every <h2> whose id starts with "apidoc-" inside the .doc container.
 * 2. Wraps the h2 and the following sibling nodes (until the next h2 or end of
 *    parent) in a .api-method-card > .api-method-header + .api-method-body structure.
 * 3. Extracts any "HTTP `GET`" / "HTTP `POST`" text from the header and replaces
 *    it with a coloured .http-badge element.
 * 4. Adds an "expand all / collapse all" control bar above the first card.
 * 5. Handles anchor (#hash) navigation — auto-opens the card that owns the target id.
 * 6. Preserves the browser history so direct links to individual methods still work.
 */
(function () {
  'use strict';

  var HTTP_VERBS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // ── Utility helpers ──────────────────────────────────────────────────────────

  function extractVerb(text) {
    for (var i = 0; i < HTTP_VERBS.length; i++) {
      // Matches "HTTP `GET`" or "HTTP GET" case-insensitively
      if (new RegExp('\\bHTTP\\b.*\\b' + HTTP_VERBS[i] + '\\b', 'i').test(text)) {
        return HTTP_VERBS[i];
      }
    }
    return null;
  }

  function makeBadge(verb) {
    var span = document.createElement('span');
    span.className = 'http-badge http-' + verb.toLowerCase();
    span.textContent = verb;
    return span;
  }

  function stripVerbText(node, verb) {
    // Remove the "HTTP `VERB`" / "HTTP VERB" pattern from text content
    var re = new RegExp('HTTP\\s+`?' + verb + '`?\\s*', 'i');
    node.childNodes.forEach(function (child) {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent = child.textContent.replace(re, '');
      }
      // Also strip from any <code> children (backtick-quoted verbs)
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'CODE') {
        if (re.test(child.textContent)) {
          child.parentNode.removeChild(child);
        }
      }
    });
  }

  // ── Card builder ─────────────────────────────────────────────────────────────

  function buildCards(docEl) {
    var headings = Array.prototype.slice.call(
      docEl.querySelectorAll('h2[id^="apidoc-"]')
    );

    if (headings.length === 0) return;

    headings.forEach(function (h2) {
      var parent = h2.parentNode;

      // Collect body nodes: siblings after h2 until the next h2
      var bodyNodes = [];
      var next = h2.nextSibling;
      while (next && !(next.nodeType === Node.ELEMENT_NODE && next.tagName === 'H2')) {
        bodyNodes.push(next);
        next = next.nextSibling;
      }

      // Card wrapper
      var card = document.createElement('div');
      card.className = 'api-method-card';

      // Header
      var header = document.createElement('div');
      header.className = 'api-method-header';

      // HTTP verb detection
      var verb = extractVerb(h2.textContent);
      if (verb) {
        header.appendChild(makeBadge(verb));
        stripVerbText(h2, verb);
      }

      // Move h2 into header
      header.appendChild(h2);

      // Toggle chevron
      var chevron = document.createElement('span');
      chevron.className = 'api-method-toggle';
      chevron.innerHTML = '&#9660;'; // ▼
      chevron.setAttribute('aria-hidden', 'true');
      header.appendChild(chevron);

      // Body
      var body = document.createElement('div');
      body.className = 'api-method-body';
      bodyNodes.forEach(function (node) {
        body.appendChild(node);
      });

      card.appendChild(header);
      card.appendChild(body);

      // Insert card before the next sibling (i.e., where h2 was)
      parent.insertBefore(card, next);

      // Click handler
      header.addEventListener('click', function () {
        toggleCard(card);
      });
    });

    // Add controls above the first card
    var firstCard = docEl.querySelector('.api-method-card');
    if (firstCard) {
      var controls = buildControls(docEl);
      firstCard.parentNode.insertBefore(controls, firstCard);
    }

    // Handle initial anchor navigation
    openCardForHash(window.location.hash);
  }

  // ── Toggle logic ─────────────────────────────────────────────────────────────

  function toggleCard(card) {
    var header = card.querySelector('.api-method-header');
    var body = card.querySelector('.api-method-body');
    var isOpen = header.classList.contains('open');
    if (isOpen) {
      header.classList.remove('open');
      body.classList.remove('open');
    } else {
      header.classList.add('open');
      body.classList.add('open');
    }
  }

  function openCard(card) {
    card.querySelector('.api-method-header').classList.add('open');
    card.querySelector('.api-method-body').classList.add('open');
  }

  function closeCard(card) {
    card.querySelector('.api-method-header').classList.remove('open');
    card.querySelector('.api-method-body').classList.remove('open');
  }

  // ── Controls bar ──────────────────────────────────────────────────────────────

  function buildControls(docEl) {
    var bar = document.createElement('div');
    bar.className = 'api-controls';

    var expandBtn = document.createElement('button');
    expandBtn.textContent = 'Expand all';
    expandBtn.addEventListener('click', function () {
      docEl.querySelectorAll('.api-method-card').forEach(openCard);
    });

    var collapseBtn = document.createElement('button');
    collapseBtn.textContent = 'Collapse all';
    collapseBtn.addEventListener('click', function () {
      docEl.querySelectorAll('.api-method-card').forEach(closeCard);
    });

    bar.appendChild(expandBtn);
    bar.appendChild(collapseBtn);
    return bar;
  }

  // ── Anchor / deep-link support ────────────────────────────────────────────────

  function openCardForHash(hash) {
    if (!hash) return;
    var id = hash.replace(/^#/, '');
    var target = document.getElementById(id);
    if (!target) return;

    // Walk up to find the enclosing card
    var el = target;
    while (el && !el.classList.contains('api-method-card')) {
      el = el.parentElement;
    }
    if (el) {
      openCard(el);
      // Small delay so layout has settled before scrolling
      setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    }
  }

  // Listen for hash changes (e.g., user clicks a nav anchor)
  window.addEventListener('hashchange', function () {
    openCardForHash(window.location.hash);
  });

  // ── Init ──────────────────────────────────────────────────────────────────────

  function init() {
    var docEl = document.querySelector('.doc');
    if (!docEl) return;
    buildCards(docEl);

    // Open a card if the current section corresponds to the URL hash
    openCardForHash(window.location.hash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

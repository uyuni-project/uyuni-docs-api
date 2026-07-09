/**
 * api-collapse.js — Swagger-style collapsible method cards
 *
 * DOM manipulation only — no AsciiDoc source changes required.
 * HTTP verbs live in the first body paragraph (HTTP `POST`), not in the h2 title.
 */
(function () {
  'use strict';

  var HTTP_VERBS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  function extractVerb(text) {
    if (!text) return null;
    for (var i = 0; i < HTTP_VERBS.length; i++) {
      if (new RegExp('\\bHTTP\\b[^\\n]*\\b' + HTTP_VERBS[i] + '\\b', 'i').test(text)) {
        return HTTP_VERBS[i];
      }
    }
    return null;
  }

  function makeBadge(verb) {
    var span = document.createElement('span');
    span.className = 'http-badge http-' + verb.toLowerCase();
    span.textContent = verb;
    span.setAttribute('aria-label', 'HTTP ' + verb);
    return span;
  }

  /** Find the first <p>HTTP … VERB…</p> inside collected body nodes. */
  function findHttpInBody(bodyNodes) {
    for (var i = 0; i < bodyNodes.length; i++) {
      var root = bodyNodes[i];
      if (!root.querySelectorAll) continue;
      var paras = root.querySelectorAll('p');
      for (var j = 0; j < paras.length; j++) {
        var verb = extractVerb(paras[j].textContent);
        if (verb) {
          return { verb: verb, paragraph: paras[j] };
        }
      }
    }
    return null;
  }

  function removeHttpParagraph(p) {
    var wrapper = p.closest('.paragraph');
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    } else if (p.parentNode) {
      p.parentNode.removeChild(p);
    }
  }

  function cleanMethodTitle(h2) {
    // Remove anchor icon — it sits before the title link and breaks flex layout.
    var anchor = h2.querySelector('a.anchor');
    if (anchor) anchor.remove();

    var link = h2.querySelector('a.link');
    var raw = link ? link.textContent : h2.textContent;
    var text = raw.replace(/^Method:\s*/i, '').trim();

    if (link) {
      link.textContent = text;
    } else {
      h2.textContent = text;
    }
  }

  function buildCards(docEl) {
    var headings = Array.prototype.slice.call(
      docEl.querySelectorAll('h2[id^="apidoc-"]')
    );

    if (headings.length === 0) return;

    headings.forEach(function (h2) {
      var parent = h2.parentNode;

      var bodyNodes = [];
      var next = h2.nextSibling;
      while (next && !(next.nodeType === Node.ELEMENT_NODE && next.tagName === 'H2')) {
        bodyNodes.push(next);
        next = next.nextSibling;
      }

      var httpInfo = findHttpInBody(bodyNodes);
      var verb = httpInfo ? httpInfo.verb : extractVerb(h2.textContent);

      var card = document.createElement('div');
      card.className = 'api-method-card';
      if (verb) {
        card.classList.add('api-verb-' + verb.toLowerCase());
      }

      var header = document.createElement('div');
      header.className = 'api-method-header';

      if (verb) {
        header.appendChild(makeBadge(verb));
      }

      cleanMethodTitle(h2);
      header.appendChild(h2);

      var chevron = document.createElement('span');
      chevron.className = 'api-method-toggle';
      chevron.innerHTML = '&#9660;';
      chevron.setAttribute('aria-hidden', 'true');
      header.appendChild(chevron);

      var body = document.createElement('div');
      body.className = 'api-method-body';
      bodyNodes.forEach(function (node) {
        body.appendChild(node);
      });

      if (httpInfo) {
        removeHttpParagraph(httpInfo.paragraph);
      }

      card.appendChild(header);
      card.appendChild(body);
      parent.insertBefore(card, next);

      header.addEventListener('click', function () {
        toggleCard(card);
      });
    });

    var firstCard = docEl.querySelector('.api-method-card');
    if (firstCard) {
      var controls = buildControls(docEl);
      firstCard.parentNode.insertBefore(controls, firstCard);
    }

    openCardForHash(window.location.hash);
  }

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

  function openCardForHash(hash) {
    if (!hash) return;
    var id = hash.replace(/^#/, '');
    var target = document.getElementById(id);
    if (!target) return;

    var el = target;
    while (el && !el.classList.contains('api-method-card')) {
      el = el.parentElement;
    }
    if (el) {
      openCard(el);
      setTimeout(function () {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  window.addEventListener('hashchange', function () {
    openCardForHash(window.location.hash);
  });

  function init() {
    var docEl = document.querySelector('.doc');
    if (!docEl) return;
    buildCards(docEl);
    openCardForHash(window.location.hash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

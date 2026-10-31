/* Our own line icons instead of emoji (2.10.1). Any emoji that reaches the page, from the app or a lazy module, is swapped
   for a Lucide-style line icon. The emoji list (EMO, filled in at build time) is small; the icon drawings load once from
   data/icons.json when the first one is needed. Text in SVG drawings, form options and titles is left alone. */
var EICO = null, EPEND = [], EMO_RX = new RegExp('(' + __EMO__ + ')\uFE0F?', 'g');   // __EMO__: the emoji list joined with | (build time)
function emoFill(el) { var d = EICO && EICO[el.getAttribute('data-ei')]; if (d) el.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
function emoLoad() {
  if (emoLoad.p) return;
  emoLoad.p = getJSON('/data/icons.json?v=' + VERSION).then(function (j) { EICO = j; EPEND.forEach(emoFill); EPEND = []; }, function () { emoLoad.p = null; });
}
function emoText(t) {
  var s = t.nodeValue, p = t.parentNode; EMO_RX.lastIndex = 0;
  if (!p || !EMO_RX.test(s)) return;
  var tag = p.nodeName;
  if (p.namespaceURI !== 'http://www.w3.org/1999/xhtml' || /^(SCRIPT|STYLE|TEXTAREA|TITLE)$/.test(tag)) return;
  if (tag === 'OPTION') { t.nodeValue = s.replace(EMO_RX, '').replace(/^\s+/, ''); return; }
  var f = document.createDocumentFragment(), last = 0; EMO_RX.lastIndex = 0;
  s.replace(EMO_RX, function (m, e, i) {
    if (i > last) f.appendChild(document.createTextNode(s.slice(last, i)));
    var el = document.createElement('span'); el.className = 'ei'; el.setAttribute('data-ei', e); el.setAttribute('aria-hidden', 'true');
    if (EICO) emoFill(el); else { EPEND.push(el); emoLoad(); }
    f.appendChild(el); last = i + m.length; return m;
  });
  if (last < s.length) f.appendChild(document.createTextNode(s.slice(last)));
  p.replaceChild(f, t);
}
function emoScan(root) {
  if (!root) return;
  if (root.nodeType === 3) return emoText(root);
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), a = [], n;
  while ((n = w.nextNode())) a.push(n);
  a.forEach(emoText);
}
(function () {
  function start() {
    emoScan(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'characterData') emoText(m.target); else for (var i = 0; i < m.addedNodes.length; i++) emoScan(m.addedNodes[i]); }); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

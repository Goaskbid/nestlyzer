/* Guided profile builder: the code lives in /assets/more.js (src/more/builder.js) and loads when someone opens it. */
function openBuilder() { return moreLoad().then(function (X) { X.openBuilder(); }, function () { toast('Could not load the profile builder. Check the connection and try again.'); }); }
function builderClick(t) { return !!(MOREX && MOREX.builderClick(t)); }
function builderInput(t) { return !!(MOREX && MOREX.builderInput(t)); }

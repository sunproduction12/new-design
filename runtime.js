(function () {
  var h = preact.h, Fragment = preact.Fragment;
  var ONE = /^\{\{\s*([^}]+?)\s*\}\}$/, ANY = /\{\{\s*([^}]+?)\s*\}\}/, ALL = /\{\{\s*([^}]+?)\s*\}\}/g;
  function get(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) { return str.replace(ALL, function (m, p) { var v = get(p, scope); return v == null ? '' : String(v); }); }
  function val(str, scope) { var m = str.match(ONE); if (m) return get(m[1], scope); return ANY.test(str) ? interp(str, scope) : str; }
  function nodes(list, scope, out) {
    for (var i = 0; i < list.length; i++) node(list[i], scope, out);
    return out;
  }
  function node(n, scope, out) {
    if (typeof n === 'string') { out.push(ANY.test(n) ? interp(n, scope) : n); return; }
    var tag = n[0], a = n[1], kids = n[2];
    if (tag === 'sc-if') { if (val(a.value, scope)) nodes(kids, scope, out); return; }
    if (tag === 'sc-for') {
      var list = val(a.list, scope) || [], as = a.as || 'item';
      for (var j = 0; j < list.length; j++) { var sc = Object.create(scope); sc[as] = list[j]; sc.$index = j; nodes(kids, sc, out); }
      return;
    }
    var props = {};
    for (var k in a) { if (k.indexOf('hint-') === 0) continue; props[k] = val(a[k], scope); }
    out.push(h.apply(null, [tag, props].concat(nodes(kids, scope, []))));
  }
  window.DCLogic = class extends preact.Component {
    render() { return h.apply(null, [Fragment, null].concat(nodes(window.__TREE__, this.renderVals(), []))); }
  };
})();

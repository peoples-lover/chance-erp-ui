/* ==========================================================================
   汽配 ERP 原型 — 应用框架：路由、布局、权限、通用组件
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------- 全局状态 ---------------- */

  var State = {
    /** 供应商敏感数据查看权限；关闭后供应商名称 / 报价全部脱敏为 *** */
    sensitive: true,
    user: { name: "王英英", acct: "wangyy", role: "业务产品岗" },
    /** 跨 Tab 记忆的供应商选择（规格 Tab ↔ 图片 Tab 联动） */
    supplierPick: {}
  };
  window.State = State;

  /* ---------------- 工具 ---------------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** 脱敏：无【供应商敏感数据查看】权限时返回 *** */
  function mask(value, alwaysVisible) {
    if (alwaysVisible || State.sensitive) return esc(value);
    return '<span class="masked">***</span>';
  }

  function supplierName(code) {
    var s = DB.supplierByCode(code);
    if (!s) return esc(code);
    return mask(s.name);
  }

  /** 供应商下拉的显示文案：无权限时只出代码 */
  function supplierLabel(code) {
    var s = DB.supplierByCode(code);
    if (!s) return code;
    return State.sensitive ? (code + "（" + s.name + "）") : code;
  }

  function money(v, cur) {
    if (v == null || v === "") return "—";
    return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (cur ? " " + cur : "");
  }

  function confBadge(c) {
    return '<span class="conf conf--' + esc(c) + '" title="可信度 ' + esc(c) + '">' + esc(c) + "</span>";
  }

  function toast(msg) {
    var box = document.getElementById("toasts");
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }
  window.toast = toast;

  /** 原型占位动作：只提示，不改数据 */
  function stub(what) {
    toast("原型演示：" + esc(what) + "（交互已定义，数据不落库）");
  }
  window.stub = stub;

  /* ---------------- 弹窗 ---------------- */

  var modalStack = [];

  function openModal(opts) {
    var mask = document.createElement("div");
    mask.className = "mask";
    mask.innerHTML =
      '<div class="modal ' + (opts.wide ? "modal--wide" : "") + '">' +
        '<div class="modal__head">' + esc(opts.title) +
          '<div class="spacer"></div><div class="x" data-close>&times;</div>' +
        "</div>" +
        '<div class="modal__body">' + opts.body + "</div>" +
        '<div class="modal__foot">' + (opts.foot || '<button class="btn" data-close>关闭</button>') + "</div>" +
      "</div>";
    document.body.appendChild(mask);
    modalStack.push(mask);
    mask.addEventListener("click", function (e) {
      if (e.target === mask || e.target.hasAttribute("data-close")) closeModal();
    });
    if (opts.onMount) opts.onMount(mask);
    return mask;
  }
  function closeModal() {
    var m = modalStack.pop();
    if (m) m.remove();
  }
  window.openModal = openModal;
  window.closeModal = closeModal;

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modalStack.length) closeModal();
  });

  /* ---------------- 通用渲染片段 ---------------- */

  /** 数据表格；cols = [{t:表头, k:字段或函数, cls, w}] */
  function table(cols, rows, opts) {
    opts = opts || {};
    var h = '<div class="table-wrap"><table class="tbl"><thead><tr>';
    cols.forEach(function (c) {
      h += '<th class="' + (c.cls || "") + '"' + (c.w ? ' style="width:' + c.w + '"' : "") + ">" + c.t + "</th>";
    });
    h += "</tr></thead><tbody>";
    if (!rows.length) {
      h += '<tr><td colspan="' + cols.length + '" class="tbl-empty">' + (opts.empty || "暂无数据") + "</td></tr>";
    }
    rows.forEach(function (r, i) {
      h += "<tr" + (opts.rowAttr ? " " + opts.rowAttr(r, i) : "") + ">";
      cols.forEach(function (c) {
        var v = typeof c.k === "function" ? c.k(r, i) : esc(r[c.k]);
        h += '<td class="' + (c.cls || "") + '">' + (v == null || v === "" ? "—" : v) + "</td>";
      });
      h += "</tr>";
    });
    return h + "</tbody></table></div>";
  }

  function alertBox(kind, icon, html) {
    return '<div class="alert alert--' + kind + '"><i>' + icon + "</i><div>" + html + "</div></div>";
  }

  function statCard(label, value, unit, foot) {
    return '<div class="stat"><div class="stat__label">' + label + "</div>" +
           '<div class="stat__value">' + value + (unit ? "<small>" + unit + "</small>" : "") + "</div>" +
           (foot ? '<div class="stat__foot">' + foot + "</div>" : "") + "</div>";
  }

  /** Tab 条；items = [{k,label,cnt}] */
  function tabBar(items, active, hrefFn) {
    return '<div class="tabs">' + items.map(function (it) {
      return '<a class="tabs__item ' + (it.k === active ? "is-active" : "") + '" href="' + hrefFn(it.k) + '">' +
             esc(it.label) + (it.cnt != null ? '<span class="cnt">' + it.cnt + "</span>" : "") + "</a>";
    }).join("") + "</div>";
  }

  window.UI = {
    esc: esc, mask: mask, supplierName: supplierName, supplierLabel: supplierLabel,
    money: money, confBadge: confBadge, table: table, alertBox: alertBox,
    statCard: statCard, tabBar: tabBar
  };

  /* ---------------- 导航 ---------------- */

  var NAV = [
    { k: "dashboard",  icon: "◎", label: "首页仪表盘",   route: "#/dashboard" },
    { k: "cp",         icon: "▤", label: "CP 公共库",    route: "#/cp-library" },
    { k: "product",    icon: "▦", label: "自有产品库",   route: "#/product/list" },
    { k: "supplier",   icon: "▣", label: "供应商管理",   route: "#/supplier/list" },
    { k: "order",      icon: "▥", label: "订单管理",     route: "#/order/list" },
    { k: "report",     icon: "▨", label: "报表中心",     route: "#/report" },
    { k: "changelog",  icon: "◫", label: "需求变更日志", route: "#/change-log/list" },
    { k: "setting",    icon: "⚙", label: "系统设置",     route: "#/setting" }
  ];

  function renderNav(activeKey) {
    var s = DB.stats();
    return '<aside class="nav">' +
      '<div class="nav__brand"><span class="dot">⚙</span>汽配 ERP 系统</div>' +
      '<div class="nav__list">' +
        NAV.map(function (n) {
          return '<a class="nav__item ' + (n.k === activeKey ? "is-active" : "") + '" href="' + n.route + '">' +
                 "<i>" + n.icon + "</i>" + n.label + "</a>";
        }).join("") +
      "</div>" +
      '<div class="nav__foot">原型 V-Full-20260917<br>OE 样本 ' + s.oeTotal + " 条 / " + s.srcTotal + " 个来源</div>" +
    "</aside>";
  }

  function renderTop(crumb) {
    var on = State.sensitive;
    return '<div class="topbar">' +
      '<div class="topbar__crumb">' + crumb + "</div>" +
      '<div class="topbar__spacer"></div>' +
      '<div class="perm-switch ' + (on ? "is-on" : "") + '" id="permSwitch" ' +
        'title="模拟角色权限点【供应商敏感数据查看】。关闭后：供应商名称、单价、起订量全部脱敏为 ***，供应商代码始终可见。">' +
        '<span class="track"></span>供应商敏感数据查看' +
        '<span class="tag ' + (on ? "tag--green" : "tag--red") + '">' + (on ? "已开启" : "已关闭") + "</span>" +
      "</div>" +
      '<a class="btn btn--sm" href="#/change-log/list">消息 <span class="tag tag--red">' + DB.stats().pendingChange + "</span></a>" +
      '<div class="topbar__user"><span class="avatar">' + esc(State.user.name.slice(0, 1)) + "</span>" +
        esc(State.user.name) + " · " + esc(State.user.role) + "</div>" +
      '<a class="btn btn--sm" href="#/dashboard" onclick="stub(\'退出登录\');return false;">退出</a>' +
    "</div>";
  }

  /* ---------------- 路由 ---------------- */

  var ROUTES = [];
  function route(pattern, navKey, handler) {
    ROUTES.push({ pattern: pattern, navKey: navKey, handler: handler });
  }
  window.route = route;

  function parseHash() {
    var raw = location.hash.replace(/^#/, "") || "/dashboard";
    var qi = raw.indexOf("?");
    var path = qi < 0 ? raw : raw.slice(0, qi);
    var query = {};
    if (qi >= 0) {
      raw.slice(qi + 1).split("&").forEach(function (kv) {
        if (!kv) return;
        var p = kv.split("=");
        query[decodeURIComponent(p[0])] = decodeURIComponent(p.slice(1).join("=") || "");
      });
    }
    return { path: path, query: query };
  }
  window.parseHash = parseHash;

  function render() {
    var r = parseHash();
    var match = null;
    for (var i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].pattern === r.path) { match = ROUTES[i]; break; }
    }
    if (!match) {
      document.getElementById("app").innerHTML =
        renderNav("") +
        '<div class="main">' + renderTop("未知页面") +
        '<div class="page"><div class="card"><div class="card__body">' +
        '<div class="tbl-empty">路由 <code>' + esc(r.path) + '</code> 不存在。<br><br>' +
        '<a class="btn btn--primary" href="#/dashboard">返回首页仪表盘</a></div>' +
        "</div></div></div></div>";
      bindTop();
      return;
    }
    var out = match.handler(r.query) || { crumb: "", html: "" };
    document.getElementById("app").innerHTML =
      renderNav(match.navKey) +
      '<div class="main">' + renderTop(out.crumb) + '<div class="page">' + out.html + "</div></div>";
    bindTop();
    if (out.onMount) out.onMount();
    document.querySelector(".main").scrollTop = 0;
    window.scrollTo(0, 0);
  }
  window.rerender = render;

  function bindTop() {
    var ps = document.getElementById("permSwitch");
    if (ps) ps.addEventListener("click", function () {
      State.sensitive = !State.sensitive;
      toast(State.sensitive
        ? "已开启【供应商敏感数据查看】：供应商名称、报价正常显示"
        : "已关闭【供应商敏感数据查看】：供应商名称、单价、起订量脱敏为 ***，供应商代码仍可见");
      render();
    });
  }

  /* ---------------- 折叠 / Tab 等轻交互（事件委托） ---------------- */

  document.addEventListener("click", function (e) {
    var acc = e.target.closest(".acc__head");
    if (acc) { acc.parentElement.classList.toggle("is-open"); return; }

    var tn = e.target.closest("[data-toggle-children]");
    if (tn) {
      var box = document.getElementById(tn.getAttribute("data-toggle-children"));
      if (box) {
        box.classList.toggle("is-open");
        var c = tn.querySelector(".caret");
        if (c) c.textContent = box.classList.contains("is-open") ? "▼" : "▶";
      }
    }
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", function () {
    if (!location.hash) location.hash = "#/dashboard";
    render();
  });
})();

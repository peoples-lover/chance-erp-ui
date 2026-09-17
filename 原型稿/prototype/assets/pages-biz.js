/* ==========================================================================
   页面 6-10：供应商管理 / 订单管理 / 需求变更日志 / 报表中心 / 系统设置
   ========================================================================== */

(function () {
  "use strict";
  var esc = UI.esc, table = UI.table, alertBox = UI.alertBox;

  /* ====================== 页面 6｜供应商管理 ====================== */

  route("/supplier/list", "supplier", function (q) {
    var kw = (q.kw || "").trim().toUpperCase();
    var rows = DB.suppliers.filter(function (s) {
      return !kw || s.code.toUpperCase().indexOf(kw) >= 0 || s.name.toUpperCase().indexOf(kw) >= 0;
    });

    var html =
      '<div class="page-head"><div><h1>供应商管理</h1>' +
        "<p>供应商代码<b>全局唯一、全部角色可见</b>，作为单据与报表的关联索引；权限只做页面与导出脱敏，数据库原始数据完整保存。</p>" +
      "</div></div>" +

      (State.sensitive ? "" : alertBox("warn", "🔒",
        "当前账号无【供应商敏感数据查看】权限：供应商名称已脱敏为 ***，<b>供应商代码正常显示</b>。")) +

      '<div class="card" style="margin-top:14px"><div class="card__head">' +
        '<form class="row" onsubmit="return Biz.supSearch(event)">' +
          '<input class="input search" name="kw" placeholder="搜索供应商代码 / 供应商名称" value="' + esc(q.kw || "") + '">' +
          '<button class="btn btn--primary" type="submit">搜索</button>' +
        "</form><div class=\"spacer\"></div>" +
        '<button class="btn btn--primary" onclick="Biz.supModal()">新增供应商</button>' +
        '<button class="btn" onclick="stub(\'导出供应商清单\')">导出</button>' +
      "</div><div class=\"card__body tight\">" +
        table([
          { t: "供应商代码", w: "110px", k: function (s) { return '<a class="mono strong" href="#/supplier/detail?id=' + s.id + '">' + s.code + "</a>"; } },
          { t: "供应商名称", k: function (s) { return UI.supplierName(s.code); } },
          { t: "供应商 ID", w: "80px", k: function (s) { return '<span class="mono muted">' + s.id + "</span>"; } },
          { t: "联系人", w: "80px", k: function (s) { return State.sensitive ? esc(s.contact) : UI.mask(s.contact); } },
          { t: "联系电话", w: "110px", k: function (s) { return State.sensitive ? esc(s.phone) : UI.mask(s.phone); } },
          { t: "地址", cls: "wrap", k: function (s) { return State.sensitive ? esc(s.addr) : UI.mask(s.addr); } },
          { t: "权限可见性", k: function (s) {
              return '<div class="tag-list">' +
                '<span class="tag ' + (s.nameVisible ? "tag--green" : "tag--grey") + '">名称 ' + (s.nameVisible ? "业务可见" : "业务不可见") + "</span>" +
                '<span class="tag ' + (s.priceVisible ? "tag--green" : "tag--grey") + '">报价 ' + (s.priceVisible ? "业务可见" : "业务不可见") + "</span>" +
                "</div>"; } },
          { t: "报价条数", cls: "num", w: "70px", k: function (s) {
              return DB.quotes.filter(function (x) { return x.supplier === s.code; }).length; } },
          { t: "操作", cls: "act", k: function (s) {
              return '<button class="btn btn--text" onclick="Biz.supModal(\'' + s.code + '\')">编辑</button>' +
                     '<a class="btn btn--text" href="#/supplier/detail?id=' + s.id + '&tab=quote">查看报价记录</a>'; } }
        ], rows, { empty: "没有匹配的供应商" }) +
      "</div></div>";

    return { crumb: "<b>供应商管理</b>", html: html };
  });

  route("/supplier/detail", "supplier", function (q) {
    var s = null;
    DB.suppliers.forEach(function (x) { if (x.id === q.id || x.code === q.id) s = x; });
    if (!s) return { crumb: "供应商管理", html: '<div class="card"><div class="tbl-empty">供应商不存在</div></div>' };
    var tab = q.tab || "base";

    var qs = DB.quotes.filter(function (x) { return x.supplier === s.code; });
    var skus = {};
    qs.forEach(function (x) { skus[x.sku] = 1; });
    var skuList = Object.keys(skus).map(function (k) { return DB.productBySku(k); });

    var tabs = [
      { k: "base",  label: "基础信息" },
      { k: "quote", label: "报价记录", cnt: qs.length },
      { k: "sku",   label: "关联 SKU 清单", cnt: skuList.length },
      { k: "log",   label: "变更日志", cnt: DB.changeLogsFor(s.code).length }
    ];

    var content;
    if (tab === "base") {
      content = '<div class="grid c2"><div>' +
        '<div class="section-title">基础信息</div><dl class="dl">' +
          "<dt>供应商代码</dt><dd><span class=\"mono strong\">" + esc(s.code) + '</span><span class="ro">唯一，不可重复，全局可见</span></dd>' +
          "<dt>供应商 ID</dt><dd><span class=\"mono\">" + esc(s.id) + "</span></dd>" +
          "<dt>供应商名称</dt><dd>" + UI.supplierName(s.code) + "</dd>" +
          "<dt>联系人</dt><dd>" + (State.sensitive ? esc(s.contact) : UI.mask(s.contact)) + "</dd>" +
          "<dt>联系电话</dt><dd>" + (State.sensitive ? esc(s.phone) : UI.mask(s.phone)) + "</dd>" +
          "<dt>地址</dt><dd>" + (State.sensitive ? esc(s.addr) : UI.mask(s.addr)) + "</dd>" +
          "<dt>备注</dt><dd>" + esc(s.note) + "</dd>" +
        "</dl></div><div>" +
        '<div class="section-title">权限配置</div><dl class="dl">' +
          "<dt>供应商名称</dt><dd><span class=\"tag " + (s.nameVisible ? "tag--green" : "tag--red") + '">业务角色' + (s.nameVisible ? "可见" : "不可见") + "</span></dd>" +
          "<dt>供应商报价数据</dt><dd><span class=\"tag " + (s.priceVisible ? "tag--green" : "tag--red") + '">业务角色' + (s.priceVisible ? "可见" : "不可见") + "</span></dd>" +
        "</dl>" +
        alertBox("info", "ⓘ", "可见性设置与角色权限点【供应商敏感数据查看】共同生效：<b>任一判定为不可见即脱敏</b>。" +
          "脱敏只影响页面与导出，数据库原始值不变。") +
        '<div style="margin-top:12px"><button class="btn btn--primary" onclick="Biz.supModal(\'' + s.code + '\')">编辑供应商</button></div>' +
        "</div></div>";
    } else if (tab === "quote") {
      content = table([
        { t: "SKU", k: function (x) { return '<a class="mono" href="#/product/detail?sku=' + x.sku + '&tab=qhist">' + x.sku + "</a>"; } },
        { t: "产品", k: function (x) { return esc((DB.productBySku(x.sku) || {}).cn); } },
        { t: "单价", cls: "num", k: function (x) { return State.sensitive ? UI.money(x.price) : UI.mask(x.price); } },
        { t: "货币", k: function (x) { return State.sensitive ? x.cur : UI.mask(x.cur); } },
        { t: "起订量", cls: "num", k: function (x) { return State.sensitive ? x.moq : UI.mask(x.moq); } },
        { t: "报价时间", k: "at" },
        { t: "有效期至", k: "validTo" },
        { t: "记录类型", k: function (x) { return x.current ? '<span class="tag tag--blue">当前</span>' : '<span class="tag tag--grey">归档</span>'; } },
        { t: "状态", k: function (x) { var st = DB.quoteStatus(x); return '<span class="tag ' + st.cls + '">' + st.label + "</span>"; } }
      ], qs, { empty: "暂无报价记录" });
    } else if (tab === "sku") {
      content = table([
        { t: "SKU", k: function (p) { return '<a class="mono" href="#/product/detail?sku=' + p.sku + '">' + p.sku + "</a>"; } },
        { t: "中文品名", k: "cn" },
        { t: "英文品名", k: "en" },
        { t: "CP 引用编号", k: function (p) { return '<span class="mono muted">' + p.cp + "</span>"; } },
        { t: "产品类目", k: function (p) { return esc(p.cat1) + " / " + esc(p.cat2); } },
        { t: "该供应商有无实拍图", k: function (p) {
            return p.imgs[s.code] ? '<span class="tag tag--green">有</span>' : '<span class="tag tag--grey">默认负片</span>'; } }
      ], skuList, { empty: "暂无关联 SKU" });
    } else {
      content = table([
        { t: "变更 ID", k: function (c) { return '<a class="mono" href="#/change-log/detail?id=' + c.id + '">' + c.id + "</a>"; } },
        { t: "模块", k: "module" },
        { t: "变更简述", cls: "wrap", k: "reason" },
        { t: "审核人", k: "approver" },
        { t: "审核状态", k: function (c) { return '<span class="tag tag--green">' + esc(c.state) + "</span>"; } },
        { t: "变更时间", k: "at" }
      ], DB.changeLogsFor(s.code), { empty: "暂无变更记录" });
    }

    var html =
      '<div class="page-head"><div><h1>' + esc(s.code) + "｜" + (State.sensitive ? esc(s.name) : "***") + "</h1>" +
        "<p>供应商 ID " + esc(s.id) + "　·　报价 " + qs.length + " 条　·　关联 SKU " + skuList.length + " 个</p>" +
      '</div><div class="spacer"></div><a class="btn" href="#/supplier/list">返回列表</a></div>' +
      '<div class="card"><div class="card__body" style="padding:0">' +
        UI.tabBar(tabs, tab, function (k) { return "#/supplier/detail?id=" + s.id + "&tab=" + k; }) +
        '<div style="padding:16px">' + content + "</div>" +
      "</div></div>";

    return { crumb: '<a href="#/supplier/list">供应商管理</a> / <b>' + esc(s.code) + "</b>", html: html };
  });

  /* ====================== 页面 7｜订单管理 ====================== */

  route("/order/list", "order", function (q) {
    var type = q.type || "ALL";
    var kw = (q.kw || "").trim().toUpperCase();
    var rows = DB.orders.filter(function (o) {
      if (type !== "ALL" && o.type !== type) return false;
      if (!kw) return true;
      return o.no.indexOf(kw) >= 0 || o.sku.indexOf(kw) >= 0 || o.party.toUpperCase().indexOf(kw) >= 0;
    });

    var html =
      '<div class="page-head"><div><h1>订单管理</h1>' +
        "<p>采购订单与销售订单统一列表。数据库保存完整订单快照，页面按账号权限脱敏展示。</p>" +
      '</div><div class="spacer"></div>' +
      '<a class="btn btn--primary" href="#/order/create">新建订单</a></div>' +

      '<div class="card"><div class="card__head">' +
        '<div class="segmented">' +
          ["ALL", "采购订单", "销售订单"].map(function (t) {
            var n = t === "ALL" ? DB.orders.length : DB.orders.filter(function (o) { return o.type === t; }).length;
            return '<a class="segmented__item ' + (type === t ? "is-active" : "") + '" href="#/order/list?type=' +
                   encodeURIComponent(t) + '">' + (t === "ALL" ? "全部" : t) + " " + n + "</a>";
          }).join("") +
        "</div>" +
        '<form class="row" onsubmit="return Biz.orderSearch(event)">' +
          '<input type="hidden" name="type" value="' + esc(type) + '">' +
          '<input class="input search" name="kw" placeholder="搜索订单号 / SKU / 供应商代码" value="' + esc(q.kw || "") + '">' +
          '<button class="btn" type="submit">搜索</button>' +
        "</form><div class=\"spacer\"></div>" +
        '<button class="btn" onclick="stub(\'导出订单列表\')">导出</button>' +
      "</div><div class=\"card__body tight\">" +
        table([
          { t: "订单号", w: "116px", k: function (o) { return '<a class="mono strong" href="#/order/detail?id=' + o.no + '">' + o.no + "</a>"; } },
          { t: "订单类型", w: "84px", k: function (o) {
              return '<span class="tag ' + (o.type === "采购订单" ? "tag--blue" : "tag--green") + '">' + o.type + "</span>"; } },
          { t: "往来单位代码", w: "104px", k: function (o) { return '<span class="mono">' + esc(o.party) + "</span>"; } },
          { t: "往来单位名称", k: function (o) {
              return o.type === "采购订单" ? UI.supplierName(o.party) : esc(o.partyName); } },
          { t: "SKU", w: "84px", k: function (o) { return '<a class="mono" href="#/product/detail?sku=' + o.sku + '">' + o.sku + "</a>"; } },
          { t: "数量", cls: "num", w: "60px", k: function (o) { return o.qty || '<span class="muted">待录入</span>'; } },
          { t: "总金额", cls: "num", w: "112px", k: function (o) {
              if (!o.qty) return '<span class="muted">待录入</span>';
              if (o.type === "采购订单" && !State.sensitive) return UI.mask(o.amount);
              return "<b>" + UI.money(o.amount, o.cur) + "</b>"; } },
          { t: "订单状态", w: "80px", k: function (o) {
              var cls = { "草稿": "tag--grey", "待确认": "tag--orange", "已下单": "tag--blue",
                          "生产中": "tag--blue", "已收货": "tag--green", "已完成": "tag--green" }[o.status] || "tag--grey";
              return '<span class="tag ' + cls + '">' + esc(o.status) + "</span>"; } },
          { t: "创建时间", w: "92px", k: "date" },
          { t: "操作", cls: "act", k: function (o) {
              return '<a class="btn btn--text" href="#/order/detail?id=' + o.no + '">查看</a>' +
                     '<button class="btn btn--text" onclick="stub(\'编辑订单\')">编辑</button>' +
                     '<button class="btn btn--text btn--danger" onclick="stub(\'删除订单（草稿可删，已提交订单仅可作废）\')">删除</button>'; } }
        ], rows, { empty: "没有匹配的订单" }) +
      "</div></div>";

    return { crumb: "<b>订单管理</b>", html: html };
  });

  /* --- 7-2 新建订单开单页 --- */

  route("/order/create", "order", function (q) {
    var sku = q.sku || "4020340";
    var p = DB.productBySku(sku);
    var sup = q.sup || p.suppliers[0];
    var quote = DB.currentQuote(sku, sup);
    var st = quote ? DB.quoteStatus(quote) : null;

    var warn = "";
    if (!quote) {
      warn = alertBox("danger", "⚠️", "<b>暂无该供应商有效报价，请重新询价。</b>无报价不可提交订单。");
    } else if (st.key === "expired") {
      warn = alertBox("warn", "⚠️", "<b>该供应商报价已于 " + quote.validTo + " 过期（已过 " + (-st.days) + " 天）。</b>" +
        "继续下单将使用过期价格，建议先重新询价；提交时需二次确认。");
    } else if (st.key === "expiring") {
      warn = alertBox("warn", "⚠️", "该供应商报价将于 <b>" + quote.validTo + "</b> 过期（剩 " + st.days + " 天），建议尽快确认。");
    }

    var priceCell = quote ? (State.sensitive ? UI.money(quote.price, quote.cur) : '<span class="masked">***</span>') : "—";
    var moqCell   = quote ? (State.sensitive ? quote.moq : '<span class="masked">***</span>') : "—";

    var html =
      '<div class="page-head"><div><h1>新建采购订单</h1>' +
        "<p>订单号自动生成，保存后不可修改。提交时写入完整订单快照，后续报价变动不影响本单。</p>" +
      '</div><div class="spacer"></div><a class="btn" href="#/order/list">返回列表</a></div>' +

      '<div class="card"><div class="card__head">基础信息</div><div class="card__body">' +
        '<div class="grid c4">' +
          '<div class="field"><label>订单号</label><input class="input" value="PO20260917" readonly></div>' +
          '<div class="field"><label>订单类型</label><select class="select"><option>采购订单</option><option>销售订单</option></select></div>' +
          '<div class="field"><label>订单日期</label><input class="input" type="date" value="' + DB.TODAY + '"></div>' +
          '<div class="field"><label>制单人</label><input class="input" value="' + esc(State.user.name) + '" readonly></div>' +
        "</div>" +
      "</div></div>" +

      '<div class="card"><div class="card__head">物料行' +
        '<div class="spacer"></div><small>选择 SKU 与供应商后自动带出当前有效报价</small></div>' +
      '<div class="card__body">' +
        '<div class="grid c3">' +
          '<div class="field"><label><span class="req">*</span>物料 SKU</label>' +
            '<select class="select" onchange="Biz.orderPick(this.value,null)">' +
              DB.products.map(function (x) {
                return '<option value="' + x.sku + '"' + (x.sku === sku ? " selected" : "") + ">" + x.sku + "（" + esc(x.cn) + "）</option>";
              }).join("") + "</select></div>" +
          '<div class="field"><label><span class="req">*</span>供应商</label>' +
            '<select class="select" onchange="Biz.orderPick(\'' + sku + '\',this.value)">' +
              p.suppliers.map(function (c) {
                return '<option value="' + c + '"' + (c === sup ? " selected" : "") + ">" + esc(UI.supplierLabel(c)) + "</option>";
              }).join("") + "</select>" +
            (State.sensitive ? "" : '<div class="hint">无敏感权限：下拉仅展示供应商代码</div>') + "</div>" +
          '<div class="field"><label>产品</label><input class="input" value="' + esc(p.cn) + " / " + esc(p.en) + '" readonly></div>' +
        "</div>" +

        warn +

        '<div class="grid c4" style="margin-top:14px">' +
          '<div class="field"><label>报价单价（自动带出）</label>' +
            '<input class="input" value="' + (quote ? (State.sensitive ? UI.money(quote.price, quote.cur) : "***") : "—") + '" readonly></div>' +
          '<div class="field"><label>最小起订量 MOQ</label>' +
            '<input class="input" value="' + (quote ? (State.sensitive ? quote.moq : "***") : "—") + '" readonly></div>' +
          '<div class="field"><label>报价有效期至</label>' +
            '<input class="input" value="' + (quote ? quote.validTo : "—") + '" readonly></div>' +
          '<div class="field"><label>报价状态</label>' +
            '<div style="padding-top:5px">' + (st ? '<span class="tag ' + st.cls + '">' + st.icon + " " + st.label + "</span>"
              : '<span class="tag tag--red">无有效报价</span>') + "</div></div>" +
        "</div>" +

        '<div class="grid c4">' +
          '<div class="field"><label><span class="req">*</span>订购数量</label>' +
            '<input class="input" id="ordQty" type="number" min="0" value="10" ' +
              'data-moq="' + (quote ? quote.moq : 0) + '" data-price="' + (quote ? quote.price : 0) + '" ' +
              'data-cur="' + (quote ? quote.cur : "") + '">' +
            '<div class="err-text" id="qtyErr" style="display:none"></div></div>' +
          '<div class="field"><label>定制</label>' +
            '<div style="padding-top:6px"><label class="check"><input type="checkbox" id="ordCustom"> 开启定制</label></div></div>' +
          '<div class="field" id="customDiffWrap" style="display:none"><label>定制差额（±）</label>' +
            '<input class="input" id="ordDiff" type="number" step="0.01" value="0"></div>' +
          '<div class="field" id="customImgWrap" style="display:none"><label>订单定制图片</label>' +
            '<button class="btn" style="width:100%" onclick="stub(\'上传订单定制图片\')">上传图片</button>' +
            '<div class="hint">仅保存在订单行，不回写产品图库</div></div>' +
        "</div>" +

        '<div id="customNote" style="display:none">' +
          alertBox("info", "ⓘ", "客户定制颜色 / 工艺图片<b>只保存在本订单明细行</b>，不会回写自有产品图库，不污染产品主数据。") +
        "</div>" +

        '<div class="section-title">自动计算</div>' +
        '<div class="grid c3">' +
          '<div class="stat"><div class="stat__label">最终成本单价</div>' +
            '<div class="stat__value" id="calcUnit">—</div>' +
            '<div class="stat__foot">报价单价 ± 定制差额</div></div>' +
          '<div class="stat"><div class="stat__label">订购数量</div>' +
            '<div class="stat__value" id="calcQty">—</div>' +
            '<div class="stat__foot">MOQ ' + moqCell + "</div></div>" +
          '<div class="stat"><div class="stat__label">订单总金额</div>' +
            '<div class="stat__value" id="calcTotal">—</div>' +
            '<div class="stat__foot">最终成本 × 数量</div></div>' +
        "</div>" +

        (State.sensitive ? "" : alertBox("warn", "🔒",
          "当前账号无【供应商敏感数据查看】权限：单价、起订量、成本金额全部显示 ***，<b>系统不做自动计算</b>；" +
          "供应商代码正常显示，仍可正常提交订单。")) +

      "</div>" +
      '<div class="card__head" style="border-top:1px solid var(--line-2);border-bottom:none">' +
        '<div class="spacer"></div>' +
        '<button class="btn" onclick="stub(\'保存草稿\')">保存草稿</button>' +
        '<button class="btn" onclick="history.back()">取消</button>' +
        '<button class="btn btn--primary" onclick="Biz.orderSubmit()">提交订单</button>' +
      "</div></div>" +

      '<div style="margin-top:14px">' +
      alertBox("info", "💡",
        "<b>告警规则</b>　1）报价已过期 → 页面橙色提示条；2）无有效报价 → 红色提示【暂无该供应商有效报价，请重新询价】；" +
        "3）数量 &lt; 起订量 → 输入框红色边框 + 红色告警文字；4）数量 ≥ 起订量 → 红框与告警同时消失。") +
      "</div>";

    return {
      crumb: '<a href="#/order/list">订单管理</a> / <b>新建订单</b>',
      html: html,
      onMount: bindOrderForm
    };
  });

  function bindOrderForm() {
    var qty = document.getElementById("ordQty");
    if (!qty) return;
    var err = document.getElementById("qtyErr");
    var diff = document.getElementById("ordDiff");
    var custom = document.getElementById("ordCustom");

    function recalc() {
      var moq   = Number(qty.getAttribute("data-moq")) || 0;
      var price = Number(qty.getAttribute("data-price")) || 0;
      var cur   = qty.getAttribute("data-cur") || "";
      var n     = Number(qty.value) || 0;
      var d     = custom && custom.checked ? (Number(diff.value) || 0) : 0;

      if (moq && n < moq) {
        qty.classList.add("input--err");
        err.style.display = "flex";
        err.innerHTML = "⚠️ 数量低于最小起订量 " + moq;
      } else {
        qty.classList.remove("input--err");
        err.style.display = "none";
      }

      var unit = document.getElementById("calcUnit");
      var tq   = document.getElementById("calcQty");
      var tt   = document.getElementById("calcTotal");
      tq.textContent = n || "—";
      if (!State.sensitive || !price) {
        unit.innerHTML = '<span class="masked">***</span>';
        tt.innerHTML   = '<span class="masked">***</span>';
        return;
      }
      var u = price + d;
      unit.innerHTML = UI.money(u) + '<small>' + cur + "</small>";
      tt.innerHTML   = UI.money(u * n) + '<small>' + cur + "</small>";
    }

    qty.addEventListener("input", recalc);
    if (diff) diff.addEventListener("input", recalc);
    if (custom) custom.addEventListener("change", function () {
      var on = custom.checked;
      document.getElementById("customDiffWrap").style.display = on ? "flex" : "none";
      document.getElementById("customImgWrap").style.display = on ? "flex" : "none";
      document.getElementById("customNote").style.display = on ? "block" : "none";
      recalc();
    });
    recalc();
  }

  /* --- 7-3 订单详情 --- */

  route("/order/detail", "order", function (q) {
    var o = DB.orderByNo(q.id);
    if (!o) return { crumb: "订单管理", html: '<div class="card"><div class="tbl-empty">订单不存在</div></div>' };
    var tab = q.tab || "base";
    var isPO = o.type === "采购订单";
    var p = DB.productBySku(o.sku);
    var maskPrice = isPO && !State.sensitive;

    var tabs = [
      { k: "base",   label: "基础信息" },
      { k: "item",   label: "物料明细", cnt: 1 },
      { k: "file",   label: "附件", cnt: 2 },
      { k: "syslog", label: "系统操作日志", cnt: 2 },
      { k: "chlog",  label: "变更日志", cnt: 0 }
    ];

    var content;
    if (tab === "base") {
      content = '<div class="grid c2"><dl class="dl">' +
        "<dt>订单号</dt><dd><span class=\"mono strong\">" + esc(o.no) + "</span></dd>" +
        "<dt>订单类型</dt><dd>" + esc(o.type) + "</dd>" +
        "<dt>" + (isPO ? "供应商代码" : "客户编号") + "</dt><dd><span class=\"mono\">" + esc(o.party) + '</span><span class="ro">始终可见</span></dd>' +
        "<dt>" + (isPO ? "供应商名称" : "客户名称") + "</dt><dd>" + (isPO ? UI.supplierName(o.party) : esc(o.partyName)) + "</dd>" +
        "<dt>订单日期</dt><dd>" + esc(o.date) + "</dd>" +
      "</dl><dl class=\"dl\">" +
        "<dt>订单状态</dt><dd><span class=\"tag tag--blue\">" + esc(o.status) + "</span></dd>" +
        "<dt>出运状态</dt><dd>" + esc(o.ship) + "</dd>" +
        "<dt>订单总金额</dt><dd>" + (maskPrice ? UI.mask(o.amount) : "<b>" + UI.money(o.amount, o.cur) + "</b>") + "</dd>" +
        "<dt>制单人</dt><dd>" + esc(State.user.name) + "</dd>" +
        "<dt>备注</dt><dd>" + (esc(o.note) || "—") + "</dd>" +
      "</dl></div>" +
      alertBox("info", "ⓘ", "数据库保存<b>完整订单快照</b>（价格、起订量、供应商信息、定制差额）。" +
        "产品报价后续变更或删除，<b>不会修改本单历史数据</b>；页面仅按当前账号权限做展示层脱敏。");
    } else if (tab === "item") {
      content = table([
        { t: "行号", w: "48px", k: function () { return "1"; } },
        { t: "SKU", k: function () { return '<a class="mono" href="#/product/detail?sku=' + o.sku + '">' + o.sku + "</a>"; } },
        { t: "CP 引用编号", k: function () { return '<span class="mono muted">' + p.cp + "</span>"; } },
        { t: "品名", k: function () { return esc(p.cn); } },
        { t: (isPO ? "供应商代码" : "客户编号"), k: function () { return '<span class="mono">' + esc(o.party) + "</span>"; } },
        { t: "数量", cls: "num", k: function () { return o.qty || "待录入"; } },
        { t: "快照单价", cls: "num", k: function () { return maskPrice ? UI.mask(o.price) : UI.money(o.price, o.cur); } },
        { t: "定制", k: function () { return o.note.indexOf("定制") >= 0 ? '<span class="tag tag--orange">有定制</span>' : "—"; } },
        { t: "小计", cls: "num", k: function () { return maskPrice ? UI.mask(o.amount) : "<b>" + UI.money(o.amount, o.cur) + "</b>"; } }
      ], [o]) +
      (o.note.indexOf("定制") >= 0
        ? '<div style="margin-top:12px">' + alertBox("warn", "💡",
            "本行含客户定制（" + esc(o.note) + "）。定制图片与差额<b>只存在于本订单行</b>，不回写产品图库与产品主数据。") + "</div>"
        : "");
    } else if (tab === "file") {
      content = table([
        { t: "文件名", k: "n" }, { t: "类型", k: "t" }, { t: "上传人", k: "u" }, { t: "上传时间", k: "a" },
        { t: "操作", cls: "act", k: function () { return '<button class="btn btn--text" onclick="stub(\'下载\')">下载</button>'; } }
      ], [
        { n: o.no + "-订单确认书.pdf", t: "合同", u: "zhaom", a: o.date },
        { n: o.no + "-形式发票.pdf",   t: "单证", u: "chenj", a: o.date }
      ]);
    } else if (tab === "syslog") {
      content = table([
        { t: "操作人", k: "u" }, { t: "操作时间", k: "a" }, { t: "变更字段", k: "f" },
        { t: "旧值", k: "b" }, { t: "新值", k: "n" }
      ], [
        { u: "zhaom", a: o.date + " 09:12", f: "订单状态", b: "草稿", n: o.status },
        { u: "zhaom", a: o.date + " 09:10", f: "订单创建", b: "—", n: o.no }
      ]);
    } else {
      content = '<div class="tbl-empty">本订单暂无需求变更记录</div>';
    }

    var html =
      '<div class="page-head"><div><h1>' + esc(o.no) + "｜" + esc(o.type) + "</h1>" +
        "<p>" + esc(o.party) + "　·　" + esc(o.date) + "　·　状态 " + esc(o.status) + "</p>" +
      '</div><div class="spacer"></div><a class="btn" href="#/order/list">返回列表</a>' +
      '<button class="btn" onclick="stub(\'打印订单\')">打印</button></div>' +
      '<div class="card"><div class="card__body" style="padding:0">' +
        UI.tabBar(tabs, tab, function (k) { return "#/order/detail?id=" + o.no + "&tab=" + k; }) +
        '<div style="padding:16px">' + content + "</div>" +
      "</div></div>";

    return { crumb: '<a href="#/order/list">订单管理</a> / <b>' + esc(o.no) + "</b>", html: html };
  });

  /* ====================== 页面 8｜需求变更日志 ====================== */

  route("/change-log/list", "changelog", function (q) {
    var mod = q.mod || "ALL";
    var rows = DB.changeLogs.filter(function (c) { return mod === "ALL" || c.module === mod; });
    var mods = ["ALL"].concat(Object.keys(DB.changeLogs.reduce(function (m, c) { m[c.module] = 1; return m; }, {})));

    var html =
      '<div class="page-head"><div><h1>需求变更日志（全局）</h1>' +
        "<p>业务功能层面的需求变更：人工提交申请、填写理由、上传图片证明、指定审核人。与系统操作日志分属两套体系。</p>" +
      '</div><div class="spacer"></div>' +
      '<button class="btn btn--primary" onclick="Biz.changeModal()">新增变更申请</button>' +
      '<button class="btn" onclick="stub(\'导出变更日志\')">导出</button></div>' +

      alertBox("info", "ⓘ",
        "<b>两套日志区分</b>：<b>系统操作日志</b>由系统自动记录字段改动（含变更前后快照），无需审核；" +
        "<b>需求变更日志</b>记录业务功能变更，人工提交 + 图片证明 + 审核流程。各详情页内置对应 Tab。") +

      '<div class="card" style="margin-top:14px"><div class="card__head">' +
        '<select class="select" onchange="location.hash=\'#/change-log/list?mod=\'+encodeURIComponent(this.value)">' +
          mods.map(function (m) {
            return '<option value="' + esc(m) + '"' + (mod === m ? " selected" : "") + ">" + (m === "ALL" ? "全部模块" : esc(m)) + "</option>";
          }).join("") + "</select>" +
        '<select class="select"><option>全部申请人</option><option>业务产品岗</option><option>外贸业务岗</option></select>' +
        '<select class="select"><option>全部审核状态</option><option>已审核</option><option>待审核</option><option>已驳回</option></select>' +
        '<input class="input search" placeholder="搜索变更内容">' +
        '<div class="spacer"></div><span class="small muted">共 ' + rows.length + " 条</span>" +
      "</div><div class=\"card__body tight\">" +
        table([
          { t: "ID", w: "68px", k: function (c) { return '<a class="mono strong" href="#/change-log/detail?id=' + c.id + '">' + c.id + "</a>"; } },
          { t: "模块", w: "92px", k: function (c) { return '<span class="tag tag--outline">' + esc(c.module) + "</span>"; } },
          { t: "申请提出人", w: "92px", k: "applicant" },
          { t: "修改理由", cls: "wrap", k: "reason" },
          { t: "图片证明附件", w: "130px", k: function (c) { return '<a href="javascript:stub(\'预览附件\')">' + esc(c.proof) + "</a>"; } },
          { t: "审核人", w: "90px", k: "approver" },
          { t: "审核状态", w: "80px", k: function (c) {
              return '<span class="tag ' + (c.state === "已审核" ? "tag--green" : "tag--orange") + '">' + esc(c.state) + "</span>"; } },
          { t: "变更时间", w: "92px", k: "at" },
          { t: "操作", cls: "act", k: function (c) {
              return '<a class="btn btn--text" href="#/change-log/detail?id=' + c.id + '">查看详情</a>' +
                (c.state === "待审核"
                  ? '<button class="btn btn--text" onclick="stub(\'审核通过 / 驳回（驳回需填写意见）\')">审核</button>' : ""); } }
        ], rows) +
      "</div></div>";

    return { crumb: "<b>需求变更日志</b>", html: html };
  });

  route("/change-log/detail", "changelog", function (q) {
    var c = DB.changeById(q.id);
    if (!c) return { crumb: "需求变更日志", html: '<div class="card"><div class="tbl-empty">变更记录不存在</div></div>' };

    var html =
      '<div class="page-head"><div><h1>' + esc(c.id) + "｜" + esc(c.module) + "</h1>" +
        "<p>" + esc(c.applicant) + " 提交　·　" + esc(c.at) + "</p>" +
      '</div><div class="spacer"></div><a class="btn" href="#/change-log/list">返回列表</a>' +
      (c.state === "待审核"
        ? '<button class="btn" onclick="stub(\'驳回并填写意见\')">驳回</button>' +
          '<button class="btn btn--primary" onclick="stub(\'审核通过\')">审核通过</button>' : "") +
      "</div>" +

      '<div class="grid c2"><div class="card"><div class="card__head">变更信息</div><div class="card__body">' +
        '<dl class="dl">' +
          "<dt>变更 ID</dt><dd><span class=\"mono\">" + esc(c.id) + "</span></dd>" +
          "<dt>所属模块</dt><dd>" + esc(c.module) + "</dd>" +
          "<dt>申请提出人</dt><dd>" + esc(c.applicant) + "</dd>" +
          "<dt>修改理由</dt><dd>" + esc(c.reason) + "</dd>" +
          "<dt>图片证明</dt><dd><a href=\"javascript:stub('预览附件')\">" + esc(c.proof) + "</a></dd>" +
          "<dt>关联页面 / 数据</dt><dd>" + c.rel.map(function (r) {
              return '<span class="tag tag--outline mono">' + esc(r) + "</span>"; }).join(" ") + "</dd>" +
          "<dt>审核人</dt><dd>" + esc(c.approver) + "</dd>" +
          "<dt>审核状态</dt><dd><span class=\"tag " + (c.state === "已审核" ? "tag--green" : "tag--orange") + '">' + esc(c.state) + "</span></dd>" +
          "<dt>变更时间</dt><dd>" + esc(c.at) + "</dd>" +
        "</dl>" +
      "</div></div>" +

      '<div class="card"><div class="card__head">审批流转</div><div class="card__body">' +
        '<div class="timeline">' +
          '<div class="timeline__item"><b>提交申请</b><div class="timeline__time">' + esc(c.applicant) + "　" + esc(c.at) + "</div>" +
            '<div class="small muted">' + esc(c.reason) + "</div></div>" +
          (c.state === "已审核"
            ? '<div class="timeline__item"><b>审核通过</b><div class="timeline__time">' + esc(c.approver) + "　" + esc(c.at) + "</div>" +
              '<div class="small muted">变更已生效，相关页面已同步</div></div>'
            : '<div class="timeline__item"><b>待审核</b><div class="timeline__time">待 ' + esc(c.approver) + " 处理</div>" +
              '<div class="small muted">审核通过后生效；驳回需填写驳回意见</div></div>') +
        "</div>" +
        '<div style="margin-top:14px">' +
        alertBox("info", "ⓘ", "审批权限隔离：<b>提交人与审批人不能为同一人</b>。替代关系、CP 合并 / 拆分等高风险变更强制双人审批。") +
        "</div>" +
      "</div></div></div>";

    return { crumb: '<a href="#/change-log/list">需求变更日志</a> / <b>' + esc(c.id) + "</b>", html: html };
  });

  /* ====================== 页面 9｜报表中心 ====================== */

  route("/report", "report", function (q) {
    var pick = q.r || "R1";
    var rep = DB.reports.filter(function (r) { return r.id === pick; })[0] || DB.reports[0];

    var html =
      '<div class="page-head"><div><h1>报表中心</h1>' +
        "<p>选择报表 → 设置筛选条件 → 导出 Excel。导出同样受【供应商敏感数据查看】权限控制。</p>" +
      "</div></div>" +

      '<div class="split" style="align-items:start">' +
        '<div class="card"><div class="card__body" style="padding:12px"><div class="tree">' +
          '<div class="tree__group"><div class="tree__label">报表清单</div>' +
            DB.reports.map(function (r) {
              return '<a class="tree__node ' + (r.id === rep.id ? "is-active" : "") + '" href="#/report?r=' + r.id + '">' +
                     esc(r.name) + (r.masked ? '<span class="cnt">🔒</span>' : "") + "</a>";
            }).join("") +
          "</div></div></div></div>" +

        '<div class="card"><div class="card__head">' + esc(rep.name) +
          (rep.masked ? '<span class="tag tag--orange">受敏感权限脱敏</span>' : '<span class="tag tag--green">无脱敏</span>') +
        "</div><div class=\"card__body\">" +
          '<div class="small muted" style="margin-bottom:14px">' + esc(rep.desc) + "</div>" +
          '<div class="section-title">筛选条件</div>' +
          '<div class="grid c3">' +
            '<div class="field"><label>时间范围</label><div class="row">' +
              '<input class="input" type="date" value="2026-01-01" style="flex:1"><span>至</span>' +
              '<input class="input" type="date" value="' + DB.TODAY + '" style="flex:1"></div></div>' +
            '<div class="field"><label>CP / SKU 范围</label><select class="select"><option>全部</option>' +
              DB.products.map(function (p) { return "<option>" + p.cp + " / " + p.sku + " " + esc(p.cn) + "</option>"; }).join("") +
              "</select></div>" +
            '<div class="field"><label>供应商</label><select class="select"><option>全部供应商</option>' +
              DB.suppliers.map(function (s) { return "<option>" + esc(UI.supplierLabel(s.code)) + "</option>"; }).join("") +
              "</select></div>" +
            '<div class="field"><label>数据来源</label><select class="select"><option>全部来源</option>' +
              DB.dataSources.map(function (d) { return "<option>" + esc(d.name) + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label>可信度</label><select class="select"><option>全部</option><option>A</option><option>B</option><option>C</option><option>D</option></select></div>' +
            '<div class="field"><label>客户</label><select class="select"><option>全部客户</option>' +
              DB.customers.map(function (c) { return "<option>" + esc(c.short) + "</option>"; }).join("") + "</select></div>" +
          "</div>" +

          (rep.masked && !State.sensitive
            ? alertBox("warn", "🔒", "当前账号无【供应商敏感数据查看】权限：本报表导出时<b>供应商名称、单价、起订量输出 ***</b>，供应商代码正常输出。")
            : "") +

          '<div class="section-title">报表预览<div class="spacer"></div>' +
            '<button class="btn btn--sm btn--primary" onclick="Prod.exportOne(\'' + esc(rep.name) + "'," + rep.masked + ')">导出 Excel</button></div>' +
          reportPreview(rep) +
        "</div></div>" +
      "</div>";

    return { crumb: "<b>报表中心</b>", html: html };
  });

  function reportPreview(rep) {
    if (rep.id === "R1") {
      return table([
        { t: "CP 编码", k: function (r) { return '<span class="mono">' + esc(r.cp) + "</span>"; } },
        { t: "OE 编号", k: function (r) { return '<span class="mono">' + esc(r.oe) + "</span>"; } },
        { t: "OE 品牌", k: "brand" },
        { t: "标准化 OE", k: function (r) { return '<span class="mono muted">' + esc(r.norm) + "</span>"; } },
        { t: "来源", k: "src" },
        { t: "可信度", k: function (r) { return UI.confBadge(r.conf); } },
        { t: "出现来源数", cls: "num", k: function (r) { return DB.oeSources(r.cp, r.norm).length; } }
      ], window.OE_ROWS.slice(0, 12)) + '<div class="small muted" style="margin-top:8px">预览前 12 行，全量 ' + window.OE_ROWS.length + " 行</div>";
    }
    if (rep.id === "R2" || rep.id === "R4") {
      var rows = DB.quotes.filter(function (q) { return q.current; });
      if (rep.id === "R4") rows = rows.filter(function (q) { return DB.quoteStatus(q).key !== "valid"; });
      return table([
        { t: "SKU", k: function (r) { return '<span class="mono">' + r.sku + "</span>"; } },
        { t: "供应商代码", k: function (r) { return '<span class="mono">' + r.supplier + "</span>"; } },
        { t: "供应商名称", k: function (r) { return UI.supplierName(r.supplier); } },
        { t: "单价", cls: "num", k: function (r) { return State.sensitive ? UI.money(r.price, r.cur) : UI.mask(r.price); } },
        { t: "起订量", cls: "num", k: function (r) { return State.sensitive ? r.moq : UI.mask(r.moq); } },
        { t: "有效期至", k: "validTo" },
        { t: "状态", k: function (r) { var s = DB.quoteStatus(r); return '<span class="tag ' + s.cls + '">' + s.label + "</span>"; } }
      ], rows);
    }
    if (rep.id === "R3") {
      return table([
        { t: "订单号", k: function (o) { return '<span class="mono">' + o.no + "</span>"; } },
        { t: "类型", k: "type" },
        { t: "往来单位", k: function (o) { return o.type === "采购订单" ? UI.supplierName(o.party) : esc(o.partyName); } },
        { t: "SKU", k: "sku" },
        { t: "数量", cls: "num", k: "qty" },
        { t: "快照单价", cls: "num", k: function (o) {
            return o.type === "采购订单" && !State.sensitive ? UI.mask(o.price) : UI.money(o.price, o.cur); } },
        { t: "金额", cls: "num", k: function (o) {
            return o.type === "采购订单" && !State.sensitive ? UI.mask(o.amount) : UI.money(o.amount, o.cur); } },
        { t: "状态", k: "status" }
      ], DB.orders);
    }
    if (rep.id === "R5") {
      var rows5 = [];
      DB.customers.forEach(function (c) {
        rows5.push({
          c: c,
          quoted: DB.customerSkus(c.id, "quoted").length,
          sold: DB.customerSkus(c.id, "sold").length,
          shipped: DB.customerSkus(c.id, "shipped").length,
          unsold: DB.customerSkus(c.id, "unsold").length
        });
      });
      return table([
        { t: "客户", k: function (r) { return esc(r.c.name); } },
        { t: "国家", k: function (r) { return esc(r.c.country); } },
        { t: "等级", k: function (r) { return esc(r.c.level); } },
        { t: "已报价", cls: "num", k: "quoted" },
        { t: "已销售", cls: "num", k: "sold" },
        { t: "已出运", cls: "num", k: "shipped" },
        { t: "已报价未销售", cls: "num", k: function (r) {
            return r.unsold ? '<span class="tag tag--orange">' + r.unsold + "</span>" : "0"; } }
      ], rows5);
    }
    var rows6 = [];
    DB.categories.forEach(function (c1) {
      c1.children.forEach(function (c2) {
        var ps = DB.productsOfCategory(c2.key);
        rows6.push({ a: c1.name, b: c2.name, n: ps.length,
          oe: ps.reduce(function (s, p) { return s + DB.oeOf(p.cp).length; }, 0),
          cov: ps.map(function (p) { return p.coverage; }).join("、") });
      });
    });
    return table([
      { t: "产品大类", k: "a" }, { t: "产品小类", k: "b" },
      { t: "SKU 数量", cls: "num", k: "n" }, { t: "OE 记录数", cls: "num", k: "oe" },
      { t: "覆盖状态", k: "cov" }
    ], rows6);
  }

  /* ====================== 页面 10｜系统设置 ====================== */

  route("/setting", "setting", function (q) {
    var tab = q.tab || "user";
    var tabs = [
      { k: "user",   label: "用户管理", cnt: DB.users.length },
      { k: "role",   label: "角色权限管理", cnt: DB.roles.length },
      { k: "source", label: "数据源配置", cnt: DB.dataSources.length },
      { k: "enum",   label: "枚举配置" },
      { k: "log",    label: "全局操作日志", cnt: DB.sysLogs.length }
    ];

    var content;
    if (tab === "user") {
      content = '<div class="row" style="margin-bottom:12px"><div class="spacer"></div>' +
        '<button class="btn btn--primary" onclick="stub(\'新增用户\')">新增用户</button></div>' +
        table([
          { t: "账号", k: function (u) { return '<span class="mono">' + esc(u.acct) + "</span>"; } },
          { t: "姓名", k: "name" },
          { t: "角色", k: function (u) { return '<span class="tag tag--outline">' + esc(u.role) + "</span>"; } },
          { t: "供应商敏感数据查看", k: function (u) {
              return '<span class="tag ' + (u.sensitive ? "tag--green" : "tag--red") + '">' + (u.sensitive ? "已授权" : "未授权") + "</span>"; } },
          { t: "状态", k: function (u) {
              return '<span class="tag ' + (u.state === "启用" ? "tag--green" : "tag--grey") + '">' + esc(u.state) + "</span>"; } },
          { t: "操作", cls: "act", k: function (u) {
              return '<button class="btn btn--text" onclick="Biz.loginAs(\'' + esc(u.acct) + '\')">模拟登录</button>' +
                     '<button class="btn btn--text" onclick="stub(\'编辑用户\')">编辑</button>'; } }
        ], DB.users) +
        '<div style="margin-top:12px">' +
        alertBox("info", "ⓘ", "点击【模拟登录】可切换到该账号视角，直观查看脱敏效果——这是原型演示能力，正式系统由后端鉴权控制。") +
        "</div>";
    } else if (tab === "role") {
      content = table([
        { t: "角色名称", k: "name" },
        { t: "用户数", cls: "num", k: "users" },
        { t: "权限点", cls: "wrap", k: function (r) {
            return '<div class="tag-list">' + r.perms.map(function (p) {
              return '<span class="tag ' + (p === "供应商敏感数据查看" ? "tag--orange" : "tag--outline") + '">' + esc(p) + "</span>";
            }).join("") + "</div>"; } },
        { t: "操作", cls: "act", k: function () { return '<button class="btn btn--text" onclick="stub(\'配置权限\')">配置权限</button>'; } }
      ], DB.roles) +
      '<div style="margin-top:14px">' +
      '<div class="card"><div class="card__head">权限点说明　·　【供应商敏感数据查看】</div><div class="card__body">' +
        '<dl class="dl">' +
          "<dt>权限描述</dt><dd>允许查看供应商真实名称、报价、起订量等敏感报价信息</dd>" +
          "<dt>关闭后效果</dt><dd>供应商名称、单价、货币、起订量全部脱敏为 ***；新增 / 复制报价按钮置灰；开单页不做自动计算；报表导出同步脱敏</dd>" +
          "<dt>不受影响</dt><dd><b>供应商代码全局唯一、全部角色可见</b>，作为单据与报表的关联索引</dd>" +
          "<dt>数据库</dt><dd>原始数据完整保存不变，脱敏只发生在展示层与导出层</dd>" +
        "</dl>" +
        '<div style="margin-top:12px">' +
        alertBox("warn", "⚠️", "审批权限隔离：替代关系新增 / 修改、CP 合并拆分等高风险操作，<b>提交人与审批人不能为同一人</b>。") +
        "</div></div></div></div>";
    } else if (tab === "source") {
      content = '<div class="row" style="margin-bottom:12px"><div class="spacer"></div>' +
        '<button class="btn btn--primary" onclick="stub(\'新增数据源\')">新增数据源</button>' +
        '<button class="btn" onclick="CP.importModal()">手动导入</button></div>' +
        table([
          { t: "数据源名称", k: "name" },
          { t: "接入方式", k: function (d) { return '<span class="tag tag--outline">' + esc(d.type) + "</span>"; } },
          { t: "同步策略", k: "freq" },
          { t: "最近同步", k: "last" },
          { t: "状态", k: function (d) {
              return d.state === "已连接" ? '<span class="tag tag--green">已连接</span>' : '<span class="muted">—</span>'; } },
          { t: "本库 OE 记录数", cls: "num", k: "rows" },
          { t: "操作", cls: "act", k: function () {
              return '<button class="btn btn--text" onclick="stub(\'立即同步\')">立即同步</button>' +
                     '<button class="btn btn--text" onclick="stub(\'配置清洗规则\')">清洗规则</button>'; } }
        ], DB.dataSources) +
        '<div style="margin-top:12px">' +
        alertBox("info", "ⓘ", "<b>OE 标准化清洗规则</b>：统一转大写 → 去除空格、横杠、点号等分隔符 → 得到标准化 OE 号参与聚合与查重。" +
          "例：<span class=\"mono\">0020942404</span> 与 <span class=\"mono\">A0020942404</span> 需人工判定是否同号；" +
          "<span class=\"mono\">9325100050</span> 与 <span class=\"mono\">93251-0050</span> 标准化后视为同号。") +
        "</div>";
    } else if (tab === "enum") {
      content = '<div class="grid c2">' + Object.keys(DB.enums).map(function (k) {
        return '<div class="card"><div class="card__head">' + esc(k) +
          '<div class="spacer"></div><button class="btn btn--sm" onclick="stub(\'新增枚举项\')">新增</button></div>' +
          '<div class="card__body"><div class="tag-list">' +
            DB.enums[k].map(function (v) { return '<span class="tag tag--outline">' + esc(v) + "</span>"; }).join("") +
          "</div></div></div>";
      }).join("") + "</div>";
    } else {
      content = table([
        { t: "对象", k: function (l) { return '<span class="mono">' + esc(l.target) + "</span>"; } },
        { t: "操作人", k: "user" },
        { t: "操作时间", k: "at" },
        { t: "变更字段", cls: "wrap", k: "field" },
        { t: "变更前", cls: "wrap", k: function (l) { return '<span class="muted">' + esc(l.before) + "</span>"; } },
        { t: "变更后", cls: "wrap", k: function (l) { return "<b>" + esc(l.after) + "</b>"; } }
      ], DB.sysLogs) +
      '<div style="margin-top:12px">' +
      alertBox("info", "ⓘ", "审计日志记录<b>变更前后快照</b>（操作类型、操作人、时间、变更前值、变更后值、变更原因），" +
        "全部数据<b>禁止物理删除</b>，一律逻辑停用 + 归档，保证历史单据可追溯。") + "</div>";
    }

    var html =
      '<div class="page-head"><div><h1>系统设置</h1><p>用户、角色权限、数据源、枚举与全局审计日志。</p></div></div>' +
      '<div class="card"><div class="card__body" style="padding:0">' +
        UI.tabBar(tabs, tab, function (k) { return "#/setting?tab=" + k; }) +
        '<div style="padding:16px">' + content + "</div>" +
      "</div></div>";

    return { crumb: "<b>系统设置</b>", html: html };
  });

  /* ====================== 交互 ====================== */

  window.Biz = {
    supSearch: function (e) {
      e.preventDefault();
      var kw = e.target.kw.value.trim();
      location.hash = "#/supplier/list" + (kw ? "?kw=" + encodeURIComponent(kw) : "");
      return false;
    },
    orderSearch: function (e) {
      e.preventDefault();
      var f = e.target, qs = [];
      if (f.type.value) qs.push("type=" + encodeURIComponent(f.type.value));
      if (f.kw.value.trim()) qs.push("kw=" + encodeURIComponent(f.kw.value.trim()));
      location.hash = "#/order/list" + (qs.length ? "?" + qs.join("&") : "");
      return false;
    },
    orderPick: function (sku, sup) {
      var p = DB.productBySku(sku);
      location.hash = "#/order/create?sku=" + sku + "&sup=" + encodeURIComponent(sup || p.suppliers[0]);
    },
    orderSubmit: function () {
      var qty = document.getElementById("ordQty");
      var moq = Number(qty.getAttribute("data-moq")) || 0;
      var n = Number(qty.value) || 0;
      if (!moq) { toast("无有效报价，不可提交订单，请先重新询价"); return; }
      if (n < moq) { toast("数量低于最小起订量 " + moq + "，请修正后再提交"); qty.focus(); return; }
      toast("原型演示：订单已提交，已写入完整订单快照");
    },

    supModal: function (code) {
      var s = code ? DB.supplierByCode(code) : null;
      openModal({
        title: (s ? "编辑" : "新增") + "供应商",
        body:
          '<div class="field"><label><span class="req">*</span>供应商代码</label>' +
            '<input class="input mono" id="sup_code" value="' + esc(s ? s.code : "") + '" placeholder="例：S-FI-001"' +
            (s ? " readonly" : "") + ">" +
            '<div class="hint">全局唯一，不可重复；创建后不可修改；全部角色可见，不受脱敏权限控制</div></div>' +
          '<div class="field"><label><span class="req">*</span>供应商名称</label>' +
            '<input class="input" value="' + esc(s ? s.name : "") + '"></div>' +
          '<div class="grid c2" style="gap:0 14px">' +
            '<div class="field"><label>联系人</label><input class="input" value="' + esc(s ? s.contact : "") + '"></div>' +
            '<div class="field"><label>联系电话</label><input class="input" value="' + esc(s ? s.phone : "") + '"></div>' +
          "</div>" +
          '<div class="field"><label>地址</label><input class="input" value="' + esc(s ? s.addr : "") + '"></div>' +
          '<div class="section-title">权限可见性设置</div>' +
          '<div class="field"><label>供应商名称</label><div class="row">' +
            '<label class="check"><input type="radio" name="vn"' + (s && s.nameVisible ? " checked" : "") + "> 业务角色可见</label>" +
            '<label class="check"><input type="radio" name="vn"' + (!s || !s.nameVisible ? " checked" : "") + "> 业务角色不可见</label>" +
          "</div></div>" +
          '<div class="field"><label>供应商报价数据</label><div class="row">' +
            '<label class="check"><input type="radio" name="vp"' + (s && s.priceVisible ? " checked" : "") + "> 业务角色可见</label>" +
            '<label class="check"><input type="radio" name="vp"' + (!s || !s.priceVisible ? " checked" : "") + "> 业务角色不可见</label>" +
          "</div></div>" +
          '<div class="field"><label>备注</label><textarea class="textarea" rows="2">' + esc(s ? s.note : "") + "</textarea></div>",
        foot: '<button class="btn" data-close>取消</button>' +
              '<button class="btn btn--primary" onclick="closeModal();toast(\'原型演示：供应商已保存\')">保存</button>'
      });
    },

    changeModal: function () {
      openModal({
        title: "新增需求变更申请",
        body:
          '<div class="field"><label><span class="req">*</span>所属模块</label><select class="select">' +
            ["CP 公共库", "自有产品库", "供应商", "订单", "报表", "系统设置"].map(function (m) {
              return "<option>" + m + "</option>"; }).join("") + "</select></div>" +
          '<div class="field"><label><span class="req">*</span>修改申请提出人</label>' +
            '<input class="input" value="' + esc(State.user.name) + "（" + esc(State.user.role) + '）">' +
            '<div class="hint">自动带出当前登录账号，可修改</div></div>' +
          '<div class="field"><label><span class="req">*</span>修改理由</label>' +
            '<textarea class="textarea" rows="3" placeholder="详细描述业务诉求、期望的页面/字段改动、影响范围"></textarea></div>' +
          '<div class="field"><label>图片证明</label>' +
            '<div class="photo photo--empty" style="cursor:pointer;height:90px" onclick="stub(\'选择文件\')">' +
            "点击上传截图 / Excel / 聊天记录，支持多文件</div></div>" +
          '<div class="field"><label>关联页面 / 数据</label>' +
            '<input class="input" placeholder="填写受影响页面、SKU / CP 编号，例：/cp-library/detail、CP00000001"></div>' +
          '<div class="field"><label><span class="req">*</span>审核人</label><select class="select">' +
            "<option>架构负责人</option><option>产品经理</option></select>" +
            '<div class="hint">提交人与审核人不能为同一人</div></div>',
        foot: '<button class="btn" data-close>取消</button>' +
              '<button class="btn btn--primary" onclick="closeModal();toast(\'已提交，状态变为【待审核】，等待审核人处理\')">提交申请</button>'
      });
    },

    loginAs: function (acct) {
      var u = null;
      DB.users.forEach(function (x) { if (x.acct === acct) u = x; });
      if (!u) return;
      State.user = { name: u.name, acct: u.acct, role: u.role };
      State.sensitive = u.sensitive;
      toast("已切换到账号【" + esc(u.name) + " · " + esc(u.role) + "】，" +
            (u.sensitive ? "拥有" : "<b>不具备</b>") + "【供应商敏感数据查看】权限");
      rerender();
    }
  };
})();

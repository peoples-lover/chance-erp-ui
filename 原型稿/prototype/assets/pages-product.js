/* ==========================================================================
   页面 4-5：自有产品库列表 / 自有产品详情
   核心约束：全程不跳转 CP 公共库；CP 引用编号与 OE 引用均只读展示
   ========================================================================== */

(function () {
  "use strict";
  var esc = UI.esc, table = UI.table, alertBox = UI.alertBox;

  var VIEWS = [
    { k: "all",     label: "全部" },
    { k: "quoted",  label: "已报价产品" },
    { k: "sold",    label: "已销售产品" },
    { k: "shipped", label: "已出运产品" },
    { k: "unsold",  label: "已报价未销售产品" }
  ];

  /* ====================== 页面 4｜自有产品库列表 ====================== */

  route("/product/list", "product", function (q) {
    var cust = q.cust || "";
    var cat  = q.cat  || "";
    var view = q.view || "all";
    var kw   = (q.kw || "").trim().toUpperCase();

    /* ---- 左侧目录树 ---- */
    var tree = '<div class="card"><div class="card__body" style="padding:12px">' +
      '<div class="tree">' +

      '<div class="tree__group"><div class="tree__label">客户目录</div>' +
        DB.customers.map(function (c) {
          var n = DB.customerSkus(c.id, "all").length;
          return '<a class="tree__node tree__node--l2 ' + (cust === c.id ? "is-active" : "") + '" ' +
                 'href="#/product/list?cust=' + c.id + '&view=' + view + '">' +
                 esc(c.short) + '<span class="cnt">' + n + "</span></a>";
        }).join("") +
      "</div>" +

      '<div class="tree__group"><div class="tree__label">公司目录（产品类目）</div>' +
        '<a class="tree__node ' + (!cust && !cat ? "is-active" : "") + '" href="#/product/list">' +
          '<span class="caret">▣</span>全部产品<span class="cnt">' + DB.products.length + "</span></a>" +
        DB.categories.map(function (c1, i) {
          var boxId = "cat-" + i;
          var n1 = DB.productsOfCategory(c1.key).length;
          return '<div class="tree__node ' + (cat === c1.key ? "is-active" : "") + '" data-toggle-children="' + boxId + '" ' +
                   'onclick="Prod.goCat(event,\'' + c1.key + '\')">' +
                   '<span class="caret">▼</span>' + esc(c1.name) + '<span class="cnt">' + n1 + "</span></div>" +
                 '<div class="tree__children is-open" id="' + boxId + '">' +
                   c1.children.map(function (c2) {
                     var n2 = DB.productsOfCategory(c2.key).length;
                     return '<a class="tree__node tree__node--l3 ' + (cat === c2.key ? "is-active" : "") + '" ' +
                            'href="#/product/list?cat=' + encodeURIComponent(c2.key) + '">' +
                            esc(c2.name) + '<span class="cnt">' + n2 + "</span></a>";
                   }).join("") +
                 "</div>";
        }).join("") +
      "</div>" +

      "</div></div></div>";

    /* ---- 右侧列表 ---- */
    var rows, scopeNote;
    if (cust) {
      var c = DB.customerById(cust);
      var links = DB.customerSkus(cust, view);
      rows = links.map(function (l) {
        var p = DB.productBySku(l.sku);
        return Object.assign({}, p, { _link: l });
      });
      scopeNote = "客户目录：" + esc(c.name) + "　·　" + esc(c.country) + "　·　" + esc(c.level);
    } else {
      rows = DB.productsOfCategory(cat);
      scopeNote = cat ? "公司目录：" + esc(catName(cat)) : "公司目录：全部产品";
    }

    if (kw) {
      rows = rows.filter(function (p) {
        if (p.sku.indexOf(kw) >= 0 || p.cp.indexOf(kw) >= 0) return true;
        if (p.cn.indexOf(q.kw) >= 0 || p.en.toUpperCase().indexOf(kw) >= 0) return true;
        return DB.oeOf(p.cp).some(function (r) { return r.norm.indexOf(kw.replace(/[^0-9A-Z]/g, "")) >= 0; });
      });
    }

    var cols = [
      { t: "SKU 编码", w: "94px", k: function (p) { return '<a class="mono strong" href="#/product/detail?sku=' + p.sku + '">' + p.sku + "</a>"; } },
      { t: "CP 引用编号", w: "116px", k: function (p) {
          return '<span class="mono muted" title="仅展示，不可跳转 CP 公共库">' + esc(p.cp) + "</span>"; } },
      { t: "中文品名", k: "cn" },
      { t: "产品类目", cls: "wrap", k: function (p) { return '<div class="small">' + esc(p.cat1) + '<br><span class="muted">' + esc(p.cat2) + "</span></div>"; } },
      { t: "供应商", k: function (p) {
          return '<div class="tag-list">' + p.suppliers.map(function (s) {
            return '<span class="tag tag--outline mono">' + esc(s) + "</span>";
          }).join("") + "</div>"; } },
      { t: "有效报价", cls: "num", k: function (p) {
          var n = DB.quotesOf(p.sku, { currentOnly: true }).filter(function (qq) {
            return DB.quoteStatus(qq).key === "valid"; }).length;
          return n ? '<span class="tag tag--green">' + n + " 条</span>" : '<span class="tag tag--red">无有效报价</span>'; } },
      { t: "状态", w: "70px", k: function (p) { return '<span class="tag tag--green">' + esc(p.status) + "</span>"; } }
    ];

    if (cust) {
      cols.splice(6, 0, { t: "客户业务状态", k: function (p) {
        var l = p._link, t = [];
        if (l.quoted)  t.push('<span class="tag tag--blue">已报价</span>');
        if (l.sold)    t.push('<span class="tag tag--green">已销售</span>');
        if (l.shipped) t.push('<span class="tag tag--green">已出运</span>');
        if (l.quoted && !l.sold) t.push('<span class="tag tag--orange">报价未销售</span>');
        return '<div class="tag-list">' + t.join("") + "</div>";
      }});
    }

    cols.push({ t: "操作", cls: "act", k: function (p) {
      return '<a class="btn btn--text" href="#/product/detail?sku=' + p.sku + '">查看详情</a>' +
             '<a class="btn btn--text" href="#/order/create?sku=' + p.sku + '">开单</a>';
    }});

    var viewBar = cust
      ? '<div class="row" style="padding:12px 16px 0">' +
          '<div class="segmented">' + VIEWS.map(function (v) {
            var n = DB.customerSkus(cust, v.k).length;
            return '<a class="segmented__item ' + (view === v.k ? "is-active" : "") + '" ' +
                   'href="#/product/list?cust=' + cust + "&view=" + v.k + '">' + v.label + " " + n + "</a>";
          }).join("") + "</div>" +
          '<div class="spacer"></div>' +
          '<span class="small muted">统计视图，数据由报价 / 销售订单 / 出运单据回写，<b>不能手工标记</b></span>' +
        "</div>"
      : "";

    var list = '<div class="card"><div class="card__head">' +
        '<form class="row" onsubmit="return Prod.search(event)">' +
          '<input type="hidden" name="cust" value="' + esc(cust) + '">' +
          '<input type="hidden" name="cat" value="' + esc(cat) + '">' +
          '<input type="hidden" name="view" value="' + esc(view) + '">' +
          '<input class="input search" name="kw" placeholder="搜索 SKU / 品名 / OE / CP 编码" value="' + esc(q.kw || "") + '">' +
          '<button class="btn btn--primary" type="submit">搜索</button>' +
        "</form>" +
        '<div class="spacer"></div>' +
        '<button class="btn" onclick="stub(\'新增自有 SKU — 查重键：标准化主 OE + 品牌 + 质量等级 + 包装 + 供应商\')">新增</button>' +
        '<button class="btn" onclick="CP.importModal()">批量导入</button>' +
        '<button class="btn" onclick="stub(\'导出 Excel\')">导出</button>' +
      "</div>" +
      viewBar +
      '<div class="card__body tight" style="padding-top:12px">' +
        table(cols, rows, { empty: cust ? "该客户在当前视图下暂无产品" : "暂无产品" }) +
      "</div></div>";

    var html =
      '<div class="page-head"><div>' +
        "<h1>自有产品库</h1>" +
        "<p>经营库 / 可销售库。" + scopeNote + "</p>" +
      "</div></div>" +
      alertBox("info", "ⓘ",
        "自有库<b>不维护 OE 主数据</b>，只引用公共库 CP 编码与标准化 OE 号。列表中的 CP 引用编号<b>仅做展示，不可点击跳转 CP 公共库</b>；" +
        "修改 OE 请前往 CP 公共库模块。") +
      '<div class="split" style="margin-top:14px">' + tree + list + "</div>";

    return { crumb: "<b>自有产品库</b>", html: html };
  });

  function catName(key) {
    var out = key;
    DB.categories.forEach(function (c1) {
      if (c1.key === key) out = c1.name;
      c1.children.forEach(function (c2) { if (c2.key === key) out = c1.name + " / " + c2.name; });
    });
    return out;
  }

  /* ====================== 页面 5｜自有产品详情 ====================== */

  var P_TABS = [
    { k: "spec",   label: "规格" },
    { k: "photo",  label: "图片" },
    { k: "file",   label: "附件" },
    { k: "qhist",  label: "报价历史" },
    { k: "shist",  label: "销售历史" },
    { k: "phist",  label: "采购历史" },
    { k: "oeref",  label: "OE 引用" },
    { k: "cross",  label: "OE 交叉关系" },
    { k: "syslog", label: "系统操作日志" },
    { k: "chlog",  label: "变更日志" },
    { k: "export", label: "报表导出" }
  ];

  route("/product/detail", "product", function (q) {
    var p = DB.productBySku(q.sku || "4020340");
    if (!p) return { crumb: "自有产品库", html: '<div class="card"><div class="tbl-empty">SKU 不存在</div></div>' };

    var tab = q.tab || "spec";
    /* 供应商选择跨 Tab 记忆：规格 Tab ↔ 图片 Tab 同步 */
    var sup = q.sup || State.supplierPick[p.sku] || p.suppliers[0];
    State.supplierPick[p.sku] = sup;

    var tabs = P_TABS.map(function (t) {
      var c = null;
      if (t.k === "qhist")  c = DB.quotesOf(p.sku).length;
      if (t.k === "shist")  c = DB.ordersOf(p.sku, "销售订单").length;
      if (t.k === "phist")  c = DB.ordersOf(p.sku, "采购订单").length;
      if (t.k === "oeref")  c = DB.oeDistinct(p.cp).length;
      if (t.k === "cross")  c = DB.relationsOf("sku", p.sku).length;
      if (t.k === "syslog") c = DB.sysLogsFor(p.sku).length;
      if (t.k === "chlog")  c = DB.changeLogsFor(p.sku).length;
      return { k: t.k, label: t.label, cnt: c };
    });

    var head =
      '<div class="page-head"><div>' +
        "<h1>SKU " + esc(p.sku) + "｜" + esc(p.cn) + "</h1>" +
        "<p>" + esc(p.en) + "　·　CP 引用编号 <span class=\"mono\">" + esc(p.cp) + "</span>" +
        '<span class="tag tag--grey" style="margin-left:6px">只读引用</span>　·　' + esc(p.cat1) + " / " + esc(p.cat2) + "</p>" +
      '</div><div class="spacer"></div>' +
      '<a class="btn" href="#/product/list">返回列表</a>' +
      '<a class="btn btn--primary" href="#/order/create?sku=' + p.sku + "&sup=" + encodeURIComponent(sup) + '">前往开单</a>' +
      "</div>";

    var body =
      '<div class="card"><div class="card__body" style="padding:0">' +
      UI.tabBar(tabs, tab, function (k) { return "#/product/detail?sku=" + p.sku + "&tab=" + k + "&sup=" + encodeURIComponent(sup); }) +
      '<div style="padding:16px">' + renderPTab(p, tab, sup, q) + "</div>" +
      "</div></div>";

    return { crumb: '<a href="#/product/list">自有产品库</a> / <b>' + esc(p.sku) + "</b>", html: head + body };
  });

  function renderPTab(p, tab, sup, q) {
    switch (tab) {
      case "spec":   return pSpec(p, sup);
      case "photo":  return pPhoto(p, sup);
      case "file":   return pFile(p);
      case "qhist":  return pQuoteHist(p, q);
      case "shist":  return pSalesHist(p);
      case "phist":  return pPurchaseHist(p);
      case "oeref":  return pOeRef(p);
      case "cross":  return pCross(p);
      case "syslog": return pSysLog(p);
      case "chlog":  return pChLog(p);
      case "export": return pExport(p);
    }
    return "";
  }

  /** 供应商下拉（规格 / 图片 Tab 共用，含【全部供应商】） */
  function supplierSelect(p, sup, tab) {
    return '<select class="select" style="min-width:210px" onchange="Prod.pickSupplier(\'' + p.sku + '\',\'' + tab + '\',this.value)">' +
      '<option value="ALL"' + (sup === "ALL" ? " selected" : "") + ">全部供应商</option>" +
      p.suppliers.map(function (code) {
        return '<option value="' + code + '"' + (code === sup ? " selected" : "") + ">" + esc(UI.supplierLabel(code)) + "</option>";
      }).join("") + "</select>";
  }

  /* --- Tab 1 规格 --- */
  function pSpec(p, sup) {
    var isAll = sup === "ALL";
    var img = isAll ? p.mainImg : (p.imgs[sup] || null);
    var supName = isAll ? "" : (DB.supplierByCode(sup) || {}).name;

    var photo = img
      ? '<div class="photo"><img src="' + img + '" alt="">' +
        '<div class="photo__cap">' + (isAll
          ? '<span class="tag tag--blue">全部供应商</span>展示 SKU 全局主图'
          : '<span class="tag tag--blue">' + esc(sup) + "</span>当前展示：" + esc(State.sensitive ? supName : sup) + " 工厂图片") +
        "</div></div>"
      : '<div class="photo photo--empty">系统默认负片<br><span class="small">该工厂暂无实拍图</span></div>';

    var qs = DB.quotesOf(p.sku, { currentOnly: true, supplier: sup });

    var quoteTbl = table([
      { t: "供应商代码", w: "100px", k: function (x) { return '<span class="mono strong">' + esc(x.supplier) + "</span>"; } },
      { t: "供应商名称", k: function (x) { return UI.supplierName(x.supplier); } },
      { t: "单价", cls: "num", k: function (x) { return State.sensitive ? "<b>" + UI.money(x.price) + "</b>" : UI.mask(x.price); } },
      { t: "货币", w: "56px", k: function (x) { return State.sensitive ? x.cur : UI.mask(x.cur); } },
      { t: "起订量", cls: "num", w: "70px", k: function (x) { return State.sensitive ? x.moq : UI.mask(x.moq); } },
      { t: "报价时间", w: "92px", k: "at" },
      { t: "有效期至", w: "92px", k: "validTo" },
      { t: "状态", w: "128px", k: function (x) {
          var s = DB.quoteStatus(x);
          return '<span class="tag ' + s.cls + '">' + s.icon + " " + s.label + "</span>" +
                 '<div class="small muted">' + (s.days < 0 ? "已过期 " + (-s.days) + " 天" : "剩 " + s.days + " 天") + "</div>"; } },
      { t: "报价备注", cls: "wrap", k: function (x) { return State.sensitive ? esc(x.note) : UI.mask(x.note); } },
      { t: "操作", cls: "act", k: function (x) {
          if (!State.sensitive) return '<span class="muted small">无权限</span>';
          return '<button class="btn btn--text" onclick="Prod.quoteModal(\'' + p.sku + '\',\'' + x.supplier + '\')">编辑</button>' +
                 '<button class="btn btn--text btn--danger" onclick="stub(\'删除报价 — 逻辑删除，历史报价仍归档保留\')">删除</button>'; } }
    ], qs, { empty: sup === "ALL" ? "暂无报价" : "该供应商暂无当前有效报价，请重新询价" });

    return '<div class="row" style="margin-bottom:14px">' +
        '<span class="small muted">供应商：</span>' + supplierSelect(p, sup, "spec") +
        '<span class="small muted">切换后，主图、报价表与【图片】Tab 同步联动</span>' +
      "</div>" +

      '<div class="main-photo">' + photo +
        '<div style="flex:1 1 auto;min-width:0">' +
          '<div class="section-title">基础自有产品信息</div>' +
          '<div class="grid c2"><dl class="dl">' +
            "<dt>SKU 编号</dt><dd><span class=\"mono strong\">" + esc(p.sku) + "</span></dd>" +
            "<dt>CP 引用编号</dt><dd><span class=\"mono\">" + esc(p.cp) + '</span><span class="ro">仅文本展示，不可跳转公共库</span></dd>' +
            "<dt>中文品名</dt><dd>" + esc(p.cn) + "</dd>" +
            "<dt>英文品名</dt><dd>" + esc(p.en) + "</dd>" +
            "<dt>中文描述</dt><dd>" + esc(p.cnDesc) + "</dd>" +
            "<dt>英文描述</dt><dd>" + esc(p.enDesc) + "</dd>" +
          "</dl><dl class=\"dl\">" +
            "<dt>报关单位</dt><dd>" + esc(p.unit) + "</dd>" +
            "<dt>报关品名</dt><dd>" + esc(p.decl) + "</dd>" +
            "<dt>海关编码</dt><dd><span class=\"mono\">" + esc(p.hs) + "</span></dd>" +
            "<dt>退税率</dt><dd>" + esc(p.rebate) + "</dd>" +
            "<dt>产品大类</dt><dd>" + esc(p.cat1) + "</dd>" +
            "<dt>产品小类</dt><dd>" + esc(p.cat2) + "</dd>" +
          "</dl></div>" +
        "</div>" +
      "</div>" +

      '<div class="section-title">供应商报价信息' +
        '<small class="muted" style="font-weight:400">（维度 = SKU + 供应商，当前有效报价）</small>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--sm ' + (State.sensitive ? "btn--primary" : "is-disabled") + '" ' +
          'onclick="Prod.quoteModal(\'' + p.sku + '\')">新增报价</button>' +
        '<button class="btn btn--sm ' + (State.sensitive ? "" : "is-disabled") + '" onclick="stub(\'复制报价\')">复制报价</button>' +
        '<button class="btn btn--sm" onclick="stub(\'导出报价 — 无敏感权限时名称与价格输出 ***\')">导出</button>' +
      "</div>" +

      (State.sensitive ? "" : alertBox("warn", "🔒",
        "当前账号<b>无【供应商敏感数据查看】权限</b>：供应商名称、单价、货币、起订量已脱敏为 ***，新增 / 复制报价按钮置灰；" +
        "<b>供应商代码始终可见</b>，作为单据与报表的关联索引。")) +

      quoteTbl +

      '<div style="margin-top:10px">' +
      alertBox("info", "💡",
        "报价维度 = <b>SKU + 供应商</b>，三个 SKU 的报价互相独立；报价过期或删除<b>不会修改已生成订单的价格快照</b>；" +
        "报价新增 / 编辑 / 删除需要独立权限，普通业务人员仅可查看。") +
      "</div>";
  }

  /* --- Tab 2 图片 --- */
  function pPhoto(p, sup) {
    var cards;
    if (sup === "ALL") {
      cards = '<div class="grid c3">' + p.suppliers.map(function (code) {
        var img = p.imgs[code];
        var nm = State.sensitive ? (DB.supplierByCode(code) || {}).name : code;
        return img
          ? '<div class="photo"><img src="' + img + '" alt="">' +
            '<div class="photo__cap"><span class="tag tag--blue">所属工厂</span>' + esc(nm) +
            ' <span class="mono muted">' + esc(code) + "</span></div></div>"
          : '<div class="photo"><div class="photo--empty">系统默认负片</div>' +
            '<div class="photo__cap"><span class="tag tag--grey">所属工厂</span>' + esc(nm) +
            ' <span class="mono muted">' + esc(code) + "</span></div></div>";
      }).join("") +
      '<div class="photo"><img src="' + p.mainImg + '" alt="">' +
        '<div class="photo__cap"><span class="tag tag--green">SKU 全局主图</span>不区分工厂</div></div>' +
      "</div>";
    } else {
      var img = p.imgs[sup];
      var nm = State.sensitive ? (DB.supplierByCode(sup) || {}).name : sup;
      cards = '<div class="grid c3">' + (img
        ? '<div class="photo"><img src="' + img + '" alt="">' +
          '<div class="photo__cap"><span class="tag tag--blue">所属工厂</span>' + esc(nm) + "</div></div>"
        : '<div class="photo"><div class="photo--empty">系统默认负片<br><span class="small">该工厂暂无实拍图</span></div>' +
          '<div class="photo__cap"><span class="tag tag--grey">所属工厂</span>' + esc(nm) + "</div></div>") + "</div>";
    }

    return '<div class="row" style="margin-bottom:14px">' +
        '<span class="small muted">供应商：</span>' + supplierSelect(p, sup, "photo") +
        '<span class="small muted">选项与【规格】Tab 完全一致，跨 Tab 自动同步选中值</span>' +
        '<div class="spacer"></div>' +
        '<button class="btn" onclick="stub(\'上传工厂图片\')">上传图片</button>' +
      "</div>" +
      cards +
      '<div style="margin-top:14px">' +
      alertBox("warn", "💡", "系统默认负片<b>不可删除</b>：工厂无实拍图时统一占位，保证列表与详情页图位不塌陷。") +
      alertBox("warn", "💡", "客户定制颜色 / 工艺图片<b>存储在订单明细行</b>，不会回写至本产品图库，<b>不污染产品主数据</b>。") +
      "</div>";
  }

  /* --- Tab 3 附件 --- */
  function pFile(p) {
    var files = [
      { name: p.sku + "-规格书.pdf",       type: "规格文档", size: "412 KB", by: "wangyy", at: "2026-09-05" },
      { name: p.sku + "-装配图纸.dwg",     type: "图纸",     size: "1.8 MB", by: "wangyy", at: "2026-09-05" },
      { name: p.sku + "-报关要素.xlsx",    type: "报关资料", size: "36 KB",  by: "chenj",  at: "2026-09-08" },
      { name: p.sku + "-第三方检测报告.pdf", type: "认证",   size: "2.4 MB", by: "lizq",   at: "2026-09-11" }
    ];
    return '<div class="row" style="margin-bottom:12px"><div class="spacer"></div>' +
      '<button class="btn btn--primary" onclick="stub(\'上传附件（PDF / 图纸 / 报关资料 / 规格文档）\')">上传附件</button></div>' +
      table([
        { t: "文件名", k: function (f) { return '<a href="javascript:stub(\'预览附件\')">' + esc(f.name) + "</a>"; } },
        { t: "类型", k: "type" },
        { t: "大小", k: "size" },
        { t: "上传人", k: "by" },
        { t: "上传时间", k: "at" },
        { t: "操作", cls: "act", k: function () {
            return '<button class="btn btn--text" onclick="stub(\'预览\')">预览</button>' +
                   '<button class="btn btn--text" onclick="stub(\'下载\')">下载</button>' +
                   '<button class="btn btn--text btn--danger" onclick="stub(\'删除附件（逻辑删除）\')">删除</button>'; } }
      ], files);
  }

  /* --- Tab 4 报价历史 --- */
  function pQuoteHist(p, q) {
    var sf = q.qsup || "ALL";
    var rows = DB.quotesOf(p.sku, { supplier: sf });
    return '<div class="row" style="margin-bottom:12px">' +
        '<span class="small muted">供应商：</span>' +
        '<select class="select" onchange="Prod.qhistFilter(\'' + p.sku + '\',this.value)">' +
          '<option value="ALL"' + (sf === "ALL" ? " selected" : "") + ">全部供应商</option>" +
          p.suppliers.map(function (c) {
            return '<option value="' + c + '"' + (c === sf ? " selected" : "") + ">" + esc(UI.supplierLabel(c)) + "</option>";
          }).join("") + "</select>" +
        '<select class="select"><option>全部时间</option><option>近 3 个月</option><option>近 1 年</option></select>' +
        '<select class="select"><option>全部状态</option><option>有效</option><option>即将过期</option><option>已过期</option></select>' +
        '<div class="spacer"></div>' +
        '<button class="btn" onclick="stub(\'导出报价历史 Excel\')">导出 Excel</button>' +
      "</div>" +
      (State.sensitive ? "" : alertBox("warn", "🔒", "无敏感权限：供应商名称、单价、起订量脱敏为 ***；<b>供应商代码始终可见</b>。")) +
      table([
        { t: "供应商代码", k: function (x) { return '<span class="mono strong">' + esc(x.supplier) + "</span>"; } },
        { t: "供应商名称", k: function (x) { return UI.supplierName(x.supplier); } },
        { t: "单价", cls: "num", k: function (x) { return State.sensitive ? UI.money(x.price) : UI.mask(x.price); } },
        { t: "货币", k: function (x) { return State.sensitive ? x.cur : UI.mask(x.cur); } },
        { t: "起订量", cls: "num", k: function (x) { return State.sensitive ? x.moq : UI.mask(x.moq); } },
        { t: "报价时间", k: "at" },
        { t: "有效期至", k: "validTo" },
        { t: "记录类型", k: function (x) {
            return x.current ? '<span class="tag tag--blue">当前报价</span>' : '<span class="tag tag--grey">历史归档</span>'; } },
        { t: "状态", k: function (x) {
            var s = DB.quoteStatus(x);
            return '<span class="tag ' + s.cls + '">' + s.label + "</span>"; } },
        { t: "操作", cls: "act", k: function () { return '<button class="btn btn--text" onclick="stub(\'查看报价快照\')">查看</button>'; } }
      ], rows) +
      '<div style="margin-top:10px">' +
      alertBox("info", "ⓘ", "报价历史<b>全部归档，不可物理删除</b>。删除当前报价后记录仍保留在本 Tab，用于价格追溯与纠纷举证。") +
      "</div>";
  }

  /* --- Tab 5 销售历史 --- */
  function pSalesHist(p) {
    var rows = DB.ordersOf(p.sku, "销售订单");
    return '<div class="row" style="margin-bottom:12px">' +
        '<select class="select"><option>全部客户</option>' + DB.customers.map(function (c) { return "<option>" + esc(c.short) + "</option>"; }).join("") + "</select>" +
        '<select class="select"><option>全部订单状态</option><option>待确认</option><option>生产中</option><option>已完成</option></select>' +
        '<select class="select"><option>全部出运状态</option><option>已出运</option><option>未出运</option></select>' +
        '<div class="spacer"></div><button class="btn" onclick="stub(\'导出销售历史\')">导出 Excel</button>' +
      "</div>" +
      table([
        { t: "销售订单号", k: function (o) { return '<a class="mono" href="#/order/detail?id=' + o.no + '">' + o.no + "</a>"; } },
        { t: "客户名称", k: "partyName" },
        { t: "订单日期", k: "date" },
        { t: "数量", cls: "num", k: "qty" },
        { t: "单价", cls: "num", k: function (o) { return UI.money(o.price, o.cur); } },
        { t: "订单金额", cls: "num", k: function (o) { return "<b>" + UI.money(o.amount, o.cur) + "</b>"; } },
        { t: "订单状态", k: function (o) { return '<span class="tag tag--blue">' + esc(o.status) + "</span>"; } },
        { t: "出运状态", k: function (o) {
            return '<span class="tag ' + (o.ship === "已出运" ? "tag--green" : "tag--grey") + '">' + esc(o.ship) + "</span>"; } },
        { t: "操作", cls: "act", k: function (o) { return '<a class="btn btn--text" href="#/order/detail?id=' + o.no + '">订单详情</a>'; } }
      ], rows, { empty: "该 SKU 暂无销售记录" }) +
      '<div style="margin-top:10px">' + alertBox("info", "ⓘ", "订单号跳转订单模块，<b>不跳转 CP 公共库</b>。销售单价为订单成交价快照，不随报价变动。") + "</div>";
  }

  /* --- Tab 6 采购历史 --- */
  function pPurchaseHist(p) {
    var rows = DB.ordersOf(p.sku, "采购订单");
    return '<div class="row" style="margin-bottom:12px">' +
        '<select class="select"><option>全部供应商</option>' +
          p.suppliers.map(function (c) { return "<option>" + esc(UI.supplierLabel(c)) + "</option>"; }).join("") + "</select>" +
        '<select class="select"><option>全部订单状态</option><option>草稿</option><option>已下单</option><option>生产中</option><option>已收货</option></select>' +
        '<div class="spacer"></div><button class="btn" onclick="stub(\'导出采购历史\')">导出 Excel</button>' +
      "</div>" +
      table([
        { t: "采购订单号", k: function (o) { return '<a class="mono" href="#/order/detail?id=' + o.no + '">' + o.no + "</a>"; } },
        { t: "供应商代码", k: function (o) { return '<span class="mono">' + esc(o.party) + "</span>"; } },
        { t: "供应商名称", k: function (o) { return UI.supplierName(o.party); } },
        { t: "订单日期", k: "date" },
        { t: "数量", cls: "num", k: function (o) { return o.qty || '<span class="muted">待录入</span>'; } },
        { t: "单价", cls: "num", k: function (o) { return State.sensitive ? UI.money(o.price, o.cur) : UI.mask(o.price); } },
        { t: "订单金额", cls: "num", k: function (o) { return State.sensitive ? "<b>" + UI.money(o.amount, o.cur) + "</b>" : UI.mask(o.amount); } },
        { t: "订单状态", k: function (o) {
            var cls = o.status === "已收货" ? "tag--green" : (o.status === "草稿" ? "tag--grey" : "tag--blue");
            return '<span class="tag ' + cls + '">' + esc(o.status) + "</span>"; } },
        { t: "操作", cls: "act", k: function (o) { return '<a class="btn btn--text" href="#/order/detail?id=' + o.no + '">订单详情</a>'; } }
      ], rows, { empty: "该 SKU 暂无采购记录" });
  }

  /* --- Tab 7 OE 引用（只读） --- */
  function pOeRef(p) {
    var rows = DB.oeDistinct(p.cp);
    return alertBox("info", "🔵",
      "OE 数据<b>引用自 CP 公共库 " + esc(p.cp) + "</b>，本页仅只读查看。修改 OE 请前往 CP 公共库模块；" +
      "公共库更新后本 Tab 自动同步。<b>本页不提供任何跳转 CP 公共库的入口</b>。") +
      '<div class="row" style="margin:12px 0">' +
        '<span class="small muted">共 ' + rows.length + " 个去重 OE（原始记录 " + DB.oeOf(p.cp).length + " 条，同号多来源已合并展示）</span>" +
        '<div class="spacer"></div>' +
        '<button class="btn" onclick="stub(\'导出 OE 清单 — 字段：OE 编号、OE 品牌、出现来源、备注\')">导出 OE 清单</button>' +
      "</div>" +
      table([
        { t: "OE 编号", w: "150px", k: function (r) { return '<span class="mono strong">' + esc(r.oe) + "</span>"; } },
        { t: "OE 品牌", w: "140px", k: function (r) { return esc(r.brand) || '<span class="tag tag--red">缺失</span>'; } },
        { t: "标准化 OE", w: "140px", k: function (r) { return '<span class="mono muted">' + esc(r.norm) + "</span>"; } },
        { t: "出现来源", k: function (r) {
            return '<div class="tag-list">' + DB.oeSources(p.cp, r.norm).map(function (s) {
              return '<span class="tag tag--grey">' + esc(s) + "</span>"; }).join("") + "</div>"; } },
        { t: "可信度", w: "62px", k: function (r) { return UI.confBadge(r.conf); } },
        { t: "备注", cls: "wrap", k: "note" }
      ], rows) +
      '<div style="margin-top:10px">' +
      alertBox("warn", "⚠️", "本 Tab 无新增 / 编辑 / 删除按钮，也无 OE 弹窗——这是<b>引用模式</b>的强制约束，避免自有库复制 OE 主数据造成双份真相。") +
      "</div>";
  }

  /* --- Tab 8 OE 交叉关系（SKU 私有） --- */
  function pCross(p) {
    var rows = DB.relationsOf("sku", p.sku);
    var T = DB.RELATION_TYPES;
    return '<div class="row" style="margin-bottom:12px">' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--primary" onclick="CP.relModal(\'sku\',\'' + p.sku + '\')">新增</button>' +
        '<button class="btn" onclick="stub(\'编辑需重新提交审批\')">编辑</button>' +
        '<button class="btn" onclick="stub(\'删除交叉关系必须审批\')">删除</button>' +
        '<button class="btn" onclick="stub(\'导出 SKU 私有交叉\')">导出</button>' +
        '<button class="btn btn--primary" onclick="Prod.refCpCross(\'' + p.sku + '\',\'' + p.cp + '\')">参考 CP 全局交叉</button>' +
      "</div>" +
      table([
        { t: "本 SKU 绑定 OE", k: function (r) { return '<span class="mono strong">' + esc(r.oeA) + "</span>"; } },
        { t: "本 OE 品牌", k: "brandA" },
        { t: "交叉 OE 编号", k: function (r) { return '<span class="mono strong">' + esc(r.oeB) + "</span>"; } },
        { t: "交叉 OE 品牌", k: "brandB" },
        { t: "关系类型", k: function (r) { return '<span class="tag ' + T[r.type].cls + '">' + T[r.type].label + "</span>"; } },
        { t: "方向", k: "dir" },
        { t: "适用条件", cls: "wrap", k: function (r) { return r.cond === "—" ? '<span class="muted">—</span>' : esc(r.cond); } },
        { t: "号码来源", k: function (r) { return esc(r.src) + " " + UI.confBadge(r.level); } },
        { t: "状态", k: function (r) {
            return '<span class="tag ' + (r.status === "已生效" ? "tag--green" : "tag--orange") + '">' + esc(r.status) + "</span>"; } },
        { t: "备注", cls: "wrap", k: "note" }
      ], rows, { empty: "本 SKU 暂无私有交叉关系" }) +
      '<div style="margin-top:12px">' +
      alertBox("warn", "⚠️", "本页为<b>本 SKU 业务适配交叉</b>，与 CP 全局交叉<b>两套数据隔离、互不覆盖</b>；" +
        "【参考 CP 全局交叉】只做<b>勾选复制</b>，复制后归本 SKU 独立维护。下单适配<b>以供应商供货规则为准</b>。") +
      "</div>";
  }

  /* --- Tab 9 系统操作日志 --- */
  function pSysLog(p) {
    return alertBox("info", "ⓘ", "系统自动记录字段级改动，<b>无需审核、不可编辑</b>。业务功能层面的需求变更请看【变更日志】Tab。") +
      '<div style="margin-top:12px">' +
      table([
        { t: "操作人", w: "90px", k: "user" },
        { t: "操作时间", w: "130px", k: "at" },
        { t: "变更字段", cls: "wrap", k: "field" },
        { t: "旧值", cls: "wrap", k: function (l) { return '<span class="muted">' + esc(l.before) + "</span>"; } },
        { t: "新值", cls: "wrap", k: function (l) { return "<b>" + esc(l.after) + "</b>"; } }
      ], DB.sysLogsFor(p.sku), { empty: "暂无操作记录" }) + "</div>";
  }

  /* --- Tab 10 变更日志 --- */
  function pChLog(p) {
    return table([
      { t: "变更 ID", k: function (c) { return '<a class="mono" href="#/change-log/detail?id=' + c.id + '">' + c.id + "</a>"; } },
      { t: "申请提出人", k: "applicant" },
      { t: "变更简述", cls: "wrap", k: "reason" },
      { t: "附件证明", k: function (c) { return '<a href="javascript:stub(\'预览附件\')">' + esc(c.proof) + "</a>"; } },
      { t: "审核人", k: "approver" },
      { t: "审核状态", k: function (c) {
          return '<span class="tag ' + (c.state === "已审核" ? "tag--green" : "tag--orange") + '">' + esc(c.state) + "</span>"; } },
      { t: "变更时间", k: "at" }
    ], DB.changeLogsFor(p.sku), { empty: "暂无变更记录" }) +
    '<div style="margin-top:10px"><span class="small muted">点击变更 ID 跳转全局需求变更日志详情页面。</span></div>';
  }

  /* --- Tab 11 报表导出 --- */
  function pExport(p) {
    var items = [
      { n: "产品基础信息",              d: "SKU、CP 引用、中英文品名与描述、类目、报关全套字段", m: false },
      { n: "引用 OE 清单（含 OE 品牌）", d: "OE 编号、OE 品牌、标准化 OE、出现来源、可信度、备注", m: false },
      { n: "供应商报价（当前有效）",     d: "供应商代码 / 名称、单价、货币、起订量、有效期、状态", m: true },
      { n: "报价历史",                  d: "含已归档、已过期报价，用于价格追溯", m: true },
      { n: "销售历史",                  d: "销售订单号、客户、数量、单价、出运状态", m: false },
      { n: "采购历史",                  d: "采购订单号、供应商代码、数量、单价、订单状态", m: true }
    ];
    return '<div class="grid c2">' + items.map(function (i) {
      return '<div class="card"><div class="card__body">' +
        '<div class="row"><b>' + esc(i.n) + "</b>" +
          (i.m ? '<span class="tag tag--orange">受敏感权限脱敏</span>' : '<span class="tag tag--green">无脱敏</span>') +
        "</div>" +
        '<div class="small muted" style="margin:6px 0 10px">' + esc(i.d) + "</div>" +
        '<button class="btn btn--sm btn--primary" onclick="Prod.exportOne(\'' + esc(i.n) + "'," + i.m + ')">导出 Excel</button>' +
      "</div></div>";
    }).join("") + "</div>" +
    '<div style="margin-top:12px">' +
    alertBox("info", "ⓘ", "无【供应商敏感数据查看】权限导出时，<b>供应商名称与报价字段输出 ***，供应商代码正常输出</b>；数据库原始数据完整保存不变。") +
    "</div>";
  }

  /* ====================== 交互 ====================== */

  window.Prod = {
    search: function (e) {
      e.preventDefault();
      var f = e.target, qs = [];
      if (f.cust.value) qs.push("cust=" + encodeURIComponent(f.cust.value));
      if (f.cat.value)  qs.push("cat=" + encodeURIComponent(f.cat.value));
      if (f.view.value) qs.push("view=" + f.view.value);
      if (f.kw.value.trim()) qs.push("kw=" + encodeURIComponent(f.kw.value.trim()));
      location.hash = "#/product/list" + (qs.length ? "?" + qs.join("&") : "");
      return false;
    },
    goCat: function (e, key) {
      // 点击父级类目：展开/收起交给委托逻辑，同时切换筛选
      if (e.target.classList.contains("caret")) return;
      location.hash = "#/product/list?cat=" + encodeURIComponent(key);
    },
    pickSupplier: function (sku, tab, val) {
      State.supplierPick[sku] = val;
      location.hash = "#/product/detail?sku=" + sku + "&tab=" + tab + "&sup=" + encodeURIComponent(val);
      toast("已切换供应商：" + esc(val === "ALL" ? "全部供应商" : UI.supplierLabel(val)) + "，规格 / 图片 Tab 已同步");
    },
    qhistFilter: function (sku, val) {
      location.hash = "#/product/detail?sku=" + sku + "&tab=qhist&qsup=" + encodeURIComponent(val);
    },

    quoteModal: function (sku, supplier) {
      var p = DB.productBySku(sku);
      var q = supplier ? DB.currentQuote(sku, supplier) : null;
      openModal({
        title: (q ? "编辑" : "新增") + "供应商报价　·　SKU " + sku,
        body:
          alertBox("info", "ⓘ", "报价维度 = <b>SKU + 供应商</b>。同一供应商新增报价时，旧报价自动归档进【报价历史】，不覆盖、不删除。") +
          '<div class="grid c2" style="gap:0 14px;margin-top:14px">' +
            '<div class="field"><label><span class="req">*</span>供应商</label><select class="select">' +
              p.suppliers.map(function (c) {
                return '<option value="' + c + '"' + (c === supplier ? " selected" : "") + ">" + esc(UI.supplierLabel(c)) + "</option>";
              }).join("") + "</select></div>" +
            '<div class="field"><label><span class="req">*</span>货币</label><select class="select">' +
              ["USD", "EUR", "CNY"].map(function (c) {
                return "<option" + (q && q.cur === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label><span class="req">*</span>单价</label><input class="input" type="number" step="0.01" value="' + (q ? q.price : "") + '"></div>' +
            '<div class="field"><label><span class="req">*</span>最小起订量 MOQ</label><input class="input" type="number" value="' + (q ? q.moq : "") + '"></div>' +
            '<div class="field"><label><span class="req">*</span>报价时间</label><input class="input" type="date" value="' + (q ? q.at : DB.TODAY) + '"></div>' +
            '<div class="field"><label><span class="req">*</span>有效期至</label><input class="input" type="date" value="' + (q ? q.validTo : "") + '"></div>' +
          "</div>" +
          '<div class="field"><label>报价备注</label><textarea class="textarea" rows="2">' + esc(q ? q.note : "") + "</textarea></div>",
        foot: '<button class="btn" data-close>取消</button>' +
              '<button class="btn btn--primary" onclick="closeModal();toast(\'原型演示：报价已保存，旧报价已归档\')">保存</button>'
      });
    },

    /** 参考 CP 全局交叉 → 勾选复制到 SKU 私有交叉 */
    refCpCross: function (sku, cp) {
      var T = DB.RELATION_TYPES;
      var rows = DB.relationsOf("cp", cp);
      var existing = DB.relationsOf("sku", sku).map(function (r) { return r.oeA + ">" + r.oeB; });
      openModal({
        wide: true,
        title: "参考 CP 全局交叉　·　" + cp,
        body:
          alertBox("warn", "⚠️", "勾选后<b>复制</b>到本 SKU 私有交叉，两套数据自此<b>相互隔离、互不覆盖</b>；" +
            "后续 CP 全局交叉变更不会自动同步到已复制的 SKU 私有记录。") +
          '<div style="margin-top:12px">' +
          UI.table([
            { t: "", w: "36px", k: function (r) {
                var dup = existing.indexOf(r.oeA + ">" + r.oeB) >= 0;
                return '<input type="checkbox" ' + (dup ? "disabled" : "") + ' style="accent-color:var(--brand)">'; } },
            { t: "主 OE", k: function (r) { return '<span class="mono">' + esc(r.oeA) + "</span> " + esc(r.brandA); } },
            { t: "交叉 OE", k: function (r) { return '<span class="mono">' + esc(r.oeB) + "</span> " + esc(r.brandB); } },
            { t: "关系类型", k: function (r) { return '<span class="tag ' + T[r.type].cls + '">' + T[r.type].label + "</span>"; } },
            { t: "方向", k: "dir" },
            { t: "来源", k: function (r) { return esc(r.src) + " " + UI.confBadge(r.level); } },
            { t: "状态", k: function (r) {
                var dup = existing.indexOf(r.oeA + ">" + r.oeB) >= 0;
                return dup ? '<span class="tag tag--grey">已复制</span>' : '<span class="tag tag--blue">可复制</span>'; } }
          ], rows, { empty: "该 CP 暂无全局交叉关系" }) + "</div>",
        foot: '<button class="btn" data-close>取消</button>' +
              '<button class="btn btn--primary" onclick="closeModal();toast(\'已复制到本 SKU 私有交叉（原型演示）\')">复制选中项</button>'
      });
    },

    exportOne: function (name, masked) {
      if (masked && !State.sensitive) {
        toast("已导出《" + esc(name) + "》：供应商名称与报价字段输出 ***，供应商代码正常输出");
      } else {
        toast("已导出《" + esc(name) + "》（原型演示）");
      }
    }
  };
})();

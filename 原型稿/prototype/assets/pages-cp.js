/* ==========================================================================
   页面 1-3：首页仪表盘 / CP 公共库列表 / CP 公共库详情
   ========================================================================== */

(function () {
  "use strict";
  var esc = UI.esc, table = UI.table, alertBox = UI.alertBox, statCard = UI.statCard;

  /* ====================== 页面 1｜首页仪表盘 ====================== */

  route("/dashboard", "dashboard", function () {
    var s = DB.stats();
    var confTotal = s.conf.A + s.conf.B + s.conf.C + s.conf.D;

    var html =
      '<div class="page-head"><div>' +
        "<h1>首页仪表盘</h1>" +
        "<p>数据截至 " + DB.TODAY + "｜当前账号 " + esc(State.user.name) + "（" + esc(State.user.role) + "）</p>" +
      "</div></div>" +

      '<div class="grid c4">' +
        statCard("CP 公共库总数", s.cpTotal, "个", "公共聚合产品 CP-SKU") +
        statCard("自有 SKU 总数", s.skuTotal, "个", "可销售经营 SKU") +
        statCard("有效供应商", s.supplierTotal, "家", "全部启用状态") +
        statCard("本月新建订单", s.monthOrders, "单", "2026-09 采购 + 销售") +
      "</div>";

    /* 数据看板 */
    html += '<div class="grid c2" style="margin-top:14px">';

    // OE 数据质量
    html +=
      '<div class="card"><div class="card__head">OE 数据质量统计<div class="spacer"></div>' +
        '<small>共 ' + s.oeTotal + " 条 OE 记录 / " + s.srcTotal + " 个来源</small></div>" +
      '<div class="card__body">' +
        ["A", "B", "C", "D"].map(function (g) {
          var n = s.conf[g] || 0;
          var pct = confTotal ? Math.round(n / confTotal * 100) : 0;
          var color = { A: "var(--ok)", B: "var(--brand)", C: "var(--warn)", D: "var(--danger)" }[g];
          var desc = { A: "原厂 EPC / TecDoc / 工厂书面确认", B: "品牌官网 / 供应商盖章文件",
                       C: "普通行业网站 / 供应商口头", D: "论坛 / 客户猜测" }[g];
          return '<div style="margin-bottom:11px">' +
            '<div class="row" style="margin-bottom:4px">' + UI.confBadge(g) +
              '<span class="small">' + desc + '</span><div class="spacer"></div>' +
              '<b class="small">' + n + " 条</b><span class=\"small muted\">" + pct + "%</span></div>" +
            '<div class="bar"><i style="width:' + pct + "%;background:" + color + '"></i></div></div>';
        }).join("") +
        alertBox("warn", "!", "检出 <b>" + s.flagged + "</b> 条异常 OE 记录（列错位 / 组内重复），已按清洗规则标准化并留痕，" +
          '待人工复核 → <a href="#/cp-library/detail?id=CP00000003&tab=oe">查看 CP00000003</a>') +
      "</div></div>";

    // 报价预警
    var warnRows = DB.quotes.filter(function (q) { return q.current; }).map(function (q) {
      return { q: q, st: DB.quoteStatus(q) };
    }).filter(function (x) { return x.st.key !== "valid"; })
      .sort(function (a, b) { return a.st.days - b.st.days; });

    html +=
      '<div class="card"><div class="card__head">报价预警<div class="spacer"></div>' +
        '<small>提前 ' + DB.EXPIRING_DAYS + " 天预警</small></div>" +
      '<div class="card__body tight">' +
        '<div style="padding:14px 16px 6px" class="row">' +
          '<span class="tag tag--orange">即将过期 ' + s.expiring + " 条</span>" +
          '<span class="tag tag--red">已过期 ' + s.expired + " 条</span>" +
          '<div class="spacer"></div><a class="btn btn--sm" href="#/report?r=R4">导出预警报表</a>' +
        "</div>" +
        table([
          { t: "供应商代码", k: function (x) { return '<span class="mono">' + esc(x.q.supplier) + "</span>"; } },
          { t: "供应商名称", k: function (x) { return UI.supplierName(x.q.supplier); } },
          { t: "SKU", k: function (x) { return '<a href="#/product/detail?sku=' + x.q.sku + '">' + x.q.sku + "</a>"; } },
          { t: "有效期至", k: function (x) { return x.q.validTo; } },
          { t: "状态", k: function (x) {
              return '<span class="tag ' + x.st.cls + '">' + x.st.label + "</span>" +
                     '<span class="small muted"> ' + (x.st.days < 0 ? "已过 " + (-x.st.days) : "剩 " + x.st.days) + " 天</span>"; } }
        ], warnRows, { empty: "暂无预警报价" }) +
      "</div></div>";

    html += "</div>";

    /* 待确认任务 + 快捷入口 */
    html += '<div class="grid c2" style="margin-top:14px">';

    html +=
      '<div class="card"><div class="card__head">低可信度 OE 确认任务<div class="spacer"></div>' +
        '<small>询价触发，未确认前不映射、不自动报价</small></div>' +
      '<div class="card__body tight">' +
        table([
          { t: "任务号", k: "id" },
          { t: "OE 编号", k: function (t) { return '<span class="mono">' + esc(t.oe) + "</span>"; } },
          { t: "OE 品牌", k: "brand" },
          { t: "可信度", k: function (t) { return UI.confBadge(t.conf); } },
          { t: "触发来源", k: "from" },
          { t: "确认对象", k: "target" },
          { t: "状态", k: function (t) {
              var cls = t.state === "已确认是交叉号" ? "tag--green" : (t.state === "确认中" ? "tag--blue" : "tag--orange");
              return '<span class="tag ' + cls + '">' + esc(t.state) + "</span>"; } }
        ], DB.confirmTasks) +
      "</div></div>";

    html +=
      '<div class="card"><div class="card__head">快捷入口</div><div class="card__body">' +
        '<div class="quick-links">' +
          '<a class="quick-link" href="#/cp-library">▤ CP 公共库</a>' +
          '<a class="quick-link" href="#/product/list">▦ 新增产品</a>' +
          '<a class="quick-link" href="#/order/create">▥ 新建订单</a>' +
          '<a class="quick-link" href="#/supplier/list">▣ 供应商维护</a>' +
          '<a class="quick-link" href="#/change-log/list">◫ 需求变更日志</a>' +
          '<a class="quick-link" href="#/report">▨ 报表中心</a>' +
        "</div>" +
        '<div class="section-title">最近访问</div>' +
        '<div class="timeline">' +
          '<div class="timeline__item"><a href="#/cp-library/detail?id=CP00000001">CP00000001 空气弹簧</a>' +
            '<div class="timeline__time">今天 11:24 · CP 公共库详情</div></div>' +
          '<div class="timeline__item"><a href="#/product/detail?sku=4020340">SKU-4020340 空气弹簧</a>' +
            '<div class="timeline__time">今天 11:20 · 自有产品详情</div></div>' +
          '<div class="timeline__item"><a href="#/order/create">新建采购订单</a>' +
            '<div class="timeline__time">昨天 17:02 · 订单开单页</div></div>' +
        "</div>" +
      "</div></div>";

    html += "</div>";

    return { crumb: "<b>首页仪表盘</b>", html: html };
  });

  /* ====================== 页面 2｜CP 公共库列表 ====================== */

  route("/cp-library", "cp", function (q) {
    var kw = (q.kw || "").trim().toUpperCase();

    var rows = DB.products.filter(function (p) {
      if (!kw) return true;
      if (p.cp.indexOf(kw) >= 0 || p.sku.indexOf(kw) >= 0) return true;
      if (p.cn.indexOf(q.kw) >= 0 || p.en.toUpperCase().indexOf(kw) >= 0) return true;
      // 支持按 OE 编号搜索
      return DB.oeOf(p.cp).some(function (r) { return r.norm.indexOf(kw.replace(/[^0-9A-Z]/g, "")) >= 0; });
    });

    var html =
      '<div class="page-head"><div>' +
        "<h1>CP 公共库</h1>" +
        "<p>OE 知识库与公共产品聚合层。CP 编码由系统按标准化 OE 号聚合自动生成，唯一且不可修改。</p>" +
      '</div><div class="spacer"></div></div>' +

      alertBox("info", "ⓘ",
        "公共库<b>只管 OE 主数据、来源、四类关系与覆盖状态</b>，不维护价格、库存、销售。经营数据请在" +
        '<a href="#/product/list">自有产品库</a>维护。') +

      '<div class="card" style="margin-top:14px"><div class="card__head">' +
        '<form class="row" onsubmit="return CP.search(event)">' +
          '<input class="input search" name="kw" placeholder="搜索 CP 编码 / 自有 SKU / 中英文品名 / OE 编号" value="' + esc(q.kw || "") + '">' +
          '<button class="btn btn--primary" type="submit">搜索</button>' +
          (q.kw ? '<a class="btn" href="#/cp-library">重置</a>' : "") +
        "</form>" +
        '<div class="spacer"></div>' +
        '<button class="btn" onclick="stub(\'新增 CP\')">新增 CP</button>' +
        '<button class="btn" onclick="CP.importModal()">批量导入</button>' +
        '<button class="btn" onclick="stub(\'导出 Excel — 含 OE 编号、OE 品牌、来源、可信度、出现来源\')">导出 Excel</button>' +
      "</div>" +
      '<div class="card__body tight">' +
        table([
          { t: "CP 编码", w: "120px", k: function (p) { return '<a class="mono" href="#/cp-library/detail?id=' + p.cp + '">' + p.cp + "</a>"; } },
          { t: "自有 SKU", w: "92px", k: function (p) { return '<span class="mono">' + p.sku + "</span>"; } },
          { t: "中文品名", k: "cn" },
          { t: "英文品名", k: function (p) { return '<span class="muted">' + esc(p.en) + "</span>"; } },
          { t: "OE 总条数", cls: "num", k: function (p) { return "<b>" + DB.oeOf(p.cp).length + "</b>"; } },
          { t: "来源数", cls: "num", k: function (p) { return DB.oeGroups(p.cp).length; } },
          { t: "覆盖状态", k: function (p) {
              var cls = p.coverage === "已覆盖" ? "tag--green" : (p.coverage === "部分覆盖" ? "tag--orange" : "tag--grey");
              return '<span class="tag ' + cls + '">' + esc(p.coverage) + "</span>"; } },
          { t: "主图", w: "56px", k: function (p) { return '<img class="thumb" src="' + p.mainImg + '" alt="">'; } },
          { t: "操作", cls: "act", k: function (p) {
              return '<a class="btn btn--text" href="#/cp-library/detail?id=' + p.cp + '">查看详情</a>'; } }
        ], rows, { empty: "没有匹配的 CP 记录" }) +
      "</div></div>";

    return { crumb: "<b>CP 公共库</b>", html: html };
  });

  /* ====================== 页面 3｜CP 公共库详情 ====================== */

  var CP_TABS = [
    { k: "base",   label: "基础信息" },
    { k: "oe",     label: "OE 号码列表" },
    { k: "cross",  label: "OE 交叉关系" },
    { k: "sku",    label: "关联自有 SKU" },
    { k: "rule",   label: "供应链替代规则" },
    { k: "log",    label: "变更日志" }
  ];

  route("/cp-library/detail", "cp", function (q) {
    var p = DB.productByCp(q.id || "CP00000001");
    if (!p) return { crumb: "CP 公共库", html: '<div class="card"><div class="tbl-empty">CP 不存在</div></div>' };
    var tab = q.tab || "base";

    var tabs = CP_TABS.map(function (t) {
      var c = null;
      if (t.k === "oe")    c = DB.oeOf(p.cp).length;
      if (t.k === "cross") c = DB.relationsOf("cp", p.cp).length;
      if (t.k === "sku")   c = 1;
      if (t.k === "rule")  c = DB.supplyRules.filter(function (r) { return r.key === p.cp; }).length;
      if (t.k === "log")   c = DB.changeLogsFor(p.cp).length;
      return { k: t.k, label: t.label, cnt: c };
    });

    var head =
      '<div class="page-head"><div>' +
        "<h1>" + esc(p.cp) + "｜" + esc(p.cn) + "</h1>" +
        "<p>" + esc(p.en) + "　·　OE 记录 " + DB.oeOf(p.cp).length + " 条 / " + DB.oeGroups(p.cp).length + " 个来源　·　" +
        "覆盖状态 <b>" + esc(p.coverage) + "</b></p>" +
      '</div><div class="spacer"></div>' +
      '<a class="btn" href="#/cp-library">返回列表</a>' +
      '<a class="btn btn--primary" href="#/product/detail?sku=' + p.sku + '">查看关联自有 SKU</a>' +
      "</div>";

    var body =
      '<div class="card"><div class="card__body" style="padding:0">' +
      UI.tabBar(tabs, tab, function (k) {
        return "#/cp-library/detail?id=" + p.cp + "&tab=" + k;
      }) +
      '<div style="padding:16px">' + renderCpTab(p, tab, q) + "</div>" +
      "</div></div>";

    return {
      crumb: '<a href="#/cp-library">CP 公共库</a> / <b>' + esc(p.cp) + "</b>",
      html: head + body
    };
  });

  function renderCpTab(p, tab, q) {
    if (tab === "base")  return cpBase(p);
    if (tab === "oe")    return cpOe(p, q);
    if (tab === "cross") return cpCross(p, q);
    if (tab === "sku")   return cpSku(p);
    if (tab === "rule")  return cpRule(p);
    if (tab === "log")   return cpLog(p);
    return "";
  }

  /* --- Tab 1 基础信息 --- */
  function cpBase(p) {
    return '<div class="grid c2">' +
      "<div>" +
        '<div class="section-title">公共产品主数据</div>' +
        '<dl class="dl">' +
          "<dt>CP 编码</dt><dd><span class=\"mono\">" + esc(p.cp) + '</span><span class="ro">系统自动生成，不可修改</span></dd>' +
          "<dt>英文品名</dt><dd>" + esc(p.en) + "</dd>" +
          "<dt>中文品名</dt><dd>" + esc(p.cn) + "</dd>" +
          "<dt>产品大类</dt><dd>" + esc(p.cat1) + "</dd>" +
          "<dt>产品小类</dt><dd>" + esc(p.cat2) + "</dd>" +
          "<dt>创建时间</dt><dd>" + esc(p.createdAt) + "　创建人：" + esc(p.createdBy) + "</dd>" +
          "<dt>备注</dt><dd>" + esc(p.note) + "</dd>" +
        "</dl>" +
        '<div class="section-title">聚合与覆盖</div>' +
        '<dl class="dl">' +
          "<dt>OE 记录数</dt><dd>" + DB.oeOf(p.cp).length + " 条（同号多来源分别保留）</dd>" +
          "<dt>数据来源数</dt><dd>" + DB.oeGroups(p.cp).length + " 个</dd>" +
          "<dt>关联自有 SKU</dt><dd>1 个 · <span class=\"mono\">" + esc(p.sku) + "</span></dd>" +
          "<dt>覆盖状态</dt><dd><span class=\"tag " + (p.coverage === "已覆盖" ? "tag--green" : "tag--orange") + '">' + esc(p.coverage) +
            '</span><span class="ro">由自有库映射关系反向计算，不可手工录入</span></dd>' +
        "</dl>" +
      "</div>" +
      "<div>" +
        '<div class="section-title">公共库主图</div>' +
        '<div class="photo" style="max-width:300px"><img src="' + p.mainImg + '" alt="">' +
          '<div class="photo__cap">CP 公共库主图（不区分工厂）</div></div>' +
        alertBox("info", "ⓘ", "不同工厂 / 供应商的实拍图存放在<b>自有产品库</b>的图片 Tab，按供应商维度隔离；公共库只保留一张代表图。") +
      "</div>" +
    "</div>";
  }

  /* --- Tab 2 OE 号码列表（按来源折叠分组 + 出现来源标签 + OE 品牌） --- */
  function cpOe(p, q) {
    var groups = DB.oeGroups(p.cp);
    var srcFilter = q.src || "ALL";
    var kw = (q.okw || "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");

    var ctrl =
      '<div class="row" style="margin-bottom:12px">' +
        '<form class="row" onsubmit="return CP.oeSearch(event,\'' + p.cp + '\',\'' + esc(srcFilter) + '\')">' +
          '<input class="input search" name="okw" placeholder="搜索 OE 编号 / 品牌（忽略空格与横杠）" value="' + esc(q.okw || "") + '">' +
          '<button class="btn" type="submit">搜索</button>' +
        "</form>" +
        '<select class="select" onchange="CP.oeFilter(\'' + p.cp + '\', this.value, \'' + esc(q.okw || "") + '\')">' +
          '<option value="ALL"' + (srcFilter === "ALL" ? " selected" : "") + ">全部来源（" + groups.length + " 个）</option>" +
          groups.map(function (g) {
            return '<option value="' + esc(g.src) + '"' + (srcFilter === g.src ? " selected" : "") + ">" +
                   esc(g.src) + "（" + g.rows.length + " 条）</option>";
          }).join("") +
        "</select>" +
        '<div class="spacer"></div>' +
        '<button class="btn btn--primary" onclick="CP.oeModal(\'' + p.cp + '\')">新增 OE</button>' +
        '<button class="btn" onclick="CP.importModal()">批量导入</button>' +
        '<button class="btn" onclick="stub(\'导出 Excel — 字段：OE 编号、OE 品牌、来源、可信度、出现来源、备注\')">导出 Excel</button>' +
      "</div>";

    var shown = groups.filter(function (g) { return srcFilter === "ALL" || g.src === srcFilter; });

    var accs = shown.map(function (g, i) {
      var rows = g.rows.filter(function (r) {
        return !kw || r.norm.indexOf(kw) >= 0 || r.brand.toUpperCase().indexOf(kw) >= 0;
      });
      var confs = {};
      g.rows.forEach(function (r) { confs[r.conf] = 1; });

      return '<div class="acc ' + (i < 2 || srcFilter !== "ALL" ? "is-open" : "") + '">' +
        '<div class="acc__head"><span class="caret">▶</span>' +
          '<span class="name">来源：' + esc(g.src) + "</span>" +
          Object.keys(confs).sort().map(function (c) { return UI.confBadge(c); }).join("") +
          '<span class="muted small">共 ' + g.rows.length + " 条" + (kw ? "，命中 " + rows.length + " 条" : "") + "</span>" +
          '<div class="spacer"></div>' +
          '<span class="small muted">点击折叠 / 展开</span>' +
        "</div>" +
        '<div class="acc__body">' +
          table([
            { t: "OE 编号", w: "150px", k: function (r) {
                return '<span class="mono strong">' + esc(r.oe) + "</span>" +
                  (r.norm !== r.oe.toUpperCase() ? '<div class="small muted mono">标准化：' + esc(r.norm) + "</div>" : ""); } },
            { t: "OE 品牌", w: "130px", k: function (r) { return esc(r.brand) || '<span class="tag tag--red">缺失</span>'; } },
            { t: "出现来源", k: function (r) {
                var srcs = DB.oeSources(p.cp, r.norm);
                return '<div class="tag-list">' + srcs.map(function (s) {
                  return '<span class="tag ' + (s === g.src ? "tag--blue" : "tag--grey") + '">' + esc(s) + "</span>";
                }).join("") + "</div>"; } },
            { t: "可信度", w: "62px", k: function (r) { return UI.confBadge(r.conf); } },
            { t: "数据状态", w: "120px", k: function (r) {
                if (!r.flags.length) return '<span class="tag tag--green">正常</span>';
                return '<div class="tag-list">' + r.flags.map(function (f) {
                  return '<span class="tag tag--orange">' + esc(f) + "</span>";
                }).join("") + "</div>"; } },
            { t: "备注", cls: "wrap", k: "note" },
            { t: "操作", cls: "act", w: "100px", k: function (r) {
                return '<a class="btn btn--text" href="#/product/detail?sku=' + p.sku + '&tab=oeref">查看</a>' +
                       '<button class="btn btn--text" onclick="CP.oeModal(\'' + p.cp + '\',\'' + esc(r.oe) + '\',\'' + esc(r.brand) + '\',\'' + esc(g.src) + '\',\'' + r.conf + '\')">编辑</button>'; } }
          ], rows, { empty: "本来源分组内没有匹配记录" }) +
        "</div></div>";
    }).join("");

    var rules = alertBox("info", "💡",
      "<b>业务规则</b><br>" +
      "1、同一 OE 会在<b>多个来源分组内重复展示</b>，每条记录保留自己的来源、可信度、采集人与时间，不做覆盖；<br>" +
      "2、来源筛选<b>仅控制分组显隐</b>，【出现来源】列始终展示该 OE 命中的全部来源，不会被截断；<br>" +
      "3、当前分组来源标签为<span class=\"tag tag--blue\">蓝色高亮</span>，其余来源为<span class=\"tag tag--grey\">灰色</span>；<br>" +
      "4、OE 编号点击进入自有产品详情的【OE 引用】Tab，<b>不跳转、不允许在自有产品侧修改 OE</b>；<br>" +
      "5、批量导入模板与导出 Excel 字段一致：OE 编号、OE 品牌、来源、可信度、出现来源、备注。");

    return ctrl + accs + '<div style="margin-top:12px">' + rules + "</div>";
  }

  /* --- Tab 3 OE 交叉关系（四类关系） --- */
  function cpCross(p, q) {
    var type = q.rt || "ALL";
    var rows = DB.relationsOf("cp", p.cp).filter(function (r) { return type === "ALL" || r.type === type; });
    var T = DB.RELATION_TYPES;

    var seg = '<div class="segmented">' +
      ['<a class="segmented__item ' + (type === "ALL" ? "is-active" : "") + '" href="#/cp-library/detail?id=' + p.cp + '&tab=cross&rt=ALL">全部</a>']
      .concat(Object.keys(T).map(function (k) {
        var n = DB.relationsOf("cp", p.cp).filter(function (r) { return r.type === k; }).length;
        return '<a class="segmented__item ' + (type === k ? "is-active" : "") + '" href="#/cp-library/detail?id=' + p.cp +
               "&tab=cross&rt=" + k + '">' + T[k].label + " " + n + "</a>";
      })).join("") + "</div>";

    return '<div class="row" style="margin-bottom:12px">' + seg +
        '<div class="spacer"></div>' +
        '<button class="btn btn--primary" onclick="CP.relModal(\'cp\',\'' + p.cp + '\')">新增关系</button>' +
        '<button class="btn" onclick="stub(\'导出 CP 全局交叉关系\')">导出</button>' +
      "</div>" +

      alertBox("warn", "⚠️",
        "本页为 <b>CP 全局理论交叉关系</b>，来自权威目录与工厂确认，仅作参考。" +
        "实际下单适配<b>以 SKU 私有交叉与供应商供货规则为准</b> → " +
        '<a href="#/product/detail?sku=' + p.sku + '&tab=cross">查看 SKU 私有交叉</a>') +

      '<div style="margin-top:12px">' +
      table([
        { t: "关系 ID", w: "70px", k: function (r) { return '<span class="mono">' + esc(r.id) + "</span>"; } },
        { t: "主 OE 编号", k: function (r) { return '<span class="mono strong">' + esc(r.oeA) + "</span>"; } },
        { t: "主 OE 品牌", k: "brandA" },
        { t: "交叉 OE 编号", k: function (r) { return '<span class="mono strong">' + esc(r.oeB) + "</span>"; } },
        { t: "交叉 OE 品牌", k: "brandB" },
        { t: "关系类型", cls: "wrap", k: function (r) {
            return '<span class="tag ' + T[r.type].cls + '">' + T[r.type].label + "</span>" +
                   '<div class="small muted">' + T[r.type].swap + "</div>"; } },
        { t: "方向", k: "dir" },
        { t: "适用条件", cls: "wrap", k: function (r) { return r.cond === "—" ? '<span class="muted">—</span>' : esc(r.cond); } },
        { t: "来源", k: function (r) { return esc(r.src) + " " + UI.confBadge(r.level); } },
        { t: "状态", k: function (r) {
            var cls = r.status === "已生效" ? "tag--green" : (r.status === "冲突" ? "tag--red" : "tag--orange");
            return '<span class="tag ' + cls + '">' + esc(r.status) + "</span>"; } },
        { t: "审批", k: function (r) {
            return '<div class="small">申请：' + esc(r.applicant) + "<br>审批：" + esc(r.approver) + "<br>" + esc(r.at) + "</div>"; } },
        { t: "操作", cls: "act", k: function (r) {
            return '<button class="btn btn--text" onclick="CP.relDetail(\'' + r.id + '\')">查看</button>' +
                   '<button class="btn btn--text" onclick="stub(\'编辑关系需重新提交审批\')">编辑</button>'; } }
      ], rows, { empty: "该类型下暂无关系记录" }) +
      "</div>" +

      '<div style="margin-top:12px">' +
      alertBox("info", "ⓘ",
        "<b>四类关系区分</b>：<span class=\"tag tag--blue\">交叉引用</span>号码指向同一零件，<b>不代表可互换</b>；" +
        "<span class=\"tag tag--green\">替代关系</span><b>唯一代表可互换</b>，必须写明方向、适用条件、凭证并强制审批；" +
        "<span class=\"tag tag--grey\">同组关系</span>系统按标准化 OE 归入同一 CP，无方向、不可默认互换；" +
        "<span class=\"tag tag--orange\">同功能关系</span>功能相似仅供选品参考，<b>禁止自动映射与自动报价替换</b>。<br>" +
        "同组关系不得直接升级为替代关系，升级必须有工厂 / 客户书面凭证并重新审批。") +
      "</div>";
  }

  /* --- Tab 4 关联自有 SKU --- */
  function cpSku(p) {
    var mainSup = p.suppliers[0];
    return table([
      { t: "自有 SKU", k: function (x) { return '<span class="mono strong">' + esc(x.sku) + "</span>"; } },
      { t: "中文品名", k: "cn" },
      { t: "英文品名", k: "en" },
      { t: "映射类型", k: function () { return '<span class="tag tag--green">主关联（1:1，无需审批）</span>'; } },
      { t: "主图来源工厂", k: function () { return UI.supplierName(mainSup) + ' <span class="mono small muted">' + mainSup + "</span>"; } },
      { t: "引用 OE 数量", cls: "num", k: function (x) { return DB.oeDistinct(x.cp).length + " / " + DB.oeOf(x.cp).length; } },
      { t: "状态", k: function (x) { return '<span class="tag tag--green">' + esc(x.status) + "</span>"; } },
      { t: "跳转", cls: "act", k: function (x) { return '<a class="btn btn--text" href="#/product/detail?sku=' + x.sku + '">产品详情 →</a>'; } }
    ], [p]) +
    '<div style="margin-top:12px">' +
    alertBox("info", "ⓘ",
      "CP-SKU 与自有 SKU <b>默认 1:1，无需审批</b>。<br>" +
      "1 个 CP 关联多个自有 SKU、或 1 个自有 SKU 关联多个 CP（套装 / 维修包 / 通用替代件），<b>必须提交映射审批</b>，" +
      "并区分【主 CP】与【附加 CP】；同一 SKU 重复关联同一 CP 由系统直接拦截。") +
    "</div>";
  }

  /* --- Tab 5 供应链替代规则 --- */
  function cpRule(p) {
    var rows = DB.supplyRules.filter(function (r) { return r.key === p.cp; });
    return '<div class="row" style="margin-bottom:12px"><div class="spacer"></div>' +
      '<button class="btn btn--primary" onclick="stub(\'新增供应链替代规则\')">新增规则</button></div>' +
      table([
        { t: "替代 CP 编码", k: function (r) { return '<span class="mono">' + esc(r.altCp) + "</span>"; } },
        { t: "替代说明", cls: "wrap", k: "desc" },
        { t: "可信度", k: function (r) { return UI.confBadge(r.level); } },
        { t: "备注", cls: "wrap", k: "note" },
        { t: "操作", cls: "act", k: function () {
            return '<button class="btn btn--text" onclick="stub(\'编辑规则\')">编辑</button>' +
                   '<button class="btn btn--text btn--danger" onclick="stub(\'停用规则（逻辑停用，不做物理删除）\')">停用</button>'; } }
      ], rows, { empty: "本 CP 暂未配置供应链替代规则" });
  }

  /* --- Tab 6 变更日志 --- */
  function cpLog(p) {
    var rows = DB.changeLogsFor(p.cp);
    return alertBox("info", "ⓘ", "本 Tab 仅展示与本 CP 相关的<b>需求变更</b>（人工提交、需审核）。字段级改动请查看系统操作日志。") +
      '<div style="margin-top:12px">' +
      table([
        { t: "变更 ID", k: function (c) { return '<a class="mono" href="#/change-log/detail?id=' + c.id + '">' + c.id + "</a>"; } },
        { t: "所属模块", k: "module" },
        { t: "申请提出人", k: "applicant" },
        { t: "变更简述", cls: "wrap", k: "reason" },
        { t: "附件证明", k: function (c) { return '<a href="javascript:stub(\'预览附件\')">' + esc(c.proof) + "</a>"; } },
        { t: "审核人", k: "approver" },
        { t: "审核状态", k: function (c) {
            return '<span class="tag ' + (c.state === "已审核" ? "tag--green" : "tag--orange") + '">' + esc(c.state) + "</span>"; } },
        { t: "变更时间", k: "at" }
      ], rows, { empty: "暂无变更记录" }) + "</div>";
  }

  /* ====================== 交互 ====================== */

  window.CP = {
    search: function (e) {
      e.preventDefault();
      var kw = e.target.kw.value.trim();
      location.hash = "#/cp-library" + (kw ? "?kw=" + encodeURIComponent(kw) : "");
      return false;
    },
    oeSearch: function (e, cp, src) {
      e.preventDefault();
      var kw = e.target.okw.value.trim();
      location.hash = "#/cp-library/detail?id=" + cp + "&tab=oe&src=" + encodeURIComponent(src) +
                      (kw ? "&okw=" + encodeURIComponent(kw) : "");
      return false;
    },
    oeFilter: function (cp, src, kw) {
      location.hash = "#/cp-library/detail?id=" + cp + "&tab=oe&src=" + encodeURIComponent(src) +
                      (kw ? "&okw=" + encodeURIComponent(kw) : "");
    },

    /** 新增 / 编辑 OE 弹窗（CH010：OE 品牌必填） */
    oeModal: function (cp, oe, brand, src, conf) {
      var isEdit = !!oe;
      var groups = DB.oeGroups(cp);
      openModal({
        title: (isEdit ? "编辑" : "新增") + " OE 号码　·　" + cp,
        body:
          '<div class="field"><label><span class="req">*</span>OE 编号</label>' +
            '<input class="input" id="f_oe" value="' + esc(oe || "") + '" placeholder="例：W013587443">' +
            '<div class="hint">保存时按清洗规则标准化：转大写、去除空格 / 横杠 / 点号后参与聚合与查重</div></div>' +
          '<div class="field"><label><span class="req">*</span>OE 品牌</label>' +
            '<input class="input" id="f_brand" value="' + esc(brand || "") + '" placeholder="例：Firestone">' +
            '<div class="hint">CH010 新增字段，必填。弹窗、导入模板、导出 Excel、报表全部携带该字段</div>' +
            '<div class="err-text" id="f_brand_err" style="display:none">⚠️ OE 品牌为必填字段</div></div>' +
          '<div class="field"><label>来源</label><select class="select" id="f_src">' +
            groups.map(function (g) { return '<option' + (g.src === src ? " selected" : "") + ">" + esc(g.src) + "</option>"; }).join("") +
            "<option>TecDoc</option><option>原厂 EPC</option><option>内部录入</option></select></div>" +
          '<div class="field"><label>可信度</label><select class="select" id="f_conf">' +
            DB.enums["可信度"].map(function (c) {
              return '<option value="' + c[0] + '"' + (c[0] === conf ? " selected" : "") + ">" + esc(c) + "</option>";
            }).join("") + "</select></div>" +
          '<div class="field"><label>备注</label><textarea class="textarea" rows="2" placeholder="选填"></textarea></div>' +
          alertBox("info", "ⓘ", "同品牌同标准化 OE 号在不同来源下<b>允许多条记录共存</b>，系统不会覆盖旧记录；若与已有记录冲突，将标记为【冲突 / 待审核】。"),
        foot:
          '<button class="btn" data-close>取消</button>' +
          '<button class="btn btn--primary" onclick="CP.oeSave()">保存</button>',
        onMount: function (m) { m.querySelector("#f_oe").focus(); }
      });
    },
    oeSave: function () {
      var b = document.getElementById("f_brand");
      var err = document.getElementById("f_brand_err");
      if (!b.value.trim()) {
        b.classList.add("input--err");
        err.style.display = "flex";
        return;
      }
      closeModal();
      toast("已保存（原型演示，不落库）。标准化 OE 与来源已记录，出现来源标签将自动刷新");
    },

    importModal: function () {
      openModal({
        title: "批量导入 OE 数据",
        body:
          '<div class="field"><label>数据来源</label><select class="select">' +
            DB.dataSources.map(function (d) { return "<option>" + esc(d.name) + " · " + esc(d.type) + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>上传文件</label>' +
            '<div class="photo--empty photo" style="cursor:pointer" onclick="stub(\'选择 Excel 文件\')">' +
            "点击选择 Excel / CSV 文件，或拖拽到此处</div>" +
            '<div class="hint">模板字段：OE 编号、OE 品牌（必填）、来源、可信度、备注</div></div>' +
          '<div class="field"><label class="check"><input type="checkbox" checked> 导入前执行 OE 标准化清洗（转大写、去空格 / 横杠 / 点号）</label>' +
            '<label class="check"><input type="checkbox" checked> 同号不同来源保留多条，不覆盖历史记录</label>' +
            '<label class="check"><input type="checkbox" checked> 冲突记录标记【冲突 / 待审核】而非直接丢弃</label>' +
            '<label class="check"><input type="checkbox"> 自动按标准化 OE 聚合到 CP（仅生成推荐，需人工审批确认）</label></div>' +
          alertBox("warn", "⚠️", "标准化 OE 重合<b>只生成合并推荐</b>，不自动合并 CP。合并、拆分、OE 跨 CP 迁移一律需要审批并写审计日志。"),
        foot: '<button class="btn" data-close>取消</button>' +
              '<button class="btn btn--primary" onclick="closeModal();toast(\'原型演示：已提交导入任务，进入数据校验队列\')">开始导入</button>'
      });
    },

    relModal: function (scope, key) {
      var T = DB.RELATION_TYPES;
      openModal({
        title: "新增 OE 关系　·　" + (scope === "cp" ? "CP 全局" : "SKU 私有") + " " + key,
        body:
          '<div class="grid c2" style="gap:0 14px">' +
            '<div class="field"><label><span class="req">*</span>主 OE 编号</label><input class="input" placeholder="例：W013587443"></div>' +
            '<div class="field"><label><span class="req">*</span>主 OE 品牌</label><input class="input" placeholder="例：Firestone"></div>' +
            '<div class="field"><label><span class="req">*</span>交叉 OE 编号</label><input class="input" placeholder="例：2B12305"></div>' +
            '<div class="field"><label><span class="req">*</span>交叉 OE 品牌</label><input class="input" placeholder="例：Goodyear"></div>' +
          "</div>" +
          '<div class="field"><label><span class="req">*</span>关系类型</label>' +
            '<select class="select" id="f_rt" onchange="CP.relTypeChange(this.value)">' +
            Object.keys(T).map(function (k) { return '<option value="' + k + '">' + T[k].label + " — " + T[k].swap + "</option>"; }).join("") +
            "</select></div>" +
          '<div id="f_sub_area"></div>' +
          '<div class="field"><label>来源类型与凭证</label>' +
            '<select class="select"><option>原厂 EPC</option><option>TecDoc</option><option>品牌官网</option>' +
            "<option>工厂确认</option><option>供应商确认</option><option>客户确认</option><option>内部录入</option></select>" +
            '<div class="hint">替代关系要求 A/B 级来源；C/D 级只能标记为【待确认替代】，不得用于业务</div></div>' +
          '<div class="field"><label><span class="req">*</span>审批人</label><select class="select"><option>架构负责人</option><option>产品经理</option></select>' +
            '<div class="hint">提交人与审批人不能为同一人（防自审）</div></div>',
        foot: '<button class="btn" data-close>取消</button>' +
              '<button class="btn btn--primary" onclick="closeModal();toast(\'已提交审批，状态【待审核】，审批通过后生效\')">提交审批</button>',
        onMount: function () { CP.relTypeChange("cross"); }
      });
    },
    relTypeChange: function (t) {
      var area = document.getElementById("f_sub_area");
      if (!area) return;
      if (t === "substitute") {
        area.innerHTML =
          '<div class="field"><label><span class="req">*</span>替代方向</label><select class="select">' +
            "<option>A 可替代 B</option><option>B 可替代 A</option><option>双向可替代</option></select>" +
            '<div class="hint">单向替代不可自动反向</div></div>' +
          '<div class="field"><label><span class="req">*</span>适用条件</label>' +
            '<textarea class="textarea" rows="2" placeholder="适用车型、年份、发动机、安装位置、认证 / 质量等级"></textarea></div>' +
          '<div class="field"><label>失效时间</label><input class="input" type="date">' +
            '<div class="hint">临时替代件可设置失效时间，到期自动失效</div></div>' +
          alertBox("warn", "⚠️", "替代关系是<b>唯一代表可互换</b>的关系类型，新增 / 修改方向 / 修改条件 / 删除<b>全部强制审批</b>，且报价时不得自动替换，必须销售人工确认。");
      } else if (t === "function") {
        area.innerHTML = alertBox("warn", "⚠️", "同功能关系<b>禁止用于自动映射与自动报价替换</b>，销售页面展示时强制提示【需确认适配】。严禁直接升级为替代关系。");
      } else if (t === "group") {
        area.innerHTML = alertBox("info", "ⓘ", "同组关系一般由系统按标准化 OE 自动聚合产生。人工归组需审批；CP 合并、拆分、OE 跨 CP 迁移同样需审批。");
      } else {
        area.innerHTML = alertBox("info", "ⓘ", "交叉引用只说明号码有关联，<b>不说明能装、能用、能替代</b>。可作为自有库映射依据，但仍需审批。");
      }
    },
    relDetail: function (id) {
      var r = null;
      DB.relations.forEach(function (x) { if (x.id === id) r = x; });
      if (!r) return;
      var T = DB.RELATION_TYPES[r.type];
      openModal({
        title: "关系详情　·　" + r.id,
        body:
          '<dl class="dl">' +
            "<dt>关系类型</dt><dd><span class=\"tag " + T.cls + '">' + T.label + "</span> " + T.swap + "</dd>" +
            "<dt>主 OE</dt><dd><span class=\"mono\">" + esc(r.oeA) + "</span>　" + esc(r.brandA) + "</dd>" +
            "<dt>交叉 OE</dt><dd><span class=\"mono\">" + esc(r.oeB) + "</span>　" + esc(r.brandB) + "</dd>" +
            "<dt>方向</dt><dd>" + esc(r.dir) + "</dd>" +
            "<dt>适用条件</dt><dd>" + esc(r.cond) + "</dd>" +
            "<dt>来源</dt><dd>" + esc(r.src) + "　可信度 " + UI.confBadge(r.level) + "</dd>" +
            "<dt>状态</dt><dd>" + esc(r.status) + "</dd>" +
            "<dt>申请人</dt><dd>" + esc(r.applicant) + "</dd>" +
            "<dt>审批人</dt><dd>" + esc(r.approver) + "　" + esc(r.at) + "</dd>" +
            "<dt>备注</dt><dd>" + esc(r.note) + "</dd>" +
          "</dl>" +
          (r.status === "冲突" ? alertBox("danger", "✕", "该关系存在数据冲突，已冻结业务使用，需人工核实后重新审批。") : "")
      });
    }
  };
})();

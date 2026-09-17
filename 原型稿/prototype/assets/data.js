/* ==========================================================================
   汽配 ERP 原型 — 业务样本数据
   依据：《汽配 ERP 完整合并版原型文本 V-Full-20260917》+《卡车配件ERP产品库设计》
   OE 主数据来自 oe-data.js（由 ERP搭建测试.xlsx 真实导出）
   ========================================================================== */

window.DB = (function () {
  "use strict";

  /** 系统"今天"，用于报价有效期状态计算 */
  var TODAY = "2026-09-17";
  /** 报价进入"即将过期"的提前天数 */
  var EXPIRING_DAYS = 90;

  /* ---------------- 供应商 ---------------- */

  var suppliers = [
    { code: "S-FI-001", id: "S001", name: "Firestone",         contact: "张经理", phone: "138****6621", addr: "美国 印第安纳州", nameVisible: false, priceVisible: false, note: "原厂空气弹簧供应商" },
    { code: "S-CO-002", id: "S002", name: "Contitech",         contact: "李经理", phone: "138****3307", addr: "德国 汉诺威",     nameVisible: false, priceVisible: false, note: "原厂替代件，中性包装" },
    { code: "S-SA-003", id: "S003", name: "Sampa",             contact: "王经理", phone: "138****8845", addr: "土耳其 伊斯坦布尔", nameVisible: true,  priceVisible: false, note: "国产/土耳其替代件" },
    { code: "S-MA-004", id: "S004", name: "Mann",              contact: "赵经理", phone: "137****2190", addr: "德国 路德维希堡",  nameVisible: false, priceVisible: false, note: "滤清器原厂" },
    { code: "S-HE-005", id: "S005", name: "Hengst",            contact: "陈经理", phone: "137****5512", addr: "德国 明斯特",     nameVisible: true,  priceVisible: true,  note: "滤清器同规格替代" },
    { code: "S-FG-006", id: "S006", name: "Fleetguard",        contact: "刘经理", phone: "136****7734", addr: "美国 田纳西",     nameVisible: true,  priceVisible: true,  note: "大批量代工" },
    { code: "S-WC-007", id: "S007", name: "Williams Controls", contact: "孙经理", phone: "136****9081", addr: "美国 俄勒冈",     nameVisible: false, priceVisible: false, note: "压力保护阀原厂" },
    { code: "S-DG-008", id: "S008", name: "国内代工A厂",        contact: "周经理", phone: "135****4402", addr: "浙江 瑞安",       nameVisible: true,  priceVisible: false, note: "复刻版本，需样品确认" }
  ];

  /* ---------------- 产品（CP 公共库 ↔ 自有 SKU） ---------------- */

  var products = [
    {
      cp: "CP00000001", sku: "4020340",
      cn: "空气弹簧", en: "Air spring",
      cnDesc: "卡车挂车用空气弹簧气囊，适配挂车悬挂系统",
      enDesc: "Air spring for truck and trailer suspension system",
      cat1: "Suspension（悬挂）", cat2: "Air spring（空气弹簧）",
      catKey: "suspension/airspring",
      unit: "PCS(个)", decl: "卡车空气弹簧气囊", hs: "87088090", rebate: "13%",
      status: "正常", coverage: "已覆盖",
      createdAt: "2026-09-01", createdBy: "admin",
      note: "卡车挂车空气弹簧配件",
      mainImg: "img/4020340.jpg",
      /** 供应商代码 -> 工厂实拍图；缺图即展示系统默认负片 */
      imgs: { "S-FI-001": "img/4020340.jpg" },
      suppliers: ["S-FI-001", "S-CO-002", "S-SA-003"]
    },
    {
      cp: "CP00000002", sku: "1010140",
      cn: "空气滤清器", en: "Air filter",
      cnDesc: "重卡发动机进气空气滤清器滤芯",
      enDesc: "Engine intake air filter element for heavy duty truck",
      cat1: "Engine（发动机）", cat2: "Air filter（空气滤清器）",
      catKey: "engine/airfilter",
      unit: "PCS(个)", decl: "汽车用空气滤清器", hs: "84213100", rebate: "13%",
      status: "正常", coverage: "已覆盖",
      createdAt: "2026-09-01", createdBy: "admin",
      note: "奔驰 / DAF / Ford 通用滤芯",
      mainImg: "img/1010140.jpg",
      imgs: { "S-MA-004": "img/1010140.jpg" },
      suppliers: ["S-MA-004", "S-HE-005", "S-FG-006"]
    },
    {
      cp: "CP00000003", sku: "8450010",
      cn: "压力保护阀", en: "Pressure protection valve",
      cnDesc: "气制动系统四回路压力保护阀",
      enDesc: "Pressure protection valve for air brake system",
      cat1: "Air brake（气制动）", cat2: "Pressure protection valve（压力保护阀）",
      catKey: "airbrake/ppv",
      unit: "PCS(个)", decl: "汽车制动系统用阀", hs: "87083099", rebate: "13%",
      status: "正常", coverage: "部分覆盖",
      createdAt: "2026-09-02", createdBy: "admin",
      note: "客户已出货验证",
      mainImg: "img/8450010-CS26090052.jpg",
      imgs: {
        "S-WC-007": "img/8450010-CS21010017.jpg",
        "S-DG-008": "img/8450010-CS23110001.jpg"
      },
      suppliers: ["S-WC-007", "S-DG-008"]
    }
  ];

  /* ---------------- 供应商报价（维度 = SKU + 供应商） ---------------- */
  /* 有效期状态由 validTo 实时计算，不写死 */

  var quotes = [
    // 4020340 空气弹簧
    { id: "Q0001", sku: "4020340", supplier: "S-FI-001", price: 286.00, cur: "USD", moq: 50,  at: "2026-03-15", validTo: "2026-12-20", current: true,  note: "原厂空气弹簧，交期 35-45 天" },
    { id: "Q0002", sku: "4020340", supplier: "S-FI-001", price: 295.00, cur: "USD", moq: 50,  at: "2026-01-05", validTo: "2026-04-05", current: false, note: "上一轮报价，已归档" },
    { id: "Q0003", sku: "4020340", supplier: "S-CO-002", price: 262.50, cur: "USD", moq: 100, at: "2026-04-02", validTo: "2026-10-05", current: true,  note: "替代原厂件，包装中性，交期 30 天" },
    { id: "Q0004", sku: "4020340", supplier: "S-SA-003", price: 138.00, cur: "CNY", moq: 200, at: "2026-02-20", validTo: "2026-07-10", current: true,  note: "国产替代，库存波动大" },
    // 1010140 空气滤清器
    { id: "Q0005", sku: "1010140", supplier: "S-MA-004", price: 45.20,  cur: "EUR", moq: 80,  at: "2026-05-06", validTo: "2027-01-15", current: true,  note: "原厂件，带原厂包装" },
    { id: "Q0006", sku: "1010140", supplier: "S-HE-005", price: 38.60,  cur: "EUR", moq: 120, at: "2026-04-22", validTo: "2026-11-30", current: true,  note: "同规格替代，交期 25 天" },
    { id: "Q0007", sku: "1010140", supplier: "S-FG-006", price: 32.10,  cur: "CNY", moq: 300, at: "2026-01-10", validTo: "2026-06-20", current: true,  note: "大批量国产代工" },
    // 8450010 压力保护阀
    { id: "Q0008", sku: "8450010", supplier: "S-WC-007", price: 124.80, cur: "USD", moq: 30,  at: "2026-06-01", validTo: "2027-02-10", current: true,  note: "原厂，客户已出货验证，交期 40 天" },
    { id: "Q0009", sku: "8450010", supplier: "S-DG-008", price: 76.30,  cur: "CNY", moq: 500, at: "2026-03-28", validTo: "2026-11-05", current: true,  note: "复刻版本，需要做样品确认" }
  ];

  /* ---------------- OE 关系 ----------------
     四类关系严格区分（源自《卡车配件ERP产品库设计》第四章）：
       cross     交叉引用 — 号码指向同一零件，不代表可互换
       substitute 替代关系 — 唯一代表可互换，必须带方向 + 条件 + 凭证 + 审批
       group     同组关系 — 系统归入同一 CP-SKU，无方向
       function  同功能关系 — 功能相似，仅供参考
     scope: "cp" = CP 全局理论交叉；"sku" = SKU 私有业务交叉
  -------------------------------------------- */

  var relations = [
    // —— CP00000001 全局 ——
    { id: "R001", scope: "cp", key: "CP00000001", oeA: "W013587443", brandA: "Firestone", oeB: "2B12305",      brandB: "Goodyear",  type: "cross",      dir: "双向",       level: "A", src: "airspringapp",       cond: "—", status: "已生效", applicant: "业务产品岗", approver: "架构负责人", at: "2026-09-10", note: "原厂 EPC 兼容" },
    { id: "R002", scope: "cp", key: "CP00000001", oeA: "W013587443", brandA: "Firestone", oeB: "FD33030323",   brandB: "Contitech", type: "cross",      dir: "双向",       level: "A", src: "Firestone电子目录",  cond: "—", status: "已生效", applicant: "业务产品岗", approver: "架构负责人", at: "2026-09-10", note: "电子目录交叉" },
    { id: "R003", scope: "cp", key: "CP00000001", oeA: "W013587443", brandA: "Firestone", oeB: "SP2B22RA7443", brandB: "Automann",  type: "substitute", dir: "A 可替代 B", level: "B", src: "工厂确认",           cond: "挂车悬挂位，需确认活塞高度 ≤ 340mm", status: "已生效", applicant: "业务产品岗", approver: "架构负责人", at: "2026-09-12", note: "第三方工厂替代件，不保证原厂完全通用" },
    { id: "R004", scope: "cp", key: "CP00000001", oeA: "2B12305",    brandA: "Goodyear",  oeB: "578923310",    brandB: "Goodyear",  type: "group",      dir: "无方向",     level: "A", src: "系统自动聚合",       cond: "—", status: "已生效", applicant: "系统", approver: "—", at: "2026-09-01", note: "标准化 OE 重合，归入同一 CP" },
    { id: "R005", scope: "cp", key: "CP00000001", oeA: "AS7443",     brandA: "Fleetpride",oeB: "AS4323",       brandB: "Triangle",  type: "function",   dir: "双向参考",   level: "C", src: "供应商推荐",         cond: "—", status: "待审核", applicant: "业务产品岗", approver: "架构负责人", at: "2026-09-15", note: "功能相近，接口未确认，仅供选品参考" },
    // —— CP00000002 全局 ——
    { id: "R006", scope: "cp", key: "CP00000002", oeA: "A0020942404", brandA: "Mercedes-Benz", oeB: "0020942404", brandB: "Mercedes-Benz", type: "group",   dir: "无方向",     level: "A", src: "系统自动聚合", cond: "—", status: "已生效", applicant: "系统", approver: "—", at: "2026-09-02", note: "带 A 前缀与不带 A 前缀，标准化后同号" },
    { id: "R007", scope: "cp", key: "CP00000002", oeA: "A0020942404", brandA: "Mercedes-Benz", oeB: "C331305",    brandB: "Mann",          type: "cross",   dir: "双向",       level: "A", src: "DT",          cond: "—", status: "已生效", applicant: "业务产品岗", approver: "架构负责人", at: "2026-09-05", note: "DT 目录交叉" },
    { id: "R008", scope: "cp", key: "CP00000002", oeA: "C331305",     brandA: "Mann",          oeB: "E284L",      brandB: "Hengst",        type: "substitute", dir: "双向可替代", level: "A", src: "工厂确认", cond: "适用 OM457 / OM501 发动机，2008 年后车型", status: "已生效", applicant: "业务产品岗", approver: "架构负责人", at: "2026-09-08", note: "两家滤清器厂书面确认可互换" },
    { id: "R009", scope: "cp", key: "CP00000002", oeA: "AF1812",      brandA: "Fleetguard",    oeB: "C331305",    brandB: "Mann",          type: "cross",   dir: "双向",       level: "B", src: "Fleetguard",  cond: "—", status: "已生效", applicant: "业务产品岗", approver: "架构负责人", at: "2026-09-06", note: "品牌官网交叉表" },
    // —— CP00000003 全局 ——
    { id: "R010", scope: "cp", key: "CP00000003", oeA: "WM778A",      brandA: "Williams Controls", oeB: "118181", brandB: "Williams Controls", type: "group", dir: "无方向", level: "B", src: "系统自动聚合", cond: "—", status: "冲突", applicant: "系统", approver: "—", at: "2026-09-02", note: "两条来源均为 Williams Controls，但来源可信度不一致，待人工核实" },

    // —— SKU 私有业务交叉 ——
    { id: "R101", scope: "sku", key: "4020340", oeA: "W013587443", brandA: "Firestone", oeB: "2B12305",      brandB: "Goodyear",  type: "cross",      dir: "双向",       level: "A", src: "客供号码", cond: "—", status: "已生效", applicant: "外贸业务岗", approver: "架构负责人", at: "2026-09-12", note: "由 CP 全局交叉复制而来，客户已确认" },
    { id: "R102", scope: "sku", key: "4020340", oeA: "W013587443", brandA: "Firestone", oeB: "SP2B22RA7443", brandB: "Automann",  type: "substitute", dir: "A 可替代 B", level: "B", src: "工厂确认", cond: "仅限北美客户，需提供活塞高度确认件", status: "已生效", applicant: "外贸业务岗", approver: "架构负责人", at: "2026-09-13", note: "第三方替代件，下单适配以供应商供货规则为准" },
    { id: "R103", scope: "sku", key: "1010140", oeA: "C331305",    brandA: "Mann",      oeB: "E284L",        brandB: "Hengst",    type: "substitute", dir: "双向可替代", level: "A", src: "工厂确认", cond: "OM457 / OM501 发动机", status: "已生效", applicant: "外贸业务岗", approver: "架构负责人", at: "2026-09-14", note: "客户 C 已实测通过" },
    { id: "R104", scope: "sku", key: "8450010", oeA: "WM778A",     brandA: "Williams Controls", oeB: "118181", brandB: "Williams Controls", type: "cross", dir: "双向", level: "C", src: "Google", cond: "—", status: "待审核", applicant: "外贸业务岗", approver: "架构负责人", at: "2026-09-16", note: "来源可信度不足，已触发确认任务 T003" }
  ];

  var RELATION_TYPES = {
    cross:      { label: "交叉引用",   short: "交叉", cls: "tag--blue",   swap: "号码关联，不代表可互换" },
    substitute: { label: "替代关系",   short: "替代", cls: "tag--green",  swap: "可互换（带条件）" },
    group:      { label: "同组关系",   short: "同组", cls: "tag--grey",   swap: "系统归组，不可默认互换" },
    function:   { label: "同功能关系", short: "同功能", cls: "tag--orange", swap: "功能相似，需确认适配" }
  };

  /* ---------------- 供应链替代规则（CP 级） ---------------- */

  var supplyRules = [
    { key: "CP00000001", altCp: "CP00000007", desc: "同尺寸双折囊空气弹簧，缺货时可向客户提报替代", level: "B", note: "需客户书面确认后方可发货" },
    { key: "CP00000002", altCp: "CP00000011", desc: "同滤芯规格，滤纸等级不同", level: "C", note: "仅限非质保期车辆" }
  ];

  /* ---------------- 客户 ---------------- */

  var customers = [
    { id: "C001", name: "客户A（AutoTrade GmbH）", short: "客户A", country: "德国", level: "A 级战略客户" },
    { id: "C002", name: "客户B（Nordic Truck Parts AB）", short: "客户B", country: "瑞典", level: "B 级" },
    { id: "C003", name: "客户C（Al-Faisal Trading LLC）", short: "客户C", country: "阿联酋", level: "A 级" }
  ];

  /** 客户 × SKU 的业务状态（由报价 / 销售订单 / 出运单据回写，页面只读） */
  var customerSku = [
    { cust: "C001", sku: "4020340", quoted: true, sold: true,  shipped: true  },
    { cust: "C001", sku: "1010140", quoted: true, sold: false, shipped: false },
    { cust: "C002", sku: "8450010", quoted: true, sold: true,  shipped: false },
    { cust: "C002", sku: "4020340", quoted: true, sold: false, shipped: false },
    { cust: "C003", sku: "1010140", quoted: true, sold: true,  shipped: true  },
    { cust: "C003", sku: "8450010", quoted: true, sold: false, shipped: false }
  ];

  /* ---------------- 公司产品类目（大类 → 小类） ---------------- */

  var categories = [
    { key: "engine",     name: "Engine（发动机）", children: [
      { key: "engine/airfilter", name: "Air filter（空气滤清器）" }
    ]},
    { key: "suspension", name: "Suspension（悬挂）", children: [
      { key: "suspension/airspring", name: "Air spring（空气弹簧）" }
    ]},
    { key: "airbrake",   name: "Air brake（气制动）", children: [
      { key: "airbrake/ppv", name: "Pressure protection valve（压力保护阀）" }
    ]}
  ];

  /* ---------------- 订单 ---------------- */

  var orders = [
    { no: "PO20260917", type: "采购订单", party: "S-FI-001", partyName: "Firestone", sku: "4020340", qty: 0,   price: 286.00, cur: "USD", amount: 0,       status: "草稿",   ship: "—",     date: "2026-09-17", note: "待录入数量" },
    { no: "PO20260805", type: "采购订单", party: "S-FI-001", partyName: "Firestone", sku: "4020340", qty: 80,  price: 286.00, cur: "USD", amount: 22880,   status: "已收货", ship: "—",     date: "2026-08-05", note: "" },
    { no: "PO20260812", type: "采购订单", party: "S-MA-004", partyName: "Mann",      sku: "1010140", qty: 200, price: 45.20,  cur: "EUR", amount: 9040,    status: "生产中", ship: "—",     date: "2026-08-12", note: "" },
    { no: "PO20260902", type: "采购订单", party: "S-WC-007", partyName: "Williams Controls", sku: "8450010", qty: 60, price: 124.80, cur: "USD", amount: 7488, status: "已下单", ship: "—", date: "2026-09-02", note: "" },
    { no: "SO20260801", type: "销售订单", party: "C001", partyName: "客户A", sku: "4020340", qty: 100, price: 310.00, cur: "USD", amount: 31000, status: "已完成", ship: "已出运", date: "2026-08-01", note: "定制黑色涂装，差额 +6.00" },
    { no: "SO20260905", type: "销售订单", party: "C003", partyName: "客户C", sku: "1010140", qty: 500, price: 52.00,  cur: "EUR", amount: 26000, status: "生产中", ship: "未出运", date: "2026-09-05", note: "" },
    { no: "SO20260910", type: "销售订单", party: "C002", partyName: "客户B", sku: "8450010", qty: 60,  price: 148.00, cur: "USD", amount: 8880,  status: "待确认", ship: "未出运", date: "2026-09-10", note: "" }
  ];

  /* ---------------- 需求变更日志 ---------------- */

  var changeLogs = [
    { id: "CH001", module: "CP公共库",  applicant: "业务产品岗", reason: "OE 交叉关系初始需求，CP 公共库维护全局 OE 交叉", proof: "原型截图01",     approver: "架构负责人", state: "已审核", at: "2026-09-10", rel: ["CP00000001"] },
    { id: "CH002", module: "双模块",    applicant: "业务产品岗", reason: "OE 交叉关系两边同时保留，CP 全局 + SKU 私有",    proof: "原型截图02",     approver: "架构负责人", state: "已审核", at: "2026-09-11", rel: ["CP00000001", "4020340"] },
    { id: "CH003", module: "CP公共库",  applicant: "业务产品岗", reason: "OE 号码按来源分组展示，区分不同数据源",          proof: "ERP搭建测试.xlsx", approver: "架构负责人", state: "已审核", at: "2026-09-12", rel: ["CP00000001"] },
    { id: "CH004", module: "CP公共库",  applicant: "业务产品岗", reason: "OE 表格增加【出现来源】列，展示 OE 在哪些来源出现", proof: "BUG复核截图",   approver: "架构负责人", state: "已审核", at: "2026-09-13", rel: ["CP00000001"] },
    { id: "CH005", module: "自有产品",  applicant: "业务产品岗", reason: "产品详情增加供应商报价：报价、起订量、报价时间有效期", proof: "业务需求截图", approver: "架构负责人", state: "已审核", at: "2026-09-13", rel: ["4020340"] },
    { id: "CH006", module: "多模块",    applicant: "业务产品岗", reason: "修复复核 5 项 BUG：出现来源、主图差异化、全部供应商下拉、起订量红框、图片提示文案", proof: "BUG复核清单截图", approver: "架构负责人", state: "已审核", at: "2026-09-14", rel: ["CP00000001", "4020340"] },
    { id: "CH007", module: "自有产品",  applicant: "业务产品岗", reason: "自有库新增客户目录、公司产品类目目录；客户维度 4 种产品视图", proof: "业务需求截图", approver: "架构负责人", state: "已审核", at: "2026-09-17", rel: ["4020340", "1010140", "8450010"] },
    { id: "CH008", module: "自有产品",  applicant: "业务产品岗", reason: "重构自有产品详情，禁止跳转 CP；新增报关字段、报价/销售/采购历史、OE 引用 Tab", proof: "业务需求截图", approver: "架构负责人", state: "已审核", at: "2026-09-17", rel: ["4020340"] },
    { id: "CH009", module: "供应商模块", applicant: "业务产品岗", reason: "新增供应商代码；增加权限设置，供应商名称、报价可设置业务角色不可见", proof: "业务需求截图", approver: "架构负责人", state: "已审核", at: "2026-09-17", rel: ["S-FI-001"] },
    { id: "CH010", module: "CP公共库",  applicant: "业务产品岗", reason: "OE 号码列表增加 OE 品牌字段；自有产品 OE 引用 Tab 同步；弹窗、导入导出同步增加该字段", proof: "业务需求截图", approver: "架构负责人", state: "已审核", at: "2026-09-17", rel: ["CP00000001", "4020340"] },
    { id: "CH011", module: "CP公共库",  applicant: "外贸业务岗", reason: "CP00000003 源数据品牌列与编号列写反，申请按清洗规则纠正并回写", proof: "数据比对截图", approver: "架构负责人", state: "待审核", at: "2026-09-17", rel: ["CP00000003"] }
  ];

  /* ---------------- 系统操作日志（自动生成，无需审核） ---------------- */

  var sysLogs = [
    { target: "4020340", user: "wangyy",  at: "2026-09-17 11:24", field: "产品小类",   before: "（空）",   after: "Air spring（空气弹簧）" },
    { target: "4020340", user: "wangyy",  at: "2026-09-17 11:22", field: "海关编码",   before: "（空）",   after: "87088090" },
    { target: "4020340", user: "lizq",    at: "2026-09-15 16:08", field: "报价 Q0001 有效期至", before: "2026-11-20", after: "2026-12-20" },
    { target: "1010140", user: "wangyy",  at: "2026-09-14 09:41", field: "英文描述",   before: "Air filter", after: "Engine intake air filter element for heavy duty truck" },
    { target: "8450010", user: "system",  at: "2026-09-02 02:00", field: "OE 列错位",  before: "品牌=WM778A", after: "品牌=Williams Controls" },
    { target: "CP00000001", user: "system", at: "2026-09-01 02:00", field: "覆盖状态", before: "未覆盖",   after: "已覆盖" }
  ];

  /* ---------------- 低可信度 OE 确认任务 ---------------- */

  var confirmTasks = [
    { id: "T001", oe: "AS4323",  brand: "Triangle",          cp: "CP00000001", conf: "C", from: "客户A 询价单 INQ20260912", target: "工厂",   owner: "产品专员-王", state: "确认中",       at: "2026-09-12" },
    { id: "T002", oe: "3547443", brand: "Dayton",            cp: "CP00000001", conf: "B", from: "客户B 询价单 INQ20260914", target: "供应商", owner: "采购-李",     state: "已确认是交叉号", at: "2026-09-14" },
    { id: "T003", oe: "118181",  brand: "Williams Controls", cp: "CP00000003", conf: "C", from: "客户C 询价单 INQ20260916", target: "客户",   owner: "外贸业务-赵", state: "待确认",       at: "2026-09-16" }
  ];

  /* ---------------- 系统设置 ---------------- */

  var users = [
    { acct: "admin",  name: "系统管理员", role: "架构负责人",   sensitive: true,  state: "启用" },
    { acct: "wangyy", name: "王英英",     role: "业务产品岗",   sensitive: true,  state: "启用" },
    { acct: "lizq",   name: "李志强",     role: "采购岗",       sensitive: true,  state: "启用" },
    { acct: "zhaom",  name: "赵敏",       role: "外贸业务岗",   sensitive: false, state: "启用" },
    { acct: "sunl",   name: "孙磊",       role: "外贸业务岗",   sensitive: false, state: "启用" },
    { acct: "chenj",  name: "陈军",       role: "单证岗",       sensitive: false, state: "停用" }
  ];

  var roles = [
    { name: "架构负责人", users: 1, perms: ["全部权限", "需求变更审核", "供应商敏感数据查看"] },
    { name: "业务产品岗", users: 1, perms: ["CP 公共库维护", "自有产品维护", "供应商敏感数据查看", "提交需求变更"] },
    { name: "采购岗",     users: 1, perms: ["采购订单", "供应商报价维护", "供应商敏感数据查看"] },
    { name: "外贸业务岗", users: 2, perms: ["销售订单", "客户报价", "产品查看"] },
    { name: "单证岗",     users: 1, perms: ["订单查看", "报关资料下载"] }
  ];

  var enums = {
    "OE 来源": ["TecDoc", "原厂 EPC", "品牌官网", "权威网站", "客供号码", "airspringapp", "Firestone电子目录", "Usmerkaucuk", "Sampa", "Fleetpride", "DT", "Hengst", "Fleetguard", "Mann", "Google", "客户提供，已出货", "内部录入"],
    "可信度":  ["A — 原厂 EPC / TecDoc 官方 / 工厂书面确认", "B — 品牌官网 / 供应商盖章技术文件", "C — 普通行业网站 / 供应商口头", "D — 论坛 / 客户猜测"],
    "交叉类型": ["交叉引用", "替代关系", "同组关系", "同功能关系"],
    "订单状态": ["草稿", "待确认", "已下单", "生产中", "已收货", "已完成", "已取消"]
  };

  var dataSources = [
    { name: "TecDoc",            type: "API 接口",   freq: "实时查询", last: "2026-09-17 08:00", state: "已连接", rows: "—" },
    { name: "airspringapp",      type: "爬虫 Excel", freq: "每周全量", last: "2026-09-16 22:10", state: "已连接", rows: "21" },
    { name: "Firestone电子目录", type: "爬虫 Excel", freq: "每月全量", last: "2026-09-01 22:10", state: "已连接", rows: "6" },
    { name: "Usmerkaucuk",       type: "爬虫 Excel", freq: "每周全量", last: "2026-09-16 22:10", state: "已连接", rows: "20" },
    { name: "Sampa",             type: "爬虫 Excel", freq: "每周全量", last: "2026-09-16 22:10", state: "已连接", rows: "22" },
    { name: "Fleetguard",        type: "爬虫 Excel", freq: "每月全量", last: "2026-09-10 22:10", state: "已连接", rows: "17" },
    { name: "DT",                type: "爬虫 Excel", freq: "每月全量", last: "2026-09-10 22:10", state: "已连接", rows: "5" },
    { name: "客供号码",          type: "人工录入",   freq: "—",       last: "2026-09-09 15:32", state: "—",     rows: "2" }
  ];

  var reports = [
    { id: "R1", name: "CP-OE 数据报表",       desc: "OE 编号、OE 品牌、来源、可信度、出现来源、所属 CP", masked: false },
    { id: "R2", name: "SKU-供应商报价报表",   desc: "含报价有效期状态，受供应商敏感权限控制脱敏导出",   masked: true  },
    { id: "R3", name: "订单明细报表",         desc: "采购 / 销售订单明细，含订单快照价格",             masked: true  },
    { id: "R4", name: "报价过期预警报表",     desc: "即将过期 / 已过期报价清单，按供应商汇总",         masked: true  },
    { id: "R5", name: "客户产品统计报表",     desc: "客户维度已报价 / 已销售 / 已出运 / 报价未销售",    masked: false },
    { id: "R6", name: "产品类目统计报表",     desc: "大类 - 小类维度 SKU 数量、覆盖状态分布",          masked: false }
  ];

  /* ==================== 计算与查询辅助 ==================== */

  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  /** 报价有效期状态：有效 / 即将过期 / 已过期 */
  function quoteStatus(q) {
    var d = daysBetween(TODAY, q.validTo);
    if (d < 0)               return { key: "expired",  label: "已过期",   cls: "tag--red",    icon: "✕", days: d };
    if (d <= EXPIRING_DAYS)  return { key: "expiring", label: "即将过期", cls: "tag--orange", icon: "!", days: d };
    return                          { key: "valid",    label: "有效",     cls: "tag--green",  icon: "✓", days: d };
  }

  function supplierByCode(code) {
    for (var i = 0; i < suppliers.length; i++) if (suppliers[i].code === code) return suppliers[i];
    return null;
  }
  function productBySku(sku) {
    for (var i = 0; i < products.length; i++) if (products[i].sku === String(sku)) return products[i];
    return null;
  }
  function productByCp(cp) {
    for (var i = 0; i < products.length; i++) if (products[i].cp === cp) return products[i];
    return null;
  }
  function customerById(id) {
    for (var i = 0; i < customers.length; i++) if (customers[i].id === id) return customers[i];
    return null;
  }
  function orderByNo(no) {
    for (var i = 0; i < orders.length; i++) if (orders[i].no === no) return orders[i];
    return null;
  }
  function changeById(id) {
    for (var i = 0; i < changeLogs.length; i++) if (changeLogs[i].id === id) return changeLogs[i];
    return null;
  }

  /** 某 SKU + 供应商的当前有效报价（current = true 的那条） */
  function currentQuote(sku, supplierCode) {
    for (var i = 0; i < quotes.length; i++) {
      if (quotes[i].sku === sku && quotes[i].supplier === supplierCode && quotes[i].current) return quotes[i];
    }
    return null;
  }

  function quotesOf(sku, opts) {
    opts = opts || {};
    return quotes.filter(function (q) {
      if (q.sku !== sku) return false;
      if (opts.currentOnly && !q.current) return false;
      if (opts.supplier && opts.supplier !== "ALL" && q.supplier !== opts.supplier) return false;
      return true;
    });
  }

  function relationsOf(scope, key) {
    return relations.filter(function (r) { return r.scope === scope && r.key === key; });
  }

  /** CP 下的 OE 记录 */
  function oeOf(cp) {
    return window.OE_ROWS.filter(function (r) { return r.cp === cp; });
  }

  /** 按来源分组；同一 OE 会在每个命中它的来源分组内重复出现 */
  function oeGroups(cp) {
    var rows = oeOf(cp), order = [], map = {};
    rows.forEach(function (r) {
      if (!map[r.src]) { map[r.src] = { src: r.src, rows: [], conf: r.conf }; order.push(r.src); }
      map[r.src].rows.push(r);
    });
    return order.map(function (s) { return map[s]; });
  }

  /** 某条 OE（按标准化号）在本 CP 内出现过的全部来源 */
  function oeSources(cp, norm) {
    var out = [];
    oeOf(cp).forEach(function (r) {
      if (r.norm === norm && out.indexOf(r.src) < 0) out.push(r.src);
    });
    return out;
  }

  /** CP 下去重后的 OE 清单（自有产品 OE 引用 Tab 使用） */
  function oeDistinct(cp) {
    var seen = {}, out = [];
    oeOf(cp).forEach(function (r) {
      var k = r.norm + "|" + r.brand;
      if (seen[k]) return;
      seen[k] = 1;
      out.push(r);
    });
    return out;
  }

  function ordersOf(sku, type) {
    return orders.filter(function (o) { return o.sku === sku && o.type === type; });
  }

  /** 客户目录 4 种统计视图 */
  function customerSkus(custId, view) {
    return customerSku.filter(function (x) {
      if (x.cust !== custId) return false;
      if (view === "quoted")   return x.quoted;
      if (view === "sold")     return x.sold;
      if (view === "shipped")  return x.shipped;
      if (view === "unsold")   return x.quoted && !x.sold;
      return true;
    });
  }

  function productsOfCategory(catKey) {
    if (!catKey) return products.slice();
    return products.filter(function (p) {
      return p.catKey === catKey || p.catKey.indexOf(catKey + "/") === 0;
    });
  }

  function changeLogsFor(refId) {
    return changeLogs.filter(function (c) { return c.rel.indexOf(refId) >= 0; });
  }

  function sysLogsFor(target) {
    return sysLogs.filter(function (l) { return l.target === target; });
  }

  /* 汇总指标 */
  function stats() {
    var expiring = 0, expired = 0;
    quotes.filter(function (q) { return q.current; }).forEach(function (q) {
      var s = quoteStatus(q);
      if (s.key === "expiring") expiring++;
      if (s.key === "expired")  expired++;
    });
    var confCount = { A: 0, B: 0, C: 0, D: 0 };
    window.OE_ROWS.forEach(function (r) { confCount[r.conf] = (confCount[r.conf] || 0) + 1; });
    return {
      cpTotal: products.length,
      skuTotal: products.length,
      supplierTotal: suppliers.length,
      oeTotal: window.OE_ROWS.length,
      srcTotal: Object.keys(window.OE_ROWS.reduce(function (m, r) { m[r.src] = 1; return m; }, {})).length,
      monthOrders: orders.filter(function (o) { return o.date.indexOf("2026-09") === 0; }).length,
      expiring: expiring,
      expired: expired,
      conf: confCount,
      flagged: window.OE_ROWS.filter(function (r) { return r.flags && r.flags.length; }).length,
      pendingChange: changeLogs.filter(function (c) { return c.state === "待审核"; }).length,
      pendingTask: confirmTasks.filter(function (t) { return t.state !== "已确认是交叉号"; }).length
    };
  }

  return {
    TODAY: TODAY, EXPIRING_DAYS: EXPIRING_DAYS,
    suppliers: suppliers, products: products, quotes: quotes, relations: relations,
    RELATION_TYPES: RELATION_TYPES, supplyRules: supplyRules,
    customers: customers, customerSku: customerSku, categories: categories,
    orders: orders, changeLogs: changeLogs, sysLogs: sysLogs, confirmTasks: confirmTasks,
    users: users, roles: roles, enums: enums, dataSources: dataSources, reports: reports,
    daysBetween: daysBetween, quoteStatus: quoteStatus,
    supplierByCode: supplierByCode, productBySku: productBySku, productByCp: productByCp,
    customerById: customerById, orderByNo: orderByNo, changeById: changeById,
    currentQuote: currentQuote, quotesOf: quotesOf, relationsOf: relationsOf,
    oeOf: oeOf, oeGroups: oeGroups, oeSources: oeSources, oeDistinct: oeDistinct,
    ordersOf: ordersOf, customerSkus: customerSkus, productsOfCategory: productsOfCategory,
    changeLogsFor: changeLogsFor, sysLogsFor: sysLogsFor, stats: stats
  };
})();

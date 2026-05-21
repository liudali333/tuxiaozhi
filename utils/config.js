// utils/config.js — 全局配置常量
module.exports = {

  // ── 后端 API 地址（必须以 api.php 结尾）────────────────
  BASE_URL: 'https://image.433345.xyz/api.php',

  // ── 计费规则 ───────────────────────────────────────
  TOKEN_COST: {
    MAIN_IMAGE: 10,     // 主图生成：10 积分/张
    DETAIL_IMAGE: 20,   // 详情图生成：20 积分/张（含多模块）
  },

  // ── 充值套餐（与后端 api.php recharge_packages 对齐）─────────────────
  RECHARGE_PACKAGES: (function() {
    const list = [
      { id: 1, name: '体验套餐', tokens: 50,  price: 5,   originalPrice: 10, tag: '首充' },
      { id: 2, name: '标准套餐', tokens: 120, price: 10,  originalPrice: 20, tag: '推荐' },
      { id: 3, name: '高级套餐', tokens: 280, price: 20,  originalPrice: 40, tag: '' },
      { id: 4, name: '年度套餐', tokens: 800, price: 50,  originalPrice: 100, tag: '超值' },
    ]
    return list.map(pkg => ({
      ...pkg,
      // 单位价格（元/100积分），保留1位小数
      unitPrice: (pkg.price / pkg.tokens * 100).toFixed(1),
    }))
  })(),

  // ── 主图比例预设 ───────────────────────────────────
  MAIN_IMAGE_RATIOS: [
    { label: '1:1 方图',  value: '1:1', desc: '拼多多/淘宝/京东/抖音' },
    { label: '3:4 竖图',  value: '3:4', desc: '淘宝/服饰类目' },
    { label: '4:3 横图',  value: '4:3', desc: '博客/网站封面' },
    { label: '9:16 竖图', value: '9:16', desc: '详情/小红书封面' },
  ],

  // ── 详情图比例预设 ─────────────────────────────────
  DETAIL_IMAGE_RATIOS: [
    
    { label: '9:16 竖图', value: '9:16', desc: '通用电商详情图' },
  ],

  // ── 文字风格预设 ───────────────────────────────────
  TEXT_STYLES: [
    { id: 'minimal',   label: '简约',  icon: '🪄' },
    { id: 'promotion', label: '促销',  icon: '🔥' },
    { id: 'luxury',    label: '轻奢',  icon: '✨' },
    { id: 'fresh',     label: '清新',  icon: '🌿' },
    { id: 'retro',     label: '复古',  icon: '📜' },
  ],

  // ── 背景预设 ───────────────────────────────────────
  BACKGROUNDS: [
    { id: 'white',     label: '纯白',     color: '#FFFFFF' },
    { id: 'gradient',  label: '渐变橙',   color: 'linear-gradient(135deg, #FF6B35, #FF8C5A)' },
    { id: 'gradient2', label: '渐变蓝',   color: 'linear-gradient(135deg, #4FACFE, #00F2FE)' },
    { id: 'light',    label: '浅灰',     color: '#F5F5F5' },
    { id: 'dark',     label: '深色',     color: '#1A1A2E' },
  ],

  // ── 详情图模块类型 ─────────────────────────────────
  DETAIL_MODULES: [
    { id: 'product_info', label: '商品信息',  icon: '📦' },
    { id: 'features',     label: '特色卖点',  icon: '💡' },
    { id: 'specs',        label: '规格参数',  icon: '📐' },
    { id: 'price',        label: '价格展示',  icon: '💰' },
    { id: 'cta',          label: '行动号召',  icon: '👉' },
  ],

  // ── 参考图配置 ─────────────────────────────────────
  MAX_REF_IMAGES: 3, // 最多上传3张参考图
  
  // ── 生图模式（仅图生图）────────────────────────────────────
  GENERATE_MODES: [
    { id: 'img2img', label: '图生图', desc: '上传参考图生成相似图片', icon: '🖼️' },
  ],

  // ── 生成状态 ───────────────────────────────────────
  TASK_STATUS: {
    PENDING:   'pending',   // 等待中
    GENERATING:'generating', // 生成中
    DONE:      'done',      // 完成
    FAILED:    'failed',    // 失败
  },
}

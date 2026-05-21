// pages/generate/index.js
// 进阶参数配置页（可选，首页直接生成时不需要此页面）
const app = getApp()
const config = require('../../utils/config.js')
const request = require('../../utils/request.js')

Page({
  data: {
    mode: 'main',
    name: '',
    form: {},
    config,
    generating: false,
  },

  onLoad(opt) {
    // 支持 ?mode= 或 ?type=（history 页重生成时传 type）
    var mode = opt.mode || opt.type || 'main'
    var name = opt.name ? decodeURIComponent(opt.name) : ''
    this.setData({
      name: name,
      mode: mode,
      balance: app.globalData.balance,
    })
    // 默认表单
    if (mode === 'main') {
      this.setData({
        form: {
          ratio: '1:1',
          style: 'minimal',
          bg: 'white',
          count: 1,
        },
      })
    } else {
      this.setData({
        form: {
          modules: ['product_info', 'features', 'price'],
          extra: '',
        },
      })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  selectRatio(e) {
    this.setData({ 'form.ratio': e.currentTarget.dataset.value })
  },

  selectStyle(e) {
    this.setData({ 'form.style': e.currentTarget.dataset.id })
  },

  selectBg(e) {
    this.setData({ 'form.bg': e.currentTarget.dataset.id })
  },

  setCount(e) {
    this.setData({ 'form.count': e.detail.value })
  },

  toggleModule(e) {
    const id = e.currentTarget.dataset.id
    const modules = [...(this.data.form.modules || [])]
    const idx = modules.indexOf(id)
    if (idx > -1) modules.splice(idx, 1)
    else modules.push(id)
    this.setData({ 'form.modules': modules })
  },

  getCost() {
    return this.data.mode === 'main'
      ? config.TOKEN_COST.MAIN_IMAGE * (this.data.form.count || 1)
      : config.TOKEN_COST.DETAIL_IMAGE
  },

  startGenerate() {
    const { mode, balance } = this.data
    const cost = this.getCost()

    if (balance < cost) {
      wx.showModal({
        title: '积分不足',
        content: `需要 ${cost} 积分，当前 ${balance} 积分`,
        confirmText: '去充值',
        success: res => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/recharge/index' })
          }
        },
      })
      return
    }

    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }

    this.setData({ generating: true })

    const params = mode === 'main'
      ? {
          type: 'main',
          name: this.data.name,
          ratio: this.data.form.ratio,
          style: this.data.form.style,
          bg: this.data.form.bg,
          count: this.data.form.count || 1,
        }
      : {
          type: 'detail',
          name: this.data.name,
          modules: this.data.form.modules,
          extra: this.data.form.extra,
        }

    request.createGenerateTask(params).then(res => {
      app.updateBalance(-cost)
      this.setData({ generating: false })
      
      // 如果任务已完成（同步返回结果），直接显示图片
      if (res.status === 'completed' && res.imageUrl) {
        wx.navigateTo({ url: `/pages/result/index?taskId=${res.taskId}&mode=${mode}&status=completed&imageUrl=${encodeURIComponent(res.imageUrl)}` })
      } else {
        // 异步任务，跳转到轮询页面
        wx.navigateTo({ url: `/pages/result/index?taskId=${res.taskId}&mode=${mode}` })
      }
    }).catch(() => {
      this.setData({ generating: false })
    })
  },
})

// pages/recharge/index.js
const app = getApp()
const request = require('../../utils/request.js')
const config = require('../../utils/config.js')
const { wxPayment, wxVirtualPayment } = require('../../utils/util.js')

Page({
  data: {
    balance: 0,
    packages: [],
    selectedPkg: '',
    selectedPkgPrice: 0,
    paying: false,
  },

  onLoad() {
    this.loadPackages()
  },

  onShow() {
    this.setData({ balance: app.globalData.balance })
  },

  async loadPackages() {
    try {
      const list = await request.getPackages()
      this.setData({ packages: list || [] })
    } catch (e) {
      console.error('加载套餐失败', e)
    }
  },

  // 选择套餐
  selectPkg(e) {
    const id = e.currentTarget.dataset.id
    const pkg = this.data.packages.find(p => p.id === id)
    if (!pkg) return
    this.setData({
      selectedPkg: id,
      selectedPkgPrice: pkg.price,
    })
  },

  // 发起虚拟支付
  async doPayment() {
    if (!this.data.selectedPkg || this.data.paying) return

    // ⚠️ 验证所选套餐是否存在于套餐列表中
    const pkg = this.data.packages.find(p => p.id === this.data.selectedPkg)
    if (!pkg) {
      wx.showToast({ title: '套餐不存在', icon: 'none' })
      return
    }

    this.setData({ paying: true })

    try {
      // ⚠️ 检查登录状态
      if (!app.globalData.userId) {
        wx.showModal({
          title: '提示',
          content: '请先登录后再进行充值',
          showCancel: false,
          success: () => {
            wx.navigateTo({ url: '/pages/login/index' })
          }
        })
        return
      }

      console.log('[充值] 开始流程, selectedPkg:', this.data.selectedPkg)

      // 0. ⚠️ 关键：先 wx.login() 获取 fresh code，让后端换取最新 session_key
      //    session_key 每次登录会刷新，旧 key 立即失效，用过期 key 算签名 → SIGNATURE_INVALID
      console.log('[充值] 先 login 获取 fresh code...')
      const loginRes = await new Promise((resolve) => {
        wx.login({
          success: (res) => resolve(res),
          fail: (err) => { console.error('[充值] wx.login 失败', err); resolve({ code: '' }) }
        })
      })
      if (!loginRes.code) {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        return
      }
      console.log('[充值] 获取到 fresh code:', loginRes.code.substring(0, 10) + '...')

      // 1. 向后端下单（带上 fresh code），获取虚拟支付参数
      console.log('[充值] 调用后端接口...')
      const paymentParams = await request.recharge(this.data.selectedPkg, loginRes.code)
      console.log('[充值] 后端返回:', paymentParams)

      // 2. 获取平台信息
      const systemInfo = wx.getSystemInfoSync()
      const platform = systemInfo.platform

      // 3. 调起虚拟支付（只传 4 个核心参数，与官方示例一致）
      // ⚠️ 重要：不要同时传 offerId/buyQuantity/productId/goodsPrice 等单独字段
      //   微信 SDK 内部会从 signData 解析这些值；同时传会导致签名冲突
      const payParams = {
        signData: paymentParams.signData,
        mode: paymentParams.mode || 'short_series_goods',  // 后端使用道具直购模式
        paySig: paymentParams.paySig,
        signature: paymentParams.signature || '',
      }
      console.log('[充值] 准备虚拟支付, payParams:', payParams)
      const payResult = await wxVirtualPayment(payParams)
      console.log('[充值] 虚拟支付结果:', payResult)

      // 4. 支付成功，通知后端发货（关键步骤，否则积分不会到账）
      console.log('[充值] 通知后端确认订单:', paymentParams.orderId)
      try {
        await request.confirmRecharge(paymentParams.orderId)
        console.log('[充值] 后端确认成功')
      } catch (e) {
        console.error('[充值] 后端确认失败', e)
        // 即便后端确认失败，积分可能已通过微信回调到账
      }

      // 5. 刷新余额
      const balance = await request.getBalance()
      app.globalData.balance = balance
      app.updateBalance(0)

      wx.showModal({
        title: '🎉 充值成功',
        content: `恭喜！${this.data.packages.find(p => p.id === this.data.selectedPkg)?.tokens || ''} 积分已到账`,
        showCancel: false,
        success: () => {
          wx.navigateBack()
        },
      })
    } catch (err) {
      if (!err.errMsg || !err.errMsg.includes('cancel')) {
        wx.showToast({ title: err.message || '充值失败，请稍后重试', icon: 'none', duration: 2000 })
      }
    } finally {
      this.setData({ paying: false })
    }
  },
})

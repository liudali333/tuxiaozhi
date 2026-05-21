// pages/redeem/index.js
const app = getApp()
const request = require('../../utils/request.js')

Page({
  data: {
    code: '',
    loading: false,
    success: false,
    earnedTokens: 0,
  },

  onInput(e) {
    let value = e.detail.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    this.setData({ code: value })
  },

  clearCode() {
    this.setData({ code: '' })
  },

  async doRedeem() {
    const { code, loading } = this.data

    if (loading) return
    if (!code) {
      wx.showToast({ title: '请输入兑换码', icon: 'none' })
      return
    }
    if (code.length !== 16) {
      wx.showToast({ title: '兑换码必须为16位', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      const res = await request.redeemCode(code)
      this.setData({
        loading: false,
        success: true,
        earnedTokens: res.tokens || 0,
      })
      if (app.updateBalance) {
        app.updateBalance(res.tokens)
      }
    } catch (err) {
      this.setData({ loading: false })
      const msg = err.message || '兑换失败'
      wx.showModal({
        title: '兑换失败',
        content: msg,
        showCancel: false,
      })
    }
  },

  reset() {
    this.setData({ code: '', success: false, earnedTokens: 0 })
  },

  goBack() {
    wx.navigateBack()
  },
})

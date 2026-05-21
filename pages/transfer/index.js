// pages/transfer/index.js
const app = getApp()
const request = require('../../utils/request.js')

Page({
  data: {
    balance: 0,
    targetUserId: '',
    transferAmount: '',
    targetUser: null,
    submitting: false,
  },

  onLoad() {
    this.setData({ balance: app.globalData.balance })
  },

  onShow() {
    this.setData({ balance: app.globalData.balance })
  },

  // 输入用户ID
  onUserIdInput(e) {
    this.setData({ targetUserId: e.detail.value, targetUser: null })
  },

  // 输入转赠金额
  onAmountInput(e) {
    this.setData({ transferAmount: e.detail.value })
  },

  // 查询用户信息
  async checkUser() {
    const { targetUserId } = this.data
    if (!targetUserId || isNaN(targetUserId)) {
      wx.showToast({ title: '请输入有效的用户ID', icon: 'none' })
      return
    }

    try {
      const user = await request.getUserInfo(parseInt(targetUserId))
      this.setData({ targetUser: user })
      wx.showToast({ title: '用户信息已获取', icon: 'success' })
    } catch (e) {
      console.error('查询用户失败', e)
      this.setData({ targetUser: null })
    }
  },

  // 确认转赠
  async confirmTransfer() {
    const { targetUserId, transferAmount, targetUser, submitting, balance } = this.data
    
    if (submitting) return
    
    if (!targetUser) {
      wx.showToast({ title: '请先查询用户信息', icon: 'none' })
      return
    }

    if (!transferAmount || isNaN(transferAmount) || parseInt(transferAmount) <= 0) {
      wx.showToast({ title: '请输入有效的转赠积分', icon: 'none' })
      return
    }

    const amount = parseInt(transferAmount)
    if (amount > balance) {
      wx.showToast({ title: '积分不足', icon: 'none' })
      return
    }

    // 弹窗确认
    wx.showModal({
      title: '确认转赠',
      content: `确定要向 ${targetUser.nickname || '用户'} 转赠 ${amount} 积分吗？`,
      confirmText: '确认',
      confirmColor: '#FF6B35',
      success: async (res) => {
        if (res.confirm) {
          this.doTransfer(targetUser, amount)
        }
      }
    })
  },

  // 执行转赠
  async doTransfer(targetUser, amount) {
    this.setData({ submitting: true })

    try {
      const result = await request.transferBalance(targetUser.id, amount)
      
      // 更新余额
      app.globalData.balance = result.newBalance
      app.updateBalance(0)
      
      this.setData({
        balance: result.newBalance,
        targetUserId: '',
        transferAmount: '',
        targetUser: null,
        submitting: false,
      })

      wx.showModal({
        title: '转赠成功',
        content: `已成功向 ${result.toNickname || targetUser.nickname} 转赠 ${amount} 积分`,
        showCancel: false,
        confirmText: '确定',
        success: () => {
          wx.navigateBack()
        }
      })
    } catch (e) {
      console.error('转赠失败', e)
      this.setData({ submitting: false })
    }
  }
})

// app.js — 小程序全局入口
App({
  globalData: {
    userInfo: null,
    token: null,
    balance: 0,
    openid: '',
    userId: 0,
    nickname: '',
    avatar: '',
    shareConfig: null,
    requestUrl: 'https://image.433345.xyz/api.php',
  },

  onLaunch() {
    // 恢复本地缓存的登录态
    const cachedOpenid   = wx.getStorageSync('openid')
    const cachedToken    = wx.getStorageSync('token')
    const cachedUserInfo = wx.getStorageSync('userInfo')
    const cachedBalance  = wx.getStorageSync('balance') || 0
    const cachedUserId   = wx.getStorageSync('userId') || 0
    const cachedNickname = wx.getStorageSync('nickname') || ''
    const cachedAvatar   = wx.getStorageSync('avatar') || ''

    if (cachedOpenid)   this.globalData.openid   = cachedOpenid
    if (cachedToken)    this.globalData.token     = cachedToken
    if (cachedUserInfo) this.globalData.userInfo = cachedUserInfo
    if (cachedBalance)  this.globalData.balance  = cachedBalance
    if (cachedUserId)   this.globalData.userId   = cachedUserId
    if (cachedNickname) this.globalData.nickname = cachedNickname
    if (cachedAvatar)   this.globalData.avatar   = cachedAvatar

    // 获取分享配置
    this.loadShareConfig()

    // 静默登录（无本地缓存才触发）- 注释掉，改为用户手动登录
    // if (!cachedOpenid) this.wxLogin()

    // 小程序后台更新机制
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate(res => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已准备好，是否重启应用？',
              success: res => { if (res.confirm) updateManager.applyUpdate() }
            })
          })
          updateManager.onUpdateFailed(() => {
            wx.showModal({
              title: '更新失败',
              content: '新版本下载失败，请检查网络后重试',
              showCancel: false
            })
          })
        }
      })
    }
  },

  // 处理页面参数中的邀请码（供所有页面调用）
  setInviteCodeFromOptions(options) {
    if (options && options.invite) {
      const inviteCode = options.invite
      if (inviteCode && !wx.getStorageSync('invite_code')) {
        wx.setStorageSync('invite_code', inviteCode)
        console.log('页面邀请码已保存:', inviteCode)
      }
    }
  },

  // 清除邀请码（登录成功后调用）
  clearInviteCode() {
    wx.removeStorageSync('invite_code')
    console.log('邀请码已清除')
  },

  // 微信登录（静默登录或带用户信息登录）
  wxLogin(userInfo) {
    wx.login({
      success: res => {
        if (!res.code) return
        const request = require('./utils/request.js')
        request.wxLogin(res.code, userInfo).then(data => {
          this.globalData.openid   = data.openid
          this.globalData.token    = data.token
          this.globalData.balance  = data.balance || 0
          this.globalData.userId   = data.userId || 0
          // 从返回数据获取用户信息，或者用传入的
          if (data.nickname) this.globalData.nickname = data.nickname
          if (data.avatar) this.globalData.avatar = data.avatar
          if (userInfo) this.globalData.userInfo = userInfo
          
          wx.setStorageSync('openid',   data.openid)
          wx.setStorageSync('token',    data.token)
          wx.setStorageSync('balance',  data.balance || 0)
          wx.setStorageSync('userId',   data.userId || 0)
          if (data.nickname) wx.setStorageSync('nickname', data.nickname)
          if (data.avatar) wx.setStorageSync('avatar', data.avatar)
          if (userInfo) wx.setStorageSync('userInfo', userInfo)

          // 登录成功后清除邀请码（避免重复绑定）
          this.clearInviteCode()
        }).catch(() => {
          // 网络错误静默处理
        })
      }
    })
  },

  // 获取分享配置
  loadShareConfig() {
    const request = require('./utils/request.js')
    request.getShareConfig().then(data => {
      if (data && typeof data === 'object') {
        this.globalData.shareConfig = data
      }
    }).catch(() => {
      // 网络错误静默处理
    })
  },

  // 统一积分更新 + 通知所有页面刷新
  updateBalance(delta) {
    const newBalance = this.globalData.balance + delta
    if (newBalance < 0) return
    this.globalData.balance = newBalance
    wx.setStorageSync('balance', newBalance)
    // 通知所有已加载的页面
    const pages = getCurrentPages()
    pages.forEach(page => {
      if (typeof page.onBalanceUpdate === 'function') {
        page.onBalanceUpdate(newBalance)
      }
    })
  },
})

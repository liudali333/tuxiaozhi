// pages/profile/index.js
const app = getApp()
const request = require('../../utils/request.js')

Page({
  data: {
    userInfo: {},
    openid: '',
    balance: 0,
    hasLogin: false,
    loginLoading: false,
    avatarUploading: false,
    tempAvatar: '',
    tempNickname: '',
    userId: 0,
    todaySigned: false,
    signLoading: false,
    signReward: 20,
    showProfileSetup: false, // 是否显示头像昵称设置弹窗
    needProfileSetup: false, // 是否需要设置头像昵称
  },

  onShow() {
    this.setData({
      userInfo: app.globalData.userInfo || {},
      openid: app.globalData.openid || wx.getStorageSync('openid') || '',
      balance: app.globalData.balance,
      hasLogin: !!(app.globalData.openid || wx.getStorageSync('openid')),
      userId: app.globalData.userId || 0,
    })
    this.refreshBalance()
    this.checkTodaySigned()
    this.loadSignConfig()
  },

  // ── 微信一键登录（点击弹出头像昵称设置弹窗）──
  showLoginModal() {
    if (this.data.loginLoading) return
    
    this.setData({
      showProfileSetup: true,
      tempAvatar: '',
      tempNickname: '',
    })
  },

  // ── 登录按钮点击处理（保留兼容）──
  onLoginClick() {
    if (this.data.loginLoading) return
    if (!wx.getUserProfile) {
      wx.showToast({ title: '微信版本过低，请升级', icon: 'none' })
      return
    }
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (profileRes) => {
        const userInfo = profileRes.userInfo
        if (!userInfo || !userInfo.avatarUrl || !userInfo.nickName) {
          wx.showToast({ title: '获取用户信息失败', icon: 'none' })
          return
        }
        this.setData({ loginLoading: true })
        wx.login({
          success: (loginRes) => {
            if (!loginRes.code) {
              this.setData({ loginLoading: false })
              wx.showToast({ title: '获取登录凭证失败', icon: 'none' })
              return
            }
            this._downloadAndUploadAvatar(userInfo.avatarUrl).then(uploadedUrl => {
              userInfo.avatar = uploadedUrl
              this._performLogin(loginRes.code, userInfo)
            }).catch(() => {
              this._simpleLogin(loginRes.code, userInfo.nickName)
            })
          },
          fail: () => {
            this.setData({ loginLoading: false })
            wx.showToast({ title: '登录失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '请授权以使用完整功能', icon: 'none' })
      }
    })
  },

  // ── 通过 button 获取用户信息 ──
  onGetUserInfo(e) {
    if (this.data.loginLoading) return
    
    const userInfo = e.detail.userInfo
    
    if (!userInfo) {
      wx.showToast({ title: '请授权登录', icon: 'none' })
      return
    }
    
    this.setData({ loginLoading: true })
    
    // 先执行 wx.login 获取 code
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loginLoading: false })
          wx.showToast({ title: '登录失败', icon: 'none' })
          return
        }
        
        // 下载并上传头像
        this._downloadAndUploadAvatar(userInfo.avatarUrl).then(uploadedUrl => {
          userInfo.avatar = uploadedUrl
          this._performLogin(loginRes.code, userInfo)
        }).catch(() => {
          // 使用简单登录，但保留昵称
          this._simpleLogin(loginRes.code, userInfo.nickName)
        })
      },
      fail: () => {
        this.setData({ loginLoading: false })
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  },

  // ── 获取微信用户信息并登录 ──
  onGetUserProfile() {
    if (this.data.loginLoading) return
    
    // 先执行 wx.login 获取 code（用于获取 openid）
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.showToast({ title: '获取登录凭证失败', icon: 'none' })
          return
        }
        
        // 尝试获取用户信息
        if (wx.getUserProfile) {
          wx.getUserProfile({
            desc: '用于完善会员资料',
            success: (res) => {
              const userInfo = res.userInfo
              if (!userInfo || !userInfo.avatarUrl || !userInfo.nickName) {
                // 即使获取不到用户信息，也尝试用 code 登录
                this._simpleLogin(loginRes.code, null)
                return
              }
              
              this.setData({ loginLoading: true })
              
              // 下载并上传头像
              this._downloadAndUploadAvatar(userInfo.avatarUrl).then(uploadedUrl => {
                userInfo.avatar = uploadedUrl
                this._performLogin(loginRes.code, userInfo)
              }).catch(() => {
                this._simpleLogin(loginRes.code, userInfo.nickName)
              })
            },
            fail: () => {
              // 用户拒绝授权，使用简单登录
              wx.showToast({ title: '将使用默认昵称登录', icon: 'none' })
              this._simpleLogin(loginRes.code, null)
            }
          })
        } else {
          // API 不可用，使用简单登录
          this._simpleLogin(loginRes.code, null)
        }
      },
      fail: () => {
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  },

  // ── 简单登录（不获取用户信息）──
  _simpleLogin(code, nickname) {
    this.setData({ loginLoading: true })
    
    const inviteCode = wx.getStorageSync('invite_code') || ''
    request.wxLogin(code, {
      nickname: nickname || '微信用户',
      avatar: '',
      gender: 0,
      country: '',
    }, inviteCode).then(data => {
      app.globalData.openid   = data.openid
      app.globalData.token    = data.token
      app.globalData.userInfo = { nickname: data.nickname || '微信用户' }
      app.globalData.balance  = data.balance || 0
      app.globalData.userId   = data.userId || 0
      if (data.nickname) app.globalData.nickname = data.nickname
      if (data.avatar) app.globalData.avatar = data.avatar

      wx.setStorageSync('openid', data.openid)
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('userId', data.userId || 0)
      wx.setStorageSync('balance', data.balance || 0)

      this.setData({
        hasLogin: true,
        loginLoading: false,
        balance: data.balance || 0,
        userId: data.userId || 0,
      })

      wx.showToast({ title: '登录成功', icon: 'success' })
      this.refreshBalance()
      this.checkTodaySigned()

      // 登录成功后清除邀请码（避免重复绑定）
      app.clearInviteCode()
    }).catch(err => {
      this.setData({ loginLoading: false })
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    })
  },

  // ── 下载头像并上传 ──
  _downloadAndUploadAvatar(url) {
    return new Promise((resolve, reject) => {
      const cachedOpenid = wx.getStorageSync('openid') || ''
      const cachedToken = wx.getStorageSync('token') || ''
      wx.downloadFile({
        url: url,
        success: (downloadRes) => {
          const config = require('../../utils/config.js')
          wx.uploadFile({
            url: config.BASE_URL,
            filePath: downloadRes.tempFilePath,
            name: 'image',
            formData: { 
              act: 'upload_image',
              type: 'avatar',
              openid: cachedOpenid,
              token: cachedToken
            },
            header: {
              'Content-Type': 'multipart/form-data',
            },
            success: (uploadRes) => {
              try {
                const data = JSON.parse(uploadRes.data)
                if (data.code === 0 && data.data && data.data.url) {
                  resolve(data.data.url)
                } else {
                  reject(data.message || '上传失败')
                }
              } catch (err) {
                reject(err)
              }
            },
            fail: (err) => {
              reject(err)
            }
          })
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  // ── 执行登录请求 ──
  _performLogin(code, userInfo) {
    const inviteCode = wx.getStorageSync('invite_code') || ''
    request.wxLogin(code, userInfo, inviteCode).then(data => {
      app.globalData.openid   = data.openid
      app.globalData.token    = data.token
      app.globalData.userInfo = userInfo
      app.globalData.balance  = data.balance || 0
      app.globalData.userId   = data.userId || 0
      if (data.nickname) app.globalData.nickname = data.nickname
      if (data.avatar) app.globalData.avatar = data.avatar

      wx.setStorageSync('openid', data.openid)
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('userId', data.userId || 0)
      wx.setStorageSync('balance', data.balance || 0)
      if (data.nickname) wx.setStorageSync('nickname', data.nickname)
      if (data.avatar) wx.setStorageSync('avatar', data.avatar)

      this.setData({
        hasLogin: true,
        loginLoading: false,
        userInfo: userInfo,
        balance: data.balance || 0,
        userId: data.userId || 0,
      })

      wx.showToast({ title: '登录成功', icon: 'success' })
      this.refreshBalance()
      this.checkTodaySigned()

      // 登录成功后清除邀请码（避免重复绑定）
      app.clearInviteCode()
    }).catch(err => {
      this.setData({ loginLoading: false })
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    })
  },

  // ── 上传头像到服务器 ──
  _uploadAvatar(filePath) {
    return new Promise((resolve, reject) => {
      const config = require('../../utils/config.js')
      const cachedOpenid = wx.getStorageSync('openid') || ''
      const cachedToken = wx.getStorageSync('token') || ''
      wx.uploadFile({
        url: config.BASE_URL,
        filePath: filePath,
        name: 'image',
        formData: { 
          act: 'upload_image',
          openid: cachedOpenid,
          token: cachedToken
        },
        header: {
          'Content-Type': 'multipart/form-data',
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 0 && data.data && data.data.url) {
              resolve(data.data.url)
            } else {
              reject(data.message || '上传失败')
            }
          } catch (err) {
            reject(err)
          }
        },
        fail: (err) => {
          reject(err)
        },
      })
    })
  },

  // ── 选择微信昵称 ──
  onNicknameInput(e) {
    const nickname = e.detail.value.trim()
    this.setData({ tempNickname: nickname })
    
    // 如果已经有头像了，直接登录
    if (nickname && this.data.tempAvatar) {
      this._tryLogin()
    }
  },

  // ── 执行登录 ──
  async _tryLogin() {
    const { tempAvatar, tempNickname, loginLoading, avatarUploading } = this.data
    
    // 检查状态
    if (loginLoading || avatarUploading) return
    if (!tempAvatar || !tempNickname) return

    // 检查头像是否是临时 URL（微信的头像是临时的），如果是就先上传
    let finalAvatar = tempAvatar
    if (tempAvatar.indexOf('http') === 0 && tempAvatar.indexOf('.qpic.cn') !== -1 || tempAvatar.indexOf('tmp') !== -1) {
      try {
        this.setData({ avatarUploading: true })
        wx.showLoading({ title: '上传头像...' })
        finalAvatar = await this._uploadAvatar(tempAvatar)
        this.setData({ tempAvatar: finalAvatar })
      } catch (err) {
        wx.hideLoading()
        this.setData({ avatarUploading: false })
        wx.showToast({ title: '头像上传失败，请重试', icon: 'none' })
        return
      }
    }

    wx.hideLoading()
    this.setData({ loginLoading: true, avatarUploading: false })

    wx.login({
      success: loginRes => {
        if (!loginRes.code) {
          this.setData({ loginLoading: false })
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          return
        }

        const userInfo = {
          nickname: tempNickname,
          avatar: finalAvatar,
          gender: 0,
          country: '',
          province: '',
          city: '',
        }

        const inviteCode = wx.getStorageSync('invite_code') || ''
        request.wxLogin(loginRes.code, userInfo, inviteCode).then(data => {
          app.globalData.openid   = data.openid
          app.globalData.token    = data.token
          app.globalData.userInfo = userInfo
          app.globalData.balance  = data.balance || 0
          app.globalData.userId   = data.userId || 0
          if (data.nickname) app.globalData.nickname = data.nickname
          if (data.avatar) app.globalData.avatar = data.avatar

          wx.setStorageSync('openid', data.openid)
          wx.setStorageSync('token', data.token)
          wx.setStorageSync('userInfo', userInfo)
          wx.setStorageSync('userId', data.userId || 0)
          if (data.nickname) wx.setStorageSync('nickname', data.nickname)
          if (data.avatar) wx.setStorageSync('avatar', data.avatar)

          this.setData({
            userInfo: {
              nickname: data.nickname || userInfo.nickname,
              avatar: data.avatar || userInfo.avatar
            },
            openid: data.openid,
            balance: data.balance || 0,
            hasLogin: true,
            loginLoading: false,
            tempAvatar: '',
            tempNickname: '',
            userId: data.userId || 0,
          })
          wx.showToast({ title: '登录成功', icon: 'success' })
        }).catch(() => {
          this.setData({ loginLoading: false })
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        })
      },
      fail: () => {
        this.setData({ loginLoading: false })
        wx.showToast({ title: '微信登录失败', icon: 'none' })
      },
    })
  },

  // 刷新余额
  refreshBalance() {
    request.getBalance().then(balance => {
      this.setData({ 
        balance, 
        userId: app.globalData.userId || 0,
        userInfo: { 
          nickname: app.globalData.nickname || this.data.userInfo.nickname, 
          avatar: app.globalData.avatar || this.data.userInfo.avatar 
        }
      })
    }).catch(() => {})
  },

  // 跳转充值页
  goRecharge() {
    wx.navigateTo({ url: '/pages/recharge/index' })
  },

  // 跳转兑换页
  goRedeem() {
    wx.navigateTo({ url: '/pages/redeem/index' })
  },

  // 跳转积分互转页
  goTransfer() {
    if (!this.data.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/transfer/index' })
  },

  // 跳转充值记录
  goHistory() {
    wx.navigateTo({ url: '/pages/recharge-history/index' })
  },

  // 跳转积分记录
  goBalanceLogs() {
    wx.navigateTo({ url: '/pages/balance-logs/index' })
  },

  // 邀请好友
  goInvite() {
    wx.navigateTo({ url: '/pages/invite/index' })
  },

  // 用户协议
  showAgreement() {
    wx.showModal({
      title: '用户协议与隐私政策',
      content:
        '【用户服务协议】\n\n' +
        '1. 服务说明\n本小程序为用户提供AI图片生成服务，包括电商主图、详情图等图片生成功能。\n\n' +
        '2. 用户账号\n用户使用微信授权登录后，系统会为用户分配唯一用户ID，用于区分不同用户并管理用户数据。\n\n' +
        '3. 积分说明\n- 用户可通过充值获取积分\n- 生成图片需要消耗对应积分\n- 积分有效期12个月\n\n' +
        '4. 用户行为规范\n用户在使用本服务时，应遵守法律法规，不得生成违法违规内容。\n\n' +
        '【隐私政策】\n\n' +
        '1. 信息收集\n- 我们会收集您的微信头像、昵称用于用户身份展示\n- 我们会获取您的微信OpenID用于区分不同用户\n\n' +
        '2. AI服务说明\n- 本小程序使用第三方AI接口提供图片生成服务\n- 您的图片生成请求会发送至AI服务提供商进行处理\n\n' +
        '3. 存储权限\n- 为了让您保存生成的图片，我们需要获取您的相册写入权限\n- 我们仅在您主动保存图片时使用该权限\n\n' +
        '4. 数据保护\n我们会采取合理的技术措施保护您的个人信息安全。',
      showCancel: false,
      confirmText: '我知道了',
    })
  },

  // 联系客服 - button open-type="contact" 回调
  onContact(e) {
    console.log('客服回调:', e.detail)
    if (e.detail.errMsg === 'contact:fail') {
      wx.showToast({
        title: '客服连接失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 联系客服 - 使用微信官方客服接口（备用方案）
  // 参考文档：https://developers.weixin.qq.com/miniprogram/dev/api/open-api/customer-service/wx.openCustomerServiceChat.html
  contactService() {
    wx.openCustomerServiceChat({
      url: '/pages/home/index',
      sessionFrom: 'profile',
      success: (res) => {
        console.log('客服聊天打开成功:', res)
      },
      fail: (err) => {
        console.error('打开客服失败:', err)
        wx.showToast({
          title: '客服连接失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#FF5252',
      success: (res) => {
        if (res.confirm) {
          // 清除全局数据
          app.globalData.userInfo = null
          app.globalData.token = null
          app.globalData.balance = 0
          app.globalData.openid = ''
          app.globalData.userId = 0
          app.globalData.nickname = ''
          app.globalData.avatar = ''
          
          // 清除本地缓存
          wx.removeStorageSync('openid')
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('balance')
          wx.removeStorageSync('userId')
          wx.removeStorageSync('nickname')
          wx.removeStorageSync('avatar')
          wx.removeStorageSync('lastSignDate')
          
          // 更新页面状态
          this.setData({
            userInfo: {},
            openid: '',
            balance: 0,
            hasLogin: false,
            tempAvatar: '',
            userId: 0,
          })
          
          wx.showToast({ title: '已退出登录', icon: 'success' })
        }
      },
    })
  },

  // ── 检查今日是否已签到 ──
  checkTodaySigned() {
    const lastSignDate = wx.getStorageSync('lastSignDate')
    const today = this._getTodayDate()
    this.setData({ todaySigned: lastSignDate === today })
  },

  // ── 获取今日日期字符串（YYYY-MM-DD） ──
  _getTodayDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // ── 加载签到配置 ──
  async loadSignConfig() {
    try {
      const cfg = await request.getSignConfig()
      if (cfg && typeof cfg.sign_reward === 'number') {
        this.setData({ signReward: cfg.sign_reward })
      }
    } catch (err) {
      // 加载失败使用默认值
    }
  },

  // ── 执行签到 ──
  async doSignIn() {
    if (this.data.todaySigned || this.data.signLoading) return

    this.setData({ signLoading: true })

    if (this.checkTodaySigned()) {
      this.setData({ signLoading: false })
      return
    }

    try {
      const cfg = await request.getSignConfig()

      if (cfg && cfg.sign_ad_unit_id) {
        await this._watchAdAndSign(cfg.sign_ad_unit_id, cfg.sign_reward || 20)
      } else {
        await this._claimSignReward(0)
      }
    } catch (err) {
      // 签到失败
    }
  },

  // ── 观看激励视频并签到 ──
  _watchAdAndSign(adUnitId, reward) {
    return new Promise((resolve, reject) => {
      const that = this
      const videoAd = wx.createRewardedVideoAd({ adUnitId: adUnitId })
      let isHandled = false

      const closeHandler = (res) => {
        if (isHandled) return
        isHandled = true
        videoAd.offClose(closeHandler)
        videoAd.offError()
        videoAd.offLoad()

        if (res && res.isEnded) {
          that._claimSignReward(1).then(resolve).catch(reject)
        } else {
          that.setData({ signLoading: false })
          wx.showToast({ title: '请完整观看广告以获得奖励', icon: 'none' })
          reject(new Error('not_completed'))
        }
      }

      const errorHandler = (err) => {
        if (isHandled) return
        isHandled = true
        videoAd.offClose(closeHandler)
        videoAd.offError()
        videoAd.offLoad()
        that.setData({ signLoading: false })
        wx.showToast({ title: '广告加载失败，请稍后再试', icon: 'none' })
        reject(err)
      }

      videoAd.onClose(closeHandler)
      videoAd.onError(errorHandler)

      videoAd.load()
        .then(() => videoAd.show())
        .catch(errorHandler)
    })
  },

  // ── 领取签到奖励 ──
  async _claimSignReward(adWatched) {
    const today = this._getTodayDate()

    const res = await request.doSignIn(adWatched)

    if (res && typeof res.reward === 'number') {
      wx.setStorageSync('lastSignDate', today)

      const rewardAmount = res.reward || 20
      app.globalData.balance = (app.globalData.balance || 0) + rewardAmount
      this.setData({
        balance: app.globalData.balance,
        todaySigned: true,
        signLoading: false,
      })

      wx.showToast({
        title: `🎁 签到成功，获得 ${rewardAmount} 积分`,
        icon: 'success'
      })
    } else {
      this.setData({ signLoading: false })
      wx.showToast({
        title: res?.message || '签到失败，请稍后再试',
        icon: 'none'
      })
      throw new Error(res?.message || 'sign failed')
    }
  },

  // ═══════════════════ 头像昵称设置弹窗 ═══════════════════

  // 选择头像（open-type="chooseAvatar"）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail || {}
    if (avatarUrl) {
      this.setData({ tempAvatar: avatarUrl })
    }
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value })
  },

  // 昵称输入框失焦（type="nickname" 会自动填充微信昵称）
  onNicknameBlur(e) {
    const value = e.detail.value
    if (value && !this.data.tempNickname) {
      this.setData({ tempNickname: value })
    }
  },

  // 完成设置（头像昵称登录）
  confirmProfileSetup() {
    const { tempAvatar, tempNickname } = this.data
    
    if (!tempAvatar) {
      wx.showToast({ title: '请选择头像', icon: 'none' })
      return
    }
    if (!tempNickname || tempNickname.trim().length === 0) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    this.setData({ loginLoading: true })
    wx.showLoading({ title: '登录中...' })

    // 先获取登录 code
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.hideLoading()
          this.setData({ loginLoading: false })
          wx.showToast({ title: '获取登录凭证失败', icon: 'none' })
          return
        }

        // 判断头像是否需要上传
        if (tempAvatar && (tempAvatar.startsWith('wxfile://') || tempAvatar.startsWith('http://tmp/') || tempAvatar.startsWith('https://tmp/'))) {
          const cachedOpenid = wx.getStorageSync('openid') || ''
          const cachedToken = wx.getStorageSync('token') || ''
          wx.uploadFile({
            url: request.BASE_URL,
            filePath: tempAvatar,
            name: 'image',
            formData: { 
              act: 'upload_image',
              type: 'avatar',
              openid: cachedOpenid,
              token: cachedToken
            },
            success: (res) => {
              const data = JSON.parse(res.data)
              if (data.code === 0 && data.data && data.data.url) {
                this._doLogin(loginRes.code, tempNickname.trim(), data.data.url)
              } else {
                wx.hideLoading()
                this.setData({ loginLoading: false })
                wx.showToast({ title: '头像上传失败', icon: 'none' })
              }
            },
            fail: () => {
              wx.hideLoading()
              this.setData({ loginLoading: false })
              wx.showToast({ title: '头像上传失败', icon: 'none' })
            }
          })
        } else {
          // 头像已是 URL，直接登录
          this._doLogin(loginRes.code, tempNickname.trim(), tempAvatar)
        }
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ loginLoading: false })
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  },

  // 执行登录（发送到后端）
  _doLogin(loginCode, nickname, avatarUrl) {
    const inviteCode = wx.getStorageSync('invite_code') || ''
    request.request('wx_avatar_login', {
      code: loginCode,
      nickname: nickname,
      avatar: avatarUrl,
      invite: inviteCode,
    }, { loading: false, auth: false }).then(data => {
      wx.hideLoading()
      
      app.globalData.openid = data.openid
      app.globalData.token = data.token
      app.globalData.balance = data.balance || 0
      app.globalData.userId = data.userId || 0
      app.globalData.nickname = nickname
      app.globalData.avatar = avatarUrl
      app.globalData.userInfo = {
        nickname: nickname,
        avatar: avatarUrl,
      }

      wx.setStorageSync('openid', data.openid)
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('userId', data.userId || 0)
      wx.setStorageSync('balance', data.balance || 0)
      wx.setStorageSync('nickname', nickname)
      wx.setStorageSync('avatar', avatarUrl)

      this.setData({
        hasLogin: true,
        loginLoading: false,
        showProfileSetup: false,
        userInfo: app.globalData.userInfo,
        openid: data.openid,
        balance: data.balance || 0,
        userId: data.userId || 0,
      })

      wx.showToast({ title: '登录成功', icon: 'success' })
      this.refreshBalance()
      this.checkTodaySigned()
      
      // 登录成功后清除邀请码（避免重复绑定）
      app.clearInviteCode()
    }).catch(err => {
      wx.hideLoading()
      this.setData({ loginLoading: false })
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    })
  },

  /** 分享给朋友 */
  onShareAppMessage() {
    const app = getApp()
    const shareConfig = app.globalData.shareConfig || {}
    const userId = app.globalData.userId || wx.getStorageSync('userId') || 0
    const inviteCode = userId ? `?invite=${userId}` : ''
    return {
      title: shareConfig.title || 'AI电商图生成，让你的商品更吸睛！',
      path: '/pages/home/index' + inviteCode,
      imageUrl: shareConfig.image_url || '',
    }
  },

  /** 分享到朋友圈 */
  onShareTimeline() {
    const app = getApp()
    const shareConfig = app.globalData.shareConfig || {}
    const userId = app.globalData.userId || wx.getStorageSync('userId') || 0
    const inviteCode = userId ? `?invite=${userId}` : ''
    return {
      title: shareConfig.title || 'AI电商图生成，让你的商品更吸睛！',
      path: '/pages/home/index' + inviteCode,
      imageUrl: shareConfig.image_url || '',
    }
  },
})

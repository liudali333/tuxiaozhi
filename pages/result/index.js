// pages/result/index.js
const request = require('../../utils/request.js')
const { downloadAndSaveImage } = require('../../utils/util.js')
const app = getApp()

const MAX_POLL = 60       // 最多轮询 60 次
const POLL_INTERVAL = 2000 // 每 2 秒轮询一次，更快速反馈

Page({
  data: {
    taskId: '',
    mode: 'main',
    status: 'generating', // generating | success | failed
    imageUrl: '',
    progress: 0,
    errorMsg: '',
    saving: false,
    generating: false,
    pollCount: 0,
    adLoaded: false,
    adUnitId: '', // 原生广告单元ID
  },

  onLoad(opt) {
    // 处理邀请码（全局方法）
    app.setInviteCodeFromOptions(opt)

    if (!opt.taskId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }
    
    this.setData({ taskId: opt.taskId, mode: opt.mode || 'main' })
    
    // 加载广告配置
    this.loadAdConfig()
    
    // 如果已经完成（同步返回结果），直接显示成功状态
    if (opt.status === 'completed' && opt.imageUrl) {
      this.setData({ 
        status: 'success', 
        imageUrl: decodeURIComponent(opt.imageUrl), 
        progress: 100 
      })
    } else {
      // 异步任务，开始轮询
      this.startPoll(opt.taskId)
    }
  },

  // 加载广告配置
  loadAdConfig() {
    request.getFrontendConfig()
      .then(res => {
        if (res.ad_result && res.ad_result.ad_unit_id) {
          this.setData({ adUnitId: res.ad_result.ad_unit_id })
        }
      })
      .catch(e => {})
  },

  onUnload() {
    this.stopPoll()
  },

  // 返回首页
  goHome() {
    wx.navigateBack({ delta: 2, fail: () => wx.switchTab({ url: '/pages/home/index' }) })
  },

  // ── 轮询状态 ────────────────────────────────────────

  startPoll(taskId) {
    let count = 0
    this.setData({ pollCount: 0 })
    
    // 先立即检查一次
    this.pollOnce(taskId, count)
    
    this._pollTimer = setInterval(() => {
      count++
      this.pollOnce(taskId, count)
    }, POLL_INTERVAL)
  },

  pollOnce(taskId, count) {
    if (count > 0) {
      // 更新模拟进度（不要小数点，不限制在85%）
      let progress = this.data.progress
      if (progress < 95) {
        // 使用 Math.floor 确保进度为整数
        progress = Math.floor(Math.min(progress + Math.random() * 8 + 3, 95))
        this.setData({ progress, pollCount: count })
      }
    }

    if (count >= MAX_POLL) {
      this.stopPoll()
      this.setData({ status: 'failed', errorMsg: '生成超时，请检查网络后重试' })
      return
    }

    request.getTaskStatus(taskId).then(res => {
      // 兼容 'done' / 'completed' / 'DONE' 等多种写法
      var st = (res.status || '').toLowerCase()
      
      // 更新进度（如果有真实进度，确保为整数）
      if (res.progress && res.progress > this.data.progress) {
        this.setData({ progress: Math.floor(res.progress) })
      }
      
      if (st === 'done' || st === 'completed' || st === 'DONE' || st === 'COMPLETED') {
        this.stopPoll()
        this.setData({ status: 'success', imageUrl: res.imageUrl, progress: 100 })
      } else if (st === 'failed' || st === 'error' || st === 'FAILED') {
        this.stopPoll()
        this.setData({ status: 'failed', errorMsg: res.errorMsg || '生成失败，请重试' })
      }
    }).catch(err => {
      console.error('轮询失败', err)
      // 静默处理，继续轮询直到超时
    })
  },

  stopPoll() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  // ── 操作 ────────────────────────────────────────────

  /** 预览大图 */
  previewImage() {
    wx.previewImage({ urls: [this.data.imageUrl], current: this.data.imageUrl })
  },

  /** 保存到相册 */
  async saveImage() {
    if (this.data.saving) return
    this.setData({ saving: true })
    try {
      await downloadAndSaveImage(this.data.imageUrl)
    } catch (e) {
      console.error('保存失败', e)
    } finally {
      this.setData({ saving: false })
    }
  },

  /** 重新生成 */
  regenerate() {
    if (this.data.generating) return
    wx.showModal({
      title: '重新生成',
      content: '重新生成将消耗积分，是否继续？',
      confirmText: '继续',
      success: (modalRes) => {
        if (modalRes.confirm && !this.data.generating) {
          this.setData({ status: 'generating', progress: 0, errorMsg: '', generating: true })

          request.createGenerateTask({ type: this.data.mode }).then(res => {
            this.setData({ taskId: res.taskId, generating: false })
            
            // 更新余额（乐观更新）
            if (res.balance !== undefined) {
              app.globalData.balance = res.balance
            }
            
            this.startPoll(res.taskId)
          }).catch((err) => {
            this.setData({
              generating: false,
              status: 'failed',
              errorMsg: err.message || '请求失败，请稍后重试',
            })
          })
        }
      }
    })
  },

  /** 重试（失败状态快捷入口） */
  retryGenerate() {
    this.regenerate()
  },

  /** 分享给朋友 */
  onShareAppMessage() {
    const app = getApp()
    const shareConfig = app.globalData.shareConfig || {}
    const userId = app.globalData.userId || wx.getStorageSync('userId') || 0
    const inviteCode = userId ? `?invite=${userId}` : ''
    return {
      title: shareConfig.title || '我用 AI 生成了电商图，你也来试试！',
      path: '/pages/home/index' + inviteCode,
      imageUrl: this.data.imageUrl || shareConfig.image_url || '',
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
      imageUrl: this.data.imageUrl || shareConfig.image_url || '',
    }
  },

  // ── 广告相关 ────────────────────────────────────────

  /** 原生广告加载成功 */
  onAdLoad() {
    console.log('原生广告加载成功')
    this.setData({ adLoaded: true })
  },

  /** 原生广告加载失败 */
  onAdError(err) {
    console.error('原生广告加载失败', err)
  },
})

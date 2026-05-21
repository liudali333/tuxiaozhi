const request = require('../../utils/request.js')
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    list: [],
    loading: false,
    noMore: false,
    page: 1,
    pageSize: 20,
    total: 0,
    rebateTotal: 0,
    userId: 0,
    rewardPoints: 10,
    rebatePercent: 10
  },

  onLoad(options) {
    const app = getApp()
    
    // 处理邀请码（全局方法）
    app.setInviteCodeFromOptions(options)
    
    this.setData({ userId: app.globalData.userId || wx.getStorageSync('userId') || 0 })
    this.loadShareConfig()
    this.loadMore()
  },

  // 加载分享配置
  async loadShareConfig() {
    try {
      const config = await request.getShareConfig()
      if (config) {
        this.setData({
          rewardPoints: config.reward_points || 10,
          rebatePercent: config.rebate_percent || 10
        })
      }
    } catch (e) {
      console.error('加载分享配置失败:', e)
    }
  },

  onPullDownRefresh() {
    this.setData({ list: [], page: 1, noMore: false, total: 0, rebateTotal: 0 })
    this.loadMore().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadMore()
    }
  },

  loadMore() {
    this.setData({ loading: true })
    return request.getInviteList(this.data.page, this.data.pageSize)
      .then(res => {
        const rawList = res.list || []
        const newItems = rawList.map(item => ({
          id: item.id,
          userId: item.user_id,
          nickname: item.nickname || '微信用户',
          avatar: item.avatar || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia02jNpaml2xADeMVibluHTVcibkBOibK4icq7rB6BAQickic0r5ia8lZic5xSeiaT5UicQ/0',
          timeStr: item.created_at ? formatDate(item.created_at, 'YYYY-MM-DD') : '',
        }))
        const allList = this.data.page === 1 ? newItems : [...this.data.list, ...newItems]
        this.setData({
          list: allList,
          total: res.total || 0,
          rebateTotal: res.rebateTotal || 0,
          noMore: rawList.length < this.data.pageSize,
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
      })
  },

  onShareAppMessage() {
    const app = getApp()
    const shareConfig = app.globalData.shareConfig || {}
    const userId = this.data.userId
    const inviteCode = userId ? `?invite=${userId}` : ''
    return {
      title: shareConfig.title || 'AI电商图生成，让你的商品更吸睛！',
      path: '/pages/home/index' + inviteCode,
      imageUrl: shareConfig.image_url || '',
    }
  },

  onShareTimeline() {
    const app = getApp()
    const shareConfig = app.globalData.shareConfig || {}
    const userId = this.data.userId
    const inviteCode = userId ? `?invite=${userId}` : ''
    return {
      title: shareConfig.title || 'AI电商图生成，让你的商品更吸睛！',
      path: '/pages/home/index' + inviteCode,
      imageUrl: shareConfig.image_url || '',
    }
  },
})
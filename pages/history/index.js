// pages/history/index.js
const app = getApp()
const request = require('../../utils/request.js')
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    list: [],
    filteredList: [],
    loading: false,
    page: 1,
    pageSize: 20,
    totalTokens: 0,
    totalRecords: 0,
    totalPages: 1,
    searchKeyword: '',
    hasLogin: false,
  },

  _isLoading: false, // 防止重复加载的标志位

  onLoad() {
    this.setData({ list: [], page: 1, totalTokens: 0, totalRecords: 0, totalPages: 1, searchKeyword: '', filteredList: [] })
    this.checkLoginStatus()
    this.loadData()
  },

  onShow() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const hasToken = app.globalData.token || wx.getStorageSync('token')
    this.setData({ hasLogin: !!hasToken })
  },

  onPullDownRefresh() {
    this.setData({ list: [], page: 1, totalTokens: 0, totalRecords: 0, totalPages: 1, searchKeyword: '', filteredList: [] })
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    // 空方法，阻止默认的上拉加载行为
  },

  loadData() {
    if (this._isLoading) return Promise.resolve()
    this._isLoading = true
    this.setData({ loading: true })
    return request.getHistory(this.data.page, this.data.pageSize)
      .then(res => {
        const rawList = res.list || []
        const newItems = rawList.map(item => ({
          taskId:   item.taskId,
          type:     item.type,
          name:     item.name,
          style:    item.style,
          status:   item.status,
          cost:     item.cost,
          imageUrl: item.imageUrl,
          created_at: item.created_at,
          timeStr:  item.created_at ? formatDate(parseInt(item.created_at) * 1000, 'MM-DD HH:mm') : '',
          typeName: item.type === 'main' ? '主图' : '详情图',
          modelName: item.modelName || '',
        }))
        const totalTokens = newItems.reduce(function(s, item) { return s + (item.cost || 0) }, 0)
        const totalRecords = res.total || 0
        const totalPages = Math.ceil(totalRecords / this.data.pageSize)
        this.setData({
          list: newItems,
          filteredList: newItems,
          totalTokens: totalTokens,
          totalRecords: totalRecords,
          totalPages: totalPages,
          loading: false,
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        console.error('加载历史记录失败:', err)
        if (err && (err.code === 401 || err.errorType === 'AUTH_ERROR')) {
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          })
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          })
        }
      })
      .finally(() => {
        this._isLoading = false
      })
  },

  // 分页点击
  goToPage(e) {
    const page = e.currentTarget.dataset.page
    if (page < 1 || page > this.data.totalPages || page === this.data.page) return
    this.setData({ page: page })
    this.loadData()
  },

  // 上一页
  prevPage() {
    if (this.data.page > 1) {
      this.setData({ page: this.data.page - 1 })
      this.loadData()
    }
  },

  // 下一页
  nextPage() {
    if (this.data.page < this.data.totalPages) {
      this.setData({ page: this.data.page + 1 })
      this.loadData()
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.filterList()
  },

  // 执行搜索
  onSearch() {
    this.filterList()
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.filterList()
  },

  // 筛选列表
  filterList() {
    const keyword = this.data.searchKeyword.toLowerCase().trim()
    if (!keyword) {
      this.setData({ filteredList: this.data.list })
      return
    }
    const filtered = this.data.list.filter(item => 
      item.name.toLowerCase().includes(keyword)
    )
    this.setData({ filteredList: filtered })
  },

  // 跳转到结果页
  goToResult(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.taskId) return
    wx.navigateTo({
      url: '/pages/result/index?taskId=' + item.taskId + '&mode=' + (item.type || 'main'),
    })
  },

  // 预览大图
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.showActionSheet({
        itemList: ['保存到相册', '预览大图'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.saveImage(e)
          } else if (res.tapIndex === 1) {
            wx.showLoading({ title: '加载中...', mask: true })
            wx.downloadFile({
              url: url,
              success: (downRes) => {
                wx.hideLoading()
                if (downRes.statusCode === 200) {
                  wx.previewImage({ urls: [downRes.tempFilePath], current: downRes.tempFilePath })
                } else {
                  wx.previewImage({ urls: [url], current: url })
                }
              },
              fail: () => {
                wx.hideLoading()
                wx.previewImage({ urls: [url], current: url })
              }
            })
          }
        }
      })
    }
  },

  // 重新生成 → 跳转生成页（预填参数）
  regenerate(e) {
    const item = e.currentTarget.dataset.item
    if (!item) return
    wx.showModal({
      title: '重新生成',
      content: '将消耗积分重新生成，是否继续？',
      confirmText: '确定',
      success: function(res) {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/generate/index?mode=' + encodeURIComponent(item.type || 'main') + '&name=' + encodeURIComponent(item.name || ''),
          })
        }
      },
    })
  },

  // 保存图片
  saveImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return

    const app = getApp()
    const isExternalUrl = url.includes('res.stepfun.com') || url.includes('openai.com') || url.includes('dalle') || !url.startsWith('https://image.433345.xyz')

    if (isExternalUrl) {
      wx.showLoading({ title: '处理中...' })
      wx.request({
        url: app.globalData.requestUrl || 'https://image.433345.xyz/api.php',
        method: 'POST',
        data: { act: 'download_image', url: url },
        success: (res) => {
          wx.hideLoading()
          if (res.data && res.data.code === 0 && res.data.data && res.data.data.url) {
            const localUrl = res.data.data.url
            const { downloadAndSaveImage } = require('../../utils/util.js')
            downloadAndSaveImage(localUrl).catch(() => {})
          } else {
            wx.showToast({ title: '处理失败', icon: 'none' })
          }
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '网络异常', icon: 'none' })
        }
      })
    } else {
      const { downloadAndSaveImage } = require('../../utils/util.js')
      downloadAndSaveImage(url).catch(() => {})
    }
  },

  // 返回首页
  goHome() {
    wx.switchTab({ url: '/pages/home/index' })
  },
})
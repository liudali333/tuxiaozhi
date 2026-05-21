const app = getApp()
const { request } = require('../../utils/request.js')

Page({
  data: {
    detail: {
      id: 0,
      prompt: '',
      image: '',
      refImages: [],
      tags: []
    },
    loading: true
  },

  interstitialAd: null,
  adUnitId: '',

  onLoad(options) {
    this.loadAdConfig()
    
    if (options.id) {
      this.loadDetail(parseInt(options.id))
    } else if (options.imageData) {
      try {
        const data = JSON.parse(decodeURIComponent(options.imageData))
        this.setData({ detail: data, loading: false })
      } catch (e) {
        console.error('解析图片数据失败:', e)
        wx.showToast({ title: '数据加载失败', icon: 'none' })
      }
    }
  },

  async loadAdConfig() {
    try {
      const res = await request('frontend_config', {}, { loading: false })
      if (res && res.ad_splash && res.ad_splash.ad_unit_id) {
        this.adUnitId = res.ad_splash.ad_unit_id
        this.initInterstitialAd()
      }
    } catch (e) {
      console.error('获取广告配置失败:', e)
    }
  },

  initInterstitialAd() {
    if (!this.adUnitId || !wx.createInterstitialAd) return
    
    this.interstitialAd = wx.createInterstitialAd({
      adUnitId: this.adUnitId
    })
    
    this.interstitialAd.onLoad(() => {
      console.log('插屏广告加载成功')
    })
    
    this.interstitialAd.onError((err) => {
      console.error('插屏广告加载失败:', err)
    })
    
    this.interstitialAd.onClose(() => {
      console.log('插屏广告关闭')
    })
  },

  showInterstitialAd() {
    if (this.interstitialAd) {
      this.interstitialAd.show().catch((err) => {
        console.error('插屏广告显示失败:', err)
      })
    }
  },

  async loadDetail(id) {
    this.setData({ loading: true })
    
    try {
      const res = await request('inspiration_list', { page: 1, pageSize: 100 })
      const list = res.list || []
      const image = list.find(item => item.id === id)
      
      if (image) {
        let refImages = []
        if (image.ref_images) {
          try {
            refImages = JSON.parse(image.ref_images)
          } catch (e) {
            refImages = []
          }
        }
        
        this.setData({
          detail: {
            id: image.id,
            prompt: image.prompt || '',
            image: image.image_url || image.image || '',
            refImages: refImages,
            tags: image.tags ? image.tags.split(',').filter(t => t) : []
          },
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '未找到该素材', icon: 'none' })
      }
    } catch (error) {
      console.error('加载详情失败:', error)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  copyPrompt() {
    const prompt = this.data.detail.prompt
    if (!prompt) {
      wx.showToast({ title: '提示词为空', icon: 'none' })
      return
    }
    
    wx.setClipboardData({
      data: prompt,
      success: () => {
        wx.showToast({ title: '已复制提示词', icon: 'success' })
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none' })
      }
    })
  },

  previewRefImage(e) {
    const index = e.currentTarget.dataset.index
    const urls = this.data.detail.refImages
    
    wx.previewImage({
      urls: urls,
      current: urls[index]
    })
  },

  onImageLoad() {
    this.setData({ loading: false })
  },

  onImageError() {
    this.setData({ loading: false })
    wx.showToast({ title: '图片加载失败', icon: 'none' })
  },

  goBack() {
    wx.navigateBack()
  },

  onShow() {
    setTimeout(() => {
      this.showInterstitialAd()
    }, 3000)
  },

  onUnload() {
    this.interstitialAd = null
  }
})

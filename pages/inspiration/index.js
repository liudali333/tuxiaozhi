// pages/inspiration/index.js
const { request } = require('../../utils/request.js')

Page({
  data: {
    keyword: '',
    currentCategory: -1,
    categories: [
      { id: -1, name: '全部' },
      { id: 0, name: '时尚' },
      { id: 1, name: '美食' },
      { id: 2, name: '旅行' },
      { id: 3, name: '产品' },
      { id: 4, name: '设计' },
      { id: 5, name: '插画' }
    ],
    images: [],
    leftImages: [],
    rightImages: [],
    page: 1,
    limit: 10,
    loading: false,
    hasMore: true,
    _isLoading: false
  },

  onLoad() {
    this.loadImages()
  },

  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    })
  },

  onSearch() {
    this.setData({
      page: 1,
      images: [],
      hasMore: true
    })
    this.loadImages()
  },

  selectCategory(e) {
    const categoryId = parseInt(e.currentTarget.dataset.id)
    this.setData({
      currentCategory: categoryId,
      page: 1,
      images: [],
      hasMore: true
    })
    this.loadImages()
  },

  showFilter() {
    wx.showToast({
      title: '筛选功能开发中',
      icon: 'none'
    })
  },

  async loadImages() {
    // 防止重复加载
    if (this.data.loading || this._isLoading || !this.data.hasMore) return
    
    this._isLoading = true
    this.setData({ loading: true })

    try {
      const res = await request('inspiration_list', {
        page: this.data.page
      })

      // request函数直接返回d.data，所以不需要检查res.code
      const newImages = res.list || []
        // 转换字段名：image_url -> image, 保留原始prompt和ref_images
        const transformedImages = newImages.map(img => {
          let refImages = []
          if (img.ref_images) {
            try {
              refImages = JSON.parse(img.ref_images)
              if (!Array.isArray(refImages)) {
                refImages = []
              }
            } catch (e) {
              refImages = []
            }
          }
          return {
            ...img,
            image: img.image_url,
            title: img.prompt ? img.prompt.slice(0, 20) + (img.prompt.length > 20 ? '...' : '') : '未命名',
            tags: img.tags ? img.tags.split(',').slice(0, 3) : [],
            refImages: refImages
          }
        })
        const allImages = [...this.data.images, ...transformedImages]
        
        this.setData({
          images: allImages,
          hasMore: newImages.length >= this.data.limit,
          page: this.data.page + 1
        })

        this.splitImages()
    } catch (error) {
      console.error('加载灵感列表失败:', error)
      // 使用mock数据
      this.loadMockImages()
    } finally {
      this._isLoading = false
      this.setData({ loading: false })
    }
  },

  loadMockImages() {
    const mockImages = [
      { id: 1, prompt: '时尚模特穿着现代服装，优雅风格，高清摄影', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=fashion%20model%20wearing%20modern%20clothes%20elegant%20style&image_size=portrait_4_3', tags: '时尚,服装,优雅', ref_images: '["https://neeko-copilot.bytedance.net/api/text2image?prompt=fashion%20model%20reference&image_size=portrait_4_3"]' },
      { id: 2, prompt: '美味美食摄影，高级餐厅摆盘，精致餐具', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=delicious%20food%20photography%20gourmet%20restaurant&image_size=portrait_4_3', tags: '美食,摄影,餐厅', ref_images: '' },
      { id: 3, prompt: '美丽旅行风景，山脉自然风光，蓝天白云', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=beautiful%20travel%20landscape%20mountains%20nature&image_size=portrait_4_3', tags: '旅行,风景,自然', ref_images: '["https://neeko-copilot.bytedance.net/api/text2image?prompt=travel%20landscape%20reference&image_size=portrait_4_3"]' },
      { id: 4, prompt: '现代产品设计，极简风格，优雅造型', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=modern%20product%20design%20minimalist%20elegant&image_size=portrait_4_3', tags: '产品,设计,极简', ref_images: '' },
      { id: 5, prompt: '创意插画艺术，彩色幻想风格，手绘风格', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=creative%20illustration%20art%20colorful%20fantasy&image_size=portrait_4_3', tags: '插画,艺术,创意', ref_images: '["https://neeko-copilot.bytedance.net/api/text2image?prompt=illustration%20reference&image_size=portrait_4_3"]' },
      { id: 6, prompt: '现代室内设计，客厅装饰，优雅风格', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=modern%20interior%20design%20living%20room%20elegant&image_size=portrait_4_3', tags: '室内,设计,家居', ref_images: '' },
      { id: 7, prompt: '人物肖像摄影，专业棚拍，光影效果', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=portrait%20photography%20professional%20studio%20lighting&image_size=portrait_4_3', tags: '肖像,摄影,光影', ref_images: '' },
      { id: 8, prompt: '商业广告创意，现代风格，视觉冲击力', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=commercial%20advertisement%20creative%20modern%20style&image_size=portrait_4_3', tags: '广告,创意,商业', ref_images: '["https://neeko-copilot.bytedance.net/api/text2image?prompt=advertisement%20reference&image_size=portrait_4_3"]' },
      { id: 9, prompt: '自然风光景色，美丽户外，山川河流', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=natural%20landscape%20scenery%20beautiful%20outdoor&image_size=portrait_4_3', tags: '自然,风景,户外', ref_images: '' },
      { id: 10, prompt: '品牌视觉识别，标志设计，现代风格', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=brand%20visual%20identity%20logo%20design%20modern&image_size=portrait_4_3', tags: '品牌,视觉,设计', ref_images: '' },
      { id: 11, prompt: '运动健身活力，健康生活方式，动感', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=sports%20fitness%20athletic%20active%20lifestyle&image_size=portrait_4_3', tags: '运动,健身,健康', ref_images: '["https://neeko-copilot.bytedance.net/api/text2image?prompt=sports%20reference&image_size=portrait_4_3"]' },
      { id: 12, prompt: '静物摄影艺术，艺术构图，光影美学', image_url: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=still%20life%20photography%20artistic%20composition&image_size=portrait_4_3', tags: '静物,摄影,艺术', ref_images: '' }
    ]

    const transformedImages = mockImages.map(img => {
      let refImages = []
      if (img.ref_images) {
        try {
          refImages = JSON.parse(img.ref_images)
          if (!Array.isArray(refImages)) refImages = []
        } catch (e) {
          refImages = []
        }
      }
      return {
        ...img,
        image: img.image_url,
        title: img.prompt.slice(0, 20) + (img.prompt.length > 20 ? '...' : ''),
        tags: img.tags ? img.tags.split(',').slice(0, 3) : [],
        refImages: refImages
      }
    })

    const allImages = [...this.data.images, ...transformedImages]
    this.setData({
      images: allImages,
      hasMore: this.data.page < 3,
      page: this.data.page + 1
    })
    this.splitImages()
  },

  splitImages() {
    const left = []
    const right = []
    
    // 随机决定图片放到左边还是右边，让布局更随意
    this.data.images.forEach((img) => {
      // 为每张图片添加随机间距 (10-40rpx)
      img.gap = Math.floor(Math.random() * 31) + 10
      
      // 随机分配到左列或右列，概率稍微偏向平衡
      if (left.length <= right.length || Math.random() > 0.5) {
        left.push(img)
      } else {
        right.push(img)
      }
    })

    this.setData({
      leftImages: left,
      rightImages: right
    })
  },

  loadMore() {
    this.loadImages()
  },

  previewImage(e) {
    const id = parseInt(e.currentTarget.dataset.id)
    const image = this.data.images.find(img => img.id === id)

    if (image) {
      const imageData = {
        id: image.id,
        prompt: image.prompt || image.title || '',
        image: image.image,
        refImages: image.refImages || [],
        tags: image.tags || []
      }
      
      wx.navigateTo({
        url: `/pages/inspiration-detail/index?imageData=${encodeURIComponent(JSON.stringify(imageData))}`
      })
    }
  },

  getLeftIndex(id) {
    return this.data.leftImages.findIndex(img => img.id === id) * 2
  },

  getRightIndex(id) {
    return this.data.rightImages.findIndex(img => img.id === id) * 2 + 1
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      images: [],
      hasMore: true
    })
    this.loadImages().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    this.loadMore()
  }
})
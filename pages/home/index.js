// pages/home/index.js
const app = getApp()
const request = require('../../utils/request.js')
const config = require('../../utils/config.js')

Page({
  data: {
    balance: 0,
    cost: 10,
    announcement: '🎉 欢迎使用AI图像生成工具，让你的商品更吸睛！',
    generating: false,
    generatingPrompt: false,

    // 轮播图数据（从后端获取）
    swiperList: [],
    swiperCurrent: 0,

    // 金刚位功能入口（从后端获取）
    quickEntries: [],

    // 广告配置
    adConfig: {
      splash: { ad_unit_id: '' },
      result: { ad_unit_id: '' }
    },

    models: [{
      id: 0,
      name: 'AI 图像生成',
      model_id: 'dall-e-3',
      cost: 10,
      cost_tokens: 10,
      description: '默认AI图像生成模型',
      sort_order: 0,
      is_default: 1,
      is_enabled: 1,
      provider: 'AI',
      api_type: 'auto',
    }],
    selectedModelId: 0,
    selectedModel: {
      id: 0,
      name: 'AI 图像生成',
      model_id: 'dall-e-3',
      cost: 10,
      cost_tokens: 10,
      description: '默认AI图像生成模型',
      sort_order: 0,
      is_default: 1,
      is_enabled: 1,
      provider: 'AI',
      api_type: 'auto',
    },
    selectedModelIndex: 0,

    tabs: [
      { key: 'main', label: '主图', icon: '🖼️' },
      { key: 'detail', label: '详情图', icon: '📋' },
    ],
    currentTab: 'main',

    refImages: [],
    MAX_REF_IMAGES: 3,

    config,

    form: {
      input: '',
      ratio: '1:1',
    },

    // 预设分镜模块（从后端获取）
    presetModules: [
      { id: 'main_kv', name: '主KV' },
      { id: 'big卖点', name: '大卖点' },
      { id: 'core_func_1', name: '核心功能1' },
      { id: 'core_func_2', name: '核心功能2' },
      { id: 'param', name: '参数展示' },
      { id: 'layout', name: '排版图' },
      { id: 'compare', name: '对比图' },
      { id: 'dual_col', name: '双栏' },
      { id: 'scene_1', name: '使用场景1' },
      { id: 'scene_2', name: '使用场景2' },
      { id: 'detail', name: '细节特写' },
      { id: 'crowd', name: '适用人群' },
      { id: 'emotion', name: '情绪场景' },
      { id: 'after_sale', name: '售后/包装' },
      { id: 'infographic', name: '信息图' },
    ],

    // 已选模块
    selectedModules: [],
  },

  onLoad(options) {
    this.setData({ balance: app.globalData.balance })
    this.setData({ announcement: app.globalData.shareConfig?.announcement || '' })
    if (!this.data.balance) this.refreshBalance()
    this.loadModels()
    this.loadDetailModules()
    this.loadFrontendConfig()
    app.setInviteCodeFromOptions(options)
  },

  onShow() {
    this.refreshBalance()
    this.setData({ announcement: app.globalData.shareConfig?.announcement || '' })
  },

  loadFrontendConfig() {
    request.getFrontendConfig()
      .then(res => {
        if (res.home_banners) this.setData({ swiperList: res.home_banners })
        if (res.home_entries) this.setData({ quickEntries: res.home_entries })
        if (res.ad_splash) {
          this.setData({ 'adConfig.splash': res.ad_splash })
          this.createInterstitialAd(res.ad_splash.ad_unit_id)
        }
        if (res.ad_result) this.setData({ 'adConfig.result': res.ad_result })
      })
      .catch(e => {})
  },

  // 插屏广告
  _interstitialAd: null,

  createInterstitialAd(adUnitId) {
    if (!adUnitId || !adUnitId.trim()) return
    
    if (this._interstitialAd) {
      this._interstitialAd.destroy()
    }
    
    this._interstitialAd = wx.createInterstitialAd({ adUnitId })
    
    this._interstitialAd.onLoad(() => {
      console.log('插屏广告加载成功')
    })
    
    this._interstitialAd.onError(err => {
      console.error('插屏广告加载失败', err)
    })
    
    this._interstitialAd.onClose(res => {
      console.log('插屏广告关闭', res)
    })
  },

  showInterstitialAd() {
    if (this._interstitialAd) {
      this._interstitialAd.show().catch(err => {
        console.error('插屏广告显示失败', err)
      })
    }
  },

  onBalanceUpdate(newBalance) {
    this.setData({ balance: newBalance })
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab,
      'form.ratio': tab === 'main' ? '1:1' : '16:9',
    })
  },

  // 金刚位点击
  onQuickEntryTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item) return
    
    const type = item.type || 'page'
    const path = item.path || ''
    
    switch (type) {
      case 'web':
        if (path) {
          wx.navigateTo({
            url: `/pages/webview/index?url=${encodeURIComponent(path)}`
          })
        }
        break
      case 'miniapp':
        if (item.appid) {
          wx.navigateToMiniProgram({
            appId: item.appid,
            path: path || '',
            extraData: item.extraData || {},
            fail: (err) => {
              console.error('跳转小程序失败:', err)
              wx.showToast({ title: '跳转失败', icon: 'none' })
            }
          })
        }
        break
      case 'account':
        if (path) {
          const profileUrl = `https://mp.weixin.qq.com/profile?srcid=${path}`
          wx.navigateTo({
            url: `/pages/webview/index?url=${encodeURIComponent(profileUrl)}`
          })
        }
        break
      case 'channels':
        if (item.path) {
          if (item.path.includes('http')) {
            wx.navigateTo({
              url: `/pages/webview/index?url=${encodeURIComponent(item.path)}`
            })
          } else {
            if (wx.openChannelsUserProfile) {
              wx.openChannelsUserProfile({
                finderUserName: item.path,
                success: () => {},
                fail: (err) => {
                  console.error('打开视频号主页失败:', err)
                  const url = `https://channels.weixin.qq.com/web/pages/profile?finderUserName=${item.path}`
                  wx.navigateTo({
                    url: `/pages/webview/index?url=${encodeURIComponent(url)}`
                  })
                }
              })
            } else {
              const url = `https://channels.weixin.qq.com/web/pages/profile?finderUserName=${item.path}`
              wx.navigateTo({
                url: `/pages/webview/index?url=${encodeURIComponent(url)}`
              })
            }
          }
        } else {
          wx.showToast({ title: '请配置视频号ID或链接', icon: 'none' })
        }
        break
      default:
        if (path) {
          wx.navigateTo({ url: path })
        }
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [`form.${field}`]: value })
  },

  selectRatio(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ 'form.ratio': value })
  },

  loadModels() {
    request.getModels()
      .then(res => {
        let models = res.list || []
        if (!Array.isArray(models) || models.length === 0) {
          console.warn('模型列表为空，使用默认模型')
          models = [{
            id: 0,
            name: 'AI 图像生成',
            model_id: 'dall-e-3',
            cost: 10,
            cost_tokens: 10,
            description: '默认AI图像生成模型',
            sort_order: 0,
            is_default: 1,
            is_enabled: 1,
            provider: 'AI',
            api_type: 'auto',
          }]
        }
        // 优先选择默认模型，如果没有则选择第一个
        const defaultModel = models.find(m => m.is_default) || models[0] || null
        const defaultIndex = defaultModel ? models.findIndex(m => m.id === defaultModel.id) : 0
        
        console.log('加载模型列表:', models)
        console.log('选择默认模型:', defaultModel)
        
        this.setData({
          models,
          selectedModel: defaultModel,
          selectedModelId: defaultModel ? defaultModel.id : (models[0]?.id || 0),
          selectedModelIndex: defaultIndex >= 0 ? defaultIndex : 0,
        })
        this.updateCost()
      })
      .catch(err => {
        console.error('加载模型列表失败:', err)
        const defaultModel = {
          id: 0,
          name: 'AI 图像生成',
          model_id: 'dall-e-3',
          cost: 10,
          cost_tokens: 10,
          description: '默认AI图像生成模型',
          sort_order: 0,
          is_default: 1,
          is_enabled: 1,
          provider: 'AI',
          api_type: 'auto',
        }
        this.setData({
          models: [defaultModel],
          selectedModel: defaultModel,
          selectedModelId: 0,
          selectedModelIndex: 0,
        })
        this.updateCost()
      })
  },

  loadDetailModules() {
    request.getDetailModules()
      .then(res => {
        let modules = res || []
        if (!Array.isArray(modules) || modules.length === 0) {
          modules = [
            { id: 'main_kv', name: '主KV' },
            { id: 'big卖点', name: '大卖点' },
            { id: 'core_func_1', name: '核心功能1' },
            { id: 'core_func_2', name: '核心功能2' },
            { id: 'param', name: '参数展示' },
            { id: 'layout', name: '排版图' },
            { id: 'compare', name: '对比图' },
            { id: 'dual_col', name: '双栏' },
            { id: 'scene_1', name: '使用场景1' },
            { id: 'scene_2', name: '使用场景2' },
            { id: 'detail', name: '细节特写' },
            { id: 'crowd', name: '适用人群' },
            { id: 'emotion', name: '情绪场景' },
            { id: 'after_sale', name: '售后/包装' },
            { id: 'infographic', name: '信息图' },
          ]
        }
        this.setData({ presetModules: modules })
        this.updateModuleSelectedStatus()
      })
      .catch(err => {
        console.error('加载分镜配置失败:', err)
        const defaultModules = [
          { id: 'main_kv', name: '主KV', icon: '🎯', sub: '' },
          { id: 'big卖点', name: '大卖点', icon: '⭐', sub: '' },
          { id: 'core_func_1', name: '核心功能1', icon: '🔧', sub: '单场景' },
          { id: 'core_func_2', name: '核心功能2', icon: '🔧', sub: '单场景' },
          { id: 'param', name: '参数展示', icon: '📊', sub: '' },
          { id: 'layout', name: '排版图', icon: '📐', sub: '' },
          { id: 'compare', name: '对比图', icon: '⚖️', sub: '' },
          { id: 'dual_col', name: '双栏', icon: '📱', sub: '' },
          { id: 'scene_1', name: '使用场景1', icon: '🌿', sub: '真人' },
          { id: 'scene_2', name: '使用场景2', icon: '🏠', sub: '环境' },
          { id: 'detail', name: '细节特写', icon: '🔍', sub: '微距' },
          { id: 'crowd', name: '适用人群', icon: '👥', sub: '' },
          { id: 'emotion', name: '情绪场景', icon: '💫', sub: '' },
          { id: 'after_sale', name: '售后/包装', icon: '📦', sub: '' },
          { id: 'infographic', name: '信息图', icon: '💡', sub: '' },
        ]
        this.setData({ presetModules: defaultModules })
        this.updateModuleSelectedStatus()
      })
  },

  onModelChange(e) {
    const index = parseInt(e.detail.value)
    const model = this.data.models[index]
    if (!model) return
    this.setData({
      selectedModelIndex: index,
      selectedModelId: model.id,
      selectedModel: model,
    })
    this.updateCost()
  },

  // ── 分镜模块操作 ──────────────────────────────────

  isModuleSelected(moduleId) {
    return this.data.selectedModules.some(m => m.id === moduleId)
  },

  updateModuleSelectedStatus() {
    const presetModules = this.data.presetModules.map(module => ({
      ...module,
      isSelected: this.isModuleSelected(module.id)
    }))
    this.setData({ presetModules })
  },

  toggleModule(e) {
    const moduleId = e.currentTarget.dataset.id
    const presetModules = this.data.presetModules
    const module = presetModules.find(m => m.id === moduleId)
    if (!module) return

    let selectedModules = [...this.data.selectedModules]
    const existingIndex = selectedModules.findIndex(m => m.id === moduleId)

    if (existingIndex >= 0) {
      selectedModules.splice(existingIndex, 1)
    } else {
      if (selectedModules.length >= 3) {
        wx.showToast({ title: '最多选择3个分镜', icon: 'none' })
        return
      }
      selectedModules.push({ ...module })
    }

    this.setData({ selectedModules })
    this.updateModuleSelectedStatus()
  },

  removeModule(e) {
    const moduleId = e.currentTarget.dataset.id
    let selectedModules = [...this.data.selectedModules]
    const existingIndex = selectedModules.findIndex(m => m.id === moduleId)
    if (existingIndex >= 0) {
      selectedModules.splice(existingIndex, 1)
      this.setData({ selectedModules })
    }
  },

  // ── 参考图上传 ──────────────────────────────────

  chooseRefImage() {
    const remaining = this.data.MAX_REF_IMAGES - this.data.refImages.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传' + this.data.MAX_REF_IMAGES + '张参考图', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const newImages = res.tempFiles.map(f => ({
          url: f.tempFilePath,
          file: f.tempFilePath,
        }))
        this.setData({
          refImages: [...this.data.refImages, ...newImages].slice(0, this.data.MAX_REF_IMAGES),
        })
      },
    })
  },

  previewRefImage(e) {
    const idx = e.currentTarget.dataset.index
    const urls = this.data.refImages.map(img => img.url)
    wx.previewImage({ current: urls[idx], urls: urls })
  },

  removeRefImage(e) {
    const idx = e.currentTarget.dataset.index
    const refImages = [...this.data.refImages]
    refImages.splice(idx, 1)
    this.setData({ refImages })
  },

  // ── 提示词生成 ──────────────────────────────────

  generatePrompt() {
    const { form, currentTab, selectedModules } = this.data
    const input = form.input.trim()

    if (!input) {
      wx.showToast({ title: '请先输入内容', icon: 'none' })
      return
    }

    this.setData({ generatingPrompt: true })

    request.generatePrompt({
      name: input,
      desc: '',
      type: currentTab,
      modules: currentTab === 'detail' ? selectedModules.map(m => m.name).join(',') : '',
    }).then(res => {
      this.setData({
        'form.input': res.prompt,
        generatingPrompt: false,
      })
    }).catch(err => {
      this.setData({ generatingPrompt: false })
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
      console.error('生成提示词失败', err)
    })
  },

  optimizePrompt() {
    const { form } = this.data
    const input = form.input.trim()

    if (!input) {
      wx.showToast({ title: '请先输入产品描述', icon: 'none' })
      return
    }

    this.setData({ generatingPrompt: true })

    request.generatePrompt({
      name: input,
      desc: '',
      type: 'main',
      modules: '',
    }).then(res => {
      this.setData({
        'form.input': res.prompt,
        generatingPrompt: false,
      })
      wx.showToast({ title: '优化成功', icon: 'success' })
    }).catch(err => {
      this.setData({ generatingPrompt: false })
      wx.showToast({ title: '优化失败，请重试', icon: 'none' })
      console.error('优化提示词失败', err)
    })
  },

  generateDetailPrompt() {
    const { form, selectedModules } = this.data
    const input = form.input.trim()

    if (!input) {
      wx.showToast({ title: '请先输入产品名称', icon: 'none' })
      return
    }

    if (selectedModules.length === 0) {
      wx.showToast({ title: '请先选择分镜标签', icon: 'none' })
      return
    }

    this.setData({ generatingPrompt: true })

    const modules = selectedModules.map(m => m.name).join(',')
    request.generatePrompt({
      name: input,
      desc: '',
      type: 'detail',
      modules: modules,
    }).then(res => {
      this.setData({
        'form.input': res.prompt,
        generatingPrompt: false,
      })
    }).catch(err => {
      this.setData({ generatingPrompt: false })
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
      console.error('生成分镜提示词失败', err)
    })
  },

  // ── 业务 ────────────────────────────────────────

  refreshBalance() {
    request.getBalance().then(balance => {
      app.globalData.balance = balance
      this.setData({ balance })
    }).catch(() => {})
  },

  updateCost() {
    const cost = this.getCost()
    this.setData({ cost })
  },

  getCost() {
    const model = this.data.selectedModel
    return model?.cost_tokens ?? model?.cost ?? 10
  },

  startGenerate() {
    if (this.data.generating) return
    const { balance, form, refImages, currentTab, selectedModules } = this.data
    const cost = this.getCost()

    if (balance < cost) {
      wx.showModal({
        title: '积分不足',
        content: `当前余额 ${balance} 积分，生成需要 ${cost} 积分`,
        confirmText: '去充值',
        cancelText: '取消',
        success: res => { if (res.confirm) this.goRecharge() },
      })
      return
    }

    if (!form.input.trim()) {
      wx.showToast({ title: '请输入产品信息或提示词', icon: 'none' })
      return
    }

    this.setData({ generating: true })

    const params = {
      type: currentTab === 'main' ? 'main' : 'detail',
      name: form.input,
      prompt: `${form.input} --ar ${form.ratio}`,
      ratio: form.ratio,
      count: 1,
      model_id: this.data.selectedModelId || undefined,
    }

    if (currentTab === 'detail' && selectedModules.length > 0) {
      params.modules = JSON.stringify(selectedModules.map(m => m.id))
    }

    if (refImages.length > 0) {
      this.uploadRefImages(refImages).then(urls => {
        params.ref_images = JSON.stringify(urls)
        this.doCreateTask(params, cost)
      }).catch(err => {
        wx.showToast({ title: '图片上传失败', icon: 'none' })
        this.setData({ generating: false })
      })
    } else {
      this.doCreateTask(params, cost)
    }
  },

  uploadRefImages(images) {
    return new Promise((resolve, reject) => {
      const urls = []
      const uploadNext = (index) => {
        if (index >= images.length) {
          resolve(urls)
          return
        }
        wx.uploadFile({
          url: config.BASE_URL,
          filePath: images[index].file,
          name: 'image',
          formData: { 
            act: 'upload_image',
            type: 'reference'
          },
          success: uploadRes => {
            try {
              const data = JSON.parse(uploadRes.data)
              if (data.code === 0 && data.data?.url) {
                urls.push(data.data.url)
                uploadNext(index + 1)
              } else {
                reject(new Error(data.message || '上传失败'))
              }
            } catch (e) {
              reject(e)
            }
          },
          fail: err => reject(err),
        })
      }
      uploadNext(0)
    })
  },

  doCreateTask(params, cost) {
    console.log('开始创建生图任务:', params)
    request.createGenerateTask(params).then(res => {
      console.log('生图任务响应:', res)
      
      // 处理响应数据（兼容不同格式）
      const taskData = res.data || res
      
      app.updateBalance(-cost)
      this.setData({ balance: app.globalData.balance, generating: false })
      
      // 如果同步返回了图片，直接传递给结果页
      const imageUrlParam = taskData.imageUrl ? `&imageUrl=${encodeURIComponent(taskData.imageUrl)}` : ''
      const statusParam = taskData.status ? `&status=${taskData.status}` : ''
      
      // 显示插屏广告
      this.showInterstitialAd()
      
      wx.navigateTo({
        url: `/pages/result/index?taskId=${taskData.taskId}&mode=${params.type}${statusParam}${imageUrlParam}`,
      })
    }).catch(err => {
      this.setData({ generating: false })
      console.error('生成失败', err)
      
      // 显示错误提示给用户
      const errorMsg = err.toastMsg || err.message || '生成失败，请稍后重试'
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      })
    })
  },

  goRecharge() {
    wx.navigateTo({ url: '/pages/recharge/index' })
  },

  onShareAppMessage() {
    const shareConfig = app.globalData.shareConfig || {}
    const userId = app.globalData.userId || wx.getStorageSync('userId') || 0
    const inviteCode = userId ? `?invite=${userId}` : ''
    return {
      title: shareConfig.title || 'AI电商图生成，让你的商品更吸睛！',
      path: '/pages/home/index' + inviteCode,
      imageUrl: shareConfig.image_url || '',
    }
  },

  onShareTimeline() {
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

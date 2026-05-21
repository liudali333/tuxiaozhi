Page({
  data: {
    webUrl: ''
  },

  onLoad(options) {
    if (options.url) {
      const url = decodeURIComponent(options.url)
      this.setData({ webUrl: url })
    }
  },

  onWebViewLoad() {
    console.log('webview 加载成功')
  },

  onWebViewError() {
    wx.showToast({
      title: '网页加载失败',
      icon: 'none'
    })
  }
})

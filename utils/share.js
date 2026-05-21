// 全局分享工具函数
const app = getApp()

// 默认分享配置
const defaultConfig = {
  title: 'AI电商图生成，让你的商品更吸睛！',
  image_url: '',
}

// 获取分享标题
function getShareTitle(customTitle) {
  if (customTitle) return customTitle
  const shareConfig = app.globalData.shareConfig
  return shareConfig?.title || defaultConfig.title
}

// 获取分享图片
function getShareImage(customImage) {
  if (customImage) return customImage
  const shareConfig = app.globalData.shareConfig
  return shareConfig?.image_url || defaultConfig.image_url
}

// 生成分享数据（分享给好友）
function createShareAppMessage(options = {}) {
  const shareData = {
    title: getShareTitle(options.title),
    path: options.path || '/pages/home/index',
  }
  const imageUrl = getShareImage(options.imageUrl)
  if (imageUrl) {
    shareData.imageUrl = imageUrl
  }
  return shareData
}

// 生成分享数据（分享到朋友圈）
function createShareTimeline(options = {}) {
  const shareData = {
    title: getShareTitle(options.title),
    path: options.path || '/pages/home/index',
  }
  const imageUrl = getShareImage(options.imageUrl)
  if (imageUrl) {
    shareData.imageUrl = imageUrl
  }
  return shareData
}

module.exports = {
  getShareTitle,
  getShareImage,
  createShareAppMessage,
  createShareTimeline,
}

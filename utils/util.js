// utils/util.js — 通用工具函数

// API 基础地址配置（与 request.js 保持一致）
const API_BASE = 'https://image.433345.xyz'

// 格式化金额（分 → 元）
function formatPrice(fen) {
  if (typeof fen !== 'number') fen = parseFloat(fen) || 0
  return (fen / 100).toFixed(2)
}

// 格式化积分显示
function formatToken(count) {
  if (typeof count !== 'number') count = parseInt(count) || 0
  return count.toLocaleString()
}

// 格式化日期
function formatDate(timestamp, fmt = 'YYYY-MM-DD HH:mm') {
  const d = new Date(timestamp)
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  const hour  = String(d.getHours()).padStart(2, '0')
  const min   = String(d.getMinutes()).padStart(2, '0')
  const sec   = String(d.getSeconds()).padStart(2, '0')
  return fmt
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', min)
    .replace('ss', sec)
}

// 节流函数
function throttle(fn, delay = 300) {
  let last = 0
  return function(...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      return fn.apply(this, args)
    }
  }
}

// 防抖函数
function debounce(fn, delay = 500) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 校验兑换码格式（16位字母数字）
function validateRedeemCode(code) {
  if (!code || typeof code !== 'string') return false
  return /^[A-Za-z0-9]{4,32}$/.test(code.trim())
}

// 下载并保存图片到相册
function downloadAndSaveImage(url, successTip = '图片已保存到相册') {
  return new Promise((resolve, reject) => {
    // 处理相对路径，拼接完整URL
    let fullUrl = url
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      // 移除URL开头的斜杠
      const cleanUrl = url.replace(/^\//, '')
      // 从BASE_URL提取域名部分
      const urlObj = new URL(API_BASE)
      fullUrl = urlObj.origin + '/' + cleanUrl
      console.log('相对路径转换:', url, '->', fullUrl)
    }

    wx.showLoading({ title: '保存中...', mask: true })
    wx.downloadFile({
      url: fullUrl,
      success: res => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading()
              wx.showToast({ title: successTip, icon: 'success' })
              resolve(res.tempFilePath)
            },
            fail: err => {
              wx.hideLoading()
              console.error('保存到相册失败', err)
              if (err.errMsg && err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '需要授权',
                  content: '请允许保存图片到相册',
                  confirmText: '去设置',
                  success: modal => {
                    if (modal.confirm) {
                      wx.openSetting()
                    }
                  }
                })
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' })
              }
              reject(err)
            }
          })
        } else {
          wx.hideLoading()
          wx.showToast({ title: '下载失败', icon: 'none' })
          reject(new Error('download failed'))
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('下载图片失败', err)
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(new Error('network error'))
      }
    })
  })
}

// 微信支付封装（普通支付）
function wxPayment(paymentParams) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...paymentParams,
      success: () => {
        wx.showToast({ title: '支付成功', icon: 'success' })
        resolve()
      },
      fail: err => {
        if (err.errMsg === 'requestPayment:fail cancel') {
          wx.showToast({ title: '支付已取消', icon: 'none' })
        } else {
          wx.showToast({ title: '支付失败', icon: 'none' })
        }
        reject(err)
      }
    })
  })
}

// 微信虚拟支付封装（iOS/Android 虚拟商品支付）
// 参考官方文档: https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html
function wxVirtualPayment(paymentParams) {
  // 开发工具模拟器不支持虚拟支付
  const isSimulator = wx.getSystemInfoSync && wx.getSystemInfoSync().platform === 'windows'
  return new Promise((resolve, reject) => {
    // 检查是否支持虚拟支付
    if (!wx.requestVirtualPayment) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本不支持虚拟支付，请升级微信',
        showCancel: false
      })
      reject(new Error('不支持虚拟支付'))
      return
    }

    // 模拟器提示
    if (isSimulator) {
      wx.showModal({
        title: '提示',
        content: '虚拟支付仅支持真机调试，请在手机上进行测试',
        showCancel: false
      })
      reject(new Error('模拟器不支持虚拟支付'))
      return
    }

    // 超时处理（30秒）
    const timeoutId = setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '支付超时，请重试', icon: 'none' })
      reject(new Error('支付超时'))
    }, 30000)

    // ⚠️ 重要：必须使用后端返回的 signData（已用于生成 paySig 和 signature）
    // 不能重新构建，否则签名会不匹配导致 PAY_SIG_INVALID
    const signData = paymentParams.signData
    if (!signData) {
      clearTimeout(timeoutId)
      wx.showToast({ title: '支付参数错误', icon: 'none' })
      reject(new Error('缺少 signData 参数'))
      return
    }

    // 虚拟支付参数（只传 4 个核心参数，其余在 signData JSON 里）
    // ⚠️ 注意：不要同时传 offerId/buyQuantity/productId/goodsPrice 等单独字段
    //   微信 SDK 内部会从 signData 解析这些值；同时传会导致双重解析/签名冲突
    //   参考 CSDN 官方示例：https://blog.csdn.net/kenan6545456/article/details/139959177
    const params = {
      // signData（包含所有业务参数，SDK 内部提取字段用于调起支付和签名验证）
      signData: signData,
      // 签名（服务端态：appKey 签名）
      paySig: paymentParams.paySig || '',
      // 签名（用户态：session_key 签名，用于支付验证）
      signature: paymentParams.signature || '',
      // 支付模式：short_series_coin = 代币充值，short_series_goods = 道具直购
      mode: paymentParams.mode || 'short_series_coin',
      success: (res) => {
        clearTimeout(timeoutId)
        console.log('[wxVirtualPayment] success:', res)
        wx.showToast({ title: '支付成功', icon: 'success' })
        resolve(res)
      },
      fail: (err) => {
        clearTimeout(timeoutId)
        console.log('[wxVirtualPayment] fail:', err)
        if (err.errMsg && err.errMsg.includes('cancel')) {
          wx.showToast({ title: '支付已取消', icon: 'none' })
        } else {
          wx.showToast({ title: err.message || '支付失败', icon: 'none' })
        }
        reject(err)
      }
    }
    // ⚠️ 调试日志：确认传递给微信的所有参数
    console.log('[wxVirtualPayment] 最终参数:', JSON.stringify(params, null, 2))
    console.log('[wxVirtualPayment] 开始调用, signData:', signData, 'mode:', params.mode)

    wx.requestVirtualPayment(params)
  })
}

module.exports = {
  formatPrice,
  formatToken,
  formatDate,
  throttle,
  debounce,
  validateRedeemCode,
  downloadAndSaveImage,
  wxPayment,
  wxVirtualPayment,
}

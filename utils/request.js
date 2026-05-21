// utils/request.js — 统一请求封装 + 业务接口
// ⚠️ 上线时：确认 BASE_URL 指向 api.php，确认 MOCK_ENABLE = false

const app = getApp()

// 根据运行环境选择API地址
const isDev = true // 开发环境设为true，生产环境设为false
const BASE_URL = isDev ? 'https://image.433345.xyz/api.php' : 'https://image.433345.xyz/api.php'
// 如果本地开发，请使用：
// const BASE_URL = 'http://localhost:8000/api.php'
const MOCK_ENABLE = false

const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
}

const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  SERVER: 'SERVER_ERROR',
  AUTH: 'AUTH_ERROR',
  BUSINESS: 'BUSINESS_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
}

let globalErrorHandler = null

function setGlobalErrorHandler(handler) {
  globalErrorHandler = handler
}

function classifyError(err, statusCode) {
    // 网络错误（无状态码）
    if (!statusCode) return ERROR_TYPES.NETWORK
    // 认证错误（HTTP 401 或业务码 401）
    if (statusCode === 401 || err.code === 401) return ERROR_TYPES.AUTH
    // 服务端错误（HTTP 5xx）
    if (statusCode >= 500) return ERROR_TYPES.SERVER
    // 如果 HTTP 200 但业务码不为 0，使用业务码判断
    if (statusCode === 200 && err.code) {
        if (err.code >= 500) return ERROR_TYPES.SERVER
        if (err.code >= 400) return ERROR_TYPES.AUTH
    }
    return ERROR_TYPES.BUSINESS
}

function handleError(err, showToast) {
  if (globalErrorHandler) {
    const result = globalErrorHandler(err)
    if (result === false) return
  }

  if (showToast !== false && err.toastMsg) {
    const icon = err.code === 401 ? 'none' : 'none'
    wx.showToast({
      title: err.toastMsg,
      icon: icon,
      duration: 2000
    })
  }

  if (err.code === 401) {
    wx.removeStorageSync('token')
    wx.removeStorageSync('openid')
    if (app) {
      app.globalData.token = ''
      app.globalData.openid = ''
      app.globalData.balance = 0
      app.globalData.userId = 0
    }
  }
}

// ── Mock 数据（仅开发调试用）─────────────────────────
function getMockData(act, data) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      var mockOpenid = wx.getStorageSync('mockOpenid') || 'mock_' + Date.now()
      wx.setStorageSync('mockOpenid', mockOpenid)
      if (act === 'wx_login') {
        resolve({ openid: mockOpenid, token: 'mock_token_' + Date.now(), balance: 520 })
      } else if (act === 'balance') {
        resolve(520)
      } else if (act === 'recharge_packages') {
        resolve([
          { id: 'pkg_1', name: '体验套餐', tokens: 50,  price: 5,   originalPrice: 10, unitPrice: '0.10', tag: '首充' },
          { id: 'pkg_2', name: '标准套餐', tokens: 120, price: 10,  originalPrice: 20, unitPrice: '0.083', tag: '推荐' },
          { id: 'pkg_3', name: '高级套餐', tokens: 280, price: 20,  originalPrice: 40, unitPrice: '0.071', tag: '' },
          { id: 'pkg_4', name: '年度套餐', tokens: 800, price: 50,  originalPrice: 100, unitPrice: '0.063', tag: '超值' },
        ])
      } else if (act === 'recharge_create') {
        var pkgs = { pkg_1: 50, pkg_2: 120, pkg_3: 280, pkg_4: 800 }
        resolve({ orderId: 'ORD' + Date.now(), tokens: pkgs[data.packageId] || 50, balance: 570 })
      } else if (act === 'redeem_exchange') {
        var code = (data && data.code) || ''
        var msgs = { FREE2026: { t: 520, m: '兑换成功，获得 520 积分' }, WELCOME: { t: 100, m: '兑换成功，获得 100 积分' }, VIP888: { t: 888, m: '兑换成功，获得 888 积分' } }
        var r = msgs[code] || (code.length >= 4 ? { t: 100, m: '兑换成功，获得 100 积分' } : null)
        if (!r) { wx.hideLoading(); wx.showToast({ title: '兑换码无效', icon: 'none' }); return }
        resolve({ balance: 620, tokens: r.t, message: r.m })
      } else if (act === 'generate_create') {
        var type = (data && data.type) || 'main'
        var color = type === 'main' ? 'FF6B35' : '4A90D9'
        var text = encodeURIComponent((data && data.name) || '电商图')
        resolve({ taskId: 'T' + Date.now(), imageUrl: 'https://via.placeholder.com/800/' + color + '/FFFFFF?text=' + text, balance: 510 })
      } else if (act === 'generate_status') {
        resolve({ status: 'completed', imageUrl: 'https://via.placeholder.com/400/FF6B35/FFFFFF?text=Generated', progress: 100, errorMsg: '' })
      } else if (act === 'generate_history') {
        resolve({ list: [], total: 0, page: 1, pageSize: 10 })
      } else if (act === 'recharge_history') {
        resolve({ list: [], total: 0, page: 1, pageSize: 10 })
      } else {
        resolve({})
      }
    }, 500)
  })
}

// ── 延迟函数 ────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── 判断是否应该重试 ────────────────────────────────────────
function shouldRetry(err, attempt, maxRetries) {
  if (attempt >= maxRetries) return false

  // 网络错误（无 statusCode）应该重试
  if (!err.statusCode) return true

  // 特定状态码应该重试
  return RETRY_CONFIG.retryableStatusCodes.indexOf(err.statusCode) !== -1
}

// ── 执行单个请求（不包含重试）───────────────────────────────────────
function doRequest(act, data, opts) {
  return new Promise(function(resolve, reject) {
    var token = (app && app.globalData.token) || wx.getStorageSync('token') || ''

    var header = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    if (opts.useAuth && token) {
      header['Authorization'] = 'Bearer ' + token
    }

    var reqData = { act: act }
    if (data) {
      for (var k in data) reqData[k] = data[k]
    }

    wx.request({
      url: BASE_URL,
      data: reqData,
      method: 'POST',
      header: header,
      timeout: 120000,  // 120秒超时，AI生图可能需要较长时间
      success: function(res) {
        if (res.statusCode === 200) {
          var d = res.data
          if (d.code === 0) {
            resolve(d.data)
          } else if (d.code === 401) {
            reject({
              code: 401,
              errorType: ERROR_TYPES.AUTH,
              message: '未登录',
              toastMsg: '登录已过期，请重新登录',
              shouldShowToast: true,
              data: d.data
            })
          } else {
            reject({
              code: d.code,
              errorType: ERROR_TYPES.BUSINESS,
              message: d.message || '请求失败',
              toastMsg: d.message || '请求失败',
              shouldShowToast: d.code !== 400,
              data: d.data
            })
          }
        } else {
          reject({
            code: res.statusCode,
            statusCode: res.statusCode,
            errorType: ERROR_TYPES.SERVER,
            message: '服务器异常',
            toastMsg: '服务器异常（' + res.statusCode + '）',
            shouldShowToast: true
          })
        }
      },
      fail: function(err) {
        // 区分超时错误和网络错误
        var isTimeout = err.errMsg && err.errMsg.indexOf('timeout') !== -1
        reject({
          code: -1,
          errorType: isTimeout ? ERROR_TYPES.SERVER : ERROR_TYPES.NETWORK,
          message: isTimeout ? '请求超时' : '网络异常',
          toastMsg: isTimeout ? '请求超时，请稍后重试' : '网络异常，请检查网络',
          shouldShowToast: true
        })
      },
    })
  })
}

// ── 核心请求函数（含重试）───────────────────────────────────────
function request(act, data, opts) {
  opts = opts || {}
  var showLoading = opts.loading !== false
  var useAuth     = opts.auth !== false
  var maxRetries  = opts.retries !== undefined ? opts.retries : RETRY_CONFIG.maxRetries

  if (MOCK_ENABLE) {
    if (showLoading) wx.showLoading({ title: '加载中...', mask: true })
    return getMockData(act, data).then(function(d) {
      wx.hideLoading()
      return d
    }).catch(function(e) {
      wx.hideLoading()
      return Promise.reject(e)
    })
  }

  if (showLoading) wx.showLoading({ title: '加载中...', mask: true })

  let attempt = 0

  const executeWithRetry = () => {
    return doRequest(act, data, { showLoading, useAuth })
      .then(result => {
        wx.hideLoading()
        return result
      })
      .catch(err => {
        attempt++
        if (maxRetries > 0 && shouldRetry(err, attempt, maxRetries)) {
          return delay(RETRY_CONFIG.retryDelay).then(executeWithRetry)
        }

        wx.hideLoading()
        handleError(err, err.shouldShowToast)
        return Promise.reject(err)
      })
  }

  return executeWithRetry()
}

// ── 导出错误处理工具 ────────────────────────────────────
module.exports = {
  request,
  setGlobalErrorHandler,
  classifyError,
  ERROR_TYPES,
}

// ── 业务接口封装 ────────────────────────────────────

// 微信登录（静默登录或带用户信息）
function wxLogin(code, userInfo, invite) {
  var data = { code: code }
  // 传递邀请码
  var inviteCode = invite || wx.getStorageSync('invite_code') || ''
  if (inviteCode) {
    data.invite = inviteCode
  }
  if (userInfo) {
    data.nickname = userInfo.nickname
    data.avatar   = userInfo.avatarUrl || userInfo.avatar // 兼容两种字段名
    data.gender   = userInfo.gender
    data.country  = userInfo.country
    data.province = userInfo.province
    data.city     = userInfo.city
  }
  return request('wx_login', data, { loading: false, auth: false })
}

// 查询积分余额
function getBalance() {
  return request('balance', {}, { loading: false }).then(data => {
    // 兼容旧格式（直接返回数字）和新格式（返回对象）
    if (typeof data === 'number') return data
    // 新格式：{ balance, userId, nickname, avatar }
    if (data && typeof data.balance === 'number') {
      // 更新 globalData 中的其他用户信息
      if (app) {
        if (data.userId) app.globalData.userId = data.userId
        if (data.nickname) app.globalData.nickname = data.nickname
        if (data.avatar) app.globalData.avatar = data.avatar
      }
      return data.balance
    }
    return 0
  })
}

// 充值套餐列表（静默，无登录要求）
function getPackages() {
  return request('recharge_packages', {}, { loading: false, auth: false })
}

// 创建充值订单（返回支付参数）
function recharge(packageId, code) {
  // 后端 recharge_packages 返回 id 为整数，recharge_create 期望整数
  const data = { packageId: parseInt(packageId) || packageId }
  if (code) data.code = code  // 传递 fresh login code，让后端换取 session_key
  return request('recharge_create', data, { loading: true })
}

// 确认虚拟支付成功（发货）
function confirmRecharge(orderId) {
  return request('recharge_confirm', { orderId: orderId }, { loading: true })
}

// 兑换码兑换
function redeemCode(code) {
  return request('redeem_exchange', { code: code }, { loading: true })
}

// 创建生成任务（不重试）
function createGenerateTask(params) {
  return request('generate_create', params, { loading: true, retries: 0 })
}

// 查询任务状态（轮询请求，不重试）
function getTaskStatus(taskId) {
  return request('generate_status', { id: taskId }, { loading: false, retries: 0 })
}

// 模型列表
function getModels() {
  return request('model_list', {}, { loading: false })
}

// 智能体列表
function getAgents() {
  return request('agent_list', {}, { loading: false })
}

// 详情图分镜配置
function getDetailModules() {
  return request('get_detail_modules', {}, { loading: false, auth: false })
}

// 生成提示词
function generatePrompt(params) {
  return request('agent_generate_prompt', params, { loading: true })
}

// 生成记录
function getHistory(page, pageSize) {
  page = page || 1
  pageSize = pageSize || 20
  return request('generate_history', { page: page, pageSize: pageSize }, { loading: false })
}

// 充值记录
function getRechargeHistory(page, pageSize) {
  page = page || 1
  pageSize = pageSize || 10
  return request('recharge_history', { page: page, pageSize: pageSize }, { loading: false })
}

// 积分记录
function getBalanceLogs(page, pageSize) {
  page = page || 1
  pageSize = pageSize || 20
  return request('balance_logs', { page: page, pageSize: pageSize }, { loading: false })
}

// 查询用户信息（根据用户ID）
function getUserInfo(userId) {
  return request('get_user_info', { userId: userId }, { loading: true })
}

// 转赠积分
function transferBalance(userId, amount) {
  return request('transfer_balance', { userId: userId, amount: amount }, { loading: true })
}

// 每日签到
function doSignIn(adWatched) {
  return request('do_sign_in', { ad_watched: adWatched || 0 }, { loading: false })
}

// 获取签到配置
function getSignConfig() {
  return request('sign_config', {}, { loading: false })
}

// 获取分享配置
function getShareConfig() {
  return request('get_share_config', {}, { loading: false, auth: false })
}

// 获取前端配置（轮播图、金刚位、广告）
function getFrontendConfig() {
  return request('frontend_config', {}, { loading: false, auth: false })
}

// 获取邀请好友列表
function getInviteList(page, pageSize) {
  page = page || 1
  pageSize = pageSize || 20
  return request('invite_list', { page: page, pageSize: pageSize }, { loading: false })
}

// ── 导出 ────────────────────────────────────────────
module.exports = {
  request: request,
  wxLogin: wxLogin,
  getBalance: getBalance,
  getPackages: getPackages,
  recharge: recharge,
  confirmRecharge: confirmRecharge,
  redeemCode: redeemCode,
  createGenerateTask: createGenerateTask,
  getTaskStatus: getTaskStatus,
  getModels: getModels,
  getAgents: getAgents,
  getDetailModules: getDetailModules,
  generatePrompt: generatePrompt,
  getHistory: getHistory,
  getRechargeHistory: getRechargeHistory,
  getBalanceLogs: getBalanceLogs,
  getUserInfo: getUserInfo,
  transferBalance: transferBalance,
  doSignIn: doSignIn,
  getSignConfig: getSignConfig,
  getShareConfig: getShareConfig,
  getInviteList: getInviteList,
  getFrontendConfig: getFrontendConfig,
  BASE_URL: BASE_URL,
  setGlobalErrorHandler: setGlobalErrorHandler,
  classifyError: classifyError,
  ERROR_TYPES: ERROR_TYPES,
}

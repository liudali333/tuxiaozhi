const request = require('../../utils/request.js')
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    list: [],
    loading: false,
    noMore: false,
    page: 1,
    pageSize: 10,
    totalAmount: 0,
  },

  onLoad() {
    this.loadMore()
  },

  onPullDownRefresh() {
    this.setData({ list: [], page: 1, noMore: false, totalAmount: 0 })
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
    return request.getRechargeHistory(this.data.page, this.data.pageSize)
      .then(res => {
        const rawList = res.list || []
        const newItems = rawList.map(item => ({
          orderId:    item.orderId,
          amount:    item.amount,
          tokens:    item.tokens,
          status:    item.status,
          created_at: item.created_at,
          timeStr:   item.created_at ? formatDate(parseInt(item.created_at) * 1000, 'MM-DD HH:mm') : '',
          statusName: item.status === 'success' ? '成功' : (item.status === 'failed' ? '失败' : '处理中'),
          statusClass: item.status === 'success' ? 'status-success' : (item.status === 'failed' ? 'status-failed' : 'status-pending'),
        }))
        const allList = this.data.page === 1 ? newItems : [...this.data.list, ...newItems]
        const totalAmount = allList.reduce(function(s, item) { return s + (item.amount || 0) }, 0)
        this.setData({
          list: allList,
          totalAmount: totalAmount,
          noMore: rawList.length < this.data.pageSize,
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
      })
  },

  goProfile() {
    wx.navigateBack()
  },
})
const request = require('../../utils/request.js')
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    list: [],
    loading: false,
    noMore: false,
    page: 1,
    pageSize: 20,
  },

  onLoad() {
    this.loadMore()
  },

  onPullDownRefresh() {
    this.setData({ list: [], page: 1, noMore: false })
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
    return request.getBalanceLogs(this.data.page, this.data.pageSize)
      .then(res => {
        const rawList = res.list || []
        const newItems = rawList.map(item => ({
          id: item.id,
          type: item.type,
          typeName: item.typeName,
          amount: item.amount,
          balanceAfter: item.balanceAfter,
          remark: item.remark,
          timeStr: item.createdAt ? formatDate(parseInt(item.createdAt) * 1000, 'YYYY-MM-DD HH:mm') : '',
          isIncome: item.amount > 0,
        }))
        const allList = this.data.page === 1 ? newItems : [...this.data.list, ...newItems]
        this.setData({
          list: allList,
          noMore: rawList.length < this.data.pageSize,
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
      })
  },

  goBack() {
    wx.navigateBack()
  },
})
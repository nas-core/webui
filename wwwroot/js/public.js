/**
 * nascore 公共JavaScript功能
 * 主要包含主题切换和界面交互功能
 */

/**
 * nascore 公共JavaScript功能
 * 配置管理和公共功能封装
 */

// 配置管理
const CONFIG_KEY = 'nascore-config'

// 默认配置
const DEFAULT_CONFIG = {
  hideHiddenFiles: false, // 是否隐藏隐藏文件
  useSingleClick: false, // 是否使用单击打开
  onlineEditFileSizeLimit: 500, // 在线文件编辑大小限制，单位KB
  useOnlyThumbnails: false, // 是否只使用缩略图文件夹的图片预览
  imagePreviewSizeLimit: 1024, // 图片预览大小限制，单位KB（1MB默认值）
  showExactDate: false, // 是否显示精确的日期格式
}

/**
 * 获取配置
 * @returns {Object} 配置对象
 */
function getConfig() {
  try {
    const savedConfig = localStorage.getItem(CONFIG_KEY)
    return savedConfig ? { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) } : { ...DEFAULT_CONFIG }
  } catch (error) {
    console.error('读取配置失败:', error)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 保存配置
 * @param {Object} config - 要保存的配置
 */
function saveConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

// 导出到全局
window.NascoreConfig = {
  get: getConfig,
  save: saveConfig,
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function () {
  // 初始化主题
  // 初始化主题但不显示通知
  initTheme()

  // 初始化主题设置模态框
  initThemeModal()

  // 绑定移动端侧边栏切换
  bindSidebarToggle()

  // 绑定文件列表点击事件
  bindFileListEvents()

  // 初始化工具提示
})

/**
 * 初始化主题设置
 */
function initTheme() {
  // 获取保存的主题设置，默认为自动
  const savedTheme = localStorage.getItem('nascore-theme') || 'auto'

  // 设置主题选择下拉菜单的选中状态
  const themeSelector = document.getElementById('theme-selector')
  if (themeSelector) {
    themeSelector.value = savedTheme
  }

  // 应用主题
  applyTheme(savedTheme)
}

/**
 * 应用指定的主题
 * @param {string} theme - 主题名称: 'light', 'dark', 'auto'
 */
function applyTheme(theme, showNotification = true) {
  const root = document.documentElement

  // 判断是否使用暗色主题
  let useDarkTheme = theme === 'dark'

  // 如果是自动模式，则根据系统设置决定
  if (theme === 'auto') {
    useDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // 设置HTML根元素的data-theme属性，这将触发CSS变量的更新
  root.setAttribute('data-theme', useDarkTheme ? 'dark' : 'light')

  // 保存主题设置到本地存储
  localStorage.setItem('nascore-theme', theme)

  // 更新主题文本显示
  updateThemeText(theme)
}

/**
 * 更新主题文本显示
 */
function updateThemeText(theme) {
  const themeTextElement = document.getElementById('currentThemeText')
  if (themeTextElement) {
    let themeText = '跟随系统'
    if (theme === 'light') {
      themeText = '明亮模式'
    } else if (theme === 'dark') {
      themeText = '暗黑模式'
    }
    themeTextElement.textContent = themeText
  }
}

/**
 * 初始化主题设置模态框
 */
function initThemeModal() {
  // 创建模态框HTML
  const modalHTML = `
    <div class="modal fade" id="themeModal" tabindex="-1" aria-labelledby="themeModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="themeModalLabel">主题设置</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body">
            <div class="list-group">
              <a href="#" class="list-group-item list-group-item-action theme-option d-flex align-items-center" data-theme="light">
                <i class="bi bi-sun me-3"></i>
                <div>
                  <h6 class="mb-1">明亮主题</h6>
                  <small class="text-muted">适合日间使用的明亮配色</small>
                </div>
              </a>
              <a href="#" class="list-group-item list-group-item-action theme-option d-flex align-items-center" data-theme="dark">
                <i class="bi bi-moon me-3"></i>
                <div>
                  <h6 class="mb-1">暗黑主题</h6>
                  <small class="text-muted">适合夜间使用的暗色配色</small>
                </div>
              </a>
              <a href="#" class="list-group-item list-group-item-action theme-option d-flex align-items-center" data-theme="auto">
                <i class="bi bi-circle-half me-3"></i>
                <div>
                  <h6 class="mb-1">跟随系统</h6>
                  <small class="text-muted">根据系统主题自动切换</small>
                </div>
              </a>
            </div>
            <p class="text-muted mt-3">
              <small>主题设置将保存在您的浏览器中，当您在其他设备或清除浏览器数据后需要重新设置。</small>
            </p>
          </div>
        </div>
      </div>
    </div>
  `

  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    //console.log('DEBUG: Bootstrap and bootstrap.Modal is ok。')
  } else {
    console.error('ERROR: Bootstrap and bootstrap.Modal is not available。')
  }

  // 添加模态框到页面
  document.body.insertAdjacentHTML('beforeend', modalHTML)
  const themeModalElement = document.getElementById('themeModal')

  // 获取模态框实例
  const themeModal = new bootstrap.Modal(themeModalElement)

  // 绑定主题切换事件
  document.querySelectorAll('.theme-option').forEach((option) => {
    option.addEventListener('click', function (e) {
      e.preventDefault()
      const theme = this.getAttribute('data-theme')
      applyTheme(theme, true) // 显示切换通知

      // 更新选中状态
      document.querySelectorAll('.theme-option').forEach((opt) => {
        opt.classList.remove('active')
      })
      this.classList.add('active')

      // 关闭模态框
      themeModal.hide()
    })
  })

  // 绑定打开主题设置的事件
  const openThemeModalButtons = document.querySelectorAll('[data-action="open-theme-modal"]')

  openThemeModalButtons.forEach((btn) => {
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      themeModal.show()
    })
  })

  // 初始化当前主题文本
  updateThemeText(localStorage.getItem('nascore-theme') || 'auto')

  // 当模态框显示时设置当前主题的选中状态
  document.getElementById('themeModal').addEventListener('show.bs.modal', function () {
    const currentTheme = localStorage.getItem('nascore-theme') || 'auto'
    document.querySelectorAll('.theme-option').forEach((opt) => {
      opt.classList.toggle('active', opt.getAttribute('data-theme') === currentTheme)
    })
  })
}

/**
 * 绑定移动端侧边栏切换
 */
function bindSidebarToggle() {
  // 已移至side.js
}

/**
 * 绑定文件列表相关事件
 */
function bindFileListEvents() {
  // 检查页面上是否有file-item元素
  const fileItems = document.querySelectorAll('.file-item')
  if (fileItems.length > 0) {
    fileItems.forEach(function (item) {
      item.addEventListener('click', function () {
        // 检查是文件夹还是文件
        const isFolder = item.querySelector('.bi-folder-fill') !== null

        if (isFolder) {
          // 如果是文件夹，导航到该文件夹
          const folderPath = item.getAttribute('data-path')
          if (folderPath) {
            // 此处将来会实现后端跳转
            console.log('Navigate to folder:', folderPath)
          }
        } else {
          // 如果是文件，根据文件类型执行相应操作
          const filePath = item.getAttribute('data-path')
          if (filePath) {
            // 此处将来会实现文件操作
            console.log('Open file:', filePath)
          }
        }
      })
    })
  }

  // 文件排序事件
  const sortHeaders = document.querySelectorAll('.sort-header')
  if (sortHeaders.length > 0) {
    sortHeaders.forEach(function (header) {
      header.addEventListener('click', function () {
        const sortBy = this.getAttribute('data-sort')
        const currentDir = this.getAttribute('data-dir') || 'asc'
        const newDir = currentDir === 'asc' ? 'desc' : 'asc'

        // 更新排序方向
        sortHeaders.forEach((h) => h.setAttribute('data-dir', ''))
        this.setAttribute('data-dir', newDir)

        // 此处将来会实现排序逻辑
        console.log('Sort by:', sortBy, 'Direction:', newDir)
      })
    })
  }
}

/**
 * 显示消息通知
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型: 'success', 'error', 'warning', 'info'
 * @param {number} duration - 显示时长（毫秒）
 */

function showNotification(message, type = 'info', duration = 3000) {
  // 创建通知元素
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.textContent = message

  // 添加到文档
  const notificationContainer = document.getElementById('notification-container')
  if (!notificationContainer) {
    // 如果容器不存在，创建一个
    const container = document.createElement('div')
    container.id = 'notification-container'
    document.body.appendChild(container)
    container.appendChild(notification)
  } else {
    notificationContainer.appendChild(notification)
  }

  // 淡入效果
  setTimeout(() => {
    notification.classList.add('show')
  }, 10)

  // 设置定时器，自动移除通知
  setTimeout(() => {
    notification.classList.remove('show')
    setTimeout(() => {
      notification.remove()
    }, 300)
  }, duration)
}

/**
 * 确认对话框
 * @param {string} message - 确认消息
 * @param {Function} onConfirm - 确认回调
 * @param {Function} onCancel - 取消回调
 */
function confirmDialog(message, onConfirm, onCancel) {
  // 检查是否有Bootstrap模态框API
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    // 创建模态框元素
    const modalEl = document.createElement('div')
    modalEl.className = 'modal fade'
    modalEl.id = 'confirmModal'
    modalEl.tabIndex = -1
    modalEl.setAttribute('aria-labelledby', 'confirmModalLabel')
    modalEl.setAttribute('aria-hidden', 'true')

    // 设置模态框内容
    modalEl.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmModalLabel">确认操作</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmBtn">确认</button>
                    </div>
                </div>
            </div>
        `

    // 添加到文档
    document.body.appendChild(modalEl)

    // 创建模态框实例
    const modal = new bootstrap.Modal(modalEl)

    // 绑定确认事件
    document.getElementById('confirmBtn').addEventListener('click', function () {
      if (typeof onConfirm === 'function') {
        onConfirm()
      }
      modal.hide()
    })

    // 模态框隐藏后事件
    modalEl.addEventListener('hidden.bs.modal', function () {
      modalEl.remove()
    })

    // 模态框取消事件
    modalEl.addEventListener('hide.bs.modal', function () {
      if (typeof onCancel === 'function') {
        onCancel()
      }
    })

    // 显示模态框
    modal.show()
  } else {
    // 降级为原生确认对话框
    if (window.confirm(message)) {
      if (typeof onConfirm === 'function') {
        onConfirm()
      }
    } else {
      if (typeof onCancel === 'function') {
        onCancel()
      }
    }
  }
}

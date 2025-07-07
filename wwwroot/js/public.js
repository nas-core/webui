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
  // type: 'success', 'error', 'warning', 'info'
  const colorMap = {
    success: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-200',
    error: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-200',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    info: 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    danger: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  const notification = document.createElement('div')
  notification.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2 border-l-4 rounded shadow-lg min-w-[220px] max-w-xs transition-all duration-300 opacity-0 pointer-events-auto ${colorMap[type] || colorMap.info}`
  notification.style.marginTop = '0.5rem'
  notification.innerHTML = `<div class="flex items-center gap-2"><span class="flex-1">${message}</span><button type="button" class="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" aria-label="关闭" onclick="this.closest('.fixed').remove()"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>`
  // 添加到文档
  let notificationContainer = document.getElementById('notification-container')
  if (!notificationContainer) {
    notificationContainer = document.createElement('div')
    notificationContainer.id = 'notification-container'
    notificationContainer.className = 'fixed top-4 left-0 w-full flex flex-col items-center pointer-events-none z-[1100]'
    document.body.appendChild(notificationContainer)
  }
  notificationContainer.appendChild(notification)
  // 淡入
  setTimeout(() => {
    notification.classList.add('opacity-100')
    notification.classList.remove('opacity-0')
  }, 10)
  // 自动移除
  setTimeout(() => {
    notification.classList.remove('opacity-100')
    notification.classList.add('opacity-0')
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
  // Tailwind 风格自定义模态框
  const modalId = 'tailwindConfirmModal_' + Date.now()
  const modalEl = document.createElement('div')
  modalEl.id = modalId
  modalEl.className = 'fixed inset-0 z-[1200] flex items-center justify-center bg-black/40'
  modalEl.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-xs relative animate-fadeIn">
      <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h5 class="text-lg font-semibold">确认操作</h5>
        <button class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="关闭" onclick="document.getElementById('${modalId}').remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-4 text-gray-700 dark:text-gray-200">${message}</div>
      <div class="flex justify-end gap-2 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <button type="button" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600" id="${modalId}_cancel">取消</button>
        <button type="button" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" id="${modalId}_ok">确认</button>
      </div>
    </div>
  `
  document.body.appendChild(modalEl)
  document.getElementById(`${modalId}_ok`).onclick = function () {
    if (typeof onConfirm === 'function') onConfirm()
    modalEl.remove()
  }
  document.getElementById(`${modalId}_cancel`).onclick = function () {
    if (typeof onCancel === 'function') onCancel()
    modalEl.remove()
  }
}

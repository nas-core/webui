/**
 * 文件视图模式切换
 */

document.addEventListener('DOMContentLoaded', () => {
  const VIEW_MODE_KEY = 'nascore-view-mode'
  const fileListContainer = document.getElementById('fileListContainer')
  const viewModeButtons = document.querySelectorAll('[data-view-mode]')
  const viewOptionsIcon = document.querySelector('#viewOptionsDropdown i')
  const viewModeDropdown = document.getElementById('viewOptionsDropdown')

  // 初始化视图模式
  initViewMode()

  // 绑定CSS类变化的事件监听器，用于处理视图模式切换时的图片预览布局调整
  if (fileListContainer) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // 当视图模式切换时，调整图片预览的样式
          adjustImagePreviewLayout()
        }
      })
    })

    observer.observe(fileListContainer, { attributes: true })
  }

  // 绑定视图切换事件
  viewModeButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault()
      const mode = button.dataset.viewMode
      changeViewMode(mode)
    })
  })

  /**
   * 初始化视图模式
   */
  function initViewMode() {
    try {
      // 获取保存的视图模式，默认为详细列表
      const savedMode = localStorage.getItem(VIEW_MODE_KEY) || 'detailed-list'
      changeViewMode(savedMode, false) // 不显示通知
      // console.log('已加载视图模式:', savedMode)
    } catch (error) {
      console.error('initViewMode load error:', error)
      changeViewMode('detailed-list', false) // 失败时使用默认视图模式
    }
  }

  /**
   * 改变视图模式
   * @param {string} mode - 视图模式：'detailed-list' 或 'grid-medium'
   * @param {boolean} showNotification - 是否显示通知
   */
  function changeViewMode(mode, showNotification = true) {
    if (!mode || !fileListContainer) return

    // 移除所有可能的视图类
    fileListContainer.classList.remove('detailed-list', 'grid-medium')

    // 添加新的视图类
    fileListContainer.classList.add(mode)

    try {
      // 保存视图模式到本地存储
      localStorage.setItem(VIEW_MODE_KEY, mode)
      //console.log('已保存视图模式:', mode)

      // 更新视图切换按钮的图标
      updateViewIcon(mode)

      // 更新视图按钮的激活状态
      updateActiveViewButton(mode)

      // 显示通知
      if (showNotification) {
        const modeName = mode === 'detailed-list' ? '详细列表' : '图标列表'
        window.showNotification(`已切换到${modeName}视图`, 'info')
      }

      // 调整图片预览布局
      adjustImagePreviewLayout()
    } catch (error) {
      console.error('保存视图模式失败:', error)
      if (showNotification) {
        window.showNotification('视图切换已完成，但无法保存设置', 'warning')
      }
    }
  }

  /**
   * 更新视图切换按钮的图标
   * @param {string} mode - 当前的视图模式
   */
  function updateViewIcon(mode) {
    if (!viewOptionsIcon) return

    // 移除现有的图标类
    viewOptionsIcon.classList.remove('bi-grid-3x3-gap-fill', 'bi-list-ul')

    // 添加对应的图标类
    if (mode === 'detailed-list') {
      viewOptionsIcon.classList.add('bi-list-ul')
    } else {
      viewOptionsIcon.classList.add('bi-grid-3x3-gap-fill')
    }
  }

  /**
   * 更新视图按钮的激活状态
   * @param {string} activeMode - 当前激活的视图模式
   */
  function updateActiveViewButton(activeMode) {
    viewModeButtons.forEach((button) => {
      const isActive = button.dataset.viewMode === activeMode
      button.classList.toggle('active', isActive)
    })
  }

  /**
   * 调整图片预览布局
   * 根据当前视图模式调整图片预览的布局
   */
  function adjustImagePreviewLayout() {
    if (!fileListContainer) return

    const isGridView = fileListContainer.classList.contains('grid-medium')
    const previewImages = document.querySelectorAll('.file-image-preview')

    previewImages.forEach((img) => {
      const container = img.closest('.file-preview-container')
      if (container) {
        if (isGridView) {
          // 网格视图下的样式调整
          container.classList.add('icon-view')
        } else {
          // 列表视图下的样式调整
          container.classList.remove('icon-view')
        }
      }
    })
  }

  // 暴露函数到全局，使其他模块可以调用
  window.adjustImagePreviewLayout = adjustImagePreviewLayout
})

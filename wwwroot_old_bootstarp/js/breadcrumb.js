/**
 * 面包屑导航功能
 * 依赖：filelist.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const defaultBreadcrumb = document.getElementById('defaultBreadcrumb')
  const pathEditor = document.querySelector('.path-editor')
  const pathInput = document.getElementById('pathInput')
  const editPathBtn = document.getElementById('editPathBtn')
  const confirmPathBtn = document.getElementById('confirmPath')
  const cancelPathEditBtn = document.getElementById('cancelPathEdit')

  // 监听路由变化
  window.addEventListener('hashchange', updateBreadcrumb)
  // 首次加载
  updateBreadcrumb()

  // 绑定编辑路径按钮事件
  editPathBtn?.addEventListener('click', togglePathEditor)
  confirmPathBtn?.addEventListener('click', confirmPath)
  cancelPathEditBtn?.addEventListener('click', cancelPathEdit)
  pathInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmPath()
    }
  })

  /**
   * 更新面包屑导航
   */
  function updateBreadcrumb() {
    if (!defaultBreadcrumb) return

    // 获取当前路径
    let path = decodeURI(window.location.hash.replace(/^#/, '')) || '/'

    // 分割路径
    const segments = path.split('/').filter(Boolean)

    // 清空现有面包屑（除了根目录图标）
    while (defaultBreadcrumb.children.length > 1) {
      defaultBreadcrumb.removeChild(defaultBreadcrumb.lastChild)
    }

    // 构建面包屑项
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += '/' + segment
      const isLast = index === segments.length - 1

      const li = document.createElement('li')
      li.className = 'breadcrumb-item'
      if (isLast) li.classList.add('active')

      if (isLast) {
        li.textContent = segment
        li.setAttribute('aria-current', 'page')
      } else {
        const a = document.createElement('a')
        a.href = `#${currentPath}`
        a.textContent = segment
        li.appendChild(a)
      }

      defaultBreadcrumb.appendChild(li)
    })

    // 更新路径输入框的值
    if (pathInput) {
      pathInput.value = path
    }
  }

  /**
   * 切换路径编辑器显示状态
   */
  function togglePathEditor() {
    if (!defaultBreadcrumb || !pathEditor) return

    const isEditing = !pathEditor.classList.contains('d-none')

    if (isEditing) {
      // 切换回面包屑显示
      pathEditor.classList.add('d-none')
      defaultBreadcrumb.classList.remove('d-none')
      editPathBtn?.classList.remove('active')
    } else {
      // 切换到编辑模式
      defaultBreadcrumb.classList.add('d-none')
      pathEditor.classList.remove('d-none')
      editPathBtn?.classList.add('active')
      // 设置当前路径到输入框
      if (pathInput) {
        const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
        pathInput.value = currentPath
        pathInput.focus()
        pathInput.select()
      }
    }
  }

  /**
   * 确认路径更改
   */
  function confirmPath() {
    if (!pathInput) return

    let path = pathInput.value.trim()

    // 确保路径以/开头
    if (!path.startsWith('/')) {
      path = '/' + path
    }

    // 规范化路径（移除多余的斜杠等）
    path = path.replace(/\/+/g, '/')

    // 更新URL并触发路由变化
    window.location.hash = path

    // 切换回面包屑显示
    togglePathEditor()
  }

  /**
   * 取消路径编辑
   */
  function cancelPathEdit() {
    // 恢复原始路径
    if (pathInput) {
      const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
      pathInput.value = currentPath
    }

    // 切换回面包屑显示
    togglePathEditor()
  }
})

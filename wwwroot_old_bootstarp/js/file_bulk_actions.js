/**
 * 文件多选和批量操作功能
 * 依赖：fileOperations.js, public.js (用于showNotification和confirmDialog), compress_extract.js
 */

// HTML转义函数，确保在任何需要时可用
function escapeHtml(str) {
  return str.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  )
}

document.addEventListener('DOMContentLoaded', () => {
  const fileList = document.querySelector('.file-list')
  const bulkToolbar = document.querySelector('.bulk-actions-toolbar')
  const selectedCountEl = bulkToolbar?.querySelector('.selected-count')
  window.selectedItems = new Set() // 存储选中项的路径
  let isShiftSelecting = false
  let isCtrlSelecting = false
  let lastSelectedItem = null // 存储上一次点击的 fileItem DOM元素

  // 鼠标划区域选择相关变量
  let isMouseSelecting = false
  let selectionBox = null
  let startX = 0
  let startY = 0

  // 初始化多选功能
  function initMultiSelect() {
    if (!fileList || !bulkToolbar) {
      console.error('ERROR: 缺少必要的DOM元素', { fileList: !!fileList, bulkToolbar: !!bulkToolbar })
      return
    }

    // 添加键盘状态监听
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') isShiftSelecting = true
      if (e.key === 'Control' || e.key === 'Meta') isCtrlSelecting = true

      // 更新选择状态的视觉反馈
      if (isShiftSelecting || isCtrlSelecting) {
        document.body.classList.add('multi-select-mode')
      }
    })

    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') isShiftSelecting = false
      if (e.key === 'Control' || e.key === 'Meta') isCtrlSelecting = false

      // 更新选择状态的视觉反馈
      if (!isShiftSelecting && !isCtrlSelecting) {
        document.body.classList.remove('multi-select-mode')
      }
    })

    // 添加键盘快捷键处理
    document.addEventListener('keydown', (e) => {
      // 检查焦点是否在输入元素上
      if (isInputFocused()) {
        return // 如果在输入框中，不处理快捷键
      }

      // Ctrl+A 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        selectAll()
        return
      }

      // Ctrl+ESC 取消选择
      if ((e.ctrlKey || e.metaKey) && e.key === 'Escape') {
        e.preventDefault()
        clearSelection()
        return
      }

      // Ctrl+C 复制选中文件
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedItems.size > 0) {
        e.preventDefault()
        bulkCopy()
        return
      }

      // Ctrl+X 剪切选中文件
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedItems.size > 0) {
        e.preventDefault()
        bulkCut()
        return
      }

      // Ctrl+V 粘贴文件
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        // 检查剪贴板中是否有内容
        const clipboardArray = JSON.parse(localStorage.getItem('clipboard') || '[]')
        const hasCutItems = clipboardArray.some((group) => group.action === 'cut' && group.items.length > 0)
        const hasCopyItems = clipboardArray.some((group) => group.action === 'copy' && group.items.length > 0)

        if (hasCutItems) {
          bulkPasteCut()
        } else if (hasCopyItems) {
          bulkPasteCopy()
        } else {
          window.showNotification('剪贴板中没有可粘贴的内容', 'info')
        }
        return
      }

      // Delete 删除选中文件
      if (e.key === 'Delete' && selectedItems.size > 0) {
        e.preventDefault()
        bulkDelete()
        return
      }
    })

    // 处理复选框点击事件
    fileList.addEventListener('change', (e) => {
      const checkbox = e.target
      if (checkbox.matches('[data-select-item]')) {
        const fileItem = checkbox.closest('.file-item')
        handleItemSelection(fileItem, checkbox.checked)
      }
    })

    // 处理文件项点击事件（用于Ctrl和Shift选择）
    fileList.addEventListener('click', (e) => {
      // 避免与复选框点击冲突
      if (e.target.matches('[data-select-item]')) return

      const fileItem = e.target.closest('.file-item')
      if (!fileItem) return

      // 阻止默认的文件打开行为（当按下修饰键时）
      if (isCtrlSelecting || isShiftSelecting) {
        e.preventDefault()
        e.stopPropagation()

        const checkbox = fileItem.querySelector('[data-select-item]')
        if (!checkbox) return

        if (isCtrlSelecting) {
          // Ctrl+点击：切换选择状态
          const newState = !checkbox.checked
          checkbox.checked = newState
          handleItemSelection(fileItem, newState)
        } else if (isShiftSelecting) {
          // Shift+点击：范围选择
          checkbox.checked = true
          handleItemSelection(fileItem, true)
        }
      }
    })

    // 移动端长按多选支持
    if ('ontouchstart' in window) {
      let longPressTimer = null
      let startTouch = null

      fileList.addEventListener('touchstart', (e) => {
        const fileItem = e.target.closest('.file-item')
        if (!fileItem || e.target.matches('[data-select-item]')) return

        startTouch = e.touches[0]
        longPressTimer = setTimeout(() => {
          // 长按触发多选模式
          const checkbox = fileItem.querySelector('[data-select-item]')
          if (checkbox) {
            const newState = !checkbox.checked
            checkbox.checked = newState
            handleItemSelection(fileItem, newState)

            // 触觉反馈（如果支持）
            if (navigator.vibrate) {
              navigator.vibrate(50)
            }
          }
        }, 500) // 500ms长按
      })

      fileList.addEventListener('touchmove', (e) => {
        if (longPressTimer && startTouch) {
          const touch = e.touches[0]
          const moveDistance = Math.sqrt(Math.pow(touch.clientX - startTouch.clientX, 2) + Math.pow(touch.clientY - startTouch.clientY, 2))

          // 如果移动距离超过阈值，取消长按
          if (moveDistance > 10) {
            clearTimeout(longPressTimer)
            longPressTimer = null
          }
        }
      })

      fileList.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
        startTouch = null
      })
    }

    // 初始化鼠标划区域选择
    initMouseSelection()

    // 处理批量操作按钮点击
    bulkToolbar.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action
      if (!action) return

      switch (action) {
        case 'bulk-select-all':
          selectAll()
          break
        case 'bulk-invert':
          invertSelection()
          break
        case 'bulk-cut':
          bulkCut()
          break
        case 'bulk-copy':
          bulkCopy()
          break
        case 'bulk-delete':
          bulkDelete()
          break
        case 'bulk-paste-cut':
          bulkPasteCut()
          break
        case 'bulk-paste-copy':
          bulkPasteCopy()
          break
        case 'bulk-compress':
          bulkCompress()
          break
        case 'bulk-cancel':
          clearSelection()
          break
      }
    })
  }

  // 处理文件项选择
  function handleItemSelection(fileItem, isSelected) {
    if (!fileItem) return

    if (isShiftSelecting && lastSelectedItem) {
      const items = Array.from(fileList.querySelectorAll('.file-item'))
      const start = items.indexOf(lastSelectedItem)
      const end = items.indexOf(fileItem)
      const range = items.slice(Math.min(start, end), Math.max(start, end) + 1)

      range.forEach((item) => {
        const checkbox = item.querySelector('[data-select-item]')
        if (checkbox) {
          // 确保checkbox存在
          checkbox.checked = isSelected
          toggleItemSelection(item, isSelected)
        }
      })
    } else {
      toggleItemSelection(fileItem, isSelected)
    }

    lastSelectedItem = fileItem // 无论是选中还是取消，都更新lastSelectedItem
    updateToolbar()
  }

  // 切换文件项选中状态
  function toggleItemSelection(fileItem, isSelected) {
    if (isSelected) {
      selectedItems.add(fileItem.dataset.path)
      fileItem.classList.add('selected')
    } else {
      selectedItems.delete(fileItem.dataset.path)
      fileItem.classList.remove('selected')
    }
  }

  // 更新工具栏状态
  function updateToolbar() {
    const count = selectedItems.size
    if (count > 0) {
      // 设置数字到data-count属性
      if (selectedCountEl) {
        selectedCountEl.setAttribute('data-count', count)
        // 设置完整文本(大屏幕会显示)
        selectedCountEl.innerHTML = `<span>已选择 ${count} 项</span>`
      }
      bulkToolbar.classList.add('show')
    } else {
      bulkToolbar.classList.remove('show')
    }

    // 更新粘贴按钮的显示状态
    updatePasteButtons()
  }

  // 全选功能
  function selectAll() {
    const checkboxes = fileList.querySelectorAll('[data-select-item]')
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true
      // 直接调用toggleItemSelection,因为selectAll不涉及shift选择逻辑
      toggleItemSelection(checkbox.closest('.file-item'), true)
    })
    updateToolbar() // 更新工具栏
  }
  // 反选功能
  function invertSelection() {
    const checkboxes = fileList.querySelectorAll('[data-select-item]')
    checkboxes.forEach((checkbox) => {
      const fileItem = checkbox.closest('.file-item')
      const newState = !checkbox.checked
      checkbox.checked = newState
      // 直接调用toggleItemSelection
      toggleItemSelection(fileItem, newState)
    })
    updateToolbar() // 更新工具栏
  }
  // 清除选择
  function clearSelection() {
    const checkboxes = fileList.querySelectorAll('[data-select-item]')
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false
      const fileItem = checkbox.closest('.file-item')
      if (fileItem) {
        fileItem.classList.remove('selected') // 移除selected类
      }
    })
    window.selectedItems.clear()
    lastSelectedItem = null // 清空lastSelectedItem
    updateToolbar()
  }

  // 将clearSelection暴露为全局函数
  window.clearSelection = clearSelection

  // 批量剪切
  function bulkCut() {
    if (selectedItems.size === 0) return
    const cutItems = Array.from(selectedItems).map((path) => {
      const fileItemEl = fileList.querySelector(`.file-item[data-path=\"${CSS.escape(path)}\"]`)
      const isDir = fileItemEl?.dataset.isDir === 'true'
      const name = fileItemEl?.querySelector('.ms-2')?.textContent
      return { path, is_dir: isDir, name }
    })

    // 获取现有剪贴板数据
    const existingClipboard = JSON.parse(localStorage.getItem('clipboard') || '[]')

    // 添加新的剪切组
    existingClipboard.push({
      action: 'cut',
      items: cutItems,
    })

    localStorage.setItem('clipboard', JSON.stringify(existingClipboard))
    window.showNotification(`已剪切 ${selectedItems.size} 个项目到剪贴板`, 'info')
    clearSelection() // 剪切后清空选中状态
  }

  // 批量复制
  function bulkCopy() {
    if (selectedItems.size === 0) return
    const copyItems = Array.from(selectedItems).map((path) => {
      const fileItemEl = fileList.querySelector(`.file-item[data-path=\"${CSS.escape(path)}\"]`)
      const isDir = fileItemEl?.dataset.isDir === 'true'
      const name = fileItemEl?.querySelector('.ms-2')?.textContent
      return { path, is_dir: isDir, name }
    })

    // 获取现有剪贴板数据
    const existingClipboard = JSON.parse(localStorage.getItem('clipboard') || '[]')

    // 添加新的复制组
    existingClipboard.push({
      action: 'copy',
      items: copyItems,
    })

    localStorage.setItem('clipboard', JSON.stringify(existingClipboard))
    window.showNotification(`已复制 ${selectedItems.size} 个项目到剪贴板`, 'info')
    clearSelection() // 复制后清空选中状态
  }

  // 粘贴剪切的文件
  async function bulkPasteCut() {
    const clipboardArray = JSON.parse(localStorage.getItem('clipboard') || '[]')
    const cutGroups = clipboardArray.filter((group) => group.action === 'cut')

    if (cutGroups.length === 0) {
      window.showNotification('剪贴板中没有剪切的内容', 'warning')
      return
    }

    const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
    const totalItems = cutGroups.reduce((total, group) => total + group.items.length, 0)

    let successCount = 0
    let failedItems = []

    window.confirmDialog(`确定要粘贴剪切的 ${totalItems} 个项目到当前目录吗？`, async () => {
      const toRemove = [] // 记录需要移除的组索引

      for (let groupIndex = 0; groupIndex < clipboardArray.length; groupIndex++) {
        const group = clipboardArray[groupIndex]
        if (group.action === 'cut') {
          for (const item of group.items) {
            const sourcePath = item.path
            const itemName = item.name || sourcePath.split('/').pop()
            const destinationPath = (currentPath === '/' ? '' : currentPath) + '/' + itemName

            try {
              await window.FileOperations.moveItem(sourcePath, destinationPath)
              successCount++
              // 剪切成功，从源位置移除
              const sourceItemEl = fileList.querySelector(`.file-item[data-path=\"${CSS.escape(sourcePath)}\"]`)
              if (sourceItemEl) {
                sourceItemEl.remove()
              }
            } catch (err) {
              failedItems.push({ item: item, error: err.message || '未知错误' })
              console.error(`剪切项目失败: ${sourcePath}`, err)
            }
          }
          // 标记此组为需要移除
          toRemove.push(groupIndex)
        }
      }

      // 从后往前移除剪切的组
      toRemove.reverse().forEach((index) => {
        clipboardArray.splice(index, 1)
      })

      // 更新剪贴板
      if (clipboardArray.length === 0) {
        localStorage.removeItem('clipboard')
      } else {
        localStorage.setItem('clipboard', JSON.stringify(clipboardArray))
      }

      if (successCount > 0) {
        window.showNotification(`成功剪切粘贴 ${successCount} 个项目`, 'success')
      }
      if (failedItems.length > 0) {
        window.showNotification(`部分项目剪切失败: ${failedItems.map((f) => f.item.name).join(', ')}`, 'error')
      }

      // 异步加载最新文件列表
      window.loadFileList(currentPath, false)
    })
  }

  // 粘贴复制的文件
  async function bulkPasteCopy() {
    const clipboardArray = JSON.parse(localStorage.getItem('clipboard') || '[]')
    const copyGroups = clipboardArray.filter((group) => group.action === 'copy')

    if (copyGroups.length === 0) {
      window.showNotification('剪贴板中没有复制的内容', 'warning')
      return
    }

    const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
    const totalItems = copyGroups.reduce((total, group) => total + group.items.length, 0)

    let successCount = 0
    let failedItems = []

    window.confirmDialog(`确定要粘贴复制的 ${totalItems} 个项目到当前目录吗？`, async () => {
      for (const group of copyGroups) {
        if (group.action === 'copy') {
          for (const item of group.items) {
            const sourcePath = item.path
            const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/'
            const itemName = item.name || sourcePath.split('/').pop()
            let destinationPath = (currentPath === '/' ? '' : currentPath) + '/' + itemName

            try {
              // 检查是否复制到同目录，需要重命名
              if (sourceDir === currentPath) {
                const uniqueName = generateUniqueFileName(itemName)
                destinationPath = (currentPath === '/' ? '' : currentPath) + '/' + uniqueName
              }

              await window.FileOperations.copyItem(sourcePath, destinationPath)
              successCount++
            } catch (err) {
              failedItems.push({ item: item, error: err.message || '未知错误' })
              console.error(`复制项目失败: ${sourcePath}`, err)
            }
          }
        }
      }

      if (successCount > 0) {
        window.showNotification(`成功复制粘贴 ${successCount} 个项目`, 'success')
      }
      if (failedItems.length > 0) {
        window.showNotification(`部分项目复制失败: ${failedItems.map((f) => f.item.name).join(', ')}`, 'error')
      }

      // 异步加载最新文件列表
      window.loadFileList(currentPath, false)
      // 复制操作不清空剪贴板，可以多次粘贴
    })
  }

  // 更新批量操作工具栏中的粘贴按钮显示状态
  function updatePasteButtons() {
    const clipboardArray = JSON.parse(localStorage.getItem('clipboard') || '[]')
    const pasteCutButton = bulkToolbar?.querySelector('[data-action="bulk-paste-cut"]')
    const pasteCopyButton = bulkToolbar?.querySelector('[data-action="bulk-paste-copy"]')

    const hasCutItems = clipboardArray.some((group) => group.action === 'cut' && group.items.length > 0)
    const hasCopyItems = clipboardArray.some((group) => group.action === 'copy' && group.items.length > 0)

    if (pasteCutButton) {
      pasteCutButton.style.display = hasCutItems ? 'flex' : 'none'
    }

    if (pasteCopyButton) {
      pasteCopyButton.style.display = hasCopyItems ? 'flex' : 'none'
    }
  }

  // 批量删除功能
  function bulkDelete() {
    if (selectedItems.size === 0) {
      window.showNotification('请先选择要删除的文件或文件夹', 'warning')
      return
    }

    const itemsToDelete = Array.from(selectedItems)
    const itemNames = itemsToDelete.map((path) => {
      const fileItemEl = fileList.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`)
      return fileItemEl?.querySelector('.ms-2')?.textContent || path.split('/').pop()
    })

    window.confirmDialog(
      `确定要删除选中的 ${selectedItems.size} 个项目吗？此操作不可撤销！\n\n包括：\n${itemNames.slice(0, 5).join('\n')}${itemNames.length > 5 ? `\n...还有 ${itemNames.length - 5} 个项目` : ''}`,
      async () => {
        let successCount = 0
        let failedItems = []
        const totalItems = itemsToDelete.length

        // 显示删除进度提示
        window.showNotification(`开始删除 ${totalItems} 个项目...`, 'info', 1000)

        for (let i = 0; i < itemsToDelete.length; i++) {
          const itemPath = itemsToDelete[i]
          const itemName = itemNames[i]

          try {
            // 显示当前删除进度
            if (totalItems > 1) {
              window.showNotification(`正在删除 ${i + 1}/${totalItems}: ${itemName}`, 'info', 1000)
            }

            await window.FileOperations.deleteItem(itemPath)
            successCount++

            // 从DOM中移除对应的文件项
            const fileItemEl = fileList.querySelector(`.file-item[data-path="${CSS.escape(itemPath)}"]`)
            if (fileItemEl) {
              // 添加删除动画
              fileItemEl.style.transition = 'opacity 0.3s ease'
              fileItemEl.style.opacity = '0'
              setTimeout(() => {
                if (fileItemEl.parentNode) {
                  fileItemEl.remove()
                }
              }, 300)
            }
          } catch (err) {
            failedItems.push({ name: itemName, error: err.message || '未知错误' })
            console.error(`删除项目失败: ${itemPath}`, err)
          }
        }

        // 显示最终结果
        if (successCount > 0 && failedItems.length === 0) {
          window.showNotification(`成功删除 ${successCount} 个项目`, 'success')
        } else if (successCount > 0 && failedItems.length > 0) {
          window.showNotification(`成功删除 ${successCount} 个项目，${failedItems.length} 个失败`, 'warning')
          console.error('删除失败的项目:', failedItems)
        } else {
          window.showNotification(`删除失败: ${failedItems.map((f) => f.name).join(', ')}`, 'error')
        }

        // 清空选择状态
        clearSelection()
      }
    )
  }

  // 批量压缩功能
  function bulkCompress() {
    if (window.selectedItems.size === 0) {
      window.showNotification('请先选择要压缩的文件或文件夹', 'warning')
      return
    }

    const itemPaths = Array.from(window.selectedItems)
    const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'

    // 生成默认压缩包名称
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const defaultArchiveName = itemPaths.length === 1 ? itemPaths[0].split('/').pop() : `批量压缩_${timestamp}`

    const modalHtml = `
    <div class="modal fade" id="bulkCompressModal" tabindex="-1" aria-labelledby="bulkCompressModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="bulkCompressModalLabel">批量压缩 (${itemPaths.length} 项)</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="bulkArchiveName" class="form-label">压缩包名称</label>
              <input type="text" class="form-control" id="bulkArchiveName" value="${escapeHtml(defaultArchiveName)}" placeholder="输入压缩包名称">
              <div class="form-text">将自动添加 .tarz 扩展名</div>
            </div>
            <div class="mb-3">
              <label class="form-label">选择压缩方式</label>
              <div class="list-group">
                <button type="button" class="list-group-item list-group-item-action bulk-compress-option" data-action="compress-keep">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">压缩并保留原文件</h6>
                    <small><i class="bi bi-file-earmark-zip"></i></small>
                  </div>
                  <p class="mb-1">创建压缩包，保留原始文件</p>
                </button>
                <button type="button" class="list-group-item list-group-item-action bulk-compress-option" data-action="compress-delete">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">压缩并删除原文件</h6>
                    <small><i class="bi bi-file-earmark-zip text-warning"></i></small>
                  </div>
                  <p class="mb-1">创建压缩包，删除原始文件</p>
                </button>
                <button type="button" class="list-group-item list-group-item-action bulk-compress-option" data-action="compress-download-keep">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">压缩下载并保留原文件</h6>
                    <small><i class="bi bi-download text-primary"></i></small>
                  </div>
                  <p class="mb-1">压缩后立即下载，保留原文件和压缩包</p>
                </button>
                <button type="button" class="list-group-item list-group-item-action bulk-compress-option" data-action="compress-download-delete">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">压缩下载后删除原文件</h6>
                    <small><i class="bi bi-download text-danger"></i></small>
                  </div>
                  <p class="mb-1">压缩下载后删除原文件，保留压缩包</p>
                </button>
              </div>
            </div>
            <div class="alert alert-info">
              <small>
                <i class="bi bi-info-circle me-1"></i>
                将所选文件合并压缩到一个压缩包中
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

    // 插入并显示模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml)
    const modalEl = document.getElementById('bulkCompressModal')
    const modal = new bootstrap.Modal(modalEl)
    modal.show()

    // 绑定压缩选项点击事件
    modalEl.addEventListener('click', async (e) => {
      const option = e.target.closest('.bulk-compress-option')
      if (!option) return

      const action = option.dataset.action
      const archiveNameInput = modalEl.querySelector('#bulkArchiveName')
      const archiveName = archiveNameInput.value.trim()

      if (!archiveName) {
        window.showNotification('请输入压缩包名称', 'warning')
        return
      }

      modal.hide()

      try {
        await performBulkCompress(itemPaths, archiveName, currentPath, action)
        clearSelection()
      } catch (error) {
        console.error('批量压缩操作失败:', error)
      }
    })

    // 模态框关闭后移除
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove())
  }

  // 执行批量压缩
  async function performBulkCompress(itemPaths, archiveName, currentPath, action) {
    const deleteOriginal = action.includes('delete')
    const downloadAfter = action.includes('download')

    window.showNotification(`开始批量压缩 ${itemPaths.length} 个项目...`, 'info', 2000)

    try {
      if (downloadAfter) {
        // 压缩并下载
        await window.CompressExtractAPI.compressBatchAndDownload(itemPaths, archiveName, deleteOriginal, true)
      } else {
        // 仅压缩
        // 确保压缩包名称已经包含.tarz扩展名，避免服务器端重复添加
        const safeArchiveName = archiveName.endsWith('.tarz') ? archiveName : `${archiveName}.tarz`
        const targetPath = `${currentPath}/${safeArchiveName}`.replace(/\/+/g, '/')
        const result = await window.CompressExtractAPI.compressBatch(itemPaths, targetPath)

        if (!result.data || !result.data.compressedPath) {
          throw new Error('压缩失败，未获得压缩包路径')
        }

        // 如果需要删除原文件
        if (deleteOriginal) {
          for (const itemPath of itemPaths) {
            await window.FileOperations.deleteItem(itemPath)
            // 从DOM中移除对应的文件项
            const fileItemEl = document.querySelector(`.file-item[data-path="${CSS.escape(itemPath)}"]`)
            if (fileItemEl) {
              fileItemEl.remove()
            }
          }
        }

        window.showNotification(`批量压缩成功: ${itemPaths.length} 个项目合并为一个压缩包`, 'success')
      }

      // 刷新文件列表
      if (!downloadAfter) {
        window.loadFileList(currentPath, false)
      }
    } catch (error) {
      console.error('批量压缩失败:', error)
      window.showNotification(`批量压缩失败: ${error.message || '未知错误'}`, 'error')
    }
  }

  // 初始化鼠标划区域选择功能
  function initMouseSelection() {
    if (!fileList) return

    // 检测是否为移动设备
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0

    if (isMobile) {
      // 移动端使用触摸事件
      fileList.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length !== 1) return
          if (e.target.closest('.file-item')) return
          if (e.target.matches('[data-select-item]')) return

          e.preventDefault()
          const touch = e.touches[0]
          startMouseSelection({
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => e.preventDefault(),
          })
        },
        { passive: false }
      )

      document.addEventListener(
        'touchmove',
        (e) => {
          if (isMouseSelecting && e.touches.length === 1) {
            e.preventDefault()
            const touch = e.touches[0]
            updateMouseSelection({
              clientX: touch.clientX,
              clientY: touch.clientY,
            })
          }
        },
        { passive: false }
      )

      document.addEventListener('touchend', (e) => {
        if (isMouseSelecting) {
          endMouseSelection({})
        }
      })
    } else {
      // 桌面端使用鼠标事件
      fileList.addEventListener('mousedown', (e) => {
        // 只处理左键点击
        if (e.button !== 0) return

        const isClickOnFileItem = e.target.closest('.file-item') !== null
        if (isClickOnFileItem) {
          if (e.target.matches('[data-select-item]')) {
          } else {
            return
          }
        }

        e.preventDefault()
        startMouseSelection(e)
      })

      // 监听鼠标移动事件
      document.addEventListener('mousemove', (e) => {
        if (isMouseSelecting) {
          updateMouseSelection(e)
        }
      })

      // 监听鼠标松开事件
      document.addEventListener('mouseup', (e) => {
        if (isMouseSelecting) {
          endMouseSelection(e)
        }
      })
    }
  }

  // 开始鼠标选择
  function startMouseSelection(e) {
    isMouseSelecting = true

    const rect = fileList.getBoundingClientRect()
    startX = e.clientX - rect.left
    startY = e.clientY - rect.top

    // 创建选择框
    selectionBox = document.createElement('div')
    selectionBox.className = 'selection-box'
    selectionBox.style.cssText = `
      position: absolute;
      border: 1px dashed #007bff;
      background-color: rgba(0, 123, 255, 0.1);
      pointer-events: none;
      z-index: 1000;
      left: ${startX}px;
      top: ${startY}px;
      width: 0;
      height: 0;
    `

    // 确保文件列表容器有相对定位
    if (getComputedStyle(fileList).position === 'static') {
      fileList.style.position = 'relative'
    }

    fileList.appendChild(selectionBox)

    // 如果按住Shift或Ctrl/Cmd键，保留之前的选择
    isCtrlSelecting = e.ctrlKey || e.metaKey || e.shiftKey

    // 如果没有按住Ctrl/Shift，清除之前的选择
    if (!isCtrlSelecting) {
      clearSelection()
    }
  }

  // 更新鼠标选择
  function updateMouseSelection(e) {
    if (!selectionBox || !isMouseSelecting) return

    const rect = fileList.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    const left = Math.min(startX, currentX)
    const top = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)

    selectionBox.style.left = `${left}px`
    selectionBox.style.top = `${top}px`
    selectionBox.style.width = `${width}px`
    selectionBox.style.height = `${height}px`

    // 检测与文件项的相交
    highlightIntersectingItems(left, top, width, height)
  }

  // 结束鼠标选择
  function endMouseSelection(e) {
    if (!isMouseSelecting) return

    isMouseSelecting = false

    if (selectionBox) {
      // 获取最终选择的项目
      const rect = selectionBox.getBoundingClientRect()
      const fileListRect = fileList.getBoundingClientRect()

      const left = rect.left - fileListRect.left
      const top = rect.top - fileListRect.top
      const width = rect.width
      const height = rect.height

      selectIntersectingItems(left, top, width, height)

      // 移除选择框
      selectionBox.remove()
      selectionBox = null
    }

    updateToolbar()
  }

  // 高亮相交的项目（预览效果）
  function highlightIntersectingItems(left, top, width, height) {
    const fileItems = fileList.querySelectorAll('.file-item')

    fileItems.forEach((item) => {
      // 检查元素是否可见（如果被搜索过滤掉了或其他原因导致不可见）
      if (item.offsetParent === null) return

      const itemRect = item.getBoundingClientRect()
      const fileListRect = fileList.getBoundingClientRect()

      const itemLeft = itemRect.left - fileListRect.left
      const itemTop = itemRect.top - fileListRect.top
      const itemWidth = itemRect.width
      const itemHeight = itemRect.height

      // 检测矩形相交 - 无论是列表视图还是网格视图都应该适用
      const isIntersecting = !(left > itemLeft + itemWidth || left + width < itemLeft || top > itemTop + itemHeight || top + height < itemTop)

      if (isIntersecting) {
        item.classList.add('selecting')
      } else {
        item.classList.remove('selecting')
      }
    })
  }

  // 选择相交的项目
  function selectIntersectingItems(left, top, width, height) {
    const fileItems = fileList.querySelectorAll('.file-item')

    // 存储所有相交的项目
    const intersectingItems = []

    fileItems.forEach((item) => {
      // 检查元素是否可见
      if (item.offsetParent === null) return

      const itemRect = item.getBoundingClientRect()
      const fileListRect = fileList.getBoundingClientRect()

      const itemLeft = itemRect.left - fileListRect.left
      const itemTop = itemRect.top - fileListRect.top
      const itemWidth = itemRect.width
      const itemHeight = itemRect.height

      // 检测矩形相交 - 适用于所有视图模式
      const isIntersecting = !(left > itemLeft + itemWidth || left + width < itemLeft || top > itemTop + itemHeight || top + height < itemTop)

      if (isIntersecting) {
        intersectingItems.push(item)
      }

      // 移除预览样式
      item.classList.remove('selecting')
    })

    // 如果找到相交的项目，选中它们
    if (intersectingItems.length > 0) {
      intersectingItems.forEach((item) => {
        const checkbox = item.querySelector('[data-select-item]')
        if (checkbox) {
          checkbox.checked = true
          toggleItemSelection(item, true)
        }
      })
    }
  }

  /**
   * 检查当前焦点是否在输入元素上
   * @returns {boolean} 如果焦点在输入元素上返回true
   */
  function isInputFocused() {
    const activeElement = document.activeElement

    if (!activeElement) return false

    // 检查常见的输入元素
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT']
    if (inputTags.includes(activeElement.tagName)) {
      return true
    }

    // 检查contenteditable元素
    if (activeElement.contentEditable === 'true') {
      return true
    }

    // 检查特定的输入框ID
    const inputIds = [
      'pathInput', // 面包屑路径编辑
      'fileEditorContent', // 文件编辑器
      'username', // 登录用户名
      'password', // 登录密码
      'currentPassword', // 设置页面密码
      'newPassword', // 设置页面新密码
      'siteName', // 系统设置
      'baseURL', // 系统设置
    ]

    if (inputIds.includes(activeElement.id)) {
      return true
    }

    // 检查是否在模态框的输入元素中
    const modal = activeElement.closest('.modal')
    if (modal && modal.classList.contains('show')) {
      const inputElements = modal.querySelectorAll('input, textarea, select, [contenteditable="true"]')
      for (const input of inputElements) {
        if (input === activeElement) {
          return true
        }
      }
    }

    return false
  }

  // 初始化功能
  initMultiSelect()
  updatePasteButtons() // 初始化时更新粘贴按钮状态

  // 添加一个全局调试函数
  window.debugBulkActions = function () {
    console.log('DEBUG: bulkActions', {
      fileList: !!fileList,
      bulkToolbar: !!bulkToolbar,
      selectedCountEl: !!selectedCountEl,
      selectedItems: Array.from(selectedItems),
      selectedItemsSize: selectedItems.size,
    })
  }

  /**
   * 生成唯一的文件名，避免同名冲突
   * @param {string} originalName - 原始文件名
   * @returns {string} - 唯一的文件名
   */
  function generateUniqueFileName(originalName) {
    if (!fileList) return originalName

    // 获取当前目录下所有文件名
    const existingNames = new Set()
    const fileItems = fileList.querySelectorAll('.file-item')
    fileItems.forEach((item) => {
      const nameElement = item.querySelector('.ms-2')
      if (nameElement) {
        existingNames.add(nameElement.textContent.trim())
      }
    })

    // 解析文件名和扩展名
    const lastDotIndex = originalName.lastIndexOf('.')
    let baseName, extension

    if (lastDotIndex > 0 && lastDotIndex < originalName.length - 1) {
      // 有扩展名的文件
      baseName = originalName.substring(0, lastDotIndex)
      extension = originalName.substring(lastDotIndex)
    } else {
      // 没有扩展名的文件或文件夹
      baseName = originalName
      extension = ''
    }

    // 生成唯一名称
    let counter = 1
    let newName = `${baseName} - 副本${extension}`

    // 如果已存在，则继续递增数字
    while (existingNames.has(newName)) {
      counter++
      newName = `${baseName} - 副本${counter}${extension}`
    }

    return newName
  }
})

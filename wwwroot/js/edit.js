/**
 * 在线文件编辑功能
 * 依赖：api.js, public.js (用于showNotification), personalSettingsForm.js (用于获取在线编辑大小限制), fileUtility.js (用于文件读写)
 */

;(function () {
  // Declare variables at a higher scope within the IIFE
  let fileEditorModal = null // Bootstrap Modal instance
  let currentEditFilePathEl = null // DOM element for file path display
  let fileEditorContentEl = null // DOM element for textarea
  let saveFileContentBtn = null // DOM element for save button
  let editorFileSizeEl = null // DOM element for file size display
  let editorFileTypeEl = null // DOM element for file type display

  let currentEditingPath = ''
  let originalFileContent = '' // 用于判断文件内容是否更改

  // 辅助函数：文件大小格式化 (从 filelist.js 复制，避免重复代码)
  function formatSize(size) {
    if (size == null) return ''
    if (size < 1024) return size + ' B'
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KiB'
    if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MiB'
    return (size / 1024 / 1024 / 1024).toFixed(2) + ' GiB'
  }

  // 辅助函数：获取文件扩展名（使用FileUtility可以替代此函数，但保留以保持代码兼容性）
  function getFileExtensionOrFullName(filename) {
    return filename.split('.').pop().toLowerCase()
  }

  // 辅助函数：判断是否为可编辑的文本文件
  function isEditableTextFile(filename) {
    const editableExtensions = [
      'txt',
      'md',
      'log',
      'ini',
      'conf',
      'json',
      'js',
      'ts',
      'html',
      'shtml',
      'htm',
      'shtm',
      'php',
      'mpy',
      'css',
      'py',
      'go',
      'rs',
      'c',
      'cpp',
      'h',
      'java',
      'sh',
      'xml',
      'yml',
      'yaml',
      'env',
      'dockerfile',
      'caddyfile',
      'csv',
      'tsv',
      'sql',
      'toml',
      'cmd',
      'bat',
      'reg',
      'jsx',
      'tsx',
      'vue',
      'jsonc',
      'webmanifest',
      'svg',
      'cfg',
      'props',
      'properties',
      'rst',
      'adoc',
      'textile',
      'kt',
      'kts',
      'swift',
      'groovy',
      'scala',
      'rb',
      'pl',
      'pm',
      'ps1',
      'psm1',
      'psd1',
      'asm',
      's',
      'tex',
      'vbs',
      'vb',
      'cs',
      'fs',
      'fsi',
      'ml',
      'mli',
      'jl',
      'ex',
      'exs',
      'jsonl',
      'nfo',
      'diz',
    ]
    const ext = getFileExtensionOrFullName(filename)
    return editableExtensions.includes(ext)
  }

  /**
   * 打开文件编辑器模态框
   * @param {string} filePath - 要编辑的文件路径
   * @param {number} fileSize - 文件大小 (Bytes)
   */
  async function openFileEditor(filePath, fileSize) {
    // Ensure modal elements are initialized before trying to use them
    if (!fileEditorModal) {
      console.error('File editor modal elements were not found on DOMContentLoaded. Cannot open editor.')
      window.showNotification('文件编辑器未准备好，请稍后再试。', 'error')
      return
    }

    const config = window.NascoreConfig.get()
    const onlineEditMaxSizeKB = config.onlineEditFileSizeLimit || 500 // 默认 500KB

    // 检查文件大小是否超出限制
    if (fileSize > onlineEditMaxSizeKB * 1024) {
      window.showNotification(`文件过大，无法在线编辑 (最大 ${onlineEditMaxSizeKB}KB)`, 'warning')
      return
    }

    currentEditingPath = filePath
    currentEditFilePathEl.textContent = filePath

    // 显示文件大小和类型
    editorFileSizeEl.textContent = formatSize(fileSize)
    editorFileTypeEl.textContent = getFileExtensionOrFullName(filePath).toUpperCase() + ' 文件'

    try {
      // 使用FileUtility从后端读取文件内容
      const result = await window.FileUtility.getFileContent(filePath, true)

      if (result.success && result.content) {
        originalFileContent = result.content
        fileEditorContentEl.value = originalFileContent
        fileEditorModal.show()
      } else {
        window.showNotification(result.message || '获取文件内容失败或内容为空', 'error')
      }
    } catch (err) {
      window.showNotification(`读取文件失败: ${err.message || '未知错误'}`, 'error')
      console.error('读取文件内容时发生错误:', err)
    }
  }

  /**
   * 保存文件内容
   */
  async function saveFileContent() {
    const newContent = fileEditorContentEl.value

    if (newContent === originalFileContent) {
      window.showNotification('文件内容未更改，无需保存', 'info')
      fileEditorModal.hide()
      return
    }

    try {
      // 使用FileUtility保存文件内容
      const result = await window.FileUtility.saveFileContent(currentEditingPath, newContent)

      if (result.success) {
        window.showNotification(result.message, 'success')
        originalFileContent = newContent // 更新原始内容
        fileEditorModal.hide()
      } else {
        window.showNotification(result.message || '保存文件失败', 'error')
      }
    } catch (err) {
      window.showNotification(`保存文件失败: ${err.message || '未知错误'}`, 'error')
      console.error('保存文件内容时发生错误:', err)
    }
  }

  // Wrap DOM-dependent initialization in DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    const fileEditorModalEl = document.getElementById('fileEditorModal')
    if (!fileEditorModalEl) {
      console.error('File editor modal element not found. Editing functionality will be limited.')
      // No return here, so global functions are still exposed, just modal won't work.
      return
    }

    // Assign to previously declared 'let' variables
    fileEditorModal = new bootstrap.Modal(fileEditorModalEl)
    currentEditFilePathEl = document.getElementById('currentEditFilePath')
    fileEditorContentEl = document.getElementById('fileEditorContent')
    saveFileContentBtn = document.getElementById('saveFileContentBtn')
    editorFileSizeEl = document.getElementById('editorFileSize')
    editorFileTypeEl = document.getElementById('editorFileType')

    // 绑定保存按钮事件
    saveFileContentBtn.addEventListener('click', saveFileContent)

    /**
     * 实现模态框拖动功能
     */
    const modalDialog = fileEditorModalEl.querySelector('.modal-dialog')
    const modalHeader = fileEditorModalEl.querySelector('.modal-header')

    let isDragging = false
    let offsetX, offsetY

    modalHeader.addEventListener('mousedown', (e) => {
      isDragging = true
      const rect = modalDialog.getBoundingClientRect()
      offsetX = e.clientX - rect.left
      offsetY = e.clientY - rect.top

      // 优化拖动体验，防止文本选择
      modalHeader.style.cursor = 'grabbing'
      modalDialog.style.userSelect = 'none'
      modalDialog.style.pointerEvents = 'none' // 避免拖动时选中模态框内部元素
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return

      modalDialog.style.position = 'absolute' // 确保可以定位
      modalDialog.style.left = `${e.clientX - offsetX}px`
      modalDialog.style.top = `${e.clientY - offsetY}px`
    })

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false
        modalHeader.style.cursor = 'grab'
        modalDialog.style.userSelect = 'auto'
        modalDialog.style.pointerEvents = 'auto'
      }
    })

    /**
     * 实现模态框调整大小功能 (简易版)
     */
    const resizableHandles = fileEditorModalEl.querySelectorAll('.resizable-handle')
    let isResizing = false
    let currentHandle = null
    let startX, startY, startWidth, startHeight, startLeft, startTop

    resizableHandles.forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        isResizing = true
        currentHandle = handle
        startX = e.clientX
        startY = e.clientY

        const dialogRect = modalDialog.getBoundingClientRect()
        startWidth = dialogRect.width
        startHeight = dialogRect.height
        startLeft = dialogRect.left
        startTop = dialogRect.top

        // 临时设置模态框为固定定位，并设置其当前的left/top，避免在调整大小过程中因margin或居中导致位置跳动
        modalDialog.style.position = 'fixed'
        modalDialog.style.left = `${startLeft}px`
        modalDialog.style.top = `${startTop}px`
        modalDialog.style.margin = '0' // 移除居中margin

        // 防止文本选择
        modalDialog.style.userSelect = 'none'
        modalDialog.style.pointerEvents = 'none'
      })
    })

    document.addEventListener('mousemove', (e) => {
      if (!isResizing || !currentHandle) return

      const dx = e.clientX - startX
      const dy = e.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight
      let newLeft = startLeft
      let newTop = startTop

      if (currentHandle.classList.contains('resizable-handle-se')) {
        newWidth = Math.max(startWidth + dx, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-width')) || 300)
        newHeight = Math.max(startHeight + dy, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-height')) || 200)
      } else if (currentHandle.classList.contains('resizable-handle-sw')) {
        newWidth = Math.max(startWidth - dx, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-width')) || 300)
        newHeight = Math.max(startHeight + dy, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-height')) || 200)
        newLeft = startLeft + dx
      } else if (currentHandle.classList.contains('resizable-handle-ne')) {
        newWidth = Math.max(startWidth + dx, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-width')) || 300)
        newHeight = Math.max(startHeight - dy, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-height')) || 200)
        newTop = startTop + dy
      } else if (currentHandle.classList.contains('resizable-handle-nw')) {
        newWidth = Math.max(startWidth - dx, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-width')) || 300)
        newHeight = Math.max(startHeight - dy, parseFloat(getComputedStyle(modalDialog).getPropertyValue('--min-height')) || 200)
        newLeft = startLeft + dx
        newTop = startTop + dy
      }

      modalDialog.style.width = `${newWidth}px`
      modalDialog.style.height = `${newHeight}px`
      modalDialog.style.left = `${newLeft}px`
      modalDialog.style.top = `${newTop}px`

      // 更新textarea的高度
      fileEditorContentEl.style.height = `calc(${newHeight}px - ${modalHeader.offsetHeight}px - ${fileEditorModalEl.querySelector('.modal-footer').offsetHeight}px - ${fileEditorModalEl.querySelector('.editor-info-bar').offsetHeight}px)`
    })

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false
        currentHandle = null
        modalDialog.style.userSelect = 'auto'
        modalDialog.style.pointerEvents = 'auto'

        // 调整大小结束后，恢复到居中定位（通过移除fixed定位和设置margin:auto）
        // 这里需要延迟一下，确保样式更新完成
        setTimeout(() => {
          modalDialog.style.position = '' // 恢复默认定位（modal-dialog会处理居中）
          modalDialog.style.left = ''
          modalDialog.style.top = ''
          modalDialog.style.margin = '' // 恢复默认margin（modal-dialog会通过 margin: auto 居中）
          fileEditorContentEl.style.height = '' // 恢复flex布局自动计算高度
        }, 0)
      }
    })
  })

  // 将 openFileEditor 函数暴露给全局 (或其他需要调用的模块)
  window.openFileEditor = openFileEditor
  window.isEditableTextFile = isEditableTextFile // 也将判断函数暴露，供 filelist.js 使用
})()

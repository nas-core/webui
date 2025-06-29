/**
 * 弹出文件详情模态框
 * @param {HTMLElement} fileItem - 对应的文件项 DOM 元素
 */
function showFileDetailModal(fileItem) {
  // 获取文件名 - 兼容图片预览和图标两种情况
  let name = ''
  const nameEl = fileItem.querySelector('.ms-2')
  if (nameEl) {
    name = nameEl.textContent
  } else {
    // 可能是通过文件预览图片点击的，尝试获取alt属性
    const imgEl = fileItem.querySelector('.file-image-preview')
    if (imgEl && imgEl.alt) {
      name = imgEl.alt
    }
  }

  // 获取图标类 - 兼容图片预览和图标两种情况
  let iconClass = ''
  const iconEl = fileItem.querySelector('.file-icon')
  if (iconEl) {
    iconClass = iconEl.className
  } else {
    // 使用默认文件图标
    const ext = name.split('.').pop().toLowerCase()
    const fileIconClass = window.getFileIcon ? window.getFileIcon(name) : 'bi-file-earmark-fill text-secondary'
    iconClass = `bi ${fileIconClass} file-icon`
  }

  const path = fileItem.dataset.path
  const isDir = fileItem.dataset.isDir === 'true'
  const fileSize = parseInt(fileItem.dataset.fileSize, 10) // 获取文件大小

  const config = window.NascoreConfig.get()
  const onlineEditMaxSizeKB = config.onlineEditFileSizeLimit || 512

  const canEdit = !isDir && window.isEditableTextFile && window.isEditableTextFile(name) && fileSize <= onlineEditMaxSizeKB * 1024

  const ext = name.split('.').pop().toLowerCase()
  // 预览支持的类型
  const isPreviewableMedia =
    !isDir &&
    (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || // 图片
      ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'm3u8'].includes(ext) || // 视频
      ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) // 音频

  const editButtonHtml = canEdit ? `<button class="btn btn-info me-2" id="editFileBtn"><i class="bi bi-pencil me-1"></i>编辑</button>` : ''
  const previewButtonHtml = isPreviewableMedia
    ? `<button class="btn btn-primary me-2" id="previewFileBtn"><i class="bi bi-play-circle me-1"></i>预览</button>`
    : ''

  // 构造模态框内容
  // 检查是否是图片文件
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)

  // 获取用户图片预览设置
  const useOnlyThumbnails = config.useOnlyThumbnails || false
  const imageSizeLimit = (config.imagePreviewSizeLimit || 1024) * 1024 // 转换为字节
  const systemMaxSize = config.WebuiImageDirectlyMaxSize || 1024 * 1024 * 2 // 系统默认2MB

  // 确定实际使用的大小限制
  const maxImageSize = useOnlyThumbnails ? 0 : Math.min(imageSizeLimit, systemMaxSize)

  // 图片预览HTML
  let previewHtml = `<i class="${iconClass}" style="font-size:5rem"></i>`

  // 图片预览处理
  if (isImage && fileSize > 0) {
    const accessToken = window.API.TokenManager.getAccessToken() // 获取 access token

    // 判断是否需要使用缩略图
    if (useOnlyThumbnails) {
      // 构建缩略图路径 (.nascoreThumbnail/Thumbnail.文件名)
      const dirPath = path.substring(0, path.lastIndexOf('/') + 1)
      const thumbnailPath = `${dirPath}.nascoreThumbnail/Thumbnail.${name}`
      const thumbnailFileName = `Thumbnail.${name}`

      // 检查缩略图目录缓存
      if (
        window.thumbnailDirectoryCache &&
        window.thumbnailDirectoryCache.exists &&
        window.thumbnailDirectoryCache.path === dirPath + '.nascoreThumbnail' &&
        window.thumbnailDirectoryCache.files[thumbnailFileName]
      ) {
        // 缩略图存在于缓存中，直接使用
        const thumbnailUrl = `{{.ServerUrl}}/@api/file/download?path=${encodeURIComponent(thumbnailPath)}&token=${accessToken}`
        previewHtml = `<img src="${thumbnailUrl}" class="img-fluid mb-3" style="max-height:300px; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2);" alt="${escapeHtml(name)}">`
      } else {
        // 尝试检查缩略图是否存在
        const thumbnailUrl = `{{.ServerUrl}}/@api/file/download?path=${encodeURIComponent(thumbnailPath)}&token=${accessToken}`

        // 创建图像元素进行预加载，检查缩略图是否存在
        const thumbnailImg = new Image()
        thumbnailImg.onload = function () {
          // 缩略图存在，替换预览图
          const modalImg = document.querySelector('#fileDetailModal img.img-fluid')
          if (modalImg) {
            modalImg.src = thumbnailUrl
          }
        }
        thumbnailImg.src = thumbnailUrl
      }
    }
    // 如果不使用缩略图，且文件大小在限制范围内，则直接显示原图
    else if (fileSize <= maxImageSize) {
      const imageUrl = `{{.ServerUrl}}/@api/file/download?path=${encodeURIComponent(path)}&token=${accessToken}`
      previewHtml = `<img src="${imageUrl}" class="img-fluid mb-3" style="max-height:300px; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2);" alt="${escapeHtml(name)}">`
    }
  }

  const modalHtml = `
    <div class="modal fade" id="fileDetailModal" tabindex="-1" aria-labelledby="fileDetailModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header draggable">
            <h5 class="modal-title" id="fileDetailModalLabel">${escapeHtml(name)}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body text-center">
            ${previewHtml}
            <input type="text" class="form-control text-center fileDetailModal-filepath-input" value="${escapeHtml(path)}" readonly>
            <div class="mb-2">大小: ${formatSize(fileSize)}</div>
            <div class="d-flex justify-content-center gap-2 flex-wrap">
              ${editButtonHtml}
              ${previewButtonHtml}
              <button class="btn btn-primary" id="downloadFileBtn" ${isDir ? 'disabled' : ''}>下载</button>
              <button class="btn btn-secondary" id="renameFileBtn">重命名</button>
              <button class="btn btn-danger" id="deleteFileBtn">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  // 插入并显示
  document.body.insertAdjacentHTML('beforeend', modalHtml)
  const modalEl = document.getElementById('fileDetailModal')

  // 设置文件路径和文件名属性，供预览功能使用
  modalEl.setAttribute('data-file-path', path)
  modalEl.setAttribute('data-file-name', name)

  const modal = new bootstrap.Modal(modalEl)
  modal.show()

  // 初始化拖拽功能
  initDraggableModal(modalEl)

  // 绑定事件
  modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove()) // 模态框关闭后从DOM中移除

  // 编辑按钮
  const editBtn = modalEl.querySelector('#editFileBtn')
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      modal.hide() // 关闭详情模态框
      window.openFileEditor(path, fileSize) // 打开文件编辑器
    })
  } else {
    //console.log('DEBUG: 详情模态框中没有编辑按钮。')
  }

  // 预览按钮
  const previewBtn = modalEl.querySelector('#previewFileBtn')
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      modal.hide() // 关闭详情模态框

      // 检查是否已加载预览功能
      if (typeof window.openFilePreview === 'function') {
        window.openFilePreview(path, name)
      } else {
        // 先检查是否已加载FileUtility
        const needLoadFileUtility = typeof window.FileUtility === 'undefined'

        // 动态加载依赖组件
        const loadDependencies = []

        // 加载CSS
        if (!document.querySelector('link[href*="file_preview.css"]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = '/css/file_preview.css'
          document.head.appendChild(link)
        }

        // 加载FileUtility工具（如果需要）
        if (needLoadFileUtility) {
          loadDependencies.push(
            new Promise((resolve) => {
              const script = document.createElement('script')
              script.src = '/js/fileUtility.js'
              script.onload = resolve
              document.head.appendChild(script)
            })
          )
        }

        // 我们已经在 nascore.shtml 和 preview.shtml 中静态加载了 HLS.js 和 ArtPlayer
        // 不需要再动态加载这些库

        // 加载预览JS
        loadDependencies.push(
          new Promise((resolve) => {
            const script = document.createElement('script')
            script.src = '/js/filePreview.js'
            script.onload = resolve
            document.head.appendChild(script)
          })
        )

        // 等待所有资源加载完成后打开预览
        Promise.all(loadDependencies)
          .then(() => {
            if (typeof window.openFilePreview === 'function') {
              setTimeout(() => window.openFilePreview(path, name), 300)
            } else {
              window.showNotification('无法加载预览功能', 'error')
            }
          })
          .catch(() => {
            window.showNotification('加载预览组件失败', 'error')
          })
      }
    })
  }

  // 下载按钮
  const downloadBtn = modalEl.querySelector('#downloadFileBtn')
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!isDir) {
        const accessToken = window.API.TokenManager.getAccessToken() // 获取 access token
        if (accessToken) {
          window.location.href = `{{.ServerUrl}}/@api/file/download?path=${encodeURIComponent(path)}&token=${accessToken}` // 附加 token
          window.showNotification(`正在下载 "${name}"`, 'info')
          modal.hide()
        } else {
          window.showNotification('未找到认证信息，无法下载。请重新登录。', 'error')
          modal.hide()
        }
      } else {
        window.showNotification('暂不支持下载文件夹', 'warning')
      }
    })
  }

  // 重命名按钮
  const renameBtn = modalEl.querySelector('#renameFileBtn')
  if (renameBtn) {
    renameBtn.addEventListener('click', async () => {
      const newName = prompt(`请输入 "${name}" 的新名称:`, name)
      if (newName && newName.trim() !== '' && newName !== name) {
        try {
          const currentDir = path.substring(0, path.lastIndexOf('/')) || '/'
          const newPath = (currentDir === '/' ? currentDir : currentDir + '/') + newName
          await window.FileOperations.moveItem(path, newPath)
          window.showNotification(`"${name}" 已成功重命名为 "${newName}"`, 'success')
          modal.hide()

          // 使用FileOperations更新图片预览
          if (window.FileOperations.updateImagePreviewAfterMove) {
            window.FileOperations.updateImagePreviewAfterMove(path, newPath)
          }

          // 局部更新DOM，而不是刷新页面
          fileItem.dataset.path = newPath // 更新data-path属性

          // 检查是否存在显示名称的元素并更新
          const nameSpan = fileItem.querySelector('.ms-2')
          if (nameSpan) {
            nameSpan.textContent = newName // 更新显示名称
          }

          // 检查是否是图片预览
          const imgPreview = fileItem.querySelector('.file-image-preview')
          if (imgPreview) {
            // 更新图片预览的alt属性
            imgPreview.alt = newName

            // 更新图片预览的src (需要更新为新路径)
            const accessToken = window.API.TokenManager.getAccessToken()
            if (accessToken) {
              imgPreview.src = `{{.ServerUrl}}/@api/file/download?path=${encodeURIComponent(newPath)}&token=${accessToken}`
            }
          } else {
            // 同时更新图标，以防文件类型改变
            const iconElement = fileItem.querySelector('.file-icon')
            if (iconElement) {
              const newIconClass = window.getFileIcon ? window.getFileIcon(newName) : 'bi-file-earmark-fill text-secondary'
              // 移除旧的图标类，添加新的图标类，但保留已有的颜色类和file-icon类
              iconElement.className = `bi ${newIconClass} file-icon`
            }
          }
        } catch (err) {
          window.showNotification(`重命名失败: ${err.message || '未知错误'}`, 'error')
        }
      } else if (newName === name) {
        window.showNotification('新名称与原名称相同，无需重命名', 'info')
      }
    })
  }

  // 删除按钮
  const deleteBtn = modalEl.querySelector('#deleteFileBtn')
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      window.confirmDialog(`确定要删除 "${name}" 吗？此操作不可撤销！`, async () => {
        try {
          await window.FileOperations.deleteItem(path)
          window.showNotification(`"${name}" 删除成功！`, 'success')
          modal.hide()

          // 从DOM中移除对应的文件项
          // 使用更可靠的选择器，确保找到正确的元素即使DOM结构有变化
          const deletedFileItem = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`)
          if (deletedFileItem) {
            deletedFileItem.remove()
          }
        } catch (err) {
          window.showNotification(`删除失败: ${err.message || '未知错误'}`, 'error')
        }
      })
    })
  }
}

// 初始化模态框拖拽功能
function initDraggableModal(modalEl) {
  const modalHeader = modalEl.querySelector('.modal-header.draggable')
  const modalDialog = modalEl.querySelector('.modal-dialog')

  if (!modalHeader || !modalDialog) return

  let isDragging = false
  let initialMouseX, initialMouseY
  let initialTranslateX = 0
  let initialTranslateY = 0

  modalHeader.addEventListener('mousedown', function (e) {
    // 忽略关闭按钮的点击
    if (e.target.classList.contains('btn-close')) {
      return
    }

    isDragging = true
    initialMouseX = e.clientX
    initialMouseY = e.clientY

    // 获取当前的transform值，以便在此基础上进行位移
    const transformStyle = window.getComputedStyle(modalDialog).transform
    if (transformStyle && transformStyle !== 'none') {
      const matrix = transformStyle.match(/matrix.*\((.+)\)/)
      if (matrix && matrix[1]) {
        const values = matrix[1].split(', ').map(Number)
        initialTranslateX = values[4] || 0 // 矩阵的translateX值
        initialTranslateY = values[5] || 0 // 矩阵的translateY值
      }
    } else {
      initialTranslateX = 0
      initialTranslateY = 0
    }

    // 优化拖动体验
    modalHeader.style.cursor = 'grabbing'
  })

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return

    const deltaX = e.clientX - initialMouseX
    const deltaY = e.clientY - initialMouseY

    const newTranslateX = initialTranslateX + deltaX
    const newTranslateY = initialTranslateY + deltaY

    modalDialog.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px)`
  })

  document.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false
      modalHeader.style.cursor = 'grab'
    }
  })

  // 模态框关闭时清除transform，确保下次打开时在初始位置
  modalEl.addEventListener('hidden.bs.modal', function () {
    modalDialog.style.transform = ''
  })
}

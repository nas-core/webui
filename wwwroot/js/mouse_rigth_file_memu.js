/**
 * 文件列表右键菜单处理
 * 依赖：fileOperations.js, public.js (用于showNotification and confirmDialog), compress_extract.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const contextMenu = document.getElementById('fileContextMenu')
  let currentTarget = null // 当前右键点击的文件项DOM元素

  // 显示上下文菜单
  function showContextMenu(e, target) {
    e.preventDefault()
    currentTarget = target

    // 清除所有多选状态，确保右键菜单与批量操作不冲突
    if (window.clearSelection) {
      window.clearSelection()
    }

    // 获取当前路径以便判断是否可以粘贴
    const clipboardArray = JSON.parse(localStorage.getItem('clipboard') || '[]')
    const pasteCutButton = contextMenu.querySelector('[data-action="paste-cut"]')
    const pasteCopyButton = contextMenu.querySelector('[data-action="paste-copy"]')

    const hasCutItems = clipboardArray.some((group) => group.action === 'cut' && group.items.length > 0)
    const hasCopyItems = clipboardArray.some((group) => group.action === 'copy' && group.items.length > 0)

    if (pasteCutButton) {
      // 如果剪贴板有剪切内容，则显示剪切粘贴按钮
      pasteCutButton.style.display = hasCutItems ? 'flex' : 'none'
    }

    if (pasteCopyButton) {
      // 如果剪贴板有复制内容，则显示复制粘贴按钮
      pasteCopyButton.style.display = hasCopyItems ? 'flex' : 'none'
    }

    // 根据目标类型隐藏/显示特定选项
    const isDir = target && target.dataset.isDir === 'true'
    const openButton = contextMenu.querySelector('[data-action="open"]')
    const downloadButton = contextMenu.querySelector('[data-action="download"]')
    const uploadButton = contextMenu.querySelector('[data-action="upload"]') // 上传按钮
    const editButton = contextMenu.querySelector('[data-action="edit"]') // 新增编辑按钮
    const cutButton = contextMenu.querySelector('[data-action="cut"]')
    const copyButton = contextMenu.querySelector('[data-action="copy"]') // 新增复制按钮
    const deleteButton = contextMenu.querySelector('[data-action="delete"]')

    // 压缩和解压相关按钮
    const compressButton = contextMenu.querySelector('[data-action="compress"]')
    const extractButton = contextMenu.querySelector('[data-action="extract"]')

    if (target) {
      // 获取文件信息
      const name = target.querySelector('.ms-2')?.textContent || ''
      const size = parseInt(target.dataset.fileSize, 10) || 0
      const config = window.NascoreConfig.get()
      const onlineEditMaxSizeKB = config.onlineEditFileSizeLimit || 500 // 默认 500KB

      const canEdit = !isDir && window.isEditableTextFile && window.isEditableTextFile(name) && size <= onlineEditMaxSizeKB * 1024
      const canExtract = !isDir && window.CompressExtractAPI && window.CompressExtractAPI.isSupportedArchive(name)

      // 如果点击的是文件或文件夹
      if (openButton) openButton.style.display = isDir ? 'flex' : 'none' // 只有文件夹可以"打开"
      if (downloadButton) downloadButton.style.display = isDir ? 'none' : 'flex' // 只有文件可以"下载"
      if (uploadButton) uploadButton.style.display = 'flex' // 始终显示上传按钮
      if (editButton) editButton.style.display = canEdit ? 'flex' : 'none' // 只有可编辑文件可以"编辑"
      if (cutButton) cutButton.style.display = 'flex'
      if (copyButton) copyButton.style.display = 'flex' // 复制按钮
      if (deleteButton) deleteButton.style.display = 'flex'

      // 压缩和解压选项
      if (compressButton) compressButton.style.display = 'flex' // 所有文件和文件夹都可以压缩
      if (extractButton) extractButton.style.display = canExtract ? 'flex' : 'none' // 只有支持的压缩文件可以解压
    } else {
      // 如果点击的是文件列表空白处
      if (openButton) openButton.style.display = 'none'
      if (downloadButton) downloadButton.style.display = 'none'
      if (uploadButton) uploadButton.style.display = 'flex' // 空白处可以上传
      if (editButton) editButton.style.display = 'none' // 空白处不能编辑
      if (cutButton) cutButton.style.display = 'none'
      if (copyButton) copyButton.style.display = 'none' // 空白处不能复制
      if (deleteButton) deleteButton.style.display = 'none'
      if (compressButton) compressButton.style.display = 'none' // 空白处不能压缩
      if (extractButton) extractButton.style.display = 'none' // 空白处不能解压

      // 如果是空白区域，只保留创建和上传功能，隐藏其他的分隔线
      const dividers = contextMenu.querySelectorAll('.context-menu-divider')
      if (dividers && dividers.length > 0) {
        // 保留第一个分隔线，隐藏其他分隔线
        dividers[0].style.display = 'block'
        for (let i = 1; i < dividers.length; i++) {
          dividers[i].style.display = 'none'
        }
      }
    }

    // 定位菜单
    contextMenu.style.left = `${e.pageX}px`
    contextMenu.style.top = `${e.pageY}px`

    // 确保菜单不会超出视窗
    const rect = contextMenu.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      contextMenu.style.left = `${e.pageX - rect.width}px`
    }
    if (rect.bottom > window.innerHeight) {
      contextMenu.style.top = `${e.pageY - rect.height}px`
    }

    // 显示菜单
    contextMenu.classList.add('show')
  }

  // 隐藏上下文菜单
  function hideContextMenu() {
    contextMenu.classList.remove('show')
    currentTarget = null // 隐藏时重置 currentTarget
  }

  // 绑定右键菜单事件到所有文件项和文件列表容器（空白处右键）
  document.addEventListener('contextmenu', (e) => {
    const fileItem = e.target.closest('.file-item')
    const fileListContainer = e.target.closest('#fileListContainer')

    if (fileItem) {
      showContextMenu(e, fileItem)
    } else if (fileListContainer && fileListContainer.contains(e.target)) {
      // 确保点击在 fileListContainer 内部的空白处
      showContextMenu(e, null) // 传递null表示在空白处右键
    }
  })

  // 点击其他地方隐藏菜单
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu()
    }
  })

  // 按ESC键隐藏菜单
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu()
    }
  })

  // 处理菜单项点击
  contextMenu.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action
    if (!action) {
      hideContextMenu() // 如果点击的不是有效菜单项，则隐藏菜单
      return
    }

    // 将 currentTarget 临时保存起来，在操作完成后再隐藏菜单和清空 currentTarget
    const targetItem = currentTarget

    const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'

    switch (action) {
      case 'new-folder': {
        console.log('右键菜单-新建文件夹被点击')
        console.log('当前路径:', currentPath)
        console.log('FileOperations对象:', window.FileOperations)
        const folderName = prompt('请输入新文件夹的名称:', 'new_folder')
        if (folderName) {
          try {
            console.log('开始创建文件夹:', currentPath, folderName)
            await window.FileOperations.createFolder(currentPath, folderName)
            console.log('文件夹创建成功')
            window.showNotification(`文件夹 "${folderName}" 创建成功！`, 'success')
            // 添加新文件夹到文件列表，不刷新整个页面
            if (typeof window.addNewItemToList === 'function') {
              window.addNewItemToList(currentPath, folderName, true)
            } else {
              console.error('addNewItemToList 函数不存在')
              window.location.reload()
            }
          } catch (err) {
            console.error('创建文件夹失败:', err)
            window.showNotification(`创建文件夹失败: ${err.message || '未知错误'}`, 'error')
          }
        }
        break
      }
      case 'new-file': {
        console.log('右键菜单-新建文件被点击')
        console.log('当前路径:', currentPath)
        console.log('FileOperations对象:', window.FileOperations)
        let fileName = prompt('请输入新文件的名称 (默认后缀.md):', 'new_file.md')
        if (fileName) {
          try {
            console.log('开始创建文件:', currentPath, fileName)
            await window.FileOperations.createFile(currentPath, fileName)
            console.log('文件创建成功')
            window.showNotification(`文件 "${fileName}" 创建成功！`, 'success')
            // 添加新文件到文件列表，不刷新整个页面
            if (typeof window.addNewItemToList === 'function') {
              window.addNewItemToList(currentPath, fileName, false)
            } else {
              console.error('addNewItemToList 函数不存在')
              window.location.reload()
            }
          } catch (err) {
            console.error('创建文件失败:', err)
            window.showNotification(`创建文件失败: ${err.message || '未知错误'}`, 'error')
          }
        }
        break
      }
      case 'cut':
        if (targetItem) {
          // 使用临时变量 targetItem
          const path = targetItem.dataset.path
          const isDir = targetItem.dataset.isDir === 'true'
          const name = targetItem.querySelector('.ms-2')?.textContent || ''
          const cutItem = { path, is_dir: isDir, name }

          // 获取现有剪贴板数据
          const existingClipboard = JSON.parse(localStorage.getItem('clipboard') || '[]')

          // 添加新的剪切组
          existingClipboard.push({
            action: 'cut',
            items: [cutItem],
          })

          localStorage.setItem('clipboard', JSON.stringify(existingClipboard))
          window.showNotification('已剪切到剪贴板', 'info')
        } else {
          window.showNotification('请先选择要剪切的文件或文件夹', 'warning')
        }
        break
      case 'copy':
        if (targetItem) {
          // 使用临时变量 targetItem
          const path = targetItem.dataset.path
          const isDir = targetItem.dataset.isDir === 'true'
          const name = targetItem.querySelector('.ms-2')?.textContent || ''
          const copyItem = { path, is_dir: isDir, name }

          // 获取现有剪贴板数据
          const existingClipboard = JSON.parse(localStorage.getItem('clipboard') || '[]')

          // 添加新的复制组
          existingClipboard.push({
            action: 'copy',
            items: [copyItem],
          })

          localStorage.setItem('clipboard', JSON.stringify(existingClipboard))
          window.showNotification('已复制到剪贴板', 'info')
        } else {
          window.showNotification('请先选择要复制的文件或文件夹', 'warning')
        }
        break
      case 'paste-cut':
        const clipboardArray = JSON.parse(localStorage.getItem('clipboard') || '[]')
        const cutGroups = clipboardArray.filter((group) => group.action === 'cut')

        if (cutGroups.length === 0) {
          window.showNotification('剪贴板中没有可剪切粘贴的项目', 'warning')
          break
        }

        const destinationPathBase = currentPath.endsWith('/') ? currentPath : currentPath + '/' // 确保目标路径以斜杠结尾
        const totalItems = cutGroups.reduce((total, group) => total + group.items.length, 0)

        try {
          const toRemove = [] // 记录需要移除的组索引

          for (let groupIndex = 0; groupIndex < clipboardArray.length; groupIndex++) {
            const group = clipboardArray[groupIndex]
            if (group.action === 'cut') {
              for (const item of group.items) {
                const sourcePath = item.path
                const itemName = item.name || sourcePath.split('/').pop()
                const newDestinationPath = destinationPathBase + itemName // 构建目标完整路径
                await window.FileOperations.moveItem(sourcePath, newDestinationPath)
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

          window.showNotification(`已成功粘贴 ${totalItems} 个项目`, 'success')
          // 增量更新文件列表，不刷新整个页面
          window.loadFileList(currentPath, false)
        } catch (err) {
          window.showNotification(`粘贴失败: ${err.message || '未知错误'}`, 'error')
        }
        break
      case 'paste-copy':
        const clipboardArrayCopy = JSON.parse(localStorage.getItem('clipboard') || '[]')
        const copyGroups = clipboardArrayCopy.filter((group) => group.action === 'copy')

        if (copyGroups.length === 0) {
          window.showNotification('剪贴板中没有可复制粘贴的项目', 'warning')
          break
        }

        const destinationPathBaseCopy = currentPath.endsWith('/') ? currentPath : currentPath + '/' // 确保目标路径以斜杠结尾
        const totalItemsCopy = copyGroups.reduce((total, group) => total + group.items.length, 0)

        try {
          for (const group of copyGroups) {
            if (group.action === 'copy') {
              for (const item of group.items) {
                const sourcePath = item.path
                const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/'
                const itemName = item.name || sourcePath.split('/').pop()
                let newDestinationPath = destinationPathBaseCopy + itemName // 构建目标完整路径

                // 检查是否粘贴到同目录
                if (sourceDir === currentPath) {
                  // 同目录复制，需要重命名以避免冲突
                  newDestinationPath = generateUniqueFileName(destinationPathBaseCopy, itemName)
                }

                await window.FileOperations.copyItem(sourcePath, newDestinationPath)
              }
            }
          }
          window.showNotification(`已成功复制粘贴 ${totalItemsCopy} 个项目`, 'success')
          // 注意：复制不需要清空剪贴板，可以多次粘贴
          // 增量更新文件列表，不刷新整个页面
          window.loadFileList(currentPath, false)
        } catch (err) {
          window.showNotification(`复制粘贴失败: ${err.message || '未知错误'}`, 'error')
        }
        break

      case 'edit':
        if (targetItem) {
          const path = targetItem.dataset.path
          const isDir = targetItem.dataset.isDir === 'true'
          const name = targetItem.querySelector('.ms-2')?.textContent || ''
          const size = parseInt(targetItem.dataset.fileSize, 10) || 0

          if (isDir) {
            window.showNotification('不支持在线编辑文件夹', 'warning')
          } else if (window.isEditableTextFile && window.isEditableTextFile(name)) {
            const config = window.NascoreConfig.get()
            const onlineEditMaxSizeKB = config.onlineEditFileSizeLimit || 500
            if (size <= onlineEditMaxSizeKB * 1024) {
              window.openFileEditor(path, size)
            } else {
              window.showNotification(`文件过大 (${window.formatSize(size)}), 无法在线编辑。最大支持 ${onlineEditMaxSizeKB}KB。`, 'warning', 5000)
            }
          } else {
            window.showNotification('该文件类型不支持在线编辑', 'warning')
          }
        }
        break
      case 'open':
        if (targetItem) {
          // 使用临时变量 targetItem
          const path = targetItem.dataset.path
          const isDir = targetItem.dataset.isDir === 'true'
          const name = targetItem.querySelector('.ms-2')?.textContent || ''
          const size = parseInt(targetItem.dataset.fileSize, 10) || 0 // 获取文件大小

          if (isDir) {
            window.location.hash = encodeURI(path)
          } else {
            // 弹出文件详情模态框
            window.showFileDetailModal(targetItem)
          }
        }
        break
      case 'upload':
        console.log('右键菜单-上传文件被点击')
        console.log('当前路径:', currentPath)
        console.log('FileUploader对象:', window.FileUploader)
        // 调用上传模态框，传递当前路径
        if (window.FileUploader && window.FileUploader.openUploadModal) {
          console.log('使用FileUploader.openUploadModal')
          window.FileUploader.openUploadModal(currentPath)
        } else {
          console.log('使用备用上传方式')
          // 如果没有找到FileUploader对象，使用Bootstrap方式直接显示模态框
          const uploadModal = document.getElementById('uploadModal')
          if (uploadModal) {
            // 设置当前路径到上传模态框
            const pathElement = document.getElementById('currentUploadPath')
            if (pathElement) {
              pathElement.textContent = currentPath
            }
            const modal = new bootstrap.Modal(uploadModal)
            modal.show()
          } else {
            console.error('找不到上传模态框元素')
            window.showNotification('上传功能暂不可用', 'error')
          }
        }
        break
      case 'download':
        if (targetItem) {
          // 使用临时变量 targetItem
          const path = targetItem.dataset.path
          const isDir = targetItem.dataset.isDir === 'true'
          if (isDir) {
            window.showNotification('暂不支持下载文件夹', 'warning')
            return
          }
          const accessToken = window.API.TokenManager.getAccessToken() // 获取 access token
          if (accessToken) {
            window.location.href = `/@api/file/download?path=${encodeURIComponent(path)}&token=${accessToken}` // 附加 token
            window.showNotification(`正在下载 "${targetItem.querySelector('.ms-2')?.textContent || ''}"`, 'info')
          } else {
            window.showNotification('未找到认证信息，无法下载。请重新登录。', 'error')
          }
        }
        break
      case 'delete':
        if (targetItem) {
          // 使用临时变量 targetItem
          const path = targetItem.dataset.path
          const itemName = targetItem.querySelector('.ms-2')?.textContent || ''
          window.confirmDialog(`确定要删除 "${itemName}" 吗？此操作不可撤销！`, async () => {
            try {
              await window.FileOperations.deleteItem(path)
              window.showNotification(`"${itemName}" 删除成功！`, 'success')
              targetItem.remove()
              //window.location.reload() // 刷新文件列表
            } catch (err) {
              window.showNotification(`删除失败: ${err.message || '未知错误'}`, 'error')
            }
          })
        } else {
          window.showNotification('请先选择要删除的文件或文件夹', 'warning')
        }
        break
      case 'compress':
        if (targetItem) {
          const path = targetItem.dataset.path
          const name = targetItem.querySelector('.ms-2')?.textContent || ''
          showSingleItemCompressOptions(path, name)
        }
        break
      case 'extract':
        if (targetItem) {
          const path = targetItem.dataset.path
          const name = targetItem.querySelector('.ms-2')?.textContent || ''
          showSingleItemExtractOptions(path, name)
        }
        break
    }
    hideContextMenu() // 操作完成后再隐藏菜单
  })

  /**
   * 显示单个文件压缩选项
   */
  function showSingleItemCompressOptions(itemPath, itemName) {
    const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
    const defaultArchiveName = itemName || itemPath.split('/').pop()

    const modalHtml = `
      <div class="modal fade" id="singleCompressModal" tabindex="-1" aria-labelledby="singleCompressModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="singleCompressModalLabel">压缩 "${escapeHtml(itemName)}"</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label for="singleArchiveName" class="form-label">压缩包名称</label>
                <input type="text" class="form-control" id="singleArchiveName" value="${escapeHtml(defaultArchiveName)}" placeholder="输入压缩包名称">
                <div class="form-text">将自动添加 .tarz 扩展名</div>
              </div>
              <div class="mb-3">
                <label class="form-label">选择压缩方式</label>
                <div class="list-group">
                  <button type="button" class="list-group-item list-group-item-action single-compress-option" data-action="compress-keep">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">压缩并保留原文件</h6>
                      <small><i class="bi bi-file-earmark-zip"></i></small>
                    </div>
                    <p class="mb-1">创建压缩包，保留原始文件</p>
                  </button>
                  <button type="button" class="list-group-item list-group-item-action single-compress-option" data-action="compress-delete">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">压缩并删除原文件</h6>
                      <small><i class="bi bi-file-earmark-zip text-warning"></i></small>
                    </div>
                    <p class="mb-1">创建压缩包，删除原始文件</p>
                  </button>
                  <button type="button" class="list-group-item list-group-item-action single-compress-option" data-action="compress-download-keep">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">压缩下载并保留原文件</h6>
                      <small><i class="bi bi-download text-primary"></i></small>
                    </div>
                    <p class="mb-1">压缩后立即下载，保留原文件和压缩包</p>
                  </button>
                  <button type="button" class="list-group-item list-group-item-action single-compress-option" data-action="compress-download-delete">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">压缩下载后删除原文件</h6>
                      <small><i class="bi bi-download text-danger"></i></small>
                    </div>
                    <p class="mb-1">压缩下载后删除原文件，保留压缩包</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // 插入并显示模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml)
    const modalEl = document.getElementById('singleCompressModal')
    const modal = new bootstrap.Modal(modalEl)
    modal.show()

    // 绑定压缩选项点击事件
    modalEl.addEventListener('click', async (e) => {
      const option = e.target.closest('.single-compress-option')
      if (!option) return

      const action = option.dataset.action
      const archiveNameInput = modalEl.querySelector('#singleArchiveName')
      const archiveName = archiveNameInput.value.trim()

      if (!archiveName) {
        window.showNotification('请输入压缩包名称', 'warning')
        return
      }

      modal.hide()

      try {
        await performSingleCompress(itemPath, archiveName, currentPath, action)
      } catch (error) {
        console.error('压缩操作失败:', error)
      }
    })

    // 模态框关闭后移除
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove())
  }

  /**
   * 显示单个文件解压选项
   */
  function showSingleItemExtractOptions(itemPath, itemName) {
    const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
    const fileFormat = window.CompressExtractAPI.getArchiveFormat(itemName)

    // 生成默认解压目录名（去掉扩展名）
    const defaultExtractDir = itemName.replace(/\.(tarz|tar\.z|tar\.gz|tar\.bz2|tar\.xz|zip|7z|rar|gz|bz2|xz|lz|lzma|Z|tar)$/i, '')

    const modalHtml = `
      <div class="modal fade" id="singleExtractModal" tabindex="-1" aria-labelledby="singleExtractModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="singleExtractModalLabel">解压 "${escapeHtml(itemName)}"</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label for="extractTargetDir" class="form-label">解压到目录</label>
                <input type="text" class="form-control" id="extractTargetDir" value="${escapeHtml(defaultExtractDir)}" placeholder="输入解压目录名称">
                <div class="form-text">将在当前目录下创建此文件夹并解压到其中</div>
              </div>
              <div class="mb-3">
                <label class="form-label">选择解压方式</label>
                <div class="list-group">
                  <button type="button" class="list-group-item list-group-item-action single-extract-option" data-action="extract-keep">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">解压并保留压缩包</h6>
                      <small><i class="bi bi-archive"></i></small>
                    </div>
                    <p class="mb-1">解压文件，保留原始压缩包</p>
                  </button>
                  <button type="button" class="list-group-item list-group-item-action single-extract-option" data-action="extract-delete">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">解压后删除压缩包</h6>
                      <small><i class="bi bi-archive text-warning"></i></small>
                    </div>
                    <p class="mb-1">解压文件，删除原始压缩包</p>
                  </button>
                </div>
              </div>
              <div class="alert alert-info">
                <small>
                  <i class="bi bi-info-circle me-1"></i>
                  检测到的压缩格式：${fileFormat.toUpperCase()}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // 插入并显示模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml)
    const modalEl = document.getElementById('singleExtractModal')
    const modal = new bootstrap.Modal(modalEl)
    modal.show()

    // 绑定解压选项点击事件
    modalEl.addEventListener('click', async (e) => {
      const option = e.target.closest('.single-extract-option')
      if (!option) return

      const action = option.dataset.action
      const targetDirInput = modalEl.querySelector('#extractTargetDir')
      const targetDir = targetDirInput.value.trim()

      if (!targetDir) {
        window.showNotification('请输入解压目录名称', 'warning')
        return
      }

      modal.hide()

      try {
        await performSingleExtract(itemPath, targetDir, currentPath, action)
      } catch (error) {
        console.error('解压操作失败:', error)
      }
    })

    // 模态框关闭后移除
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove())
  }

  /**
   * 执行单个文件压缩
   */
  async function performSingleCompress(itemPath, archiveName, currentPath, action) {
    window.showNotification('开始压缩...', 'info', 1000)

    try {
      const deleteOriginal = action.includes('delete')
      const downloadAfter = action.includes('download')

      if (downloadAfter) {
        // 压缩并下载
        await window.CompressExtractAPI.compressAndDownload(itemPath, archiveName, deleteOriginal, true)
      } else {
        // 仅压缩
        // 确保压缩包名称已经包含.tarz扩展名
        const safeArchiveName = archiveName.endsWith('.tarz') ? archiveName : `${archiveName}.tarz`
        const targetPath = `${currentPath}/${safeArchiveName}`.replace(/\/+/g, '/')
        const result = await window.CompressExtractAPI.compressItem(itemPath, targetPath)

        if (result.data && result.data.compressedPath) {
          window.showNotification(`压缩成功: ${result.data.message}`, 'success')

          // 如果需要删除原文件
          if (deleteOriginal) {
            await window.FileOperations.deleteItem(itemPath)
            // 从DOM中移除对应的文件项
            const fileItemEl = document.querySelector(`.file-item[data-path="${CSS.escape(itemPath)}"]`)
            if (fileItemEl) {
              fileItemEl.remove()
            }
            window.showNotification('原文件已删除', 'info')
          }

          // 刷新文件列表
          window.loadFileList(currentPath, false)
        } else {
          throw new Error('压缩失败，未获得压缩包路径')
        }
      }
    } catch (error) {
      console.error('压缩失败:', error)
      window.showNotification(`压缩失败: ${error.message || '未知错误'}`, 'error')
    }
  }

  /**
   * 执行单个文件解压
   */
  async function performSingleExtract(itemPath, targetDir, currentPath, action) {
    window.showNotification('开始解压...', 'info', 1000)

    try {
      const deleteOriginal = action.includes('delete')

      // 构建完整的目标路径
      const fullTargetPath = currentPath.endsWith('/') ? currentPath + targetDir : currentPath + '/' + targetDir

      const result = await window.CompressExtractAPI.extractItem(itemPath, fullTargetPath)

      if (result.data && result.data.success) {
        window.showNotification(`解压成功: ${result.data.message}`, 'success')

        // 如果需要删除原压缩包
        if (deleteOriginal) {
          await window.FileOperations.deleteItem(itemPath)
          // 从DOM中移除对应的文件项
          const fileItemEl = document.querySelector(`.file-item[data-path="${CSS.escape(itemPath)}"]`)
          if (fileItemEl) {
            fileItemEl.remove()
          }
          window.showNotification('原压缩包已删除', 'info')
        }

        // 刷新文件列表
        window.loadFileList(currentPath, false)
      } else {
        throw new Error('解压失败')
      }
    } catch (error) {
      console.error('解压失败:', error)
      window.showNotification(`解压失败: ${error.message || '未知错误'}`, 'error')
    }
  }

  /**
   * 生成唯一的文件名，避免同名冲突
   * @param {string} basePath - 基础路径
   * @param {string} originalName - 原始文件名
   * @returns {string} - 唯一的完整路径
   */
  function generateUniqueFileName(basePath, originalName) {
    const fileList = document.querySelector('.file-list')
    if (!fileList) return basePath + originalName

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

    return basePath + newName
  }
})

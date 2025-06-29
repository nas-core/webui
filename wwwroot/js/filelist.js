/**
 * 文件列表渲染与交互
 * 依赖：api.js, public.js, bootstrap-icons, fileOperations.js, edit.js, image_preview.css
 */

// --- 全局变量声明 ---
// fileListContainer 将在 DOMContentLoaded 中赋值
let fileListContainer = null
// 缩略图目录缓存
let thumbnailDirectoryCache = {
  path: null,
  exists: false,
  files: {},
}
// 将缩略图缓存暴露到全局
window.thumbnailDirectoryCache = thumbnailDirectoryCache

// --- 工具函数和核心逻辑函数定义 (在 DOMContentLoaded 外部，确保可提升和即时访问) ---

/**
 * 路由变化时加载对应目录
 */
function onRouteChange() {
  let path = decodeURI(window.location.hash.replace(/^#/, ''))
  if (!path) path = '/'
  if (window.loadFileList) {
    // 再次确认 window.loadFileList 存在
    window.loadFileList(path)
  } else {
    console.error('ERROR: window.loadFileList is not available for direct call in onRouteChange.')
  }
}

/**
 * 加载文件列表
 * @param {string} path - 要加载的目录路径
 */
async function loadFileList(path, shouldClear = true) {
  // 确保 fileListContainer 在调用此函数时已初始化
  if (!fileListContainer) {
    console.error('ERROR: fileListContainer is not initialized in loadFileList.')
    // 可以在这里添加一个通知，提示用户页面加载有问题
    if (window.showNotification) {
      window.showNotification('文件列表容器未准备好，请刷新页面。', 'error')
    }
    return
  }

  if (shouldClear) {
    // 清空并显示加载中状态
    fileListContainer.innerHTML = ''
    const loading = document.createElement('div')
    loading.className = 'text-center p-4 text-muted'
    loading.textContent = '加载中...'
    fileListContainer.appendChild(loading)
  }

  try {
    const res = await window.API.request(`/@api/file/list?path=${encodeURIComponent(path)}`, {}, { needToken: true })
    if (!res.data || !Array.isArray(res.data.items)) throw new Error('数据格式错误')

    // 检查用户设置，是否启用了仅使用缩略图
    const config = window.NascoreConfig.get()
    if (config.useOnlyThumbnails) {
      // 预加载缩略图目录信息
      await loadThumbnailDirectory(path, res.data.items)
    }

    renderFileList(res.data.items, path, shouldClear)
  } catch (err) {
    console.error('ERROR: 加载文件列表失败:', err.message)
    if (shouldClear) {
      fileListContainer.innerHTML = `<div class="text-danger p-4">加载失败：${err.message || '未知错误'}</div>`
    } else {
      window.showNotification(`加载失败：${err.message || '未知错误'}`, 'error')
    }
  }
}

/**
 * 渲染文件列表
 * @param {Array<Object>} items - 文件项数据数组
 * @param {string} currentPath - 当前路径
 */
function renderFileList(items, currentPath, shouldClear = true) {
  if (!fileListContainer) {
    // 防御性检查
    console.error('ERROR: fileListContainer is not initialized in renderFileList.')
    return
  }
  const config = window.NascoreConfig.get()

  // 过滤隐藏文件(如果启用)
  let filteredItems = items
  if (config.hideHiddenFiles) {
    filteredItems = items.filter((item) => !item.name.startsWith('.'))
  }
  // 排序：文件夹在前，文件在后，按名称排序
  const dirs = filteredItems.filter((i) => i.is_dir).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  const files = filteredItems.filter((i) => !i.is_dir).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  const all = [...dirs, ...files]

  if (shouldClear) {
    // 保留文件列表头部
    const originalHeader = fileListContainer.querySelector('.file-list-header')

    // 清空容器
    fileListContainer.innerHTML = ''

    // 如果原始头部存在，则重新添加
    if (originalHeader) {
      fileListContainer.appendChild(originalHeader.cloneNode(true))
    }
  } else {
    // 移除加载中提示（如果存在）
    const loadingEl = fileListContainer.querySelector('.text-center.p-4.text-muted')
    if (loadingEl) {
      loadingEl.remove()
    }
  }

  // 文件项
  all.forEach((item) => {
    // 检查是否已存在相同路径的项目（用于增量更新）
    if (!shouldClear) {
      const existingItem = fileListContainer.querySelector(`.file-item[data-path="${CSS.escape(item.path)}"]`)
      if (existingItem) {
        return // 如果已存在，则跳过
      }
    }

    const fileItem = document.createElement('div')
    fileItem.className = 'file-item'
    fileItem.dataset.path = item.path
    fileItem.dataset.isDir = item.is_dir
    fileItem.dataset.fileSize = item.size // 添加文件大小到dataset

    // 图标或图片预览
    let iconHtml = ''
    if (item.is_dir) {
      iconHtml = `<i class="bi bi-folder-fill file-icon text-warning"></i>`
    } else {
      // 检查是否是图片文件
      const ext = item.name.split('.').pop().toLowerCase()
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)
      const config = window.NascoreConfig.get()

      // 获取用户图片预览设置
      const useOnlyThumbnails = config.useOnlyThumbnails || false
      const imageSizeLimit = (config.imagePreviewSizeLimit || 1024) * 1024 // 转换为字节
      const systemMaxSize = config.WebuiImageDirectlyMaxSize || 1024 * 1024 * 2 // 系统默认2MB

      // 确定实际使用的大小限制
      const maxImageSize = useOnlyThumbnails ? 0 : Math.min(imageSizeLimit, systemMaxSize)

      // 判断是否使用图片预览
      let shouldShowPreview = isImage && item.size > 0 && item.size <= maxImageSize

      // 如果启用了"仅使用缩略图"选项，检查缩略图是否存在
      if (useOnlyThumbnails && isImage) {
        // 构建缩略图路径 (.nascoreThumbnail/Thumbnail.文件名)
        const dirPath = item.path.substring(0, item.path.lastIndexOf('/') + 1)
        const thumbnailPath = `${dirPath}.nascoreThumbnail/Thumbnail.${item.name}`
        const thumbnailFileName = `Thumbnail.${item.name}`

        // 使用缩略图路径，而不考虑大小限制
        if (shouldShowPreview || item.size > maxImageSize) {
          // 检查缩略图目录缓存
          if (
            thumbnailDirectoryCache.exists &&
            thumbnailDirectoryCache.path === dirPath + '.nascoreThumbnail' &&
            thumbnailDirectoryCache.files[thumbnailFileName]
          ) {
            // 缩略图存在，显示缩略图
            const accessToken = window.API.TokenManager.getAccessToken()
            const thumbnailUrl = `/@api/file/download?path=${encodeURIComponent(thumbnailPath)}&token=${accessToken}`
            iconHtml = `<div class="file-preview-container"><img src="${thumbnailUrl}" class="file-image-preview" alt="${escapeHtml(item.name)}" /></div>`
          } else {
            // 缩略图不存在或未知，使用默认图标
            shouldShowPreview = false
          }
        }
      }

      if (shouldShowPreview) {
        // 使用原始图片预览
        const accessToken = window.API.TokenManager.getAccessToken() // 获取 access token
        const imageUrl = `/@api/file/download?path=${encodeURIComponent(item.path)}&token=${accessToken}`
        iconHtml = `<div class="file-preview-container"><img src="${imageUrl}" class="file-image-preview" alt="${escapeHtml(item.name)}" /></div>`
      } else {
        // 确保 window.getFileIcon 在此可用
        iconHtml = `<i class="bi ${window.getFileIcon ? window.getFileIcon(item.name) : 'bi-file-earmark-fill text-secondary'} file-icon text-primary"></i>`
      }
    }

    // 名称
    const nameHtml = `<span class="ms-2">${escapeHtml(item.name)}</span>`

    // 大小
    const sizeHtml = item.is_dir ? '—' : formatSize(item.size)

    // 修改时间
    const modHtml = formatTime(item.mod_time)

    // 详细列表模式的HTML结构
    fileItem.innerHTML = `
      <div class="row align-items-center">
        <div class="col-6 col-md-5">
          <div class="d-flex align-items-center">
            <div class="select-checkbox me-2">
              <input type="checkbox" class="form-check-input" data-select-item>
            </div>
            ${iconHtml}
            ${nameHtml}
          </div>
        </div>
        <div class="col-md-2 d-none d-md-block">
          <span>${sizeHtml}</span>
        </div>
        <div class="col-6 col-md-5 text-end text-md-start file-mod-time">
          <span class="mod-time">${modHtml}</span>
        </div>
      </div>
    `

    // 如果是增量更新，添加一个简单的淡入动画
    if (!shouldClear) {
      fileItem.style.opacity = '0'
      fileItem.style.transition = 'opacity 0.3s ease'
      setTimeout(() => {
        fileItem.style.opacity = '1'
      }, 10)
    }

    fileListContainer.appendChild(fileItem)
  })
}

/**
 * 文件类型图标映射
 * @param {string} filename - 文件名
 * @returns {string} - Bootstrap icon class
 */
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()

  // 图像文件
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'bi-card-image text-success'

  // 视频文件

  if (['m3u8'].includes(ext)) return 'bi-file-earmark-play text-info'
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) return 'bi-file-earmark-play-fill text-danger'

  // 音频文件
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'bi-file-earmark-music-fill text-info'

  // 压缩文件
  if (['zip', 'rar', '7z', 'tar', 'tarz', 'wim', 'gz', 'bz2'].includes(ext)) return 'bi-file-earmark-zip-fill text-primary'

  // 文档文件
  if (['pdf'].includes(ext)) return 'bi-file-earmark-pdf-fill text-danger'
  if (['doc', 'docx'].includes(ext)) return 'bi-filetype-doc text-primary'
  if (['xls', 'xlsx'].includes(ext)) return 'bi-filetype-xls text-success'
  if (['ppt', 'pptx'].includes(ext)) return 'bi-filetype-ppt text-warning'

  // 可执行文件
  if (['exe', 'msi', 'dll', 'bat', 'sys'].includes(ext)) return 'bi-x-diamond text-danger'
  if (['appimage'].includes(ext)) return 'bi-x-unity text-primary'
  // 镜像文件
  if (['iso'].includes(ext)) return 'bi-box text-info'
  if (['img', 'raw'].includes(ext)) return 'bi-box-seam text-info'
  if (['vhd', 'vhdx'].includes(ext)) return 'bi-box-seam-fill text-info'
  if (['qcow', 'qcow2', 'vdi', 'vmdk'].includes(ext)) return 'bi-box-fill text-info'

  // 脚本文件
  if (['sh'].includes(ext)) return 'bi-filetype-sh text-warning'
  if (['cmd', 'bat'].includes(ext)) return 'bi-terminal-fill text-success'

  // 数据库与配置文件
  if (['sql'].includes(ext)) return 'bi-filetype-sql text-info'
  if (['md', 'markdown'].includes(ext)) return 'bi-filetype-md text-primary'

  // 代码文件
  if (['html', 'htm'].includes(ext)) return 'bi-filetype-html text-primary'
  if (['css'].includes(ext)) return 'bi-filetype-css text-primary'
  if (['js'].includes(ext)) return 'bi-filetype-js text-warning'
  if (['json'].includes(ext)) return 'bi-filetype-json text-success'
  if (['py'].includes(ext)) return 'bi-filetype-py text-primary'
  if (['java'].includes(ext)) return 'bi-filetype-java text-danger'
  if (['php'].includes(ext)) return 'bi-filetype-php text-primary'
  if (['rb'].includes(ext)) return 'bi-filetype-rb text-danger'
  if (['cs'].includes(ext)) return 'bi-filetype-cs text-success'
  if (['tsx', 'jsx'].includes(ext)) return 'bi-filetype-tsx text-primary'
  if (['xml'].includes(ext)) return 'bi-filetype-xml text-warning'
  if (['yml', 'yaml'].includes(ext)) return 'bi-filetype-yml text-success'
  if (['sass', 'scss'].includes(ext)) return 'bi-filetype-scss text-pink'

  // 字体文件
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'bi-fonts text-secondary'

  // 将可编辑文本文件图标统一，并与edit.js中的EDITABLE_EXTENSIONS保持一致
  //if (window.isEditableTextFile && window.isEditableTextFile(filename)) return 'bi-file-earmark-text-fill text-secondary'

  // 默认图标
  return 'bi-file-earmark-fill text-secondary'
}

/**
 * 文件大小格式化
 * @param {number} size - 文件大小 (Bytes)
 * @returns {string} - 格式化后的字符串
 */
function formatSize(size) {
  if (size == null) return ''
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KiB'
  if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MiB'
  return (size / 1024 / 1024 / 1024).toFixed(2) + ' GiB'
}

/**
 * 时间格式化
 * @param {string} iso - ISO 格式的时间字符串
 * @returns {string} - 格式化后的时间字符串
 */
function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = (now - d) / 1000

  // 获取用户配置
  const config = window.NascoreConfig.get()
  const showExactDate = config.showExactDate || false

  // 如果启用了精确日期格式，使用精确格式
  if (showExactDate) {
    const currentYear = now.getFullYear()
    const dateYear = d.getFullYear()

    // 如果是当前年份，只显示月-日 时:分
    if (dateYear === currentYear) {
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    // 否则显示完整年-月-日 时:分
    return `${dateYear}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // 使用相对时间格式
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  if (diff < 86400 * 3) return Math.floor(diff / 86400) + ' 天前'
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * HTML 转义函数
 * @param {string} str - 要转义的字符串
 * @returns {string} - 转义后的字符串
 */
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

// --- 核心函数暴露到全局 (确保在 DOMContentLoaded 外部，可立即访问) ---
// 注意：这些函数声明会被提升，所以在这里赋值是安全的。
window.loadFileList = loadFileList
window.getFileIcon = getFileIcon
// 格式化大小函数也可能被其他模块需要，所以也暴露出来
window.formatSize = formatSize
// 格式化时间函数也可能被其他模块需要
window.formatTime = formatTime
// 暴露 showFileDetailModal 函数，以便其他地方可以直接调用它来显示文件详情
window.showFileDetailModal = showFileDetailModal
// 暴露缩略图缓存刷新函数
window.refreshThumbnailCache = refreshThumbnailCache

/**
 * 预加载缩略图目录信息
 * @param {string} currentPath - 当前目录路径
 * @param {Array} items - 文件列表项目
 * @returns {Promise<boolean>} - 缩略图目录是否存在
 */
async function loadThumbnailDirectory(currentPath, items) {
  try {
    // 构建缩略图目录路径
    const thumbnailDirPath = currentPath.endsWith('/') ? currentPath + '.nascoreThumbnail' : currentPath + '/.nascoreThumbnail'

    // 清除旧的缓存
    thumbnailDirectoryCache = {
      path: thumbnailDirPath,
      exists: false,
      files: {},
    }
    // 同步更新全局缓存
    window.thumbnailDirectoryCache = thumbnailDirectoryCache

    try {
      // 请求缩略图目录
      const res = await window.API.request(`/@api/file/list?path=${encodeURIComponent(thumbnailDirPath)}`, {}, { needToken: true })

      if (res.data && Array.isArray(res.data.items)) {
        // 缩略图目录存在
        thumbnailDirectoryCache.exists = true

        // 缓存缩略图文件信息
        res.data.items.forEach((item) => {
          if (!item.is_dir) {
            thumbnailDirectoryCache.files[item.name] = {
              path: item.path,
              size: item.size,
            }
          }
        })

        return true
      }
    } catch (err) {
      // 目录可能不存在，这是正常的
      thumbnailDirectoryCache.exists = false
      // 同步更新全局缓存
      window.thumbnailDirectoryCache = thumbnailDirectoryCache
    }
    return false
  } catch (err) {
    console.error('ERROR: 加载缩略图目录失败:', err)
    return false
  }
}

/**
 * 刷新缩略图目录缓存
 * @param {string} path - 当前目录路径
 * @returns {Promise<boolean>} - 缩略图目录是否存在
 */
async function refreshThumbnailCache(path) {
  try {
    return await loadThumbnailDirectory(path, [])
  } catch (err) {
    console.error('ERROR: 刷新缩略图缓存失败:', err)
    return false
  }
}

/**
 * 增量添加一个新项目到文件列表
 * @param {Object} item - 文件项数据
 * @param {string} currentPath - 当前路径
 */
function addItemToList(item) {
  if (!fileListContainer || !item) return

  // 检查项目是否已存在
  const existingItem = fileListContainer.querySelector(`.file-item[data-path="${CSS.escape(item.path)}"]`)
  if (existingItem) return // 如果已存在，则跳过

  const fileItem = document.createElement('div')
  fileItem.className = 'file-item'
  fileItem.dataset.path = item.path
  fileItem.dataset.isDir = item.is_dir
  fileItem.dataset.fileSize = item.size

  // 图标或图片预览
  let iconHtml = ''
  if (item.is_dir) {
    iconHtml = `<i class="bi bi-folder-fill file-icon text-warning"></i>`
  } else {
    // 检查是否是图片文件
    // 检查是否是图片文件，且小于配置的最大尺寸限制
    const ext = item.name.split('.').pop().toLowerCase()
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)
    const config = window.NascoreConfig.get()

    // 获取用户图片预览设置
    const useOnlyThumbnails = config.useOnlyThumbnails || false
    const imageSizeLimit = (config.imagePreviewSizeLimit || 1024) * 1024 // 转换为字节
    const systemMaxSize = config.WebuiImageDirectlyMaxSize || 1024 * 1024 * 2 // 系统默认2MB

    // 确定实际使用的大小限制
    const maxImageSize = useOnlyThumbnails ? 0 : Math.min(imageSizeLimit, systemMaxSize)

    // 判断是否使用图片预览
    let shouldShowPreview = isImage && item.size > 0 && item.size <= maxImageSize

    // 如果启用了"仅使用缩略图"选项，检查缩略图是否存在
    if (useOnlyThumbnails && isImage) {
      // 构建缩略图路径 (.nascoreThumbnail/Thumbnail.文件名)
      const dirPath = item.path.substring(0, item.path.lastIndexOf('/') + 1)
      const thumbnailPath = `${dirPath}.nascoreThumbnail/Thumbnail.${item.name}`
      const thumbnailFileName = `Thumbnail.${item.name}`

      // 使用缩略图路径，而不考虑大小限制
      if (shouldShowPreview || item.size > maxImageSize) {
        // 检查缩略图目录缓存
        if (
          thumbnailDirectoryCache.exists &&
          thumbnailDirectoryCache.path === dirPath + '.nascoreThumbnail' &&
          thumbnailDirectoryCache.files[thumbnailFileName]
        ) {
          // 缩略图存在，显示缩略图
          const accessToken = window.API.TokenManager.getAccessToken()
          const thumbnailUrl = `/@api/file/download?path=${encodeURIComponent(thumbnailPath)}&token=${accessToken}`
          iconHtml = `<div class="file-preview-container"><img src="${thumbnailUrl}" class="file-image-preview" alt="${escapeHtml(item.name)}" /></div>`
        } else {
          // 缩略图不存在或未知，使用默认图标
          shouldShowPreview = false
        }
      }
    }

    if (shouldShowPreview) {
      // 使用原始图片预览
      const accessToken = window.API.TokenManager.getAccessToken() // 获取 access token
      const imageUrl = `/@api/file/download?path=${encodeURIComponent(item.path)}&token=${accessToken}`
      iconHtml = `<div class="file-preview-container"><img src="${imageUrl}" class="file-image-preview" alt="${escapeHtml(item.name)}" /></div>`
    } else {
      iconHtml = `<i class="bi ${window.getFileIcon ? window.getFileIcon(item.name) : 'bi-file-earmark-fill text-secondary'} file-icon text-primary"></i>`
    }
  }

  // 名称
  const nameHtml = `<span class="ms-2">${escapeHtml(item.name)}</span>`

  // 大小
  const sizeHtml = item.is_dir ? '—' : formatSize(item.size)

  // 修改时间
  const modHtml = formatTime(item.mod_time)

  // 详细列表模式的HTML结构
  fileItem.innerHTML = `
    <div class="row align-items-center">
      <div class="col-6 col-md-5">
        <div class="d-flex align-items-center">
          <div class="select-checkbox me-2">
            <input type="checkbox" class="form-check-input" data-select-item>
          </div>
          ${iconHtml}
          ${nameHtml}
        </div>
      </div>
      <div class="col-md-2 d-none d-md-block">
        <span>${sizeHtml}</span>
      </div>
      <div class="col-6 col-md-5 text-end text-md-start file-mod-time">
        <span class="mod-time">${modHtml}</span>
      </div>
    </div>
  `

  // 添加淡入动画
  fileItem.style.opacity = '0'
  fileItem.style.transition = 'opacity 0.3s ease'

  // 添加到列表
  fileListContainer.appendChild(fileItem)

  // 开始淡入动画
  setTimeout(() => {
    fileItem.style.opacity = '1'
  }, 10)

  return fileItem
}

// 暴露增量添加函数
window.addItemToList = addItemToList

/**
 * 增量添加新建项目到文件列表
 * @param {string} path - 文件路径
 * @param {string} name - 文件名
 * @param {boolean} isDir - 是否为文件夹
 */
window.addNewItemToList = async function (path, name, isDir) {
  // 构建完整路径
  const fullPath = path.endsWith('/') ? path + name : path + '/' + name

  // 构造项目对象
  const newItem = {
    name: name,
    path: fullPath,
    is_dir: isDir,
    size: 0,
    mod_time: new Date().toISOString(),
  }

  // 调用增量添加函数
  return addItemToList(newItem)
}

// --- DOMContentLoaded 事件监听器 (用于初始化 DOM 相关的操作) ---
document.addEventListener('DOMContentLoaded', function () {
  fileListContainer = document.getElementById('fileListContainer')
  if (!fileListContainer) {
    console.error('ERROR: fileListContainer element not found on DOMContentLoaded. File list functionality might be limited.')
    // 不返回，让其余的事件监听器尝试绑定，但会依赖于 fileListContainer 是否存在
  }

  // 路由监听
  window.addEventListener('hashchange', onRouteChange)
  // 首次加载
  onRouteChange()

  // 双击事件委托
  if (fileListContainer) {
    // 仅当 fileListContainer 存在时才绑定事件
    fileListContainer.addEventListener('dblclick', function (e) {
      const fileItem = e.target.closest('.file-item')
      if (!fileItem) return

      // 如果点击的是复选框,不触发打开操作
      if (e.target.matches('[data-select-item]')) return

      const isDir = fileItem.dataset.isDir === 'true'
      const path = fileItem.dataset.path

      // 获取文件名 - 兼容图片预览和普通图标
      let name = ''
      const nameEl = fileItem.querySelector('.ms-2')
      if (nameEl) {
        name = nameEl.textContent
      } else {
        // 检查是否有图片预览
        const imgEl = fileItem.querySelector('.file-image-preview')
        if (imgEl && imgEl.alt) {
          name = imgEl.alt
        }
      }

      const size = parseInt(fileItem.dataset.fileSize, 10) // 获取文件大小

      if (isDir) {
        // 跳转到新目录
        window.location.hash = encodeURI(path)
      } else {
        // 无论是否是可编辑文件，都显示文件详情对话框
        showFileDetailModal(fileItem)
      }
    })

    // 单击事件委托
    fileListContainer.addEventListener('click', function (e) {
      const config = window.NascoreConfig.get()

      // 如果点击的是复选框,不触发打开操作
      if (e.target.matches('[data-select-item]')) {
        return
      }

      const fileItem = e.target.closest('.file-item')
      if (!fileItem) return

      // 检查是否按下了修饰键（Ctrl、Shift），如果是则由选择逻辑处理
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        // 让选择逻辑处理，不执行文件打开操作
        return
      }

      if (!config.useSingleClick) {
        return // 如果未启用单击,则不处理
      }

      const isDir = fileItem.dataset.isDir === 'true'
      const path = fileItem.dataset.path

      // 获取文件名 - 兼容图片预览和普通图标
      let name = ''
      const nameEl = fileItem.querySelector('.ms-2')
      if (nameEl) {
        name = nameEl.textContent
      } else {
        // 检查是否有图片预览
        const imgEl = fileItem.querySelector('.file-image-preview')
        if (imgEl && imgEl.alt) {
          name = imgEl.alt
        }
      }

      if (isDir) {
        // 导航到新目录
        window.location.hash = encodeURI(path)
      } else {
        // 弹出文件详情
        showFileDetailModal(fileItem)
      }
    })
  } else {
    console.warn('WARNING: fileListContainer not found, double-click and single-click events will not be bound.')
  }
})

/**
 * 文件预览功能
 * 支持图片、视频、音频等文件类型预览
 * 依赖：fileUtility.js, Bootstrap 5
 */

// 支持预览的文件类型
const previewableImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
const previewableVideoTypes = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.m3u8']
const previewableAudioTypes = ['.mp3', '.wav', '.ogg', '.aac', '.flac']

// 全局播放器实例
// Function to extract translate values from a transform matrix string
function getTranslateValues(transformString) {
  const matrixMatch = transformString.match(/matrix(?:3d)?\(([^)]+)\)/)
  if (!matrixMatch || !matrixMatch[1]) {
    return { x: 0, y: 0 }
  }
  const values = matrixMatch[1].split(', ').map(Number)
  if (transformString.startsWith('matrix3d')) {
    return { x: values[12] || 0, y: values[13] || 0 }
  } else if (transformString.startsWith('matrix')) {
    return { x: values[4] || 0, y: values[5] || 0 }
  }
  return { x: 0, y: 0 }
}

// 全局播放器实例
let artPlayerInstance = null

// 全局模态框实例
let previewModal = null

// 初始化文件预览功能
function initFilePreview() {
  // 创建预览模态框
  createPreviewModal()

  // 监听预览按钮点击事件
  document.addEventListener('click', function (event) {
    // 检查是否是预览按钮
    if (event.target.id === 'previewFileBtn' || event.target.closest('#previewFileBtn')) {
      const modal = document.getElementById('fileDetailModal')
      if (modal) {
        const filePath = modal.getAttribute('data-file-path')
        const fileName = modal.getAttribute('data-file-name')

        if (filePath && fileName) {
          // 关闭详情模态框
          const bsModal = bootstrap.Modal.getInstance(modal)
          if (bsModal) {
            bsModal.hide()
          }

          // 打开预览
          openPreview(filePath, fileName)
        }
      }
    }
  })
}

// 创建预览模态框DOM
function createPreviewModal() {
  // 如果已存在则不重复创建
  if (document.getElementById('filePreviewModal')) {
    return
  }

  // 创建模态框HTML
  const modalHtml = `
    <div class="modal fade file-preview-modal" id="filePreviewModal" tabindex="-1" aria-labelledby="filePreviewModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header draggable">
            <h5 class="modal-title" id="filePreviewModalLabel"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body">
            <div class="file-preview-loading"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="openNewWindowBtn">新窗口打开</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
          </div>
        </div>
      </div>
    </div>
  `

  // 添加到文档
  document.body.insertAdjacentHTML('beforeend', modalHtml)

  // 获取模态框元素
  const modalEl = document.getElementById('filePreviewModal')

  // 创建Bootstrap模态框实例
  previewModal = new bootstrap.Modal(modalEl, {
    backdrop: 'static',
    keyboard: true,
  })

  // 初始化拖拽功能
  initDraggableModal(modalEl)
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

// 打开预览
function openPreview(filePath, fileName) {
  // 获取文件扩展名
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

  // 获取模态框元素
  const modalEl = document.getElementById('filePreviewModal')
  const title = modalEl.querySelector('.modal-title')
  const body = modalEl.querySelector('.modal-body')

  // 设置标题
  title.textContent = fileName

  // 清除内容区
  body.innerHTML = '<div class="file-preview-loading"></div>'

  // 设置文件路径和名称到模态框，供新窗口打开功能使用
  modalEl.dataset.filePath = filePath
  modalEl.dataset.fileName = fileName

  // 显示模态框
  previewModal.show()

  // 绑定新窗口打开按钮事件
  const openNewWindowBtn = modalEl.querySelector('#openNewWindowBtn')
  if (openNewWindowBtn) {
    openNewWindowBtn.onclick = function () {
      openPreviewInNewWindow(filePath, fileName)
    }
  }

  // 根据文件类型加载不同的预览
  if (previewableImageTypes.includes(extension)) {
    loadImagePreview(filePath, fileName, body)
  } else if (previewableVideoTypes.includes(extension)) {
    loadVideoPreview(filePath, fileName, extension, body)
  } else if (previewableAudioTypes.includes(extension)) {
    loadAudioPreview(filePath, fileName, body)
  } else {
    body.innerHTML = '<div class="alert alert-warning">此文件类型不支持预览</div>'
  }
}

// 加载图片预览
async function loadImagePreview(filePath, fileName, container) {
  try {
    // 使用download接口直接获取图片URL（更适合图片文件）
    const imageUrl = window.FileUtility.getMediaFileUrl(filePath)
    if (!imageUrl) {
      container.innerHTML = '<div class="alert alert-danger">无法获取图片URL，请确认您已登录</div>'
      return
    }

    // 创建图片元素
    const img = document.createElement('img')
    img.className = 'file-preview-image'
    img.alt = fileName

    // 加载完成后移除加载状态
    img.onload = function () {
      container.innerHTML = ''
      container.appendChild(img)
    }

    // 加载错误处理
    img.onerror = function () {
      container.innerHTML = '<div class="alert alert-danger">图片加载失败</div>'
    }

    // 设置图片源
    img.src = imageUrl
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">加载图片失败: ${err.message || '未知错误'}</div>`
  }
}

// 加载视频预览
function loadVideoPreview(filePath, fileName, extension, container) {
  // 清除容器
  container.innerHTML = ''

  // 创建ArtPlayer容器
  const playerContainer = document.createElement('div')
  playerContainer.className = 'artplayer-app'
  container.appendChild(playerContainer)

  // 如果有旧的播放器实例，销毁它
  if (artPlayerInstance) {
    artPlayerInstance.destroy()
    artPlayerInstance = null
  }

  // 获取视频URL (使用download接口，更适合媒体文件)
  const videoUrl = window.FileUtility.getMediaFileUrl(filePath)
  if (!videoUrl) {
    container.innerHTML = '<div class="alert alert-danger">无法获取视频URL，请确认您已登录</div>'
    return
  }

  // 检查是否为HLS格式
  const isHLS = extension === '.m3u8'

  // 创建ArtPlayer实例
  artPlayerInstance = new Artplayer({
    container: playerContainer,
    url: videoUrl,
    title: fileName,
    volume: 0.5,
    isLive: isHLS,
    muted: false,
    autoplay: false,
    pip: true,
    autoSize: true,
    autoMini: false,
    screenshot: true,
    setting: true,
    loop: false,
    flip: true,
    playbackRate: true,
    aspectRatio: true,
    fullscreen: true,
    fullscreenWeb: true,
    subtitleOffset: false,
    miniProgressBar: true,
    mutex: true,
    backdrop: true,
    playsInline: true,
    autoPlayback: false,
    theme: '#23ade5',
    customType: {
      m3u8: function (video, url) {
        if (Hls.isSupported()) {
          const hls = new Hls()
          hls.loadSource(url)
          hls.attachMedia(video)
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url
        } else {
          container.innerHTML = '<div class="alert alert-danger">您的浏览器不支持播放HLS视频</div>'
        }
      },
    },
  })
}

// 加载音频预览
function loadAudioPreview(filePath, fileName, container) {
  // 创建音频元素
  const audio = document.createElement('audio')
  audio.className = 'file-preview-audio'
  audio.controls = true
  audio.preload = 'metadata'

  // 获取音频URL (使用download接口，更适合媒体文件)
  const audioUrl = window.FileUtility.getMediaFileUrl(filePath)
  if (!audioUrl) {
    container.innerHTML = '<div class="alert alert-danger">无法获取音频URL，请确认您已登录</div>'
    return
  }

  // 音频源
  const source = document.createElement('source')
  source.src = audioUrl

  // 添加到音频元素
  audio.appendChild(source)

  // 加载完成后移除加载状态
  audio.oncanplay = function () {
    container.innerHTML = ''
    container.appendChild(audio)
  }

  // 加载错误处理
  audio.onerror = function () {
    container.innerHTML = '<div class="alert alert-danger">音频加载失败</div>'
  }

  // 添加到容器
  container.innerHTML = ''
  container.appendChild(audio)
}

// 关闭预览 (由Bootstrap模态框自动处理)
function closePreview() {
  if (previewModal) {
    previewModal.hide()
  }

  // 如果有播放器实例，销毁它
  if (artPlayerInstance) {
    artPlayerInstance.destroy()
    artPlayerInstance = null
  }
}

// 在新窗口中打开预览
function openPreviewInNewWindow(filePath, fileName) {
  // 创建URL参数
  const params = new URLSearchParams()
  params.append('path', filePath)
  params.append('name', fileName)
  params.append('token', window.API.TokenManager.getAccessToken())

  // 打开新窗口
  const previewWindow = window.open('./preview.shtml?' + params.toString(), '_blank')

  // 如果浏览器阻止了弹出窗口
  if (!previewWindow || previewWindow.closed || typeof previewWindow.closed === 'undefined') {
    window.showNotification && window.showNotification('浏览器阻止了弹出窗口，请允许此站点的弹出窗口', 'warning')
  }
}

// 模态框关闭事件处理
document.addEventListener('hidden.bs.modal', function (event) {
  if (event.target.id === 'filePreviewModal') {
    // 如果有播放器实例，销毁它
    if (artPlayerInstance) {
      artPlayerInstance.destroy()
      artPlayerInstance = null
    }

    // 清空内容区
    const body = event.target.querySelector('.modal-body')
    if (body) {
      body.innerHTML = ''
    }
  }
})

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
  initFilePreview()
})

// 全局导出，供其他模块调用
window.openFilePreview = openPreview

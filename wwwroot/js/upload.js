/**
 * 文件上传功能
 * 依赖:
 * - Dropzone.js
 * - Bootstrap 5
 */

;(function () {
  // 禁用 Dropzone 自动发现功能
  if (typeof Dropzone !== 'undefined') {
    Dropzone.autoDiscover = false
  }

  // 确保 FileUploader 实例全局可访问
  window.FileUploader = null

  class FileUploader {
    constructor() {
      // 确保元素存在
      const uploadModal = document.getElementById('uploadModal')
      const minimizedUpload = document.getElementById('uploadMinimized')

      if (!uploadModal || !minimizedUpload) {
        console.error('Upload modal elements not found')
        return
      }

      this.uploadModal = new bootstrap.Modal(uploadModal)
      this.minimizedUpload = minimizedUpload
      this.currentPath = '/'

      // 添加显示上传模态框的方法
      this.showUploadModal = function () {
        // 自动获取当前路径
        const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
        this.openUploadModal(currentPath)
      }

      this.totalProgress = 0
      this.activeUploads = 0
      this.queuedFiles = []
      this.uploadedFiles = []
      this.isUploading = false
      this.isPaused = false

      // 将实例保存到全局对象
      window.FileUploader = this
      this.maxConcurrentUploads = this.getMaxConcurrentUploads()
      this.dropzone = null
      this.hasPendingRefresh = false

      this.initDropzone()
      this.bindEvents()
    }

    /**
     * 初始化 Dropzone
     */
    initDropzone() {
      const dropzoneElement = document.getElementById('uploadDropzone')
      if (!dropzoneElement) {
        console.error('Dropzone element not found')
        return
      }

      // 如果已存在dropzone实例，先销毁
      if (dropzoneElement.dropzone) {
        dropzoneElement.dropzone.destroy()
      }

      try {
        this.dropzone = new Dropzone(dropzoneElement, {
          url: (file) => {
            return `/@api/file/upload?path=${encodeURIComponent(this.currentPath)}`
          },
          paramName: 'file',
          maxFilesize: 10240,
          chunking: true,
          forceChunking: true,
          chunkSize: 2000000,
          parallelChunkUploads: false,
          retryChunks: true,
          retryChunksLimit: 3,
          timeout: 180000,
          autoProcessQueue: false,
          addRemoveLinks: false,
          maxFiles: null,
          dictDefaultMessage: '',
          clickable: true,
          createImageThumbnails: false,
          previewsContainer: false,

          sending: (file, xhr, formData) => {
            formData.append('path', this.currentPath)
            if (file.fullPath) {
              formData.append('relativePath', file.fullPath)
            } else if (file.webkitRelativePath) {
              formData.append('relativePath', file.webkitRelativePath)
            }
            formData.append('filename', file.name)
          },

          headers: {
            Authorization: `Bearer ${localStorage.getItem('jwt_access_token')}`,
          },

          chunksUploaded: (file, done) => {
            console.log('所有分块上传完成:', file.name)
            setTimeout(() => {
              this.verifyUploadedFile(file, this.currentPath)
                .then((isValid) => {
                  window.loadFileList(this.currentPath, false)
                  if (isValid) {
                    window.showNotification(`文件 ${file.name} 已完全上传成功`, 'success')
                  } else {
                    console.warn(`文件 ${file.name} 验证结果不确定，但文件可能已成功上传`)
                  }
                  done()
                })
                .catch((err) => {
                  console.error('文件验证过程出错:', err)
                  window.loadFileList(this.currentPath, false)
                  done()
                })
            }, 1000)
          },
        })

        // 绑定事件
        this.dropzone.on('addedfile', this.handleFileAdded.bind(this))
        this.dropzone.on('uploadprogress', this.handleUploadProgress.bind(this))
        this.dropzone.on('success', this.handleUploadSuccess.bind(this))
        this.dropzone.on('error', this.handleUploadError.bind(this))
        this.dropzone.on('complete', this.handleUploadComplete.bind(this))
        this.dropzone.on('sending', this.handleSending.bind(this))
        this.dropzone.on('totaluploadprogress', this.handleTotalProgress.bind(this))

        // 添加错误处理
        this.dropzone.on('error', (file, message) => {
          console.warn('Dropzone error:', file.name, message)
          if (typeof message === 'string' && message.includes("can't be queued")) {
            // 文件状态错误，尝试重新添加
            setTimeout(() => {
              this.handleFileAdded(file)
            }, 100)
          }
        })

        // 不使用dropzone的queuecomplete事件，我们自己管理队列完成

        // console.log('Dropzone initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Dropzone:', error)
      }
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
      // 开始/暂停上传按钮
      document.getElementById('startUploadBtn')?.addEventListener('click', () => {
        if (this.isUploading && !this.isPaused) {
          this.pauseUpload()
        } else {
          // 如果是暂停状态，重新开始上传
          if (this.isPaused) {
            this.isPaused = false
            this.isUploading = true
          }
          this.startUpload()
        }
      })

      // 清空已完成按钮
      document.getElementById('clearCompletedBtn')?.addEventListener('click', () => {
        this.clearCompleted()
      })

      // 最小化按钮
      document.getElementById('minimizeUploadBtn')?.addEventListener('click', () => {
        this.uploadModal.hide()
        this.minimizedUpload.style.display = 'block'
      })

      // 最大化按钮
      document.getElementById('maximizeUploadBtn')?.addEventListener('click', () => {
        this.minimizedUpload.style.display = 'none'
        this.uploadModal.show()
      })

      // 关闭最小化窗口
      document.getElementById('closeMinimizedUploadBtn')?.addEventListener('click', () => {
        this.confirmCancelUploads()
      })

      // 清空队列按钮
      document.getElementById('clearQueueBtn')?.addEventListener('click', () => {
        this.clearQueue()
      })
    }

    /**
     * 打开上传模态框
     */
    openUploadModal(path) {
      this.currentPath = path.startsWith('/') ? path : '/' + path

      const pathElement = document.getElementById('currentUploadPath')
      if (pathElement) {
        pathElement.textContent = this.currentPath
      }

      this.uploadModal.show()
      this.totalProgress = 0
      this.updateMinimizedProgress(0)
      this.updateUploadStats()
    }

    /**
     * 处理文件添加
     */
    handleFileAdded(file) {
      // 检查文件是否已经在队列中
      const existingFile = this.queuedFiles.find((f) => f.name === file.name && f.size === file.size)
      if (existingFile) {
        console.warn('文件已在队列中:', file.name)
        window.showNotification(`文件 ${file.name} 已在队列中`, 'warning')
        return
      }

      file.uploadPath = this.currentPath
      file.id = Date.now() + Math.random() + Math.random()
      file.customStatus = 'waiting' // 使用自定义状态避免与dropzone冲突

      this.queuedFiles.push(file)
      this.addFileToQueue(file)
      this.updateUploadStats()
      this.updateButtons()
    }

    /**
     * 添加文件到队列显示
     */
    addFileToQueue(file) {
      const queueList = document.getElementById('uploadQueueList')
      const fileItem = document.createElement('div')
      fileItem.className = 'queue-file-item'
      fileItem.setAttribute('data-file-id', file.id)

      fileItem.innerHTML = `
        <div class="queue-file-icon">
          <i class="bi bi-file-earmark"></i>
        </div>
        <div class="queue-file-info">
          <div class="queue-file-details">
            <span class="queue-file-size">${this.formatBytes(file.size)}</span>
            <span class="queue-file-name">${file.name}</span>
            <span class="queue-file-status">等待上传</span>
          </div>
        </div>
        <div class="queue-file-progress">
          <div class="progress-bar" style="width: 0%"></div>
          <div class="queue-file-progress-text">0%</div>
        </div>
        <div class="queue-file-actions">
          <button class="btn btn-sm btn-outline-danger remove-file-btn" data-file-id="${file.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `

      queueList.appendChild(fileItem)

      // 绑定删除按钮事件
      fileItem.querySelector('.remove-file-btn').addEventListener('click', () => {
        this.removeFile(file.id)
      })
    }

    /**
     * 更新文件状态显示
     */
    updateFileStatus(file, status, progress = 0) {
      const fileItem = document.querySelector(`[data-file-id="${file.id}"]`)
      if (!fileItem) return

      const statusElement = fileItem.querySelector('.queue-file-status')
      const progressElement = fileItem.querySelector('.queue-file-progress')
      const progressBar = fileItem.querySelector('.progress-bar')
      const progressText = fileItem.querySelector('.queue-file-progress-text')
      const iconElement = fileItem.querySelector('.queue-file-icon i')

      file.customStatus = status // 使用自定义状态

      // 更新样式类
      fileItem.className = `queue-file-item ${status}`

      switch (status) {
        case 'waiting':
          statusElement.textContent = '等待上传'
          iconElement.className = 'bi bi-file-earmark'
          progressBar.style.width = '0%'
          progressText.textContent = '0%'
          break
        case 'uploading':
          statusElement.textContent = '上传中'
          iconElement.className = 'bi bi-arrow-up-circle'
          progressBar.style.width = `${progress}%`
          progressText.textContent = `${Math.round(progress)}%`
          break
        case 'completed':
          statusElement.textContent = '上传完成'
          iconElement.className = 'bi bi-check-circle-fill'
          progressBar.style.width = '100%'
          progressText.textContent = '100%'
          break
        case 'error':
          statusElement.textContent = '上传失败'
          iconElement.className = 'bi bi-exclamation-circle-fill'
          progressBar.style.width = `${progress}%`
          progressText.textContent = '失败'
          break
      }
    }

    /**
     * 开始上传
     */
    startUpload() {
      const waitingFiles = this.queuedFiles.filter((file) => file.customStatus === 'waiting')
      if (waitingFiles.length === 0) {
        window.showNotification('没有文件需要上传', 'warning')
        return
      }

      // 重置状态确保上传能继续进行
      this.isUploading = true
      this.isPaused = false
      this.updateButtons()
      this.updateUploadStats()

      // 开始处理队列中的文件
      this.processQueue()
    }

    /**
     * 暂停上传
     */
    pauseUpload() {
      this.isPaused = true
      this.updateButtons()
      window.showNotification('上传已暂停', 'info')
    }

    /**
     * 处理上传队列
     */
    processQueue() {
      if (this.isPaused || !this.isUploading) {
        return
      }

      // 更新最大并发数
      this.maxConcurrentUploads = this.getMaxConcurrentUploads()

      // 处理多个文件直到达到并发限制
      while (this.activeUploads < this.maxConcurrentUploads) {
        const waitingFiles = this.queuedFiles.filter((file) => file.customStatus === 'waiting')
        if (waitingFiles.length === 0) {
          return
        }

        const file = waitingFiles[0]
        this.updateFileStatus(file, 'uploading')
        this.activeUploads++

        try {
          // 确保Dropzone文件状态正确
          if (file.status !== Dropzone.QUEUED) {
            file.status = Dropzone.QUEUED
          }
          this.dropzone.processFile(file)
        } catch (error) {
          console.error('处理文件时出错:', error)
          this.updateFileStatus(file, 'error')
          this.activeUploads--
          this.continueUpload()
        }
      }
    }

    /**
     * 处理上传进度
     */
    handleUploadProgress(file, progress) {
      this.updateFileStatus(file, 'uploading', progress)
      this.updateTotalProgress()
      this.updateMinimizedProgress(this.totalProgress)
    }

    /**
     * 处理上传成功
     */
    handleUploadSuccess(file) {
      this.updateFileStatus(file, 'completed')
      this.uploadedFiles.push(file)
      window.showNotification(`文件 ${file.name} 上传成功`, 'success')

      if (!file.upload || !file.upload.chunked) {
        this.verifyUploadedFile(file, this.currentPath)
          .then((isValid) => {
            if (!isValid) {
              console.warn(`文件 ${file.name} 上传后验证失败，但仍然保留文件`)
            }
            window.loadFileList(this.currentPath, false)
          })
          .catch((err) => {
            console.error('验证文件失败，但仍然保留:', err)
            window.loadFileList(this.currentPath, false)
          })
      } else {
        window.loadFileList(this.currentPath, false)
      }

      this.continueUpload()
    }

    /**
     * 处理上传错误
     */
    handleUploadError(file, message, xhr) {
      console.error('文件上传失败:', file.name, message, xhr?.status)
      let errorMsg = message

      if (xhr && xhr.responseText) {
        try {
          const response = JSON.parse(xhr.responseText)
          if (response.error) {
            errorMsg = response.error
          }
        } catch (e) {
          // 解析失败，使用原始消息
        }
      }

      if (file.size > 100 * 1024 * 1024) {
        errorMsg += '。大文件上传失败可能是因为网络不稳定或超时，请尝试减小文件大小或使用其他方式上传。'
      }

      this.updateFileStatus(file, 'error')
      window.showNotification(`文件 ${file.name} 上传失败: ${errorMsg}`, 'error')
      this.continueUpload()
    }

    /**
     * 处理上传完成
     */
    handleUploadComplete(file) {
      this.activeUploads--
      this.continueUpload()
    }

    /**
     * 继续上传下一个文件
     */
    continueUpload() {
      // 更新统计和按钮状态
      this.updateUploadStats()
      this.updateButtons()

      if (!this.isPaused && this.isUploading) {
        // 立即尝试处理更多文件
        this.processQueue()

        // 检查是否所有文件都已完成
        const waitingFiles = this.queuedFiles.filter((file) => file.customStatus === 'waiting')
        const uploadingFiles = this.queuedFiles.filter((file) => file.customStatus === 'uploading')

        if (waitingFiles.length === 0 && uploadingFiles.length === 0 && this.activeUploads === 0) {
          this.handleQueueComplete()
        }
      }
    }

    /**
     * 处理队列完成
     */
    handleQueueComplete() {
      // 确保真的完成了
      const waitingFiles = this.queuedFiles.filter((file) => file.customStatus === 'waiting')
      const uploadingFiles = this.queuedFiles.filter((file) => file.customStatus === 'uploading')

      if (waitingFiles.length > 0 || uploadingFiles.length > 0 || this.activeUploads > 0) {
        return
      }
      this.isUploading = false
      this.updateButtons()
      this.updateUploadStats()

      setTimeout(() => {
        this.minimizedUpload.style.display = 'none'
        window.showNotification('所有文件上传完成', 'success')
      }, 1500)
    }

    /**
     * 处理发送前事件
     */
    handleSending(file, xhr, formData) {
      console.log(`开始发送: ${file.name} (${this.formatBytes(file.size)})`)

      if (file.size > 50 * 1024 * 1024) {
        xhr.timeout = 300000
        xhr.ontimeout = () => {
          window.showNotification(`上传超时: ${file.name}，将自动重试`, 'warning')
        }
      }
    }

    /**
     * 处理总体上传进度
     */
    handleTotalProgress(progress, bytesSent, bytesTotal) {
      if (bytesSent && bytesTotal) {
        const sent = this.formatBytes(bytesSent)
        const total = this.formatBytes(bytesTotal)
        console.log(`总体上传进度: ${Math.round(progress)}% (${sent}/${total})`)
      }
    }

    /**
     * 更新总体上传进度
     */
    updateTotalProgress() {
      const files = this.queuedFiles
      if (files.length === 0) return

      let totalProgress = 0
      let totalBytes = 0
      let uploadedBytes = 0

      files.forEach((file) => {
        const progress = file.upload?.progress || 0
        totalProgress += progress
        totalBytes += file.size || 0
        uploadedBytes += (file.size || 0) * (progress / 100)
      })

      this.totalProgress = totalProgress / files.length
    }

    /**
     * 更新上传统计信息
     */
    updateUploadStats() {
      const completedFiles = this.queuedFiles.filter((file) => file.customStatus === 'completed').length
      const totalFiles = this.queuedFiles.length
      const uploadingFiles = this.queuedFiles.filter((file) => file.customStatus === 'uploading').length

      // 更新进度摘要
      const summaryElement = document.getElementById('uploadProgressSummary')
      const completedCountElement = document.getElementById('completedCount')
      const totalCountElement = document.getElementById('totalCount')
      const uploadedSizeElement = document.getElementById('uploadedSize')
      const totalSizeElement = document.getElementById('totalSize')

      if (totalFiles > 0) {
        summaryElement.style.display = 'block'
        completedCountElement.textContent = completedFiles
        totalCountElement.textContent = totalFiles

        const totalBytes = this.queuedFiles.reduce((sum, file) => sum + file.size, 0)
        const uploadedBytes = this.queuedFiles.reduce((sum, file) => {
          if (file.customStatus === 'completed') return sum + file.size
          if (file.customStatus === 'uploading') return sum + (file.size * (file.upload?.progress || 0)) / 100
          return sum
        }, 0)

        uploadedSizeElement.textContent = this.formatBytes(uploadedBytes)
        totalSizeElement.textContent = this.formatBytes(totalBytes)
      } else {
        summaryElement.style.display = 'none'
      }

      // 更新状态信息
      const statusElement = document.getElementById('uploadStatusInfo')
      if (statusElement) {
        if (totalFiles === 0) {
          statusElement.textContent = '选择文件后点击开始上传...'
        } else if (this.isUploading) {
          statusElement.textContent = `正在上传 ${uploadingFiles} 个文件...`
        } else if (completedFiles === totalFiles) {
          statusElement.textContent = '所有文件上传完成'
        } else {
          statusElement.textContent = `准备上传 ${totalFiles - completedFiles} 个文件`
        }
      }
    }

    /**
     * 更新按钮状态
     */
    updateButtons() {
      const startBtn = document.getElementById('startUploadBtn')
      const clearCompletedBtn = document.getElementById('clearCompletedBtn')
      const clearQueueBtn = document.getElementById('clearQueueBtn')

      const hasWaitingFiles = this.queuedFiles.some((file) => file.customStatus === 'waiting')
      const hasUploadingFiles = this.queuedFiles.some((file) => file.customStatus === 'uploading')
      const hasCompletedFiles = this.queuedFiles.some((file) => file.customStatus === 'completed')
      const hasAnyFiles = this.queuedFiles.length > 0

      if (startBtn) {
        if (this.isUploading && !this.isPaused) {
          // 正在上传，显示暂停按钮
          startBtn.disabled = !hasUploadingFiles
          startBtn.innerHTML = '<i class="bi bi-pause-fill"></i> 暂停上传'
          startBtn.className = 'btn btn-warning'
        } else if (this.isPaused) {
          // 已暂停，显示继续按钮
          startBtn.disabled = false
          startBtn.innerHTML = '<i class="bi bi-play-fill"></i> 继续上传'
          startBtn.className = 'btn btn-primary'
        } else {
          // 未开始，显示开始按钮
          startBtn.disabled = !hasWaitingFiles
          startBtn.innerHTML = '<i class="bi bi-play-fill"></i> 开始上传'
          startBtn.className = 'btn btn-primary'
        }
      }

      // 只在有已完成文件时显示清空已完成按钮
      if (clearCompletedBtn) {
        if (hasCompletedFiles) {
          clearCompletedBtn.style.display = 'inline-block'
          clearCompletedBtn.disabled = false
        } else {
          clearCompletedBtn.style.display = 'none'
        }
      }

      // 只在有任何文件时显示清空按钮
      if (clearQueueBtn) {
        if (hasAnyFiles) {
          clearQueueBtn.style.display = 'inline-block'
          clearQueueBtn.disabled = false
        } else {
          clearQueueBtn.style.display = 'none'
        }
      }
    }

    /**
     * 移除文件
     */
    removeFile(fileId) {
      const fileIndex = this.queuedFiles.findIndex((file) => file.id === fileId)
      if (fileIndex === -1) return

      const file = this.queuedFiles[fileIndex]

      // 如果文件正在上传，取消上传
      if (file.customStatus === 'uploading') {
        try {
          // 从dropzone中移除文件
          const dzFile = this.dropzone.files.find((f) => f.id === file.id)
          if (dzFile) {
            this.dropzone.removeFile(dzFile)
          }
        } catch (e) {
          console.warn('移除文件时出错:', e)
        }
        this.activeUploads--
      }

      // 从队列中删除
      this.queuedFiles.splice(fileIndex, 1)

      // 从UI中删除
      const fileItem = document.querySelector(`[data-file-id="${fileId}"]`)
      if (fileItem) {
        fileItem.remove()
      }

      this.updateUploadStats()
      this.updateButtons()

      // 如果有暂停的上传，继续处理队列
      if (this.isUploading && !this.isPaused) {
        this.continueUpload()
      }
    }

    /**
     * 清空队列
     */
    clearQueue() {
      if (this.queuedFiles.length === 0) {
        window.showNotification('队列已为空', 'info')
        return
      }

      const hasUploadingFiles = this.queuedFiles.some((file) => file.status === 'uploading')

      if (hasUploadingFiles) {
        window.confirmDialog('确定要清空队列吗？正在上传的文件将被取消。', () => {
          this.doClearQueue()
        })
      } else {
        this.doClearQueue()
      }
    }

    /**
     * 执行清空队列
     */
    doClearQueue() {
      // 取消所有上传
      try {
        this.dropzone.removeAllFiles(true)
      } catch (e) {
        console.warn('清空队列时出错:', e)
      }

      // 清空队列
      this.queuedFiles = []
      this.uploadedFiles = []
      this.activeUploads = 0
      this.isUploading = false
      this.isPaused = false

      // 清空UI
      const queueList = document.getElementById('uploadQueueList')
      if (queueList) {
        queueList.innerHTML = ''
      }

      this.updateUploadStats()
      this.updateButtons()
      this.minimizedUpload.style.display = 'none'

      window.showNotification('队列已清空', 'info')
    }

    /**
     * 更新最小化窗口的进度显示
     */
    updateMinimizedProgress(progress) {
      const minimizedProgress = document.querySelector('.upload-minimized .progress-bar')
      const minimizedText = document.querySelector('.upload-minimized .upload-progress-text')
      if (minimizedProgress && minimizedText) {
        minimizedProgress.style.width = `${progress}%`
        minimizedText.textContent = `${Math.round(progress)}%`
      }
    }

    /**
     * 格式化字节数为人类可读格式
     */
    formatBytes(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    /**
     * 验证上传的文件
     */
    async verifyUploadedFile(file, path) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const filePath = path.endsWith('/') ? path + file.name : path + '/' + file.name
        const accessToken = localStorage.getItem('jwt_access_token')
        const response = await fetch(`/@api/file/list?path=${encodeURIComponent(filePath)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          console.warn(`文件验证API请求失败: ${response.status} ${response.statusText}`)
          if (file.upload && file.upload.chunked) {
            return true
          }
          return false
        }

        const data = await response.json()
        if (!data || !data.items || !data.items[0]) {
          console.warn(`文件验证数据格式有误:`, data)
          return false
        }

        const uploadedSize = data.items[0].size
        const originalSize = file.size
        const sizeRatio = uploadedSize / originalSize

        const allowedVariance = file.upload && file.upload.chunked ? 0.15 : 0.05

        if (sizeRatio < 1 - allowedVariance || sizeRatio > 1 + allowedVariance) {
          console.warn(`文件大小不匹配: 原始大小=${originalSize}, 上传后大小=${uploadedSize}, 比率=${sizeRatio}`)
          if (file.upload && file.upload.chunked) {
            return true
          }
          return false
        }

        return true
      } catch (error) {
        console.error('验证文件失败:', error)
        if (file.upload && file.upload.chunked) {
          return true
        }
        return false
      }
    }

    /**
     * 清空已完成的文件
     */
    clearCompleted() {
      const completedFiles = this.queuedFiles.filter((file) => file.customStatus === 'completed')

      if (completedFiles.length === 0) {
        window.showNotification('没有已完成的文件', 'info')
        return
      }

      // 从队列中移除已完成的文件
      this.queuedFiles = this.queuedFiles.filter((file) => file.customStatus !== 'completed')

      // 从UI中移除已完成的文件项
      completedFiles.forEach((file) => {
        const fileItem = document.querySelector(`[data-file-id="${file.id}"]`)
        if (fileItem) {
          fileItem.remove()
        }
      })

      this.updateUploadStats()
      this.updateButtons()

      window.showNotification(`已清空 ${completedFiles.length} 个已完成的文件`, 'success')
    }

    /**
     * 获取最大并发上传数
     */
    getMaxConcurrentUploads() {
      try {
        const config = window.NascoreConfig ? window.NascoreConfig.get() : {}
        let maxUploads = parseInt(config.maxConcurrentUploads) || 3

        // 限制范围在1-20之间
        if (maxUploads < 1 || maxUploads === 0) maxUploads = 1
        if (maxUploads > 20) maxUploads = 20

        return maxUploads
      } catch (e) {
        return 3
      }
    }

    /**
     * 确认取消上传
     */
    confirmCancelUploads() {
      if (this.activeUploads > 0 || this.queuedFiles.length > 0) {
        window.confirmDialog('确定要取消所有上传吗？这可能导致已部分上传的文件不完整。', () => {
          this.doClearQueue()
        })
      } else {
        this.minimizedUpload.style.display = 'none'
      }
    }
  }

  // 等待所有依赖加载完成
  function checkDependencies() {
    return typeof Dropzone !== 'undefined' && typeof bootstrap !== 'undefined'
  }

  // 初始化函数
  function initializeUploader() {
    if (!checkDependencies()) {
      console.warn('等待依赖加载...')
      setTimeout(initializeUploader, 100)
      return
    }

    try {
      if (!window.fileUploader) {
        window.fileUploader = new FileUploader()
        //console.log('FileUploader initialized successfully')
      }
    } catch (error) {
      console.error('Failed to initialize FileUploader:', error)
    }
  }

  // 导出打开上传对话框方法
  window.openUpload = function (path) {
    if (!window.fileUploader) {
      console.warn('上传器未初始化,正在重试...')
      initializeUploader()
      setTimeout(() => {
        if (window.fileUploader) {
          window.fileUploader.openUploadModal(path)
        } else {
          window.showNotification('上传功能初始化失败，请刷新页面重试', 'error')
        }
      }, 500)
      return
    }
    console.log('上传路径', path)
    window.fileUploader.openUploadModal(path)
  }

  // 开始初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUploader)
  } else {
    initializeUploader()
  }
})()

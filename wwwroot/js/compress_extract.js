/**
 * 压缩解压API封装
 * 依赖：api.js, public.js (用于showNotification)
 */
;(function () {
  const API = window.API

  window.CompressExtractAPI = {
    /**
     * 压缩文件或文件夹
     * @param {string} sourcePath - 要压缩的文件或文件夹路径
     * @param {string} targetPath - 压缩包保存路径 (已包含扩展名)
     * @returns {Promise<Object>}
     */
    async compressItem(sourcePath, targetPath) {
      // 确保路径以/开头
      let cleanSourcePath = sourcePath.startsWith('/') ? sourcePath : '/' + sourcePath
      let cleanTargetPath = targetPath.startsWith('/') ? targetPath : '/' + targetPath
      // 规范化路径
      cleanSourcePath = cleanSourcePath.replace(/\/+/g, '/')
      cleanTargetPath = cleanTargetPath.replace(/\/+/g, '/')

      return API.request(
        `/@api/file/compress`,
        {
          sourcePath: cleanSourcePath,
          targetPath: cleanTargetPath,
        },
        { needToken: true }
      )
    },

    /**
     * 解压文件
     * @param {string} sourcePath - 要解压的压缩包路径
     * @param {string} targetPath - 解压到的目标路径
     * @returns {Promise<Object>}
     */
    async extractItem(sourcePath, targetPath) {
      // 确保路径以/开头
      let cleanSourcePath = sourcePath.startsWith('/') ? sourcePath : '/' + sourcePath
      let cleanTargetPath = targetPath.startsWith('/') ? targetPath : '/' + targetPath
      // 规范化路径
      cleanSourcePath = cleanSourcePath.replace(/\/+/g, '/')
      cleanTargetPath = cleanTargetPath.replace(/\/+/g, '/')

      return API.request(
        `/@api/file/extract`,
        {
          sourcePath: cleanSourcePath,
          targetPath: cleanTargetPath,
        },
        { needToken: true }
      )
    },

    /**
     * 批量压缩多个文件到一个压缩包
     * @param {Array<string>} itemPaths - 要压缩的文件路径数组
     * @param {string} targetPath - 压缩包完整路径（已包含扩展名）
     * @returns {Promise<Object>}
     */
    async compressBatch(itemPaths, targetPath) {
      if (!itemPaths || itemPaths.length === 0) {
        throw new Error('没有选择要压缩的文件')
      }

      // 如果只有一个文件/文件夹，直接压缩
      if (itemPaths.length === 1) {
        const sourcePath = itemPaths[0]
        // 确保传递完整路径，不再添加扩展名
        return this.compressItem(sourcePath, targetPath)
      }

      // 多个文件时，使用批量压缩接口将多个文件压缩到一个压缩包
      const cleanSourcePaths = itemPaths.map((path) => {
        // 确保路径以/开头
        let cleanPath = path.startsWith('/') ? path : '/' + path
        // 规范化路径
        return cleanPath.replace(/\/+/g, '/')
      })

      // 确保路径规范化
      const cleanTargetPath = targetPath.startsWith('/') ? targetPath : '/' + targetPath

      return API.request(
        `/@api/file/compress`,
        {
          sourcePaths: cleanSourcePaths,
          targetPath: cleanTargetPath,
        },
        { needToken: true }
      )
    },

    /**
     * 构建目标压缩包路径
     * @param {string} targetDir - 目标目录
     * @param {string} archiveName - 压缩包名称
     * @returns {string} - 完整的目标路径
     */
    buildTargetPath(targetDir, archiveName) {
      // 确保压缩包名称以.tarz结尾
      const fileName = archiveName.endsWith('.tarz') ? archiveName : `${archiveName}.tarz`
      return targetDir.endsWith('/') ? `${targetDir}${fileName}` : `${targetDir}/${fileName}`
    },

    /**
     * 检查文件是否为支持的压缩格式
     * @param {string} fileName - 文件名
     * @returns {boolean} - 是否为支持的压缩格式
     */
    isSupportedArchive(fileName) {
      const supportedExtensions = [
        '.tarz',
        '.tar.z',
        '.tar',
        '.tar.gz',
        '.tar.bz2',
        '.tar.xz',
        '.zip',
        '.gz',
        '.bz2',
        '.7z',
        '.rar',
        '.xz',
        '.lz',
        '.lzma',
        '.Z',
      ]

      const lowerFileName = fileName.toLowerCase()
      return supportedExtensions.some((ext) => lowerFileName.endsWith(ext))
    },

    /**
     * 获取文件的压缩格式
     * @param {string} fileName - 文件名
     * @returns {string} - 压缩格式名称
     */
    getArchiveFormat(fileName) {
      const lowerFileName = fileName.toLowerCase()

      if (lowerFileName.endsWith('.tar.gz')) return 'tar.gz'
      if (lowerFileName.endsWith('.tar.bz2')) return 'tar.bz2'
      if (lowerFileName.endsWith('.tar.xz')) return 'tar.xz'
      if (lowerFileName.endsWith('.tar.z') || lowerFileName.endsWith('.tarz')) return 'tar.z'
      if (lowerFileName.endsWith('.tar')) return 'tar'
      if (lowerFileName.endsWith('.zip')) return 'zip'
      if (lowerFileName.endsWith('.7z')) return '7z'
      if (lowerFileName.endsWith('.rar')) return 'rar'
      if (lowerFileName.endsWith('.gz')) return 'gz'
      if (lowerFileName.endsWith('.bz2')) return 'bz2'
      if (lowerFileName.endsWith('.xz')) return 'xz'
      if (lowerFileName.endsWith('.lz')) return 'lz'
      if (lowerFileName.endsWith('.lzma')) return 'lzma'
      if (lowerFileName.endsWith('.Z')) return 'Z'

      return 'unknown'
    },

    /**
     * 压缩并下载
     * @param {string} sourcePath - 要压缩的文件或文件夹路径
     * @param {string} archiveName - 压缩包名称
     * @param {boolean} deleteOriginal - 是否删除原文件
     * @param {boolean} keepArchive - 是否保留压缩包在服务器上
     * @returns {Promise<void>}
     */
    async compressAndDownload(sourcePath, archiveName, deleteOriginal = false, keepArchive = true) {
      try {
        // 使用临时目录存放压缩包
        const tempDir = '/tmp'
        // 确保压缩包名称已经包含.tarz扩展名
        const safeArchiveName = archiveName.endsWith('.tarz') ? archiveName : `${archiveName}.tarz`
        const targetPath = `${tempDir}/${safeArchiveName}`.replace(/\/+/g, '/')

        // 执行压缩 (直接使用完整路径，避免再次添加扩展名)
        const result = await this.compressItem(sourcePath, targetPath)

        if (result.data && result.data.compressedPath) {
          // 下载压缩包
          const accessToken = window.API.TokenManager.getAccessToken()
          if (accessToken) {
            window.location.href = `/@api/file/download?path=${encodeURIComponent(result.data.compressedPath)}&token=${accessToken}`

            // 如果设置了删除原文件
            if (deleteOriginal) {
              setTimeout(async () => {
                try {
                  await window.FileOperations.deleteItem(sourcePath)
                  window.showNotification('原文件已删除', 'info')
                } catch (error) {
                  window.showNotification(`删除原文件失败: ${error.message}`, 'error')
                }
              }, 2000) // 延迟2秒执行删除操作，确保下载开始
            }

            // 如果不保留压缩包，删除临时压缩包
            if (!keepArchive) {
              setTimeout(async () => {
                try {
                  await window.FileOperations.deleteItem(result.data.compressedPath)
                } catch (error) {
                  console.warn('清理临时压缩包失败:', error)
                }
              }, 5000) // 延迟5秒删除，确保下载完成
            }

            window.showNotification('压缩包下载已开始', 'success')
          } else {
            throw new Error('未找到认证信息，无法下载')
          }
        } else {
          throw new Error('压缩失败，未获得压缩包路径')
        }
      } catch (error) {
        window.showNotification(`压缩下载失败: ${error.message}`, 'error')
        throw error
      }
    },

    /**
     * 批量压缩并下载
     * @param {Array<string>} itemPaths - 要压缩的文件路径数组
     * @param {string} archiveName - 压缩包名称
     * @param {boolean} deleteOriginal - 是否删除原文件
     * @param {boolean} keepArchive - 是否保留压缩包在服务器上
     * @returns {Promise<void>}
     */
    async compressBatchAndDownload(itemPaths, archiveName, deleteOriginal = false, keepArchive = true) {
      if (!itemPaths || itemPaths.length === 0) {
        throw new Error('没有选择要压缩的文件')
      }

      try {
        // 使用临时目录存放压缩包
        const tempDir = '/tmp'
        // 确保压缩包名称已经包含.tarz扩展名
        const safeArchiveName = archiveName.endsWith('.tarz') ? archiveName : `${archiveName}.tarz`
        const targetPath = `${tempDir}/${safeArchiveName}`.replace(/\/+/g, '/')

        // 批量压缩到一个压缩包
        const result = await this.compressBatch(itemPaths, targetPath)

        if (result.data && result.data.compressedPath) {
          // 下载压缩包
          const accessToken = window.API.TokenManager.getAccessToken()
          if (accessToken) {
            window.location.href = `/@api/file/download?path=${encodeURIComponent(result.data.compressedPath)}&token=${accessToken}`

            // 如果设置了删除原文件
            if (deleteOriginal) {
              setTimeout(async () => {
                try {
                  // 删除所有原始文件
                  for (const sourcePath of itemPaths) {
                    await window.FileOperations.deleteItem(sourcePath)
                  }
                  window.showNotification('原文件已删除', 'info')
                } catch (error) {
                  window.showNotification(`删除原文件失败: ${error.message}`, 'error')
                }
              }, 2000) // 延迟2秒执行删除操作，确保下载开始
            }

            // 如果不保留压缩包，删除临时压缩包
            if (!keepArchive) {
              setTimeout(async () => {
                try {
                  await window.FileOperations.deleteItem(result.data.compressedPath)
                } catch (error) {
                  console.warn('清理临时压缩包失败:', error)
                }
              }, 5000) // 延迟5秒删除，确保下载完成
            }

            window.showNotification('压缩包下载已开始', 'success')
          } else {
            throw new Error('未找到认证信息，无法下载')
          }
        } else {
          throw new Error('压缩失败，未获得压缩包路径')
        }
      } catch (error) {
        window.showNotification(`批量压缩下载失败: ${error.message}`, 'error')
        throw error
      }
    },

    /**
     * 生成唯一的压缩包名称
     * @param {string} baseName - 基础名称
     * @param {string} targetDir - 目标目录
     * @returns {string} - 唯一的压缩包名称
     */
    generateUniqueArchiveName(baseName, targetDir) {
      // 这里简化处理，实际应该检查目标目录中的现有文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      return `${baseName}_${timestamp}`
    },
  }
})()

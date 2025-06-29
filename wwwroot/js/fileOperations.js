/**
 * 文件操作API封装
 * 依赖：api.js, public.js (用于showNotification)
 */
;(function () {
  const API = window.API

  window.FileOperations = {
    /**
     * 创建新文件夹
     * @param {string} parentPath - 父目录路径
     * @param {string} folderName - 文件夹名称
     * @returns {Promise<Object>}
     */
    async createFolder(parentPath, folderName) {
      // 确保路径以/开头
      let cleanParentPath = parentPath.startsWith('/') ? parentPath : '/' + parentPath
      // 规范化路径
      cleanParentPath = cleanParentPath.replace(/\/+/g, '/')

      return API.request(
        `/@api/file/createFolder`,
        {
          path: cleanParentPath,
          name: folderName,
        },
        { needToken: true }
      )
    },

    /**
     * 创建新文件
     * @param {string} parentPath - 父目录路径
     * @param {string} fileName - 文件名称
     * @returns {Promise<Object>}
     */
    async createFile(parentPath, fileName) {
      // 确保路径以/开头
      let cleanParentPath = parentPath.startsWith('/') ? parentPath : '/' + parentPath
      // 规范化路径
      cleanParentPath = cleanParentPath.replace(/\/+/g, '/')

      return API.request(
        `/@api/file/createFile`,
        {
          path: cleanParentPath,
          name: fileName,
        },
        { needToken: true }
      )
    },

    /**
     * 删除文件或文件夹
     * @param {string} itemPath - 要删除的文件或文件夹路径
     * @returns {Promise<Object>}
     */
    async deleteItem(itemPath) {
      // 确保路径以/开头
      let cleanItemPath = itemPath.startsWith('/') ? itemPath : '/' + itemPath
      // 规范化路径
      cleanItemPath = cleanItemPath.replace(/\/+/g, '/')

      return API.request(`/@api/file/delete?path=${encodeURIComponent(cleanItemPath)}`, {}, { needToken: true })
    },

    /**
     * 移动/重命名文件或文件夹
     * @param {string} sourcePath - 源路径
     * @param {string} destinationPath - 目标路径 (包含新名称，如果是重命名)
     * @returns {Promise<Object>}
     */
    async moveItem(sourcePath, destinationPath) {
      // 确保路径以/开头
      let cleanSourcePath = sourcePath.startsWith('/') ? sourcePath : '/' + sourcePath
      let cleanDestinationPath = destinationPath.startsWith('/') ? destinationPath : '/' + destinationPath
      // 规范化路径
      cleanSourcePath = cleanSourcePath.replace(/\/+/g, '/')
      cleanDestinationPath = cleanDestinationPath.replace(/\/+/g, '/')

      // 发送请求
      const result = await API.request(
        `/@api/file/move`,
        {
          sourcePath: cleanSourcePath,
          destinationPath: cleanDestinationPath,
        },
        { needToken: true }
      )

      // 请求成功后自动更新图片预览
      try {
        this.updateImagePreviewAfterMove(cleanSourcePath, cleanDestinationPath)
      } catch (err) {
        console.error('更新图片预览失败:', err)
      }

      return result
    },

    /**
     * 复制文件或文件夹
     * @param {string} sourcePath
     * @param {string} destinationPath
     * @returns {Promise<Object>}
     */
    async copyItem(sourcePath, destinationPath) {
      // 确保路径以/开头
      let cleanSourcePath = sourcePath.startsWith('/') ? sourcePath : '/' + sourcePath
      let cleanDestinationPath = destinationPath.startsWith('/') ? destinationPath : '/' + destinationPath
      // 规范化路径
      cleanSourcePath = cleanSourcePath.replace(/\/+/g, '/')
      cleanDestinationPath = cleanDestinationPath.replace(/\/+/g, '/')

      return API.request(
        `/@api/file/copy`,
        {
          sourcePath: cleanSourcePath,
          destinationPath: cleanDestinationPath,
        },
        { needToken: true }
      )
    },
    /**
     * 更新图片预览（在移动/重命名操作后）
     * @param {string} oldPath - 旧路径
     * @param {string} newPath - 新路径
     */
    updateImagePreviewAfterMove(oldPath, newPath) {
      try {
        // 找到所有与该路径相关的图片预览
        const accessToken = window.API.TokenManager.getAccessToken()
        if (!accessToken) return

        // 查找文件项元素
        const fileItem = document.querySelector(`.file-item[data-path="${CSS.escape(oldPath)}"]`)
        if (!fileItem) return

        // 更新路径属性
        fileItem.dataset.path = newPath

        // 查找并更新图片预览
        const imgPreview = fileItem.querySelector('.file-image-preview')
        if (imgPreview) {
          // 更新图片预览的src
          imgPreview.src = `/@api/file/download?path=${encodeURIComponent(newPath)}&token=${accessToken}`

          // 如果图片有alt属性，从新路径中提取文件名更新它
          const fileName = newPath.split('/').pop()
          if (fileName) {
            imgPreview.alt = fileName
          }
        }
      } catch (error) {
        console.error('ERROR: 更新图片预览失败:', error)
      }
    },
  }
})()

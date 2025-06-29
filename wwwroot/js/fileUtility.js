/**
 * 文件操作工具集
 * 包含读取文件内容、获取文件URL等通用功能
 * 依赖：api.js
 */

;(function () {
  /**
   * 获取文件内容
   * @param {string} filePath - 文件路径
   * @param {boolean} [asText=true] - 是否作为文本返回，false则返回二进制数据
   * @returns {Promise<{content: string|ArrayBuffer, success: boolean, message: string}>}
   */
  async function getFileContent(filePath, asText = true) {
    try {
      // 从后端读取文件内容
      const res = await window.API.request(`/@api/file/read?path=${encodeURIComponent(filePath)}`, {}, { needToken: true })

      if (res.data && (typeof res.data.content === 'string' || res.data.content instanceof ArrayBuffer)) {
        return {
          success: true,
          content: res.data.content,
          message: '获取文件内容成功',
        }
      } else {
        console.error('获取文件内容失败:', res)
        return {
          success: false,
          content: null,
          message: '获取文件内容失败或内容为空',
        }
      }
    } catch (err) {
      console.error('读取文件内容时发生错误:', err)
      return {
        success: false,
        content: null,
        message: err.message || '读取文件失败',
      }
    }
  }

  /**
   * 获取文件下载URL（带Token）
   * @param {string} filePath - 文件路径
   * @returns {string} 文件URL，如果未登录则返回空字符串
   */
  function getFileUrl(filePath) {
    const accessToken = window.API.TokenManager.getAccessToken()
    if (!accessToken) {
      console.error('未找到有效的访问令牌')
      return ''
    }
    return `/@api/file/download?path=${encodeURIComponent(filePath)}&token=${accessToken}`
  }

  /**
   * 获取文件读取URL（带Token）
   * @param {string} filePath - 文件路径
   * @returns {string} 文件URL，如果未登录则返回空字符串
   */
  function getFileReadUrl(filePath) {
    const accessToken = window.API.TokenManager.getAccessToken()
    if (!accessToken) {
      console.error('未找到有效的访问令牌')
      return ''
    }
    return `/@api/file/read?path=${encodeURIComponent(filePath)}&token=${accessToken}`
  }

  /**
   * 获取文件扩展名
   * @param {string} filename - 文件名
   * @returns {string} 小写的文件扩展名
   */
  function getFileExtension(filename) {
    return filename.substring(filename.lastIndexOf('.')).toLowerCase()
  }

  /**
   * 保存文件内容
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async function saveFileContent(filePath, content) {
    try {
      const res = await window.API.request(
        `/@api/file/saveContent`,
        {
          path: filePath,
          content: content,
        },
        { needToken: true }
      )

      if (res.data && res.data.message) {
        return {
          success: true,
          message: res.data.message,
        }
      } else {
        return {
          success: false,
          message: '保存文件失败',
        }
      }
    } catch (err) {
      console.error('保存文件内容时发生错误:', err)
      return {
        success: false,
        message: err.message || '保存文件失败',
      }
    }
  }

  /**
   * 获取媒体文件URL（使用download接口，适用于视频、音频、图片）
   * @param {string} filePath - 文件路径
   * @returns {string} 媒体文件URL，如果未登录则返回空字符串
   */
  function getMediaFileUrl(filePath) {
    const accessToken = window.API.TokenManager.getAccessToken()
    if (!accessToken) {
      console.error('未找到有效的访问令牌')
      return ''
    }
    return `/@api/file/download?path=${encodeURIComponent(filePath)}&token=${accessToken}`
  }

  // 将功能暴露给全局
  window.FileUtility = {
    getFileContent,
    getFileUrl,
    getFileReadUrl,
    getFileExtension,
    saveFileContent,
    getMediaFileUrl,
  }
})()

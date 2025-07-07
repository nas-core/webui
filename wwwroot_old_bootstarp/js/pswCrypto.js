/**
 * 简单的加密解密工具
 * 使用用户名作为密钥进行加密解密
 */

const PasswordCrypto = {
  /**
   * 加密数据
   * @param {string} data - 要加密的数据
   * @param {string} key - 加密密钥(通常是用户名)
   * @returns {string} - 返回加密后的字符串
   */
  encrypt(data, key) {
    key = 'nascore' + key
    try {
      let result = ''
      for (let i = 0; i < data.length; i++) {
        // 使用key的字符循环异或
        const keyChar = key.charCodeAt(i % key.length)
        const dataChar = data.charCodeAt(i)
        const encryptedChar = keyChar ^ dataChar
        result += String.fromCharCode(encryptedChar)
      }
      // 转换为Base64以便存储
      return btoa(result)
    } catch (error) {
      console.error('加密失败:', error)
      throw new Error('加密失败')
    }
  },

  /**
   * 解密数据
   * @param {string} encryptedData - 加密后的字符串
   * @param {string} key - 解密密钥(通常是用户名)
   * @returns {string} - 返回解密后的原始数据
   */
  decrypt(encryptedData, key) {
    key = 'nascore' + key
    try {
      // 从Base64转回原始加密字符串
      const data = atob(encryptedData)
      let result = ''
      for (let i = 0; i < data.length; i++) {
        // 使用相同的key进行异或运算即可解密
        const keyChar = key.charCodeAt(i % key.length)
        const dataChar = data.charCodeAt(i)
        const decryptedChar = keyChar ^ dataChar
        result += String.fromCharCode(decryptedChar)
      }
      return result
    } catch (error) {
      console.error('解密失败:', error)
      throw new Error('解密失败')
    }
  },
}

// 导出加密工具类
window.PasswordCrypto = PasswordCrypto

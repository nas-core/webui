/**
 * 认证检查模块
 * 检查用户是否已登录，如果未登录则跳转到登录页面
 */

;(function () {
  // 当前页面是否为登录页面
  const isLoginPage = window.location.pathname.endsWith('login.shtml')
  // 如果是登录页面，不需要检查
  if (isLoginPage && checkAuth()) {
    return
  }
  /**
   * 检查token是否过期
   * @param {number} expiresTimestamp - 过期时间戳
   * @returns {boolean} - 是否过期
   */
  function isTokenExpired(expiresTimestamp) {
    if (!expiresTimestamp) return true
    // 当前时间戳（毫秒）
    const now = Date.now()
    // 过期时间戳（毫秒）
    var expires = parseInt(expiresTimestamp)
    expires = expires * 1000
    // 如果过期时间小于当前时间，则认为已过期
    return expires < now
  }

  /**
   * 检查认证状态
   * @returns {boolean} - 是否已认证
   */
  function checkAuth() {
    try {
      // 获取refresh token和过期时间
      const refreshToken = TokenManager.getRefreshToken()
      const refreshTokenExpires = TokenManager.getRefreshTokenExpires()

      // 如果没有refresh token，则未认证
      if (!refreshToken) {
        console.warn('未找到refresh token')
        return false
      }

      // 检查refresh token是否过期
      if (isTokenExpired(refreshTokenExpires)) {
        console.warn('refresh token已过期')
        return false
      }

      // 通过所有检查，认为已认证
      return true
    } catch (error) {
      console.error('检查认证状态时发生错误:', error)
      return false
    }
  }

  /**
   * 重定向到登录页面
   */
  function redirectToLogin() {
    // 清除所有token
    TokenManager.clear()
    // 保存当前页面URL，以便登录后返回
    const currentPath = window.location.pathname
    if (!currentPath.endsWith('login.shtml')) {
      try {
        localStorage.setItem('redirect_after_login', currentPath)
      } catch (error) {
        console.error('保存重定向路径时发生错误:', error)
      }
    }
    // 重定向到登录页面
    window.location.href = 'login.shtml'
  }

  // 执行认证检查
  if (!checkAuth()) {
    redirectToLogin()
  }
})()

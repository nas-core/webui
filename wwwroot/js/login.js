/**
 * 登录页面逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  // 存储账号信息的键名
  const SAVED_ACCOUNTS_KEY = 'saved_accounts'

  // 获取DOM元素
  const loginForm = document.querySelector('#login-form')
  const usernameInput = document.getElementById('username')
  const passwordInput = document.getElementById('password')
  const rememberCheckbox = document.getElementById('remember-password')
  const savedAccountsSection = document.getElementById('saved-accounts-section')
  const backToSavedAccountsBtn = document.getElementById('backToSavedAccountsBtn')

  // 初始化Toast
  const rememberPasswordToast = new bootstrap.Toast(document.getElementById('rememberPasswordToast'), {
    autohide: false,
  })

  // 记住密码的状态
  let isRememberConfirmed = false

  // 初始化页面
  initPage()

  // 监听记住密码复选框变化
  rememberCheckbox.addEventListener('change', function (e) {
    if (e.target.checked && !isRememberConfirmed) {
      rememberPasswordToast.show()
      isRememberConfirmed = true
      rememberCheckbox.checked = true
    }
  })

  /**
   * 页面初始化
   */
  function initPage() {
    const savedAccounts = getSavedAccounts()

    if (savedAccounts.length > 0) {
      renderSavedAccounts(savedAccounts)
      savedAccountsSection.style.display = 'block'
      loginForm.style.display = 'none'
      if (backToSavedAccountsBtn) {
        backToSavedAccountsBtn.style.display = 'none' // 在账号列表页隐藏“选择已记录账号”
      }
    } else {
      savedAccountsSection.style.display = 'none'
      loginForm.style.display = 'block'
      if (backToSavedAccountsBtn) {
        backToSavedAccountsBtn.style.display = 'none' // 没有保存的账号，也隐藏此按钮
      }
    }
  }

  /**
   * 获取保存的账号列表
   */
  function getSavedAccounts() {
    const accounts = localStorage.getItem(SAVED_ACCOUNTS_KEY)
    return accounts ? JSON.parse(accounts) : []
  }

  /**
   * 保存账号信息
   */
  function saveAccount(username, password) {
    try {
      // 使用用户名作为key加密密码
      const encryptedPassword = PasswordCrypto.encrypt(password, username)
      const accounts = getSavedAccounts()
      // 检查是否已存在
      const existingIndex = accounts.findIndex((acc) => acc.username === username)
      if (existingIndex >= 0) {
        accounts[existingIndex] = { username, password: encryptedPassword }
      } else {
        accounts.push({ username, password: encryptedPassword })
      }
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts))
    } catch (error) {
      console.error('保存账号失败:', error)
      alert('保存账号失败')
    }
  }

  /**
   * 渲染已保存的账号列表
   */
  function renderSavedAccounts(accounts) {
    const listContainer = document.querySelector('.saved-accounts-list')
    listContainer.innerHTML = accounts
      .map(
        (account) => `
      <div class="card mb-2" data-username="${account.username}" style="opacity: 1">
        <div class="card-body d-flex justify-content-between align-items-center py-2">
          <div class="d-flex align-items-center">
            <i class="bi bi-person text-primary" style="margin-right:0.5rem"></i>
            <div>
              <div class="fw-bold">${account.username}</div>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="quickLogin('${account.username}', '${account.password}')">
              <i class="bi bi-box-arrow-in-right me-1"></i>登录
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteAccount('${account.username}')">
              删除
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('')
  }

  /**
   * 删除保存的账号
   */
  function deleteAccount(username) {
    const accounts = getSavedAccounts().filter((acc) => acc.username !== username)
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts))

    // 找到要删除的DOM元素
    const accountElement = document.querySelector(`[data-username="${username}"]`)
    if (accountElement) {
      // 添加淡出动画
      accountElement.style.transition = 'opacity 0.3s'
      accountElement.style.opacity = '0'

      // 等待动画完成后移除元素
      setTimeout(() => {
        if (accounts.length === 0) {
          // 如果没有账号了，切换到手动输入界面，并隐藏“选择已记录账号”按钮
          savedAccountsSection.style.display = 'none'
          loginForm.style.display = 'block'
          if (backToSavedAccountsBtn) {
            backToSavedAccountsBtn.style.display = 'none'
          }
        } else {
          // 否则只移除这一行
          accountElement.remove()
        }
      }, 300)
    }
  }

  /**
   * 切换到手动登录界面
   */
  window.switchToManualLogin = () => {
    savedAccountsSection.style.display = 'none'
    loginForm.style.display = 'block'
    // 如果有保存的账号，显示“选择已记录账号”按钮
    if (backToSavedAccountsBtn && getSavedAccounts().length > 0) {
      backToSavedAccountsBtn.style.display = 'inline-block'
    } else {
      //console.log('DEBUG: switchToManualLogin - 没有已保存账号或按钮不存在，隐藏“选择已记录账号”按钮。')
    }
  }

  /**
   * 切换回已保存账号列表界面
   */
  function switchToSavedAccounts() {
    const savedAccounts = getSavedAccounts()
    if (savedAccounts.length > 0) {
      renderSavedAccounts(savedAccounts)
      savedAccountsSection.style.display = 'block'
      loginForm.style.display = 'none'
      if (backToSavedAccountsBtn) {
        backToSavedAccountsBtn.style.display = 'none' // 在账号列表页隐藏此按钮
      }
    } else {
    }
  }

  /**
   * 快速登录
   */
  window.quickLogin = async (username, encryptedPassword) => {
    try {
      // 使用用户名作为key解密密码
      const password = PasswordCrypto.decrypt(encryptedPassword, username)

      const response = await API.request('{{.ServerUrl}}/@api/user/login', {
        username,
        password,
      })

      if (response.data) {
        localStorage.removeItem('clipboard') // 防止多账号切换冲突
        API.TokenManager.setTokens(response.data)
        window.location.href = 'nascore.shtml'
      } else {
        window.showNotification('登录失败：' + (response.message || '未知错误'), 'error')
      }
    } catch (error) {
      window.showNotification('登录失败：' + (error.message || '未知错误'), 'error')
    }
  }

  // 暴露全局函数
  window.deleteAccount = deleteAccount
  // 绑定“选择已记录账号”按钮事件
  if (backToSavedAccountsBtn) {
    backToSavedAccountsBtn.addEventListener('click', switchToSavedAccounts)
  }

  /**
   * 处理登录表单提交
   */
  async function handleLogin(event) {
    event.preventDefault()

    const username = usernameInput.value.trim()
    const password = passwordInput.value.trim()

    if (!username || !password) {
      window.showNotification('请输入用户名和密码', 'warning')
      return
    }

    try {
      const response = await API.request('{{.ServerUrl}}/@api/user/login', {
        username,
        password,
      })

      if (response.data) {
        if (rememberCheckbox.checked && isRememberConfirmed) {
          saveAccount(username, password)
        }
        console.log('登录成功')
        API.TokenManager.setTokens(response.data)
        window.location.href = 'nascore.shtml'
      } else {
        window.showNotification('登录失败：密码错误', 'error')
      }
    } catch (error) {
      window.showNotification('登录失败：可能是密码错误', 'error')
      console.log('登录失败：' + (error.message || '未知错误'))
    }
  }

  // 绑定表单提交事件
  loginForm.addEventListener('submit', handleLogin)
  document.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && loginForm.style.display !== 'none') {
      loginForm.dispatchEvent(new Event('submit'))
    }
  })
})

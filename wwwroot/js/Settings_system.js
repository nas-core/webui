document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('mainform')

  // 全局变量，用于存储和访问设置数据
  window.globalSettingsData = {}
  // 监听表单输入变化，同步到全局变量
  form.addEventListener('input', function (event) {
    const target = event.target
    if (target.dataset.bind) {
      const bindPath = target.dataset.bind
      let value = target.type === 'checkbox' ? target.checked : target.value
      // 如果是数字类型，转换为整数
      if (target.type === 'number' || target.dataset.type === 'number') {
        value = parseInt(value, 10) || 0 // 转换失败时默认为 0
      }
      // 更新全局数据
      setNestedValue(window.globalSettingsData, bindPath, value)
    }
  })
  // 获取全局设置
  function getGlobalSettings() {
    const token = localStorage.getItem('jwt_access_token')
    fetch('/@api/admin/globalSettings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        window.globalSettingsData = data.data
        renderForm(window.globalSettingsData)
      })
      .catch((error) => {
        console.error('Error getting global settings:', error)
        window.showNotification('获取全局设置失败', 'error')
      })
  }

  // 渲染表单
  function renderForm(data) {
    const formElements = form.querySelectorAll('[data-bind]')
    formElements.forEach((element) => {
      const bindPath = element.dataset.bind
      const value = getNestedValue(data, bindPath)

      // 特殊处理数组绑定，例如用户列表
      if (Array.isArray(value) && element.dataset.bindHandler) {
        const handler = window[element.dataset.bindHandler]
        if (typeof handler === 'function') {
          try {
            handler(element, value)
          } catch (handlerError) {
            console.error(`ERROR: Handler for ${bindPath} failed:`, handlerError) // 捕获错误
          }
        }
      } else if (element.type === 'checkbox') {
        element.checked = value
      } else if (value !== undefined) {
        // 只有当值明确存在时才设置，避免清空未绑定的输入框
        if (typeof value === 'string') {
          element.value = value.trim() // 去除前后空格和空行
        } else {
          element.value = value
        }
      }
    })
  }

  // 获取嵌套对象的值
  function getNestedValue(obj, path) {
    const pathParts = path.split('.')
    let value = obj
    for (const part of pathParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined // 返回 undefined 而不是空字符串，以便区分不存在的路径和空字符串值
      }
    }
    return value
  }

  // 保存全局设置
  window.saveGlobalSetting = function () {
    const data = window.globalSettingsData // 直接使用全局数据

    const token = localStorage.getItem('jwt_access_token')
    fetch('/@api/admin/globalSettings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.error) {
          window.showNotification('保存成功', 'success')
          //getGlobalSettings()
        } else {
          window.showNotification('保存失败', 'error')
        }
      })
      .catch((error) => {
        console.error('Error saving global settings:', error)
        window.showNotification('保存失败', 'error')
      })
  }

  // 获取表单数据 (此函数现在直接返回全局数据)
  function getFormData() {
    return window.globalSettingsData
  }

  // 暴露一个函数，用于在其他脚本中手动触发表单更新
  window.updateGlobalSettingsForm = function () {
    renderForm(window.globalSettingsData)
  }

  // 设置嵌套对象的值 (此函数将不再直接用于收集整个表单数据，但保留以防万一)
  function setNestedValue(obj, path, value) {
    const pathParts = path.split('.')
    let current = obj
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i]
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }
    current[pathParts[pathParts.length - 1]] = value
  }

  // 页面加载时获取全局设置
  getGlobalSettings()
})

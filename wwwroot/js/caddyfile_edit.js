async function EditCaddy() {
  const fileEditorModalEl = document.getElementById('fileEditorModalCaddy')
  if (!fileEditorModalEl) {
    console.error('File editor modal element not found. Editing functionality will be limited.')
    // No return here, so global functions are still exposed, just modal won't work.
    return
  }
  const editModal = new bootstrap.Modal(fileEditorModalEl, { keyboard: false })
  editModal.show()

  // 确保在添加/编辑网站模态框关闭后，Caddyfile编辑器模态框重新显示
  const addEditSiteModalEl = document.getElementById('addEditSiteModal')
  if (addEditSiteModalEl) {
    addEditSiteModalEl.addEventListener('hidden.bs.modal', function () {
      editModal.show()
    })
  }
  // 文件内容加载和UI更新现在由 caddyfile_edit_for_caddyfile.js 中的事件监听器处理
  // 该监听器会在模态框完全显示 (shown.bs.modal) 后调用 loadAndParseCaddyfile()
}

/**
 * 保存Caddyfile编辑器中的内容
 */
async function saveFileContent() {
  const filePath = document.getElementById('ThirdPartyExtCaddy2ConfigPath').value
  const content = document.getElementById('CaddyfileEditorContent').value

  const result = await saveServerFileContent(filePath, content)

  if (result.success) {
    console.log('文件保存成功:', result.message)
    const fileEditorModalEl = document.getElementById('fileEditorModalCaddy')
    window.showNotification('文件保存成功，请尝试重载', 'success')
    document.getElementById('CaddyfileEditorStatus').innerHTML = '保存成功,请重载'
  } else {
    console.error('文件保存失败:', result.message)
    // 可以在这里向用户显示错误信息，例如使用alert或更友好的通知
    alert('保存文件失败: ' + result.message)
  }
}

/**
 * 触发Caddy服务重载 和 fmt
 */
async function reloadCaddy() {
  const binPath = document.getElementById('Caddy2BinPath').value
  const configPath = document.getElementById('ThirdPartyExtCaddy2ConfigPath').value

  if (!binPath || !configPath) {
    console.error('Caddy二进制路径或配置文件路径为空，无法执行重载。')
    alert('Caddy二进制路径和配置文件路径不能为空，请检查设置。')
    return
  }

  try {
    console.log(`尝试重载 Caddy: binPath=${binPath}, configPath=${configPath}`)
    const res = await window.API.request(
      `{{.ServerUrl}}/@api/admin/SpecialOPT?opt=caddyreload&binPath=${encodeURIComponent(binPath)}&configPath=${encodeURIComponent(configPath)}`,
      {},
      { needToken: true, method: 'GET' } // 后端 Handers_admin_caddyreload 是GET请求
    )

    let notificationMessage = ''

    // 根据后端返回的code判断是response_yh.SendError还是response_yh.SendJSON
    if (res.code !== 1) {
      notificationMessage = res.message || '未知错误'
      if (res.data) {
        notificationMessage += ' (详情: ' + res.data + ')'
      }
      window.showNotification('Caddy 重载失败 ' + notificationMessage, 'danger')
    } else {
      // 如果code是1，表示后端通过response_yh.SendJSON返回了Caddy命令的输出
      if (res.data) {
        notificationMessage = '执行完成: ' + res.data
      } else if (res.message) {
        notificationMessage = 'Caddy操作消息: ' + res.message // 正常情况下应该是"ok"
      } else {
        notificationMessage = 'Caddy 重载操作完成。'
      }
    }
    window.showNotification('重载已执行', 'info')

    // 将 notificationMessage 的内容设置到日志面板中
    const LogPanel = document.getElementById('LogPanel')
    const LogPanelContent = document.getElementById('LogPanelContent')
    const LogPanelTitle = document.getElementById('LogPanelTitle')

    if (LogPanelContent && LogPanel && LogPanelTitle) {
      LogPanelContent.textContent = notificationMessage
      LogPanelTitle.innerHTML = 'Caddy 重载 消息'
    }

    document.getElementById('CaddyfileEditorStatus').innerHTML =
      '重载操作已执行 <i class="bi bi-terminal"  onclick="document.getElementById(\'LogPanel\').style.display=\'block\'" alt="查看日志"></i>'
  } catch (err) {
    console.error('重载 Caddy 时发生错误:', err)
    window.showNotification('重载 Caddy 时发生错误: ' + (err.message || '未知错误'), 'danger')
  }
}

/**
 * 获取文件读取URL（带Token）
 * @param {string} filePath - 文件路径
 * @returns {string} 文件URL，如果未登录则返回空字符串
 */
async function getServerFileContent(filePath, asText = true) {
  try {
    // 从后端读取文件内容
    const res = await window.API.request(`{{.ServerUrl}}/@api/admin/getServerFile?path=${encodeURIComponent(filePath)}`, {}, { needToken: true })

    if (res.code === 1 && res.data && (typeof res.data.content === 'string' || res.data.content instanceof ArrayBuffer)) {
      return {
        success: true,
        content: res.data.content,
        message: '获取文件内容成功',
      }
    } else if (res.code !== 1 && res.message && res.message.includes('File not found')) {
      console.warn('文件未找到，返回空内容:', filePath)
      return {
        success: true,
        content: '', // 文件未找到时返回空字符串
        message: '文件未找到，已初始化空内容',
      }
    } else {
      console.error('获取文件内容失败:', res)
      return {
        success: false,
        content: null,
        message: res.message || '获取文件内容失败或内容为空',
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
 * 保存文件内容
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function saveServerFileContent(filePath, content) {
  try {
    const res = await window.API.request(
      `{{.ServerUrl}}/@api/admin/saveServerFile?path=${encodeURIComponent(filePath)}`,
      {
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

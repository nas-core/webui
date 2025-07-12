/**
 * 下载 Openlist 到指定路径
 * 依赖：api.js, public.js (用于showNotification)
 */
async function downloadOpenlist() {
  const DownLoadlink = document.getElementById('ThirdPartyExtOpenlistDownLoadlink').value
  const Version = document.getElementById('ThirdPartyExtOpenlistVersion').value
  const BinPath = document.getElementById('OpenlistBinPath').value
  const ThirdPartyExtGitHubDownloadMirror = document.getElementById('ThirdPartyExtGitHubDownloadMirror').value

  showNotification('Openlist 正在下载，请不要离开页面', 'info')

  try {
    const response = await API.request(
      `{{.ServerUrl}}/@api/admin/get_ThirdParty_openlist?DownLoadlink=${encodeURIComponent(DownLoadlink)}&Version=${encodeURIComponent(Version)}&BinPath=${encodeURIComponent(BinPath)}&GitHubDownloadMirror=${encodeURIComponent(ThirdPartyExtGitHubDownloadMirror)}`,
      {},
      { needToken: true }
    )

    if (response.code < 10) {
      showNotification('Openlist 下载成功', 'success')
    } else {
      showNotification('Openlist 下载失败: ' + response.message, 'danger')
    }
  } catch (error) {
    showNotification('Openlist 下载出错: ' + error.message, 'danger')
  }
}

async function resetOpenListPassword() {
  const binPath = document.getElementById('OpenlistBinPath').value
  const dataPath = document.getElementById('ThirdPartyExtOpenlistDataPath').value
  if (!binPath || !dataPath) {
    console.error('openlist二进制路径或配置文件路径为空，无法执行重载。')
    alert('openlist二进制路径和配置文件路径不能为空，请检查设置。')
    return
  }
  try {
    const res = await window.API.request(
      `{{.ServerUrl}}/@api/admin/SpecialOPT?opt=openlist_reset_admin&binPath=${encodeURIComponent(binPath)}&dataPath=${encodeURIComponent(dataPath)}`,
      {},
      { needToken: true, method: 'GET' } // 后端 Handers_admin_caddyreload 是GET请求
    )

    // 根据后端返回的code判断是response_yh.SendError还是response_yh.SendJSON
    if (res.code !== 1) {
      notificationMessage = res.message || '未知错误'
      if (res.data) {
        notificationMessage += ' (详情: ' + res.data + ')'
      }
      window.showNotification(' 重置失败 ' + notificationMessage, 'danger')
    } else {
      // 如果code是1，表示后端通过response_yh.SendJSON返回了Caddy命令的输出
      if (res.data) {
        notificationMessage = '执行完成: ' + res.data
      } else if (res.message) {
        notificationMessage = '操作消息: ' + res.message // 正常情况下应该是"ok"
      } else {
        notificationMessage = '重置操作完成。'
      }
    }
    window.showNotification('重载已执行', 'info')

    // 将 notificationMessage 的内容设置到日志面板中
    const LogPanel = document.getElementById('LogPanel')
    const LogPanelContent = document.getElementById('LogPanelContent')
    const LogPanelTitle = document.getElementById('LogPanelTitle')

    if (LogPanelContent && LogPanel && LogPanelTitle) {
      LogPanelContent.textContent = notificationMessage
      LogPanelTitle.innerHTML = '服务器消息'
    }

    document.getElementById('LogPanel').style.display = 'block'
  } catch (err) {
    console.error('重置密码发生错误:', err)
    window.showNotification('重置密码发生错误: ' + (err.message || '未知错误'), 'danger')
  }
}

/**
 * 下载 LEGO 到指定路径
 * 依赖：api.js, public.js (用于showNotification)
 */
async function downloadLego() {
  const DownLoadlink = document.getElementById('AcmeLegoDownLoadlink').value
  const Version = document.getElementById('AcmeLegoVersion').value
  const BinPath = document.getElementById('AcmeLegoBinPath').value
  const ThirdPartyExtGitHubDownloadMirror = document.getElementById('ThirdPartyExtGitHubDownloadMirror').value // 假设有一个全局的 GitHub Mirror 设置

  showNotification('LEGO 正在下载，请不要离开页面', 'info')

  try {
    const response = await API.request(
      `{{.ServerUrl}}/@api/admin/get_ThirdParty_lego?DownLoadlink=${encodeURIComponent(DownLoadlink)}&Version=${encodeURIComponent(Version)}&BinPath=${encodeURIComponent(BinPath)}&GitHubDownloadMirror=${encodeURIComponent(ThirdPartyExtGitHubDownloadMirror)}`,
      {},
      { needToken: true }
    )

    if (response.code < 10) {
      showNotification('LEGO 下载成功', 'success')
    } else {
      showNotification('LEGO 下载失败: ' + response.message, 'danger')
    }
  } catch (error) {
    showNotification('LEGO 下载出错: ' + error.message, 'danger')
  }
}

function copyLegoCommand() {
  const acmeLegoCommand = document.getElementById('AcmeLegoCommand').value
  const acmeLegoPath = document.getElementById('AcmeLegoPath').value
  const acmeLegoBinPath = document.getElementById('AcmeLegoBinPath').value

  let commandToCopy = acmeLegoCommand.replace(/\${LEGO_PATH}/g, acmeLegoPath)
  commandToCopy = commandToCopy.replace(/\${BinPath}/g, acmeLegoBinPath)
  commandToCopy = commandToCopy.replace(/&nascore/g, '')

  navigator.clipboard
    .writeText(commandToCopy)
    .then(() => {
      showNotification('命令已复制到剪贴板 并替换了路径，你可以粘贴到终端中执行', 'success')
    })
    .catch((err) => {
      console.error('复制失败:', err)
      showNotification('复制命令失败，请手动复制。', 'danger')
    })
}

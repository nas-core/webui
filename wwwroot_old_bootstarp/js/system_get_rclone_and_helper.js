/**
 * 下载 rclone 到指定路径
 * 依赖：api.js, public.js (用于showNotification)
 */
async function downloadRclone() {
  const DownLoadlink = document.getElementById('ThirdPartyExtRcloneDownLoadlink').value
  const Version = document.getElementById('ThirdPartyExtRcloneVersion').value
  const BinPath = document.getElementById('RcloneBinPath').value
  const ThirdPartyExtGitHubDownloadMirror = document.getElementById('ThirdPartyExtGitHubDownloadMirror').value

  showNotification('Rclone 正在下载，请不要离开页面', 'info')

  try {
    const response = await API.request(
      `{{.ServerUrl}}/@api/admin/get_ThirdParty_rclone?DownLoadlink=${encodeURIComponent(DownLoadlink)}&Version=${encodeURIComponent(Version)}&BinPath=${encodeURIComponent(BinPath)}&GitHubDownloadMirror=${encodeURIComponent(ThirdPartyExtGitHubDownloadMirror)}`,
      {},
      { needToken: true }
    )

    if (response.code < 10) {
      showNotification('Rclone下载成功', 'success')
    } else {
      showNotification('Rclone下载失败: ' + response.message, 'danger')
    }
  } catch (error) {
    showNotification('Rclone下载出错: ' + error.message, 'danger')
  }
}

function copyRcloneMountCommand() {
  const rcloneMountCommand = document.getElementById('ThirdPartyExtRcloneAutoMountCommand').value
  const rcloneBinPath = document.getElementById('RcloneBinPath').value

  let commandToCopy = rcloneMountCommand.replace(/\${BinPath}/g, rcloneBinPath)
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

/**

 * 依赖：api.js, public.js (用于showNotification)
 */
async function downloadCaddy2() {
  const DownLoadlink = document.getElementById('ThirdPartyExtCaddy2DownLoadlink').value
  const Version = document.getElementById('ThirdPartyExtCaddy2Version').value
  const Caddy2BinPath = document.getElementById('Caddy2BinPath').value
  const ThirdPartyExtGitHubDownloadMirror = document.getElementById('ThirdPartyExtGitHubDownloadMirror').value

  showNotification('Caddy2 正在下载，请不要离开页面', 'info')

  try {
    const response = await API.request(
      `{{.ServerUrl}}/@api/admin/get_ThirdParty_caddy2?DownLoadlink=${encodeURIComponent(DownLoadlink)}&Version=${encodeURIComponent(Version)}&BinPath=${encodeURIComponent(Caddy2BinPath)}&GitHubDownloadMirror=${encodeURIComponent(ThirdPartyExtGitHubDownloadMirror)}`,
      {},
      { needToken: true }
    )

    if (response.code < 10) {
      showNotification('Caddy2 下载成功', 'success')
    } else {
      showNotification('Caddy2 下载失败: ' + response.message, 'danger')
    }
  } catch (error) {
    showNotification('Caddy2 下载出错: ' + error.message, 'danger')
  }
}

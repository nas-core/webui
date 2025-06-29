/**
 * 下载 StaticFile 到指定路径
 * 依赖：api.js, public.js (用于showNotification)
 */
async function downloadStaticFile() {
  const DownLoadlink = document.getElementById('DefaultStaticFileServiceDownloadUrl').value
  const ThirdPartyExtGitHubDownloadMirror = document.getElementById('ThirdPartyExtGitHubDownloadMirror').value
  const dstDir = document.getElementById('DefaultStaticFileServiceRoot').value
  showNotification('StaticFile 正在下载，请不要离开页面', 'info')

  try {
    const response = await API.request(
      `/@api/admin/get_staticfile?DownLoadlink=${encodeURIComponent(DownLoadlink)}&fileName=tmp-static.tarz&GitHubDownloadMirror=${encodeURIComponent(ThirdPartyExtGitHubDownloadMirror)}&dstDir=${encodeURIComponent(dstDir)}`,
      {},
      { needToken: true }
    )

    if (response.code < 10) {
      showNotification('DDNS-Go 下载成功', 'success')
    } else {
      showNotification('DDNS-Go 下载失败: ' + response.message, 'danger')
    }
  } catch (error) {
    showNotification('DDNS-Go 下载出错: ' + error.message, 'danger')
  }
}

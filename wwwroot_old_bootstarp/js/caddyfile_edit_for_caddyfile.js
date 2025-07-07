// Caddyfile 可视化编辑相关的JS逻辑
// 尽量不修改 caddyfile_edit.js

document.addEventListener('DOMContentLoaded', () => {
  const fileEditorModalCaddyEl = document.getElementById('fileEditorModalCaddy')
  if (fileEditorModalCaddyEl) {
    fileEditorModalCaddyEl.addEventListener('shown.bs.modal', async () => {
      // 模态框显示时加载并解析Caddyfile
      await loadAndParseCaddyfile()
    })
  }

  // 绑定 auto_https 复选框的事件
  document.getElementById('check_auto_https').addEventListener('change', (event) => {
    updateCaddyfileContentFromUI() // 当复选框改变时，同步到Caddyfile内容
  })
})

/**
 * Caddyfile配置的数据结构
 * @typedef {Object} CaddyConfig
 * @property {boolean} autoHttpsOff - 全局auto_https是否为off
 * @property {Array<SiteConfig>} sites - 网站配置数组
 */

/**
 * 网站配置的数据结构
 * @typedef {Object} SiteConfig
 * @property {string} address - 网站地址 (e.g., ":8080", "http://example.com")
 * @property {string} type - 网站类型 ("respond", "file_server", "reverse_proxy")
 * @property {string} [respondContent] - respond类型的内容
 * @property {string} [fileServerRoot] - file_server类型的根路径
 * @property {string} [proxyTarget] - reverse_proxy类型的目标地址
 * @property {boolean} [tlsInsecureSkipVerify] - reverse_proxy类型是否忽略TLS验证
 * @property {Object} [basicAuth] - basic_auth配置
 * @property {string} [basicAuth.username]
 * @property {string} [basicAuth.hashedPassword] - bcrypt加密后的密码
 * @property {Object} [tls] - TLS配置
 * @property {string} [tls.certPath]
 * @property {string} [tls.keyPath]
 */

/**
 * 全局变量，用于存储解析后的Caddyfile配置
 * @type {CaddyConfig}
 */
let currentCaddyConfig = {
  autoHttpsOff: false,
  sites: [],
}

/**
 * 加载并解析Caddyfile内容，然后更新UI
 */
async function loadAndParseCaddyfile() {
  const filePath = document.getElementById('ThirdPartyExtCaddy2ConfigPath').value
  const result = await getServerFileContent(filePath, true) // 使用 caddyfile_edit.js 中的函数

  if (result.success) {
    const decodedResult = atob(result.content) // base64 解码
    document.getElementById('CaddyfileEditorContent').value = decodedResult // 更新手动编辑区

    parseCaddyfileContent(decodedResult)
    renderSiteList()
  } else {
    console.error('获取Caddyfile内容失败:', result.message)
    // 如果获取失败，也尝试清空UI并初始化配置
    parseCaddyfileContent('')
    renderSiteList()
  }
}

/**
 * 解析Caddyfile文本内容到数据结构
 * @param {string} caddyfileContent - Caddyfile的原始文本内容
 */
function parseCaddyfileContent(caddyfileContent) {
  currentCaddyConfig = {
    autoHttpsOff: false,
    sites: [],
  }

  // 1. 解析全局配置 (auto_https)
  const globalBlockMatch = caddyfileContent.match(/\{\s*auto_https\s+(off|on)\s*\}/i)
  if (globalBlockMatch) {
    currentCaddyConfig.autoHttpsOff = globalBlockMatch[1].toLowerCase() === 'off'
  }

  // 更新 auto_https 复选框
  document.getElementById('check_auto_https').checked = !currentCaddyConfig.autoHttpsOff

  // 2. 解析网站配置
  // 使用更复杂的正则来匹配完整的网站块，包括其内部指令
  const siteBlocks = caddyfileContent.matchAll(/(.+?)\s*\{\n([\s\S]*?)\n\}/g)

  for (const match of siteBlocks) {
    const address = match[1].trim()
    const directives = match[2] // 网站块内的所有指令文本
    const siteConfig = {
      address: address,
      type: 'respond', // 默认类型
    }

    // 检查 respond
    const respondMatch = directives.match(/respond\s*"(.*?)"/i)
    if (respondMatch) {
      siteConfig.type = 'respond'
      siteConfig.respondContent = respondMatch[1]
    }

    // 检查 file_server
    const fileServerMatch = directives.match(/root\s*\*?\s*(\S+)\s*\n\s*file_server/i)
    if (fileServerMatch) {
      siteConfig.type = 'file_server'
      siteConfig.fileServerRoot = fileServerMatch[1]
    }

    // 检查 reverse_proxy
    const reverseProxyMatch = directives.match(/reverse_proxy\s+(\S+)([\s\S]*?)(?:transport\s+http\s*\{\s*tls_insecure_skip_verify\s*\})?/i)
    if (reverseProxyMatch) {
      siteConfig.type = 'reverse_proxy'
      siteConfig.proxyTarget = reverseProxyMatch[1]
      siteConfig.tlsInsecureSkipVerify = reverseProxyMatch[0].includes('tls_insecure_skip_verify')
    }

    // 检查 basic_auth
    const basicAuthMatch = directives.match(/basic_auth\s+\*\s*\{\s*(\S+)\s+(\S+)\s*\}/i)
    if (basicAuthMatch) {
      siteConfig.basicAuth = {
        username: basicAuthMatch[1],
        hashedPassword: basicAuthMatch[2],
      }
    }

    // 检查 tls
    const tlsMatch = directives.match(/tls\s+(\S+)\s+(\S+)/i)
    if (tlsMatch) {
      siteConfig.tls = {
        certPath: tlsMatch[1],
        keyPath: tlsMatch[2],
      }
    }

    currentCaddyConfig.sites.push(siteConfig)
  }
}

/**
 * 渲染网站列表到UI
 */
function renderSiteList() {
  const caddySiteListBody = document.getElementById('caddySiteListBody')
  caddySiteListBody.innerHTML = '' // 清空现有列表

  if (currentCaddyConfig.sites.length === 0) {
    caddySiteListBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">暂无网站配置</td>
      </tr>
    `
    return
  }

  currentCaddyConfig.sites.forEach((site, index) => {
    const row = caddySiteListBody.insertRow()
    row.insertCell(0).textContent = site.address

    let typeText = ''
    switch (site.type) {
      case 'respond':
        typeText = '<span title="响应文本" class="text-info"><i class="bi bi-file-text"></i>响应</span>'
        break
      case 'file_server':
        typeText = '<span title="静态文件服务" class="text-info"><i class="bi bi-folder"></i>文件</span>'
        break
      case 'reverse_proxy':
        typeText = '<span title="反向代理" class="text-info"><i class="bi bi-nintendo-switch"></i>代理</span>'
        break
    }
    // padding-right =0
    row.insertCell(1).innerHTML = typeText

    let detailContent = ''
    let detailTitle = ''
    const maxDetailLength = 50 // 最大显示长度

    switch (site.type) {
      case 'respond':
        detailContent = site.respondContent || ''
        detailTitle = detailContent
        if (detailContent.length > maxDetailLength) {
          detailContent = detailContent.substring(0, maxDetailLength) + '...'
        }
        break
      case 'file_server':
        detailContent = site.fileServerRoot || ''
        detailTitle = detailContent
        break
      case 'reverse_proxy':
        detailContent = site.proxyTarget || ''
        detailTitle = detailContent
        break
      default:
        detailContent = ''
        detailTitle = ''
    }

    const detailCell = row.insertCell(2)
    detailCell.textContent = detailContent
    detailCell.title = detailTitle // 鼠标悬停显示完整内容

    const actionsCell = row.insertCell(3) // 操作列现在是第四列 (索引3)
    actionsCell.innerHTML = `
      <button type="button" class="btn btn-sm btn-info me-2" onclick="editSite(${index})">编辑</button>
      <button type="button" class="btn btn-sm btn-danger" onclick="deleteSite(${index})">删除</button>
    `
  })
}

/**
 * 打开添加网站模态框
 */
function openAddSiteModal() {
  document.getElementById('editSiteIndex').value = '' // 清空索引，表示新增
  document.getElementById('addEditSiteModalLabel').textContent = '添加网站配置'
  document.getElementById('siteConfigForm').reset() // 重置表单
  document.getElementById('siteType').value = 'reverse_proxy' // 设置默认类型为反向代理
  toggleSiteTypeFields() // 显示默认的respond字段
  toggleBasicAuthFields(false) // 隐藏basic auth
  toggleTlsFields(false) // 隐藏tls
  new bootstrap.Modal(document.getElementById('addEditSiteModal')).show() // 手动显示模态框
}

/**
 * 打开编辑网站模态框并填充数据
 * @param {number} index - 要编辑的网站在数组中的索引
 */
function editSite(index) {
  const site = currentCaddyConfig.sites[index]
  document.getElementById('editSiteIndex').value = index
  document.getElementById('addEditSiteModalLabel').textContent = '编辑网站配置'

  document.getElementById('siteAddress').value = site.address
  document.getElementById('siteType').value = site.type
  toggleSiteTypeFields() // 根据类型显示/隐藏字段

  if (site.type === 'respond') {
    document.getElementById('respondContent').value = site.respondContent || ''
  } else if (site.type === 'file_server') {
    document.getElementById('fileServerRoot').value = site.fileServerRoot || ''
  } else if (site.type === 'reverse_proxy') {
    document.getElementById('proxyTarget').value = site.proxyTarget || ''
    document.getElementById('tlsInsecureSkipVerify').checked = site.tlsInsecureSkipVerify || false
  }

  // 填充 Basic Auth
  document.getElementById('enableBasicAuth').checked = !!site.basicAuth
  toggleBasicAuthFields(!!site.basicAuth)
  if (site.basicAuth) {
    document.getElementById('authUsername').value = site.basicAuth.username || ''
    document.getElementById('authPassword').value = '' // 密码不回填，需要用户重新输入
  }

  // 填充 TLS
  document.getElementById('enableTls').checked = !!site.tls
  toggleTlsFields(!!site.tls)
  if (site.tls) {
    document.getElementById('tlsCertPath').value = site.tls.certPath || ''
    document.getElementById('tlsKeyPath').value = site.tls.keyPath || ''
  }
  new bootstrap.Modal(document.getElementById('addEditSiteModal')).show() // 手动显示模态框
}

/**
 * 根据选择的网站类型显示/隐藏相关字段
 */
function toggleSiteTypeFields() {
  const siteType = document.getElementById('siteType').value
  document.querySelectorAll('.site-type-fields').forEach((field) => {
    field.style.display = 'none'
  })

  if (siteType === 'respond') {
    document.getElementById('respondFields').style.display = 'block'
  } else if (siteType === 'file_server') {
    document.getElementById('fileServerFields').style.display = 'block'
  } else if (siteType === 'reverse_proxy') {
    document.getElementById('reverseProxyFields').style.display = 'block'
  }
}

/**
 * 显示/隐藏 Basic Auth 字段
 * @param {boolean} show - 是否显示
 */
function toggleBasicAuthFields(show = null) {
  const enableBasicAuth = document.getElementById('enableBasicAuth')
  const basicAuthFields = document.getElementById('basicAuthFields')
  if (show === null) {
    basicAuthFields.style.display = enableBasicAuth.checked ? 'block' : 'none'
  } else {
    basicAuthFields.style.display = show ? 'block' : 'none'
    enableBasicAuth.checked = show
  }
}

/**
 * 显示/隐藏 TLS 字段
 * @param {boolean} show - 是否显示
 */
function toggleTlsFields(show = null) {
  const enableTls = document.getElementById('enableTls')
  const tlsFields = document.getElementById('tlsFields')
  if (show === null) {
    tlsFields.style.display = enableTls.checked ? 'block' : 'none'
  } else {
    tlsFields.style.display = show ? 'block' : 'none'
    enableTls.checked = show
  }
}

/**
 * 保存网站配置（新增或修改）
 */
async function saveSiteConfig() {
  const index = document.getElementById('editSiteIndex').value
  const siteAddress = document.getElementById('siteAddress').value.trim()
  const siteType = document.getElementById('siteType').value

  if (!siteAddress) {
    window.showNotification('网站地址不能为空', 'danger')
    return
  }

  const newSiteConfig = {
    address: siteAddress,
    type: siteType,
  }

  if (siteType === 'respond') {
    newSiteConfig.respondContent = document.getElementById('respondContent').value.trim()
  } else if (siteType === 'file_server') {
    newSiteConfig.fileServerRoot = document.getElementById('fileServerRoot').value.trim()
    if (!newSiteConfig.fileServerRoot) {
      window.showNotification('静态文件根目录不能为空', 'danger')
      return
    }
  } else if (siteType === 'reverse_proxy') {
    newSiteConfig.proxyTarget = document.getElementById('proxyTarget').value.trim()
    newSiteConfig.tlsInsecureSkipVerify = document.getElementById('tlsInsecureSkipVerify').checked
    if (!newSiteConfig.proxyTarget) {
      window.showNotification('反向代理目标地址不能为空', 'danger')
      return
    }
  }

  // 处理 Basic Auth
  if (document.getElementById('enableBasicAuth').checked) {
    const username = document.getElementById('authUsername').value.trim()
    const password = document.getElementById('authPassword').value // 密码不trim

    if (!username || !password) {
      window.showNotification('Basic Auth 用户名和密码不能为空', 'danger')
      return
    }

    // 调用后端API来加密密码
    try {
      const bcryptRes = await window.API.request(
        `{{.ServerUrl}}/@api/admin/bcryptPassword?password=${encodeURIComponent(password)}`,
        {},
        { needToken: true, method: 'GET' }
      )
      if (bcryptRes.code === 1 && bcryptRes.data && bcryptRes.data.hashedPassword) {
        newSiteConfig.basicAuth = {
          username: username,
          hashedPassword: bcryptRes.data.hashedPassword,
        }
      } else {
        window.showNotification('密码加密失败: ' + (bcryptRes.message || '未知错误'), 'danger')
        return
      }
    } catch (err) {
      window.showNotification('密码加密请求失败: ' + (err.message || '未知错误'), 'danger')
      console.error('密码加密请求失败:', err)
      return
    }
  }

  // 处理 TLS
  if (document.getElementById('enableTls').checked) {
    const certPath = document.getElementById('tlsCertPath').value.trim()
    const keyPath = document.getElementById('tlsKeyPath').value.trim()
    if (!certPath || !keyPath) {
      window.showNotification('TLS 证书和密钥路径不能为空', 'danger')
      return
    }
    newSiteConfig.tls = {
      certPath: certPath,
      keyPath: keyPath,
    }
  }

  if (index === '') {
    // 新增
    currentCaddyConfig.sites.push(newSiteConfig)
    window.showNotification('网站添加成功', 'success')
  } else {
    // 修改
    currentCaddyConfig.sites[parseInt(index)] = newSiteConfig
    window.showNotification('网站修改成功', 'success')
  }

  renderSiteList()
  updateCaddyfileContentFromUI() // 立即同步到文本区域
  bootstrap.Modal.getInstance(document.getElementById('addEditSiteModal')).hide() // 关闭模态框
}

/**
 * 删除网站配置
 * @param {number} index - 要删除的网站在数组中的索引
 */
function deleteSite(index) {
  if (confirm('确定要删除此网站配置吗？')) {
    currentCaddyConfig.sites.splice(index, 1)
    renderSiteList()
    updateCaddyfileContentFromUI() // 立即同步到文本区域
    window.showNotification('网站删除成功', 'success')
  }
}

/**
 * 将 currentCaddyConfig 数据结构转换回 Caddyfile 文本内容
 * 并更新到 CaddyfileEditorContent 文本区域
 */
function updateCaddyfileContentFromUI() {
  let caddyfile = ''

  // 全局配置
  const checkAutoHttps = document.getElementById('check_auto_https').checked
  if (!checkAutoHttps) {
    // 如果未选中 auto_https，表示需要 auto_https off
    caddyfile += '{\n\tauto_https off\n}\n\n'
  } else {
    // 如果选中 auto_https，表示需要 auto_https on
    // 如果Caddyfile中没有其他全局设置，可以不写这个空块。但为了明确，我们还是写入
    // 检查是否已经有全局块，并尝试更新
    let existingGlobalBlock = caddyfile.match(/\{\s*auto_https\s+(off|on)\s*\}/i)
    if (existingGlobalBlock) {
      // 如果存在 auto_https off/on，我们在这里只是同步UI，不直接修改它
      // 实际生成时，我们会根据 checkAutoHttps 重新构建
    } else {
      // 如果没有显式设置 auto_https on/off，Caddy默认行为是自动HTTPS
      // 此时不需要显式写入 { auto_https on } 块，只有 off 才需要
    }
  }

  // 网站配置
  currentCaddyConfig.sites.forEach((site) => {
    caddyfile += `${site.address} {\n`

    if (site.basicAuth) {
      caddyfile += `\tbasic_auth * {\n`
      caddyfile += `\t\t${site.basicAuth.username} ${site.basicAuth.hashedPassword}\n`
      caddyfile += `\t}\n`
    }

    if (site.tls) {
      caddyfile += `\ttls ${site.tls.certPath} ${site.tls.keyPath}\n`
    }

    if (site.type === 'respond') {
      caddyfile += `\trespond "${site.respondContent || ''}"\n`
    } else if (site.type === 'file_server') {
      caddyfile += `\troot * ${site.fileServerRoot || ''}\n`
      caddyfile += `\tfile_server\n`
    } else if (site.type === 'reverse_proxy') {
      caddyfile += `\treverse_proxy ${site.proxyTarget || ''}`
      if (site.tlsInsecureSkipVerify) {
        caddyfile += ` {\n\t\ttransport http {\n\t\t\ttls_insecure_skip_verify\n\t\t}\n\t}`
      }
      caddyfile += `\n`
    }

    caddyfile += `}\n\n`
  })

  document.getElementById('CaddyfileEditorContent').value = caddyfile.trim()
}

/**
 * 将手动编辑区的内容同步到可视化UI的数据和显示
 * (当用户在手动编辑区做了修改，或点击“同步修改到手动编辑区”按钮时调用)
 */
function syncChangesToCaddyfileEditor() {
  const currentContent = document.getElementById('CaddyfileEditorContent').value
  parseCaddyfileContent(currentContent) // 重新解析手动编辑区内容
  renderSiteList() // 重新渲染网站列表
  window.showNotification('文本编辑区内容已同步到可视化列表', 'info')
}

// 将一些函数暴露到全局，以便HTML可以调用
window.openAddSiteModal = openAddSiteModal
window.editSite = editSite
window.deleteSite = deleteSite
window.saveSiteConfig = saveSiteConfig
window.toggleSiteTypeFields = toggleSiteTypeFields
window.toggleBasicAuthFields = toggleBasicAuthFields
window.toggleTlsFields = toggleTlsFields
window.syncChangesToCaddyfileEditor = syncChangesToCaddyfileEditor
window.loadAndParseCaddyfile = loadAndParseCaddyfile // 暴露这个以便 caddyfile_edit.js 可以在模态框打开时调用
window.updateCaddyfileContentFromUI = updateCaddyfileContentFromUI // 暴露这个，以便其他JS文件可以强制更新UI

/**
 * 切换可视化编辑区和手动编辑区
 */
function toggleEditorView() {
  const visualArea = document.getElementById('visualEditorArea')
  const manualArea = document.getElementById('manualEditorArea')
  const toggleButton = document.getElementById('toggleEditorView')
  const caddyfileContentTextArea = document.getElementById('CaddyfileEditorContent')

  if (visualArea.style.display === 'block') {
    // 当前是可视化模式，切换到手动编辑模式
    visualArea.style.display = 'none'
    manualArea.style.display = 'block'
    toggleButton.textContent = '切换到可视化编辑'
    // 将可视化编辑器的当前状态同步到手动编辑区
    updateCaddyfileContentFromUI()

    window.showNotification('已切换到文本编辑模式', 'info')
  } else {
    // 当前是手动编辑模式，切换到可视化模式
    manualArea.style.display = 'none'
    visualArea.style.display = 'block'
    toggleButton.textContent = '切换到文本编辑模式'
    // 从手动编辑区解析内容并更新可视化编辑器
    parseCaddyfileContent(caddyfileContentTextArea.value)
    renderSiteList()
    window.showNotification('已切换到可视化编辑模式', 'info')
  }
}

// 将一些函数暴露到全局，以便HTML可以调用
window.toggleEditorView = toggleEditorView

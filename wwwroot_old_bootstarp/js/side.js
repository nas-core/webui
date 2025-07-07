/**
 * nascore - 侧边栏JS控制
 * 依赖：fileOperations.js, public.js (用于showNotification)
 */

document.addEventListener('DOMContentLoaded', function () {
  initSidebar()
  bindSidebarActions()
})

/**
 * 绑定侧边栏操作
 */
function bindSidebarActions() {
  console.log('bindSidebarActions 开始执行')
  const newFolderButton = document.querySelector('[data-action="new-folder"] a')
  const newFileButton = document.querySelector('[data-action="new-file"] a')

  console.log('新建文件夹按钮:', newFolderButton)
  console.log('新建文件按钮:', newFileButton)
  console.log('FileOperations对象:', window.FileOperations)

  // 新建文件夹
  if (newFolderButton) {
    newFolderButton.addEventListener('click', async function (e) {
      e.preventDefault()
      console.log('新建文件夹 按钮被点击')
      const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
      console.log('当前路径:', currentPath)
      console.log('FileOperations可用性:', typeof window.FileOperations, window.FileOperations)
      const folderName = prompt('请输入新文件夹的名称:', 'new_folder')
      if (folderName) {
        try {
          console.log('开始创建文件夹:', currentPath, folderName)
          await window.FileOperations.createFolder(currentPath, folderName)
          console.log('文件夹创建成功')
          window.showNotification(`文件夹 "${folderName}" 创建成功！`, 'success')
          // 添加新文件夹到文件列表，不刷新整个页面
          if (typeof window.addNewItemToList === 'function') {
            window.addNewItemToList(currentPath, folderName, true)
          } else {
            console.error('addNewItemToList 函数不存在')
            window.location.reload()
          }
        } catch (err) {
          console.error('创建文件夹失败:', err)
          window.showNotification(`创建文件夹失败: ${err.message || '未知错误'}`, 'error')
        }
      }
    })
  } else {
    // console.error('找不到新建文件夹按钮')
  }

  // 新建文件
  if (newFileButton) {
    newFileButton.addEventListener('click', async function (e) {
      e.preventDefault()
      console.log('新建文件 按钮被点击')
      const currentPath = decodeURI(window.location.hash.replace(/^#/, '')) || '/'
      console.log('当前路径:', currentPath)
      let fileName = prompt('请输入新文件的名称 (默认后缀.md):', 'new_file.md')
      if (fileName) {
        if (!fileName.includes('.') && fileName.length > 0) {
          fileName += '.md'
        }
        try {
          console.log('开始创建文件:', currentPath, fileName)
          await window.FileOperations.createFile(currentPath, fileName)
          console.log('文件创建成功')
          window.showNotification(`文件 "${fileName}" 创建成功！`, 'success')
          // 添加新文件到文件列表，不刷新整个页面
          if (typeof window.addNewItemToList === 'function') {
            window.addNewItemToList(currentPath, fileName, false)
          } else {
            console.error('addNewItemToList 函数不存在')
            window.location.reload()
          }
        } catch (err) {
          console.error('创建文件失败:', err)
          window.showNotification(`创建文件失败: ${err.message || '未知错误'}`, 'error')
        }
      }
    })
  } else {
    // console.error('找不到新建文件按钮')
  }
}

/**
 * 初始化侧边栏 (此函数已存在且功能完整，无需修改其核心逻辑)
 */
function initSidebar() {
  const sidebarToggle = document.getElementById('sidebarToggle')
  const sidebar = document.querySelector('.sidebar')
  const contentWrapper = document.querySelector('.content-wrapper')
  const savedState = localStorage.getItem('sidebar-state')

  // 初始化侧边栏状态
  if (window.innerWidth < 992) {
    sidebar.classList.add('collapsed')
    contentWrapper.style.marginLeft = '4rem'
    contentWrapper.style.width = 'calc(100% - 4rem)'
  } else if (savedState === 'collapsed') {
    sidebar.classList.add('collapsed')
    contentWrapper.style.marginLeft = '4rem'
    contentWrapper.style.width = 'calc(100% - 4rem)'
  }

  if (sidebarToggle && sidebar && contentWrapper) {
    // 处理折叠/展开
    sidebarToggle.addEventListener('click', function () {
      if (window.innerWidth < 992) {
        // 移动端模式
        if (sidebar.classList.contains('expanded')) {
          sidebar.classList.remove('expanded')
          sidebar.classList.add('collapsed')
          contentWrapper.style.marginLeft = '4rem'
          contentWrapper.style.width = 'calc(100% - 4rem)'
        } else {
          sidebar.classList.remove('collapsed')
          sidebar.classList.add('expanded')
          contentWrapper.style.marginLeft = '15rem'
          contentWrapper.style.width = 'calc(100% - 15rem)'
        }
      } else {
        // 桌面端模式
        sidebar.classList.toggle('collapsed')
        if (sidebar.classList.contains('collapsed')) {
          contentWrapper.style.marginLeft = '4rem'
          contentWrapper.style.width = 'calc(100% - 4rem)'
          localStorage.setItem('sidebar-state', 'collapsed')
        } else {
          contentWrapper.style.marginLeft = '15rem'
          contentWrapper.style.width = 'calc(100% - 15rem)'
          localStorage.setItem('sidebar-state', 'expanded')
        }
      }
    })

    // 点击内容区域时关闭侧边栏（仅在移动视图）
    contentWrapper.addEventListener('click', function () {
      if (window.innerWidth < 992 && sidebar.classList.contains('expanded')) {
        sidebar.classList.remove('expanded')
        sidebar.classList.add('collapsed')
        contentWrapper.style.marginLeft = '4rem'
        contentWrapper.style.width = 'calc(100% - 4rem)'
      }
    })

    // 监听窗口大小变化
    window.addEventListener('resize', function () {
      if (window.innerWidth < 992) {
        // 移动端模式
        if (!sidebar.classList.contains('expanded')) {
          sidebar.classList.remove('expanded')
          sidebar.classList.add('collapsed')
          contentWrapper.style.marginLeft = '4rem'
          contentWrapper.style.width = 'calc(100% - 4rem)'
        }
      } else {
        // 桌面端模式
        sidebar.classList.remove('expanded')
        if (localStorage.getItem('sidebar-state') === 'collapsed') {
          sidebar.classList.add('collapsed')
          contentWrapper.style.marginLeft = '4rem'
          contentWrapper.style.width = 'calc(100% - 4rem)'
        } else {
          sidebar.classList.remove('collapsed')
          contentWrapper.style.marginLeft = '15rem'
          contentWrapper.style.width = 'calc(100% - 15rem)'
        }
      }
    })
  }
}

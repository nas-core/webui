/**
 * 浮动剪贴板功能
 * 依赖：fileOperations.js, public.js (用于showNotification和confirmDialog)
 */

;(function () {
  'use strict'

  class FloatingClipboard {
    constructor() {
      this.clipboardEl = document.getElementById('floatingClipboard')
      this.contentEl = document.getElementById('floatingClipboardContent')
      this.listEl = document.getElementById('clipboardList')
      this.actionTextEl = document.getElementById('clipboardActionText')
      this.countEl = document.getElementById('clipboardCount')
      this.iconEl = document.getElementById('clipboardIcon')
      this.pasteAllBtn = document.getElementById('pasteAllBtn')
      this.pasteAllIcon = document.getElementById('pasteAllIcon')
      this.pasteAllText = document.getElementById('pasteAllText')
      this.itemTemplate = document.getElementById('clipboardItemTemplate')

      this.isCollapsed = false
      this.isDragging = false
      this.dragOffset = { x: 0, y: 0 }

      this.init()
    }

    init() {
      if (!this.clipboardEl) {
        console.error('浮动剪贴板元素未找到')
        return
      }

      this.bindEvents()

      // 监听剪贴板变化
      this.watchClipboardChanges()
    }

    bindEvents() {
      // 折叠/展开按钮
      const toggleBtn = document.getElementById('toggleClipboardBtn')
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleCollapse())
      }

      // 清空全部按钮
      const clearAllBtn = document.getElementById('clearAllClipboardBtn')
      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => this.clearAll())
      }

      // 关闭按钮
      const closeBtn = document.getElementById('closeClipboardBtn')
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hide())
      }

      // 全部粘贴按钮
      if (this.pasteAllBtn) {
        this.pasteAllBtn.addEventListener('click', () => this.pasteAll())
      }

      // 头部拖拽功能
      const header = this.clipboardEl.querySelector('.floating-clipboard-header')
      if (header) {
        header.addEventListener('mousedown', (e) => this.startDrag(e))
      }

      // 全局拖拽事件
      document.addEventListener('mousemove', (e) => this.onDrag(e))
      document.addEventListener('mouseup', () => this.endDrag())

      // 监听localStorage变化
      window.addEventListener('storage', (e) => {
        if (e.key === 'clipboard') {
          this.updateDisplay()
        }
      })

      // 监听同页面内的剪贴板变化
      this.originalSetItem = Storage.prototype.setItem
      this.originalRemoveItem = Storage.prototype.removeItem

      const self = this
      Storage.prototype.setItem = function (key, value) {
        self.originalSetItem.call(this, key, value)
        if (key === 'clipboard') {
          setTimeout(() => self.updateDisplay(), 50)
        }
      }

      Storage.prototype.removeItem = function (key) {
        self.originalRemoveItem.call(this, key)
        if (key === 'clipboard') {
          setTimeout(() => self.updateDisplay(), 50)
        }
      }
    }

    /**
     * 监听剪贴板变化
     */
    watchClipboardChanges() {
      // 初始检查
      this.updateDisplay()
    }

    /**
     * 获取剪贴板数据
     */
    getClipboardData() {
      try {
        const data = localStorage.getItem('clipboard')
        return data ? JSON.parse(data) : []
      } catch (error) {
        console.error('获取剪贴板数据失败:', error)
        return []
      }
    }

    /**
     * 更新显示
     */
    updateDisplay() {
      const clipboardArray = this.getClipboardData()

      if (!clipboardArray || clipboardArray.length === 0) {
        this.hide()
        return
      }

      // 计算总文件数
      const totalItems = clipboardArray.reduce((total, group) => total + group.items.length, 0)

      if (totalItems === 0) {
        this.hide()
        return
      }

      // 避免重复更新造成跳动
      const currentDataJson = JSON.stringify(clipboardArray)

      if (this.lastDataJson === currentDataJson && this.clipboardEl.classList.contains('show')) {
        return // 数据没有变化且已显示，不需要更新
      }

      this.lastDataJson = currentDataJson

      this.show()
      this.updateHeader(totalItems)
      this.updateList(clipboardArray)
      this.updatePasteButton()
    }

    /**
     * 更新头部信息
     */
    updateHeader(totalCount) {
      // 更新图标为通用剪贴板图标
      if (this.iconEl) {
        this.iconEl.className = 'bi bi-clipboard clipboard-icon'
      }

      // 更新操作文本为通用文本
      if (this.actionTextEl) {
        this.actionTextEl.textContent = '剪贴板'
      }

      // 更新数量
      if (this.countEl) {
        this.countEl.textContent = `(${totalCount})`
      }
    }

    /**
     * 更新文件列表
     */
    updateList(clipboardArray) {
      if (!this.listEl || !this.itemTemplate) return

      // 清空现有列表
      this.listEl.innerHTML = ''

      // 遍历所有组，添加文件项
      let globalIndex = 0
      clipboardArray.forEach((group, groupIndex) => {
        group.items.forEach((item, itemIndex) => {
          const itemEl = this.createItemElement(item, globalIndex, group.action, groupIndex, itemIndex)
          this.listEl.appendChild(itemEl)
          globalIndex++
        })
      })
    }

    /**
     * 创建文件项元素
     */
    createItemElement(item, globalIndex, action, groupIndex, itemIndex) {
      const template = this.itemTemplate.content.cloneNode(true)
      const itemEl = template.querySelector('.clipboard-item')

      // 设置数据
      itemEl.setAttribute('data-path', item.path)
      itemEl.setAttribute('data-global-index', globalIndex)
      itemEl.setAttribute('data-group-index', groupIndex)
      itemEl.setAttribute('data-item-index', itemIndex)
      itemEl.setAttribute('data-action', action)

      // 设置文件类型图标
      const iconEl = itemEl.querySelector('.file-type-icon')
      if (iconEl) {
        iconEl.className = this.getFileIcon(item)
      }

      // 设置文件名
      const nameEl = itemEl.querySelector('.item-name')
      if (nameEl) {
        nameEl.textContent = item.name || item.path.split('/').pop()
      }

      // 设置路径
      const pathEl = itemEl.querySelector('.item-path')
      if (pathEl) {
        pathEl.textContent = item.path
        pathEl.title = item.path // 添加tooltip显示完整路径
      }

      // 绑定单独粘贴按钮，并设置对应的图标
      const pasteSingleBtn = itemEl.querySelector('.paste-single-btn')
      if (pasteSingleBtn) {
        // 根据操作类型设置不同的图标和样式
        const icon = pasteSingleBtn.querySelector('i')
        if (icon) {
          if (action === 'cut') {
            icon.className = 'bi bi-scissors'
            pasteSingleBtn.className = 'btn btn-sm btn-outline-warning paste-single-btn'
            pasteSingleBtn.title = '单独粘贴（剪切）'
          } else {
            icon.className = 'bi bi-files'
            pasteSingleBtn.className = 'btn btn-sm btn-outline-info paste-single-btn'
            pasteSingleBtn.title = '单独粘贴（复制）'
          }
        }
        pasteSingleBtn.addEventListener('click', () => this.pasteSingle(groupIndex, itemIndex))
      }

      // 绑定移除按钮
      const removeBtn = itemEl.querySelector('.remove-item-btn')
      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.removeItem(groupIndex, itemIndex))
      }

      return itemEl
    }

    /**
     * 获取文件图标
     */
    getFileIcon(item) {
      if (item.is_dir) {
        return 'bi bi-folder-fill file-type-icon text-warning'
      }

      // 使用全局的getFileIcon函数（如果存在）
      if (window.getFileIcon) {
        return window.getFileIcon(item.name || item.path.split('/').pop()) + ' file-type-icon'
      }

      return 'bi bi-file-earmark-fill file-type-icon text-secondary'
    }

    /**
     * 更新粘贴按钮
     */
    updatePasteButton() {
      if (!this.pasteAllBtn || !this.pasteAllIcon || !this.pasteAllText) return

      // 混合模式下统一使用剪贴板图标
      this.pasteAllIcon.className = 'bi bi-clipboard'
      this.pasteAllText.textContent = '全部粘贴'
      this.pasteAllBtn.className = 'btn btn-primary btn-sm'
    }

    /**
     * 显示剪贴板
     */
    show() {
      if (this.clipboardEl && !this.clipboardEl.classList.contains('show')) {
        this.clipboardEl.style.display = 'block'
        // 使用requestAnimationFrame确保DOM更新后再添加动画类
        requestAnimationFrame(() => {
          this.clipboardEl.classList.add('show')
        })
      }
    }

    /**
     * 隐藏剪贴板
     */
    hide() {
      if (this.clipboardEl && this.clipboardEl.classList.contains('show')) {
        this.clipboardEl.classList.remove('show')
        // 延迟隐藏DOM元素，等待CSS过渡完成
        setTimeout(() => {
          if (!this.clipboardEl.classList.contains('show')) {
            this.clipboardEl.style.display = 'none'
          }
        }, 300)
      }
    }

    /**
     * 切换折叠状态
     */
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed

      if (this.contentEl) {
        this.contentEl.classList.toggle('collapsed', this.isCollapsed)
      }

      const toggleBtn = document.getElementById('toggleClipboardBtn')
      if (toggleBtn) {
        const icon = toggleBtn.querySelector('i')
        if (icon) {
          icon.classList.toggle('rotate', this.isCollapsed)
        }
      }
    }

    /**
     * 清空全部
     */
    clearAll() {
      if (window.confirmDialog) {
        window.confirmDialog('确定要清空剪贴板吗？', () => {
          localStorage.removeItem('clipboard')
          // 重置缓存的状态
          this.lastDataJson = null
          this.updateDisplay()
          if (window.showNotification) {
            window.showNotification('剪贴板已清空', 'info')
          }
        })
      } else {
        if (confirm('确定要清空剪贴板吗？')) {
          localStorage.removeItem('clipboard')
          this.updateDisplay()
        }
      }
    }

    /**
     * 移除单个项目
     */
    removeItem(groupIndex, itemIndex) {
      const clipboardArray = this.getClipboardData()
      if (!clipboardArray || groupIndex >= clipboardArray.length) return

      const group = clipboardArray[groupIndex]
      if (!group || !group.items || itemIndex >= group.items.length) return

      const item = group.items[itemIndex]
      group.items.splice(itemIndex, 1)

      // 如果组为空，移除整个组
      if (group.items.length === 0) {
        clipboardArray.splice(groupIndex, 1)
      }

      if (clipboardArray.length === 0) {
        localStorage.removeItem('clipboard')
      } else {
        localStorage.setItem('clipboard', JSON.stringify(clipboardArray))
      }

      // 重置缓存状态以强制更新
      this.lastDataJson = null
      this.updateDisplay()

      if (window.showNotification) {
        window.showNotification(`已从剪贴板移除 "${item.name || item.path.split('/').pop()}"`, 'info')
      }
    }

    /**
     * 单独粘贴
     */
    async pasteSingle(groupIndex, itemIndex) {
      const clipboardArray = this.getClipboardData()
      if (!clipboardArray || groupIndex >= clipboardArray.length) return

      const group = clipboardArray[groupIndex]
      if (!group || !group.items || itemIndex >= group.items.length) return

      const item = group.items[itemIndex]
      const action = group.action
      const currentPath = this.getCurrentPath()

      try {
        if (action === 'cut') {
          await this.pasteCutSingle(item, currentPath)
          // 剪切成功后从剪贴板移除
          this.removeItem(groupIndex, itemIndex)
        } else {
          await this.pasteCopySingle(item, currentPath)
        }
      } catch (error) {
        console.error('粘贴失败:', error)
        if (window.showNotification) {
          window.showNotification(`粘贴失败: ${error.message || '未知错误'}`, 'error')
        }
      }
    }

    /**
     * 粘贴剪切的单个文件
     */
    async pasteCutSingle(item, currentPath) {
      const sourcePath = item.path
      const itemName = item.name || sourcePath.split('/').pop()
      const destinationPath = this.buildDestinationPath(currentPath, itemName)

      await window.FileOperations.moveItem(sourcePath, destinationPath)

      if (window.showNotification) {
        window.showNotification(`成功剪切粘贴 "${itemName}"`, 'success')
      }

      // 刷新文件列表
      if (window.loadFileList) {
        window.loadFileList(currentPath, false)
      }
    }

    /**
     * 粘贴复制的单个文件
     */
    async pasteCopySingle(item, currentPath) {
      const sourcePath = item.path
      const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/'
      const itemName = item.name || sourcePath.split('/').pop()
      let destinationPath = this.buildDestinationPath(currentPath, itemName)

      // 检查是否复制到同目录，需要重命名
      if (sourceDir === currentPath) {
        const uniqueName = this.generateUniqueFileName(itemName)
        destinationPath = this.buildDestinationPath(currentPath, uniqueName)
      }

      await window.FileOperations.copyItem(sourcePath, destinationPath)

      if (window.showNotification) {
        window.showNotification(`成功复制粘贴 "${itemName}"`, 'success')
      }

      // 刷新文件列表
      if (window.loadFileList) {
        window.loadFileList(currentPath, false)
      }
    }

    /**
     * 全部粘贴
     */
    async pasteAll() {
      const clipboardArray = this.getClipboardData()
      if (!clipboardArray || clipboardArray.length === 0) return

      const currentPath = this.getCurrentPath()
      const totalItems = clipboardArray.reduce((total, group) => total + group.items.length, 0)

      if (window.confirmDialog) {
        window.confirmDialog(`确定要粘贴全部 ${totalItems} 个项目到当前目录吗？`, async () => {
          await this.performPasteAll(clipboardArray, currentPath)
        })
      } else {
        if (confirm(`确定要粘贴全部 ${totalItems} 个项目到当前目录吗？`)) {
          await this.performPasteAll(clipboardArray, currentPath)
        }
      }
    }

    /**
     * 执行全部粘贴
     */
    async performPasteAll(clipboardArray, currentPath) {
      let successCount = 0
      let failedItems = []
      const toRemove = [] // 记录需要移除的项目（剪切成功的）

      for (let groupIndex = 0; groupIndex < clipboardArray.length; groupIndex++) {
        const group = clipboardArray[groupIndex]
        for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
          const item = group.items[itemIndex]
          try {
            if (group.action === 'cut') {
              await this.pasteCutSingle(item, currentPath)
              toRemove.push({ groupIndex, itemIndex })
            } else {
              await this.pasteCopySingle(item, currentPath)
            }
            successCount++
          } catch (error) {
            failedItems.push({ item, error: error.message || '未知错误' })
            console.error(`粘贴项目失败: ${item.path}`, error)
          }
        }
      }

      // 移除剪切成功的项目（从后往前移除，避免索引变化）
      toRemove.reverse().forEach(({ groupIndex, itemIndex }) => {
        clipboardArray[groupIndex].items.splice(itemIndex, 1)
      })

      // 移除空组
      for (let i = clipboardArray.length - 1; i >= 0; i--) {
        if (clipboardArray[i].items.length === 0) {
          clipboardArray.splice(i, 1)
        }
      }

      // 更新localStorage
      if (clipboardArray.length === 0) {
        localStorage.removeItem('clipboard')
      } else {
        localStorage.setItem('clipboard', JSON.stringify(clipboardArray))
      }

      // 显示结果
      if (successCount > 0 && failedItems.length === 0) {
        if (window.showNotification) {
          window.showNotification(`成功粘贴 ${successCount} 个项目`, 'success')
        }
      } else if (successCount > 0 && failedItems.length > 0) {
        if (window.showNotification) {
          window.showNotification(`成功粘贴 ${successCount} 个项目，${failedItems.length} 个失败`, 'warning')
        }
      } else {
        if (window.showNotification) {
          window.showNotification(`粘贴失败: ${failedItems.map((f) => f.item.name || f.item.path.split('/').pop()).join(', ')}`, 'error')
        }
      }

      this.updateDisplay()
    }

    /**
     * 获取当前路径
     */
    getCurrentPath() {
      return decodeURI(window.location.hash.replace(/^#/, '')) || '/'
    }

    /**
     * 构建目标路径
     */
    buildDestinationPath(currentPath, itemName) {
      return (currentPath === '/' ? '' : currentPath) + '/' + itemName
    }

    /**
     * 生成唯一的文件名
     */
    generateUniqueFileName(originalName) {
      const fileList = document.querySelector('.file-list')
      if (!fileList) return originalName

      // 获取当前目录下所有文件名
      const existingNames = new Set()
      const fileItems = fileList.querySelectorAll('.file-item')
      fileItems.forEach((item) => {
        const nameElement = item.querySelector('.ms-2')
        if (nameElement) {
          existingNames.add(nameElement.textContent.trim())
        }
      })

      // 解析文件名和扩展名
      const lastDotIndex = originalName.lastIndexOf('.')
      let baseName, extension

      if (lastDotIndex > 0 && lastDotIndex < originalName.length - 1) {
        baseName = originalName.substring(0, lastDotIndex)
        extension = originalName.substring(lastDotIndex)
      } else {
        baseName = originalName
        extension = ''
      }

      // 生成唯一名称
      let counter = 1
      let newName = `${baseName} - 副本${extension}`

      while (existingNames.has(newName)) {
        counter++
        newName = `${baseName} - 副本${counter}${extension}`
      }

      return newName
    }

    /**
     * 开始拖拽
     */
    startDrag(e) {
      if (e.target.closest('.clipboard-controls')) return // 不在控制按钮上拖拽

      this.isDragging = true
      this.clipboardEl.classList.add('dragging')

      const rect = this.clipboardEl.getBoundingClientRect()
      this.dragOffset.x = e.clientX - rect.left
      this.dragOffset.y = e.clientY - rect.top

      e.preventDefault()
    }

    /**
     * 拖拽中
     */
    onDrag(e) {
      if (!this.isDragging) return

      const x = e.clientX - this.dragOffset.x
      const y = e.clientY - this.dragOffset.y

      // 限制在视窗内
      const maxX = window.innerWidth - this.clipboardEl.offsetWidth
      const maxY = window.innerHeight - this.clipboardEl.offsetHeight

      const constrainedX = Math.max(0, Math.min(x, maxX))
      const constrainedY = Math.max(0, Math.min(y, maxY))

      this.clipboardEl.style.left = `${constrainedX}px`
      this.clipboardEl.style.top = `${constrainedY}px`
      this.clipboardEl.style.right = 'auto'
      this.clipboardEl.style.bottom = 'auto'
    }

    /**
     * 结束拖拽
     */
    endDrag() {
      if (this.isDragging) {
        this.isDragging = false
        this.clipboardEl.classList.remove('dragging')
      }
    }
  }

  // 初始化浮动剪贴板
  document.addEventListener('DOMContentLoaded', () => {
    window.floatingClipboard = new FloatingClipboard()
  })

  // 如果DOM已经加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.floatingClipboard) {
        window.floatingClipboard = new FloatingClipboard()
      }
    })
  } else {
    if (!window.floatingClipboard) {
      window.floatingClipboard = new FloatingClipboard()
    }
  }
})()

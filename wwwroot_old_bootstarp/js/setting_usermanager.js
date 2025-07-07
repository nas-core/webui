// code-private/wwwroot/js/setting_usermanager.js
document.addEventListener('DOMContentLoaded', function () {
  const usersTableBody = document.getElementById('usersTableBody')
  const addUserForm = document.getElementById('addUserForm')
  const saveUserBtn = document.getElementById('saveUserBtn')
  const editUserForm = document.getElementById('editUserForm')
  const updateUserBtn = document.getElementById('updateUserBtn')

  // 在模态框初始化之前和之后添加日志
  const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'))

  const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'))

  let currentUserIndex = -1 // 用于存储当前编辑的用户在数组中的索引

  // 渲染用户表格
  window.renderUsersTable = function (element, users) {
    usersTableBody.innerHTML = '' // 清空现有内容
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        const row = usersTableBody.insertRow()
        row.innerHTML = `
              <td>${user.username}</td>
              <td>${user.passwd ? '********' : ''}</td>
              <td>${user.home || ''}</td>
              <td>${user.isadmin || ''}</td>
              <td>
                <button type="button" class="btn btn-sm btn-info edit-user-btn" data-index="${index}" data-bs-toggle="modal" data-bs-target="#editUserModal">
                  <i class="bi bi-pencil-square"></i> 编辑
                </button>
                <button type="button" class="btn btn-sm btn-danger delete-user-btn" data-index="${index}">
                  <i class="bi bi-trash"></i> 删除
                </button>
              </td>
            `
      })

      // 重新绑定编辑和删除按钮的事件监听器
      bindUserActionButtons()
    }
  }

  // 绑定用户操作按钮的事件监听器
  function bindUserActionButtons() {
    document.querySelectorAll('.edit-user-btn').forEach((button) => {
      button.onclick = function () {
        currentUserIndex = parseInt(this.dataset.index)
        const user = window.globalSettingsData.Users[currentUserIndex]
        document.getElementById('editUsername').value = user.username
        document.getElementById('editPasswd').value = '' // 密码不回显
        document.getElementById('editHome').value = user.home
      }
    })

    document.querySelectorAll('.delete-user-btn').forEach((button) => {
      button.onclick = function () {
        const indexToDelete = parseInt(this.dataset.index)
        if (confirm(`确定要删除用户 ${window.globalSettingsData.Users[indexToDelete].username} 吗？`)) {
          window.globalSettingsData.Users.splice(indexToDelete, 1)
          window.updateGlobalSettingsForm() // 更新表单
          window.showNotification('用户删除成功', 'success')
        }
      }
    })
  }

  // 添加用户保存按钮点击事件
  saveUserBtn.addEventListener('click', function () {
    const username = document.getElementById('addUsername').value
    const passwd = document.getElementById('addPasswd').value
    const home = document.getElementById('addHome').value

    if (!username || !passwd) {
      window.showNotification('用户名和密码不能为空', 'error')
      return
    }

    // 检查用户名是否已存在
    if (window.globalSettingsData.Users.some((user) => user.username === username)) {
      window.showNotification('用户已存在', 'error')
      return
    }

    const newUser = {
      username: username,
      passwd: passwd,
      home: home,
      isadmin: 'no', // 默认为普通用户
    }

    if (!window.globalSettingsData.Users) {
      window.globalSettingsData.Users = []
    }
    window.globalSettingsData.Users.push(newUser)
    addUserModal.hide()
    window.updateGlobalSettingsForm() // 更新表单
    window.showNotification('用户添加成功', 'success')
    addUserForm.reset() // 重置表单
  })

  // 更新用户保存按钮点击事件
  updateUserBtn.addEventListener('click', function () {
    if (currentUserIndex === -1) return

    const userToUpdate = window.globalSettingsData.Users[currentUserIndex]
    userToUpdate.home = document.getElementById('editHome').value
    const newPasswd = document.getElementById('editPasswd').value
    if (newPasswd) {
      userToUpdate.passwd = newPasswd // 如果有新密码才更新
    }

    editUserModal.hide()
    window.updateGlobalSettingsForm() // 更新表单
    window.showNotification('用户更新成功', 'success')
  })

  // 当添加用户模态框隐藏时，重置表单
  document.getElementById('addUserModal').addEventListener('hidden.bs.modal', function () {
    addUserForm.reset()
  })
})

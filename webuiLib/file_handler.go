package webuiLib

import (
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// FileHandler 负责文件处理的结构体
type FileHandler struct {
	devMode          bool   // 是否为开发模式
	devPath          string // 开发模式下的文件路径
	staticFS         fs.FS  // 嵌入式文件系统
	webUIContentPath string // WebUI内容路径
}

// NewFileHandler 创建新的文件处理器
func NewFileHandler(devMode bool, devPath string, staticFS fs.FS) *FileHandler {
	return &FileHandler{
		devMode:  devMode,
		devPath:  devPath,
		staticFS: staticFS,
	}
}

// ReadFileContent_local_or_inBin 读取文件内容
func (h *FileHandler) ReadFileContent_local_or_inBin(path string) ([]byte, error) {
	if h.devMode {
		// 开发模式：从本地文件系统读取
		path_new := filepath.Join(h.devPath, path)
		content, err := os.ReadFile(path_new)
		if err != nil {
			return nil, fmt.Errorf("failed to read file %s: %w", path_new, err)
		}
		return content, nil
	}

	// 生产模式：从嵌入式文件系统读取
	file, err := h.staticFS.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open embedded file %s: %w", path, err)
	}
	defer file.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, file); err != nil {
		return nil, fmt.Errorf("failed to read embedded file %s: %w", path, err)
	}

	return buf.Bytes(), nil
}

// GetSafePath 获取安全的文件路径
func (h *FileHandler) GetSafePath(requestPath string) string {
	// 移除路径中的 ".." 以防止目录遍历
	path := filepath.Clean(requestPath)
	path = strings.TrimPrefix(path, "/")

	// 处理默认页面
	if path == "" || path == "/" {
		path = "login.shtml"
	}

	return path
}

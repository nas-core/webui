package webuiLib

import "path/filepath"

// GetContentType 根据文件扩展名返回对应的 Content-Type
func GetContentType(path string) string {
	ext := filepath.Ext(path)
	switch ext {
	case ".css":
		return "text/css; charset=utf-8"
	case ".js":
		return "application/javascript; charset=utf-8"
	case ".shtml", ".html":
		return "text/html; charset=utf-8"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".ico":
		return "image/x-icon"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".eot":
		return "application/vnd.ms-fontobject"
	case ".otf":
		return "font/otf"
	default:
		return "application/octet-stream" // 对于未知类型,返回通用二进制类型
	}
}

func IsMinifyableType(path string) bool { // IsMinifyableType 检查文件类型是否可以进行压缩
	ext := filepath.Ext(path)
	switch ext {
	case ".html", ".shtml", ".htm", ".shtm",
		".css",
		".js",
		".json",
		".svg",
		".xml":
		return true
	default:
		return false
	}
}

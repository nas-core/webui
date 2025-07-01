package webui

import (
	"bytes"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/nas-core/nascore/pkgs/isDevMode"
	"github.com/nas-core/webui/webuiLib"

	"github.com/nas-core/nascore/nascore_util/system_config"

	"go.uber.org/zap"
)

var ServerUrl = ""

func Webui_handler(nsCfg *system_config.SysCfg, logger *zap.SugaredLogger, qpsCounter *uint64) http.HandlerFunc {
	isUseEmbeddedFS := false
	isMinifyEnabled := false
	if isDevMode.IsDevMode() {
		isUseEmbeddedFS = false
		isMinifyEnabled = false
	} else {
		isUseEmbeddedFS = true
		isMinifyEnabled = true

	}
	if isMinifyEnabled && webuiLib.MinifierInstance == nil {
		webuiLib.InitMinifier()
	}
	return func(w http.ResponseWriter, r *http.Request) {
		if !nsCfg.Server.WebuiAndApiEnable {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("Webui/api service is disabled"))
			return
		}
		var basePatch string
		if isDevMode.IsDevMode() {
			basePatch = "./handlers_http/webUI_ssi/wwwroot/"
		} else {
			basePatch = "wwwroot/"
		}
		filePath := basePatch + strings.TrimPrefix(r.URL.Path, nsCfg.Server.WebUIPrefix)
		// 检查路径是否为目录
		if strings.HasSuffix(filePath, "/") || filepath.Ext(filePath) == "" {
			http.Redirect(w, r, nsCfg.Server.WebUIPrefix+"/login.shtml", http.StatusFound)
			return
		}
		if strings.HasSuffix(filePath, ".shtml") {
			parsedContent, err := parseSSI(filePath, basePatch, isUseEmbeddedFS, logger)
			if err != nil {
				logger.Errorln("Error parsing SSI isUseEmbeddedFS ", isUseEmbeddedFS, " , err ", err)
				http.Error(w, "Internal Server Error SSI", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "text/html")
			parsedContent = webuiLib.ReplaceTemplatePlaceholders(parsedContent, nsCfg.WebUIPubLicCdn, &ServerUrl)
			if !isMinifyEnabled {
				w.Write([]byte(parsedContent))
			} else {
				// logger.Info("压缩 shtml")
				result := &bytes.Buffer{}
				err := webuiLib.MinifierInstance.Minify("text/html", result, bytes.NewReader([]byte(parsedContent)))
				if err != nil {
					logger.Errorln("Error minifying HTML content: ", err)
					w.Write([]byte(parsedContent))
				} else {
					w.Write(result.Bytes())
				}
			}
		} else {
			fileExt := strings.ToLower(filepath.Ext(filePath)) // 全部小写判断
			var content []byte
			var err error
			if isUseEmbeddedFS {
				content, err = embeddedFS.ReadFile(filePath)
			} else {
				content, err = os.ReadFile(filePath)
			}
			if err != nil {
				logger.Errorln("Error reading file:", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}
			if isMinifyEnabled && isMinifiable(fileExt) { // 仅对可压缩文件类型执行压缩
				content, err = webuiLib.Exe_minify([]byte(webuiLib.ReplaceTemplatePlaceholders(string(content), nsCfg.WebUIPubLicCdn, &ServerUrl)), filePath, fileExt)
				if err != nil {
					logger.Errorln("Error minifying file:", err)
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}
			}
			handleFileContent(content, fileExt, nsCfg, w)
		}
	}
}

// isTextFile 判断文件是否为文本类型 文本类型的可以执行 字符替换
func isTextFile(fileExt string) bool {
	switch fileExt {
	case ".js", ".css", ".html", ".htm", ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".txt", ".md":
		return true
	default:
		return false
	}
}

// isMinifiable 判断文件是否可压缩
func isMinifiable(fileExt string) bool {
	switch fileExt {
	case ".js", ".css", ".html", ".htm", ".shtml", ".shtm", ".json", ".svg", ".xml":
		return true
	default:
		return false
	}
}

// handleFileContent 处理文件内容，仅对文本类型文件替换占位符
func handleFileContent(content []byte, fileExt string, nsCfg *system_config.SysCfg, w http.ResponseWriter) {
	// 仅对文本类型文件替换占位符
	if isTextFile(fileExt) {
		content = []byte(webuiLib.ReplaceTemplatePlaceholders(string(content), nsCfg.WebUIPubLicCdn, &ServerUrl))
	}

	// 设置 Content-Type
	switch fileExt {
	case ".js":
		w.Header().Set("Content-Type", "application/javascript")
	case ".css":
		w.Header().Set("Content-Type", "text/css")
	case ".html", ".htm":
		w.Header().Set("Content-Type", "text/html")
	case ".json":
		w.Header().Set("Content-Type", "application/json")
	case ".svg":
		w.Header().Set("Content-Type", "image/svg+xml")
	case ".xml":
		w.Header().Set("Content-Type", "application/xml")
	case ".yaml", ".yml":
		w.Header().Set("Content-Type", "application/yaml")
	case ".toml":
		w.Header().Set("Content-Type", "application/toml")
	case ".ini":
		w.Header().Set("Content-Type", "application/ini")
	case ".txt":
		w.Header().Set("Content-Type", "text/plain")
	case ".md":
		w.Header().Set("Content-Type", "text/markdown")
	case ".ico":
		w.Header().Set("Content-Type", "image/x-icon")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".gif":
		w.Header().Set("Content-Type", "image/gif")
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".webp":
		w.Header().Set("Content-Type", "image/webp")
	case ".woff", ".woff2":
		w.Header().Set("Content-Type", "font/woff2")
	case ".ttf", ".otf":
		w.Header().Set("Content-Type", "font/ttf")
	}

	w.Write(content)
}

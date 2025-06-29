package webuiLib

import (
	"bytes"
	"regexp"
	"strings"

	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/tdewolff/minify/v2/html"
	"github.com/tdewolff/minify/v2/js"
	"github.com/tdewolff/minify/v2/json"
	"github.com/tdewolff/minify/v2/svg"
	"github.com/tdewolff/minify/v2/xml"
)

var MinifyEnabled = false

var MinifierInstance *minify.M

// 初始化minifier实例
func InitMinifier() {
	if MinifierInstance == nil {
		m := minify.New()
		// 注册各种文件类型的压缩器
		m.AddFunc("text/html", html.Minify)
		m.AddFunc("text/css", css.Minify)
		m.AddFuncRegexp(regexp.MustCompile("^(application|text)/(x-)?(javascript|ecmascript)$"), js.Minify)
		m.AddFuncRegexp(regexp.MustCompile("[/+]json$"), json.Minify)
		m.AddFuncRegexp(regexp.MustCompile("[/+]xml$"), xml.Minify)
		m.AddFunc("image/svg+xml", svg.Minify)
		MinifierInstance = m
	}
}

func Exe_minify(content []byte, path string, ext string) ([]byte, error) {
	if MinifierInstance == nil {
		InitMinifier() // 确保使用之前初始化了
	}
	var mediaType string
	switch strings.ToLower(ext) { // 根据小写扩展名判断媒体类型
	case ".html", ".shtml", ".htm", ".shtm":
		mediaType = "text/html"
	case ".css":
		mediaType = "text/css"
	case ".js":
		mediaType = "application/javascript"
	case ".json":
		mediaType = "application/json"
	case ".svg":
		mediaType = "image/svg+xml"
	case ".xml":
		mediaType = "application/xml"
	}
	result := &bytes.Buffer{}
	err := MinifierInstance.Minify(mediaType, result, bytes.NewReader(content))
	if err != nil {
		return content, err // 如果压缩失败，返回原始内容
	}
	return result.Bytes(), nil // 返回压缩后的内容
}

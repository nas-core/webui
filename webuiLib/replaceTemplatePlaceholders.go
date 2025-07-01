package webuiLib

import (
	"strings"

	"github.com/nas-core/nascore/nascore_util/system_config"
)

// replaceTemplatePlaceholders 替换模板中的占位符
func ReplaceTemplatePlaceholders(content string, webuiCdnConfig system_config.WebUIStru, ServerUrl *string) string {
	content = strings.ReplaceAll(content, "{{.ServerUrl}}", *ServerUrl)
	content = strings.ReplaceAll(content, "{{.WebUIPubLicCdn.header}}", webuiCdnConfig.Header)
	content = strings.ReplaceAll(content, "{{.WebUIPubLicCdn.footer}}", webuiCdnConfig.Footer)
	content = strings.ReplaceAll(content, "{{.WebUIPubLicCdn.Dropzone}}", webuiCdnConfig.Dropzone)
	content = strings.ReplaceAll(content, "{{.WebUIPubLicCdn.Artplayer}}", webuiCdnConfig.Artplayer)
	content = strings.ReplaceAll(content, "{{.PrefixDdnsGo}}", system_config.PrefixDdnsGo)
	content = strings.ReplaceAll(content, "{{.PrefixAdguardhome}}", system_config.PrefixAdguardhome)
	return content
}

package PubFrontEnd

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/nas-core/nascore/nascore_util/system_config"
	"go.uber.org/zap"
)

type NavMenuItem struct {
	Name             string `json:"name"`
	URL              string `json:"url"`
	Key              string `json:"key"`
	OnlyWhenLogin    bool   `json:"onlyWhenLogin,omitempty"`
	OnlyWhenNotLogin bool   `json:"onlyWhenNotLogin,omitempty"`
}

func HandlerNavJS(nsCfg *system_config.SysCfg, logger *zap.SugaredLogger, qpsCounter *uint64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")

		menu := []NavMenuItem{
			{Name: "导航页", URL: "/", Key: "links"},
			{Name: "文件管理", URL: nsCfg.Server.WebUIPrefix + "nascore.shtml", Key: "webui"},
			{Name: "视频订阅", URL: system_config.PrefixNasCoreTv, Key: "vod"},
			{Name: "登录", URL: system_config.PrefixPublicFun + "/login/?redirect=${location}", Key: "login", OnlyWhenNotLogin: true},
			{Name: "退出", URL: "javascript:logoutAndRedirect()", Key: "logout", OnlyWhenLogin: true},
		}

		menuJson, _ := json.Marshal(menu)

		fmt.Fprintf(w, `window.GlobalNavMenu = %s;
window.isLoggedIn = function() {
  var expires = localStorage.getItem('nascore_jwt_refresh_token_expires');
  if (!expires) return false;
  var now = Math.floor(Date.now() / 1000);
  if (parseInt(expires, 10) < now) return false;
  return true;
};
(function(){
  if(window.GlobalNavMenu) {
    window.GlobalNavMenu.forEach(function(item){
      if(item.key==='login' && item.url && item.url.indexOf('${location}')!==-1) {
        item.url = item.url.replace('${location}', encodeURIComponent(location.href));
      }
    });
  }
  window.logoutAndRedirect = function() {
    // 清理 localStorage

    localStorage.removeItem("clipboard");
    localStorage.removeItem("nascore_jwt_access_token");
    localStorage.removeItem("nascore_jwt_access_token_expires");
    localStorage.removeItem("nascore_jwt_refresh_token");
    localStorage.removeItem("nascore_jwt_refresh_token_expires");
    // 清理所有以jwt_和nascore_jwt_开头的localStorage
    Object.keys(localStorage).forEach(function(key){
      if(/^jwt_|^nascore_jwt_/.test(key)) localStorage.removeItem(key);
    });
    // 清理 cookies
    function deleteCookie(name) {
      var domains = ['', window.location.hostname, '.'+window.location.hostname];
      var paths = ['/', window.location.pathname, ''];
      domains.forEach(function(domain){
        paths.forEach(function(path){
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + path + (domain ? '; domain=' + domain : '') + ';';
        });
      });
    }
    [
      'nascore_jwt_access_token',
      'nascore_jwt_access_token_expires',
      'nascore_jwt_refresh_token',
      'nascore_jwt_refresh_token_expires',
      'clipboard',
    ].forEach(deleteCookie);
    // 跳转到登录页
    var loginUrl = "/@public/login/?redirect=" + encodeURIComponent(location.href);
    window.location.href = loginUrl;
  }
})();
`, menuJson)
	}
}

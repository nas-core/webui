package main

import (
	"log"
	"net/http"
	"os"

	"github.com/nas-core/nascore/pkgs/system_config"
	webUI_ssi "github.com/nas-core/webui"
	"go.uber.org/zap"
)

/*
 * go run cmd/demo/main.go  /home/yh/myworkspace/nas-core/code-private/nascore_v3/nascore.toml  http://127.0.0.1:9000
 *
 */

func main() {
	configPath := os.Args[1]         // /home/yh/myworkspace/nas-core/code-private/nascore_v3/nascore.toml
	webUI_ssi.ServerUrl = os.Args[2] // http://127.0.0.1:9000/

	nsCfg, err := system_config.LoadConfig(configPath)
	if err != nil {
		panic("Failed to load config")
	}
	logger := zap.NewExample().Sugar()
	var qpsCounter *uint64

	http.HandleFunc("/", webUI_ssi.Webui_handler(nsCfg, logger, qpsCounter))
	err = http.ListenAndServe(":9001", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

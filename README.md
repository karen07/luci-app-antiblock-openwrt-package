# AntiBlock LuCI OpenWrt package

A LuCI web interface for configuring [AntiBlock](https://github.com/karen07/antiblock) on
OpenWrt. It provides browser-based service configuration and localized interface strings.

## Описание

Веб-интерфейс LuCI для настройки [AntiBlock](https://github.com/karen07/antiblock) в
OpenWrt. Позволяет управлять настройками сервиса через браузер и поддерживает локализованные
строки интерфейса.

Пакет зависит от `luci-base` и пакета `antiblock`. Он позволяет настраивать сервис AntiBlock из браузера и содержит переводы строк интерфейса в дереве `po/`.

Пакет LuCI намеренно отделен от пакета самого сервиса, чтобы AntiBlock можно было устанавливать без веб-интерфейса на системах, где LuCI не нужен.

## Структура проекта

- `luci-app-antiblock/Makefile` - описание LuCI package;
- `luci-app-antiblock/htdocs/` - JavaScript и файлы web UI;
- `luci-app-antiblock/root/` - интеграция меню LuCI и ACL rpcd;
- `luci-app-antiblock/po/` - переводы интерфейса;
- `openwrt-build.env` - параметры пакета для общего CI;
- `.github/workflows/openwrt-build.yml` - вызов общего reusable workflow.

## Сборка

Сборка выполняется через GitHub Actions. Workflow этого репозитория вызывает общий reusable workflow из [openwrt-package-ci](https://github.com/karen07/openwrt-package-ci).

CI можно запустить:

- push тега вида `vX.Y.Z` - значение тега используется как версия OpenWrt;
- вручную через `workflow_dispatch`, указав версию OpenWrt и при необходимости фильтры target/subtarget.

Параметры этого пакета хранятся в `openwrt-build.env`. Общие `openwrt-build.sh`, `openwrt-matrix.py` и логика сборки через OpenWrt SDK находятся в `openwrt-package-ci`.

Для ручной сборки каталог `luci-app-antiblock/` можно использовать как обычный package directory внутри OpenWrt buildroot/SDK.

## Связанные проекты

- [antiblock](https://github.com/karen07/antiblock) - основной daemon;
- [antiblock-openwrt-package](https://github.com/karen07/antiblock-openwrt-package) - OpenWrt package, init script и UCI configuration.

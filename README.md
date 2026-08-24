# AntiBlock LuCI OpenWrt package

This repository contains the LuCI web interface for configuring [AntiBlock](https://github.com/karen07/antiblock) on OpenWrt.

The package depends on `luci-base` and the `antiblock` package. It provides browser-based configuration for the AntiBlock service together with translated UI strings stored in the `po/` tree.

It is intentionally kept separate from the daemon package so the core service can be installed without LuCI on systems that do not need a web interface.

## Описание

Этот репозиторий содержит веб-интерфейс LuCI для настройки [AntiBlock](https://github.com/karen07/antiblock) в OpenWrt.

Пакет зависит от `luci-base` и пакета `antiblock`. Он позволяет настраивать сервис AntiBlock из браузера и содержит переводы строк интерфейса в дереве `po/`.

Пакет LuCI намеренно отделен от пакета самого сервиса, чтобы AntiBlock можно было устанавливать без веб-интерфейса на системах, где LuCI не нужен.

## Что находится в репозитории

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

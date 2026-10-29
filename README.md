# AntiBlock LuCI OpenWrt Package

A LuCI web interface for configuring [AntiBlock](https://github.com/karen07/antiblock) on
OpenWrt. It provides browser-based service configuration and localized interface strings.

Веб-интерфейс LuCI для настройки [AntiBlock](https://github.com/karen07/antiblock) в
OpenWrt. Позволяет управлять настройками сервиса через браузер и поддерживает локализованные
строки интерфейса.

## Описание

Пакет предоставляет веб-интерфейс LuCI для настройки AntiBlock, сохраняя возможность
устанавливать сервис без веб-интерфейса. Он зависит от `luci-base` и `antiblock`,
а локализованные строки интерфейса хранятся в дереве `po/`.

## Разработка и проверка изменений

**Опорные символы для изменения поведения:**

1. `domains.js:write_domains_handler` - запись списка доменов; при смене пути или команды
   сверяйте разрешения RPC.
1. `log.js:retrieveLog` и `statistics.js:retrieveLog` - получение диагностических данных;
   обработка их формата не должна подменять маршрутизацию, которая остаётся в `antiblock`.

**Основные точки изменения:**

- `luci-app-antiblock/htdocs/luci-static/resources/view/antiblock/` - страницы настроек, логов, доменов, маршрутов и статистики LuCI;
- `luci-app-antiblock/root/usr/share/rpcd/acl.d/luci-app-antiblock.json` - права RPC для интерфейса;
- `luci-app-antiblock/root/usr/share/luci/menu.d/luci-app-antiblock.json` - пункт меню LuCI;
- `luci-app-antiblock/po/` - локализации;
- `luci-app-antiblock/Makefile` - метаданные пакета.

**Типовая правка настройки:** поле LuCI задаётся в
`luci-app-antiblock/htdocs/luci-static/resources/view/antiblock/args.js`;
имя и значение должны соответствовать UCI-конфигурации в
`antiblock-openwrt-package` и чтению опций в init-скрипте этого пакета.
Если новый параметр передается демону, проверьте также его CLI в `antiblock`.
Права `rpcd` пересматриваются при добавлении операций с файловой системой
или сервисами, а не автоматически при изменении подписи поля.

**Границы интерфейса:** маршрутизация реализована в основном `antiblock`, а не в LuCI.
`args.js` редактирует UCI `antiblock` через
`form.Map` и раздел `config`; `routes.js` работает с секциями `route`.
`domains.js` записывает файл списка доменов и вызывает
`/etc/init.d/antiblock restart`, поэтому такие изменения затрагивают
не только форму, но и права в `rpcd/acl.d` и контракт init-скрипта.
`log.js` и `statistics.js` читают данные сервиса; они не реализуют
маршрутизацию и не должны подменять её логику. В частности, файл
`luci-app-antiblock/htdocs/luci-static/resources/view/antiblock/log.js`
читает `/tmp/antiblock/log.txt`, а периодический опрос добавляется только
при включённой опции UCI `log`. При изменении формата лога согласуйте
чтение файла, удаление префикса syslog и отображение строк.

**Проверка изменений:** для нового поля сверьте UCI-ключ с OpenWrt-пакетом;
для новой файловой операции - путь и точную RPC-команду с ACL; для новой
страницы - JS-модуль, маршрут в `menu.d` и доступ к ACL. Если затронут
текст интерфейса, проверьте шаблон переводов и `po/`. После изменений
нужно проверить сборку пакета и страницы LuCI; полноценная проверка прав
и UI возможна только в среде OpenWrt с LuCI.

## Сборка

Сборка выполняется через GitHub Actions. Workflow этого репозитория вызывает общий reusable workflow из [openwrt-package-ci](https://github.com/karen07/openwrt-package-ci).

CI можно запустить:

- push тега вида `vX.Y.Z` - значение тега используется как версия OpenWrt;
- вручную через `workflow_dispatch`, указав версию OpenWrt и при необходимости фильтры target/subtarget.

Параметры этого пакета хранятся в `openwrt-build.env`. Общие `openwrt-build.sh`, `openwrt-matrix.py` и логика сборки через OpenWrt SDK находятся в `openwrt-package-ci`.

Для ручной сборки каталог `luci-app-antiblock/` можно использовать как обычный package directory внутри OpenWrt buildroot/SDK.

## Структура проекта

- `luci-app-antiblock/Makefile` - описание LuCI package;
- `luci-app-antiblock/htdocs/` - JavaScript и файлы web UI;
- `luci-app-antiblock/root/` - интеграция меню LuCI и ACL rpcd;
- `luci-app-antiblock/po/` - переводы интерфейса;
- `openwrt-build.env` - параметры пакета для общего CI;
- `.github/workflows/openwrt-build.yml` - вызов общего reusable workflow.

## Связанные проекты

- [antiblock](https://github.com/karen07/antiblock) - основной daemon;
- [antiblock-openwrt-package](https://github.com/karen07/antiblock-openwrt-package) - OpenWrt package, init script и UCI configuration.

## Лицензия

Проект распространяется под лицензией GNU Affero General Public License v3.0. Подробности см. в файле [LICENSE](LICENSE).

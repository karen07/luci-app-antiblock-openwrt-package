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

## Совместимость с AntiBlock 3.x

- Форма `Args` проверяет IPv4:port и список дополнительных CIDR. Встроенный
  blacklist содержит 18 подсетей, поэтому доступны до 110 пользовательских записей.
- `Routes` принимает Linux-имя интерфейса и абсолютный путь/HTTP(S) URL.
  Старый ключ UCI `gateway` читается для совместимости, а при сохранении
  заменяется на `interface`. Можно указать интерфейс, который пока не поднят.
- Выключение сервиса через `enabled` сохраняет параметры зависимых полей.
- Редактор `Domains` работает с обычными файлами непосредственно в
  `/etc/antiblock/` (в том числе во вложенных каталогах, если они созданы). Он не меняет файл при
  открытии страницы, сохраняет пустые строки и комментарии, а запись
  перезапускает сервис. URL редактируются только в поле настроек маршрутов.
- `Log` и `Statistics` показывают сообщение об ошибке чтения в поле,
  не создавая новое уведомление на каждом интервале опроса. Диагностические
  файлы находятся в RAM; включайте журнал на время диагностики.

## Тестирование

### Полный интеграционный тест: OpenWrt в Docker + Chromium

Основная проверка LuCI - **E2E на реально установленных пакетах**, а не
имитация RPC или JavaScript-форм:

1. `tests/run.sh` передаёт общему `openwrt-build.sh` **только** каталог
   `luci-app-antiblock/` с неизменённым `openwrt-build.env`.
1. OpenWrt SDK для выбранной версии (`x86/64`) обновляет и устанавливает стандартные feeds,
   включая официальный `openwrt/packages`. `LUCI_DEPENDS:=+luci-base +antiblock`
   в Makefile разрешает зависимости автоматически. **Нет отдельного клонирования
   или сборочного задания AntiBlock.** На выходе SDK создаёт оба APK,
   `tests/find-built-antiblock.sh` находит AntiBlock в SDK output для `x86_64`.
1. `tests/run-runtime.sh`, по образцу runtime-теста OpenWrt-пакета AntiBlock,
   запускает официальный `ghcr.io/openwrt/rootfs:x86_64-SNAPSHOT` (при выборе
   master). Команда `apk add --allow-untrusted` устанавливает **оба локально собранных APK**
   одновременно, а внешние feeds используются только для остальных зависимостей.
   Затем тест запускает `/sbin/init`
   (`procd`, `ubus`, `rpcd`, `uhttpd`).
1. `tests/browser.js` в отдельном Docker-контейнере с Playwright/Chromium
   проверяет загрузку UCI, ошибочный `listen`, сохранение настроек из формы,
   редактор доменов через RPC, маршруты, журнал и статистику.

Для локального запуска разместите рядом репозитории `luci-app-antiblock-openwrt-package`
и `openwrt-package-ci` либо задайте `OPENWRT_BUILD_SH`:

```sh
OPENWRT_VERSION=SNAPSHOT sh tests/run.sh
```

Это **OpenWrt master**, а не `25.12-SNAPSHOT`. Для теста нужен актуальный
`openwrt-package-ci/openwrt-build.sh` с поддержкой Snapshot. Скрипт копируется
в `.openwrt-build-e2e.sh`; оригинальный сборщик и GitHub Actions не меняются.
SDK использует стандартный feed `openwrt/packages` из master, который
содержит AntiBlock 3.0.0. Отдельной сборки AntiBlock нет: он зависимость LuCI.

Для Snapshot ветки 25.12 и для стабильного релиза можно запустить:

```sh
OPENWRT_VERSION=25.12-SNAPSHOT sh tests/run.sh
OPENWRT_VERSION=25.12.6 sh tests/run.sh
```

Версия передается как SDK-сборке, так и Docker E2E. Для движущихся Snapshot
Docker rootfs обновляется при каждом запуске.

Можно использовать уже собранные **оба** APK и пропустить SDK-сборку:

```sh
E2E_LUCI_APK=/path/to/luci-app-antiblock-0.apk \
E2E_ANTIBLOCK_APK=/path/to/antiblock-3.0.0-r1.apk \
OPENWRT_VERSION=SNAPSHOT sh tests/run.sh
```

APK должны быть собраны под `x86_64`: Docker-тест использует OpenWrt `x86/64`,
а APK для роутера `mediatek/filogic` (`aarch64_cortex-a53`) здесь не подходят.
`OPENWRT_VERSION` (по умолчанию `SNAPSHOT`) выбирает выпуск SDK
и Docker rootfs. При ошибке тест завершается ненулевым статусом и печатает
диагностику контейнера.

**Версии AntiBlock:** используется пакет официального `openwrt/packages` feed,
согласованного с SDK. В `master` присутствует AntiBlock 3.0.0, тогда как в
`openwrt-25.12` он может отличаться. Тест не подменяет его сторонним репозиторием.
Для Snapshot результаты зависят от текущих опубликованных сборок SDK и APK: они
обновляются независимо, поэтому иногда возможна временная несовместимость.

E2E запускается вручную командой `sh tests/run.sh`. Существующие
GitHub Actions не запускают этот тест и не изменялись. Тестовые контейнеры
удаляются по окончании.

На Arch для браузерного этапа нужен только Docker: Node.js, npm и Chromium
запускаются внутри отдельного контейнера. Python не используется.
`.gitignore` совпадает с `.gitignore` OpenWrt-пакета AntiBlock.

Отдельных unit-, contract- и вспомогательных тестов инфраструктуры в
репозитории LuCI нет. Единственный тестовый сценарий - реальная сборка APK,
установка OpenWrt в Docker и браузерная E2E-проверка LuCI, RPC, UCI и файлов.
Исходники и тесты AntiBlock не изменяются.

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

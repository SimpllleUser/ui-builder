# План розвитку UI Builder

## Мета і базовий контракт

Створити visual UI builder, у якому редактор змінює Project AST, dev preview показує **реально зібраний застосунок в iframe**, а publish збирає той самий AST у версійований production artifact.

```text
Builder → mutations → Project AST → compiler → virtual files → Vite/HMR → iframe
                                  └────────────→ production build → release → CDN
```

- [ ] Зафіксувати версійний контракт Project AST як єдине джерело правди для редактора, preview і publish.
- [ ] Усі зміни документа проводити через типізовані mutations; dev і production мають використовувати спільний compiler.
- [ ] Зберегти можливість додати інші targets згодом, не вводячи їх у першу версію.

## Поточний стан і перехід

Зараз репозиторій — Vue 3/Vite/Vuetify застосунок з редактором, палітрою, canvas, inspector, undo/redo та збереженням у `localStorage`. Документ v1 — вкладене дерево `UiNode`; preview працює всередині редактора. Ці можливості слід зберегти під час міграції.

- [ ] Описати відповідність `UiNode`/document v1 новому AST, включно з `children`, named slots, props, classes, prefab і root.
- [ ] Додати імпорт/міграцію документів v1 до нової версії без втрати локальних проєктів; залишити перевірку коректності імпорту.
- [ ] Перевести поточні команди редактора та undo/redo на mutation API, зберігши наявний UX.
- [ ] Відокремити редактор, compiler, preview runtime і спільні типи поступово; не переносити код лише заради структури каталогів.

## Цільові межі модулів

```text
apps/
  builder/           редактор
  preview-runtime/   застосунок в iframe та bridge
  api/               проєкти, snapshots, assets, releases
  build-service/     build sessions і Vite dev server
  worker/            production build jobs
packages/
  ast/               модель, валідація, міграції, mutations
  schemas/           metadata компонентів і полів inspector
  components/        доступні UI компоненти
  compiler/          AST → virtual file system
  runtime/           bindings, actions, state
  protocol/          повідомлення builder ↔ preview/build service
  types/             спільні типи
```

- [ ] Для MVP дозволити API/build worker в одному Node процесі, але залишити явні інтерфейси сервісів.
- [ ] Визначити монорепозиторій та межі залежностей: compiler не залежить від UI редактора чи Nuxt.

## Phase 1 — AST → зібраний застосунок → iframe

**Критерій завершення:** JSON проєкту компілюється в робочий Vue застосунок, який відкривається в iframe редактора; зміна документа відображається в preview.

- [ ] Ввести `Project { id, version, pages, nodes, components, theme, dataSources, actions }` та `Page { id, path, rootNodeId }`.
- [ ] Нормалізувати вузли за ID: `nodes[id]` з `type`, `props`, `children: string[]`, named slots, `bindings`, `events`, styles/classes. Визначити правила унікальності ID, порядку дітей, посилань і видалення піддерева.
- [ ] Описати schema/versioning, валідацію, серіалізацію та міграції AST; окремо перевіряти дозволені типи компонентів і props.
- [ ] Зробити Component Registry єдиним джерелом metadata для палітри, inspector, compiler та runtime; використати наявні component definitions як початковий набір.
- [ ] Реалізувати незалежний compiler: `Project AST → VirtualFS` з файлами сторінок, компонентів, app entry та theme CSS. Детермінований output для однакового snapshot.
- [ ] Зробити `VirtualFS` з `read/write/delete/exists` і підключити до Vite через plugin або інший чіткий adapter.
- [ ] Запустити dev server для згенерованого застосунку та показати його в iframe. Preview повинен запускати згенерований код, а не поточний renderer редактора.
- [ ] Додавати до DOM `data-builder-node="<node-id>"` для відповідності AST ↔ елемент; перевірити вкладені компоненти й named slots.
- [ ] Написати інтеграційний сценарій: імпортоване дерево → compiler → iframe → той самий візуальний результат для базових компонентів.

## Phase 2 — керування реальним preview з редактора

**Критерій завершення:** додавання, вибір, переміщення, видалення й редагування props у наявному editor змінюють AST та preview; клік у preview вибирає вузол у редакторі.

- [ ] Визначити типізовані mutations: `add_node`, `remove_node`, `move_node`, `update_props`, `update_binding`, `update_event`, `update_style`, `update_page`.
- [ ] Централізовано застосовувати й валідувати mutations з `projectId`, базовою версією та результатною версією; конфлікти версій обробляти явно.
- [ ] Перевести палітру, canvas/layers, inspector і selection на AST та mutations.
- [ ] Зберегти undo/redo; визначити inverse mutation або snapshots/checkpoints для складних операцій.
- [ ] Додати `postMessage` bridge з контрактом `SELECT_NODE`, `NODE_CLICKED`, hover/inspect, viewport і runtime error; перевіряти `origin`, `source`, session ID і формат повідомлень.
- [ ] Розмістити iframe на окремому origin у цільовому deployment; для локальної розробки використовувати окремий порт/origin. Не надавати preview доступ до стану builder.
- [ ] Підтримати responsive viewport, click-to-select і підсвічування вибраного DOM вузла.

## Phase 3 — mutations → incremental compilation → Vite HMR

**Критерій завершення:** редагування однієї сторінки оновлює лише її залежні модулі через HMR без перезапуску preview; інші сторінки не перебудовуються.

- [ ] Ввести `BuildSession { projectId, version, status, virtualFS, moduleGraph, compilerCache, devServer }` для активного проєкту.
- [ ] Побудувати dependency graph від AST nodes/components/pages до generated modules; фіксувати набір affected modules для кожної mutation.
- [ ] Генерувати стабільні шляхи модулів і змінювати тільки відповідні virtual files, щоб Vite отримував точний HMR update.
- [ ] Кешувати результат генерації/збірки за hash джерела та залежностей; інвалідувати кеш при зміні registry, theme і compiler version.
- [ ] Передавати mutations до build session через типізований протокол (WebSocket, якщо потрібні live updates); підтримати reconnect, version sync і full refresh при розходженні версій.
- [ ] Зберігати checkpoints/snapshots і журнал mutations для recovery та audit; autosave не має губити незастосовані зміни.
- [ ] Виміряти latency зміна → HMR → готовий iframe і кількість перебудованих модулів; перевірити props, move, delete, theme і cross-page dependencies.

## Phase 4 — збереження, assets і production publish

**Критерій завершення:** publish фіксує конкретну версію AST, створює відтворюваний artifact і release URL; rollback перемикає production на попередній release.

- [ ] API для проєктів, версій, snapshots, mutations, sessions, builds та releases з перевіркою прав доступу.
- [ ] PostgreSQL для metadata і snapshots; object storage для assets, generated source, artifacts та published releases.
- [ ] Asset pipeline: upload → asset ID → storage/CDN; AST зберігає `asset://...`, compiler перетворює його на URL або локальний ресурс build.
- [ ] Черга production jobs і окремий worker; для MVP допустимий in-process adapter з тим самим контрактом.
- [ ] Publish: immutable snapshot → shared compiler → Vite/Nuxt production target → artifact → object storage/CDN → release URL. Nuxt додавати, коли потрібні SSR/SSG; для статичного MVP достатньо Vite.
- [ ] Версійовані releases без перезапису (`release-150`, `release-151`); production вказує на обраний release. Додати rollback і preview URL для release.
- [ ] Перевірити, що dev preview та production artifact однаково відтворюють один snapshot.

## Розширення після базового циклу

- [ ] DataSources (REST/GraphQL), bindings та runtime data state.
- [ ] Actions для events, API викликів, навігації та оновлення state; визначити дозволені можливості й безпечне виконання.
- [ ] Модель state: local, page, global, URL і data.
- [ ] Для кількох worker instances додати маршрутизацію `projectId → workerId` через Redis, щоб mutation потрапляла до session з теплим кешем.
- [ ] Collaboration і спільне редагування поверх версійованого mutation log.
- [ ] Розглядати WASM лише після вимірювання bottleneck; кандидатами є normalization, dependency analysis, template/CSS generation, hashing і diffing.

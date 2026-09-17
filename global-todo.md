# План розвитку UI Builder

## Мета і базовий контракт

Створити visual UI builder, у якому редактор змінює Project AST, dev preview показує **реально зібраний застосунок в iframe (через in-browser компіляцію)**, а publish збирає той самий AST у версійований production artifact на сервері.

```text
Builder → mutations → Project AST → Web Worker (compiler) → Service Worker (VFS) → iframe
                                  └───────────────────────→ backend build jobs → CDN

```

- [ ] Зафіксувати версійний контракт Project AST як єдине джерело правди для редактора, preview і publish.
- [ ] Усі зміни документа проводити через типізовані mutations; dev (в браузері) і production (на сервері) мають використовувати спільний compiler.
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
  builder/           редактор (головний потік)
  preview-runtime/   застосунок в iframe та bridge
  compiler-worker/   Web Worker для in-browser генерації коду
  network-worker/    Service Worker для перехоплення запитів iframe (віртуальна файлова система)
  api/               проєкти, snapshots, assets, releases
  worker/            production build jobs (серверна збірка)
packages/
  ast/               модель, валідація, міграції, mutations (плоска структура)
  schemas/           metadata компонентів і полів inspector
  components/        доступні UI компоненти
  compiler/          AST → Vue/JS код (спільний для браузера і сервера)
  runtime/           bindings, actions, state
  protocol/          повідомлення builder ↔ preview/workers
  types/             спільні типи

```

- [ ] Для MVP побудувати архітектуру Zero-compute backend для dev-середовища: уся робота з preview відбувається локально в браузері клієнта.
- [ ] Визначити монорепозиторій та межі залежностей: compiler не залежить від UI редактора.

## Phase 1 — AST → in-browser VFS → iframe

**Критерій завершення:** JSON проєкту компілюється в робочий Vue застосунок безпосередньо в браузері, який відкривається в iframe редактора; зміна документа відображається в preview.

- [ ] Ввести `Project { id, version, pages, nodes, components, theme, dataSources, actions }` та `Page { id, path, rootNodeId }`.
- [ ] Нормалізувати вузли за ID: плоска структура `nodes[id]` з `type`, `props`, `children: string[]`, named slots, `bindings`, `events`, styles/classes. Визначити правила унікальності ID, порядку дітей та видалення піддерева.
- [ ] Описати schema/versioning, валідацію, серіалізацію та міграції AST; окремо перевіряти дозволені типи компонентів і props.
- [ ] Зробити Component Registry єдиним джерелом metadata для палітри, inspector, compiler та runtime.
- [ ] Реалізувати незалежний in-browser compiler (Web Worker): `Project AST → VirtualFS`. Використати `@vue/compiler-sfc` для генерації коду без Vite-сервера.
- [ ] Налаштувати Service Worker, який перехоплює HTTP-запити від iframe і віддає згенеровані файли з пам'яті як реальні модулі.
- [ ] Додавати до DOM `data-builder-node="<node-id>"` для відповідності AST ↔ елемент; перевірити вкладені компоненти й named slots.
- [ ] Написати інтеграційний сценарій: імпортоване дерево → Web Worker → Service Worker → iframe → візуальний результат.

## Phase 2 — продуктивне керування preview з редактора

**Критерій завершення:** редагування в editor змінює AST та preview. Безперервні взаємодії (Drag&Drop, ресайз) працюють на 60 FPS без лагів.

- [ ] Розділити мутації на **Transient** (тимчасові прямі DOM-маніпуляції для Drag&Drop/ресайзу без HMR) та **Committed** (фіксація в AST та тригер компіляції при відпусканні миші/кліку).
- [ ] Визначити типізовані mutations: `add_node`, `remove_node`, `move_node`, `update_props`, `update_binding`, `update_event`, `update_style`, `update_page`.
- [ ] Використати `shallowReactive` або `shallowRef` для стану редактора (AST), щоб уникнути оверхеду реактивності Vue на великих деревах.
- [ ] Перевести палітру, canvas/layers, inspector і selection на AST та mutations. Зберегти undo/redo.
- [ ] Додати `postMessage` bridge з контрактом `SELECT_NODE`, `NODE_CLICKED`, hover/inspect. Надсилати між вікнами лише атомарні diffs, а не весь AST.
- [ ] Візуальне виділення (highlight) рендерити поверх iframe в редакторі на основі `DOMRect` координат з iframe, щоб не забруднювати згенерований DOM.

## Phase 3 — mutations → in-browser incremental compilation → HMR

**Критерій завершення:** редагування однієї сторінки оновлює лише її залежні модулі через in-browser HMR без перезапуску preview; інші сторінки не перебудовуються.

- [ ] Побудувати dependency graph від AST nodes/components/pages до generated modules; фіксувати набір affected modules для кожної mutation.
- [ ] Дробити генерацію: компілювати складні вузли/секції в окремі віртуальні компоненти, а не генерувати сторінку монолітом.
- [ ] Реалізувати кешування (`memoization`) на рівні компілятора: якщо `nodeId` + `version` не змінилися, миттєво віддавати закешований рядок коду.
- [ ] Надсилати HMR-патчі в iframe (через `postMessage` або легкий WebSocket клієнт) для точкового оновлення змінених модулів.
- [ ] Зберігати checkpoints/snapshots і журнал mutations для recovery та audit.
- [ ] Виміряти latency: зміна → Web Worker diffing → Service Worker → HMR → готовий iframe.

## Phase 4 — збереження, assets і production publish

**Критерій завершення:** publish фіксує конкретну версію AST, створює відтворюваний artifact на сервері і release URL.

- [ ] API для проєктів, версій, snapshots, mutations, sessions, builds та releases з перевіркою прав доступу.
- [ ] PostgreSQL для metadata і snapshots; object storage для assets, generated source, artifacts та published releases.
- [ ] Asset pipeline: upload → asset ID → storage/CDN; AST зберігає `asset://...`, compiler перетворює його на URL.
- [ ] Черга production jobs і окремий Node.js worker (наприклад, Railway/Vercel/Cloudflare Workers), який бере JSON AST і запускає справжній Vite/Nuxt build для production.
- [ ] Publish: immutable snapshot → shared compiler → Vite/Nuxt production target → artifact → object storage/CDN → release URL.
- [ ] Версійовані releases без перезапису (`release-150`, `release-151`); production вказує на обраний release. Додати rollback.

## Розширення після базового циклу

- [ ] DataSources (REST/GraphQL), bindings та runtime data state.
- [ ] Actions для events, API викликів, навігації та оновлення state; визначити дозволені можливості й безпечне виконання.
- [ ] Модель state: local, page, global, URL і data.
- [ ] Collaboration і спільне редагування поверх версійованого mutation log (CRDT/Yjs).
- [ ] Розглядати WebAssembly (WASM) **виключно** після профілювання на великих проєктах, якщо JS Web Worker стане вузьким місцем (кандидати: normalization, dependency analysis, template/CSS generation). На етапі MVP — не застосовувати.

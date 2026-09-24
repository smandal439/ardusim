// js/libraries/freertos.js — FreeRTOS / Dual-Core Plugin for ESP32
//
// Simulates FreeRTOS task scheduling on ESP32's dual-core (Core 0 + Core 1).
// Uses cooperative async interleaving to simulate concurrent task execution.
//
// Supports: xTaskCreate, xTaskCreatePinnedToCore, vTaskDelay, vTaskDelayUntil,
//   vTaskSuspend, vTaskResume, vTaskDelete, taskYIELD,
//   xQueueCreate, xQueueSend, xQueueReceive, xQueueSpacesAvailable,
//   xSemaphoreCreateMutex, xSemaphoreCreateBinary, xSemaphoreTake, xSemaphoreGive,
//   xEventGroupCreate, xEventGroupSetBits, xEventGroupWaitBits,
//   portENTER_CRITICAL, portEXIT_CRITICAL,
//   vTaskSuspendAll, xTaskResumeAll,
//   esp_deep_sleep, esp_deep_sleep_start, esp_sleep_enable_timer_wakeup,
//   esp_sleep_enable_ext0_wakeup, esp_sleep_enable_ext1_wakeup,
//   esp_sleep_get_wakeup_cause
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['FreeRTOS'] = {
  priority: 40,
  classes: [],
  includes: [
    '<freertos/FreeRTOS.h>',
    '<freertos/task.h>',
    '<freertos/queue.h>',
    '<freertos/semphr.h>',
    '<freertos/event_groups.h>',
    '<freertos/timers.h>',
    '<esp_sleep.h>',
    '<esp_system.h>',
  ],

  transpile: [
    // ── Task function declarations: void name(void *pvParameters) { → async function name(pvParameters) {
    //    Also registers the function in the FreeRTOS task registry.
    //    Matches: void fn(void *p), void fn(void* p), void fn(void * p)
    //    NOTE: (?<!\.) lookbehind on _a.* patterns prevents double-transpilation
    //    when the transpiler's second pass (step 5c) re-runs plugin rules.
    [/\bvoid\s+(\w+)\s*\(\s*void\s*\*\s*\w+\s*\)\s*\{/g,
      function (_, name) {
        return 'async function ' + name + '(pvParameters) { if(window._freertosTaskRegistry) window._freertosTaskRegistry["' + name + '"]=' + name + ';';
      }
    ],

    // ── xTaskCreatePinnedToCore(func, name, stack, param, prio, handle, core)
    [/(?<!\.)xTaskCreatePinnedToCore\s*\(\s*(\w+)\s*,\s*/g,
      'await _a.xTaskCreatePinnedToCore($1, '
    ],

    // ── xTaskCreate(func, name, stack, param, prio, handle)
    [/(?<!\.)xTaskCreate\s*\(\s*(\w+)\s*,\s*/g,
      'await _a.xTaskCreate($1, '
    ],

    // ── vTaskDelay(ticks) → await _a.vTaskDelay(ticks)
    [/(?<!\.)vTaskDelay\s*\(/g, 'await _a.vTaskDelay('],

    // ── vTaskDelayUntil(&lastTick, ticks) → await _a.vTaskDelayUntil(lastTick, ticks)
    [/(?<!\.)vTaskDelayUntil\s*\(\s*&(\w+)\s*,/g, 'await _a.vTaskDelayUntil($1,'],

    // ── Task control
    [/(?<!\.)vTaskSuspend\s*\(\s*(\w+)\s*\)/g, '_a.vTaskSuspend($1)'],
    [/(?<!\.)vTaskSuspendAll\s*\(\s*\)/g, '_a.vTaskSuspendAll()'],
    [/(?<!\.)vTaskResume\s*\(\s*(\w+)\s*\)/g, '_a.vTaskResume($1)'],
    [/(?<!\.)xTaskResumeAll\s*\(\s*\)/g, '_a.xTaskResumeAll()'],
    [/(?<!\.)vTaskDelete\s*\(\s*(\w+)\s*\)/g, '_a.vTaskDelete($1)'],
    [/(?<!\.)vTaskDelete\s*\(\s*NULL\s*\)/g, '_a.vTaskDelete(null)'],
    [/(?<!\.)taskYIELD\s*\(\s*\)/g, 'await _a.taskYIELD()'],
    [/(?<!\.)taskENTER_CRITICAL\s*\(\s*\)/g, '_a.taskENTER_CRITICAL()'],
    [/(?<!\.)taskEXIT_CRITICAL\s*\(\s*\)/g, '_a.taskEXIT_CRITICAL()'],
    [/(?<!\.)portENTER_CRITICAL\s*\(\s*&?(\w+)?\s*\)/g, '_a.taskENTER_CRITICAL()'],
    [/(?<!\.)portEXIT_CRITICAL\s*\(\s*&?(\w+)?\s*\)/g, '_a.taskEXIT_CRITICAL()'],
    [/(?<!\.)portENTER_CRITICAL_SAFE\s*\(\s*&?(\w+)?\s*\)/g, '_a.taskENTER_CRITICAL()'],
    [/(?<!\.)portEXIT_CRITICAL_SAFE\s*\(\s*&?(\w+)?\s*\)/g, '_a.taskEXIT_CRITICAL()'],

    // ── Queue API
    [/(?<!\.)xQueueCreate\s*\(/g, '_a.xQueueCreate('],
    [/(?<!\.)xQueueSend\s*\(/g, 'await _a.xQueueSend('],
    [/(?<!\.)xQueueSendToFront\s*\(/g, 'await _a.xQueueSend('],
    [/(?<!\.)xQueueSendToBack\s*\(/g, 'await _a.xQueueSend('],
    [/(?<!\.)xQueueReceive\s*\(/g, 'await _a.xQueueReceive('],
    [/(?<!\.)xQueuePeek\s*\(/g, 'await _a.xQueuePeek('],
    [/(?<!\.)xQueueSpacesAvailable\s*\(/g, '_a.xQueueSpacesAvailable('],
    [/(?<!\.)xQueueReset\s*\(/g, '_a.xQueueReset('],

    // ── Semaphore API
    [/(?<!\.)xSemaphoreCreateMutex\s*\(\s*\)/g, '_a.xSemaphoreCreateMutex()'],
    [/(?<!\.)xSemaphoreCreateBinary\s*\(\s*\)/g, '_a.xSemaphoreCreateBinary()'],
    [/(?<!\.)xSemaphoreCreateCounting\s*\(/g, '_a.xSemaphoreCreateCounting('],
    [/(?<!\.)xSemaphoreTake\s*\(/g, 'await _a.xSemaphoreTake('],
    [/(?<!\.)xSemaphoreGive\s*\(/g, '_a.xSemaphoreGive('],
    [/(?<!\.)xSemaphoreGiveFromISR\s*\(/g, '_a.xSemaphoreGive('],

    // ── Event Group API
    [/(?<!\.)xEventGroupCreate\s*\(\s*\)/g, '_a.xEventGroupCreate()'],
    [/(?<!\.)xEventGroupSetBits\s*\(/g, '_a.xEventGroupSetBits('],
    [/(?<!\.)xEventGroupClearBits\s*\(/g, '_a.xEventGroupClearBits('],
    [/(?<!\.)xEventGroupWaitBits\s*\(/g, 'await _a.xEventGroupWaitBits('],
    [/(?<!\.)xEventGroupGetBits\s*\(/g, '_a.xEventGroupGetBits('],

    // ── ESP32 deep sleep API (they throw ESP_DEEPSLEEP to abort the current
    //    boot, so they are synchronous — no await).
    [/(?<!\.)esp_deep_sleep_start\s*\(/g, '_a.esp_deep_sleep_start('],
    [/(?<!\.)esp_deep_sleep\s*\(/g, '_a.esp_deep_sleep('],
    [/(?<!\.)esp_sleep_enable_timer_wakeup\s*\(/g, '_a.esp_sleep_enable_timer_wakeup('],
    [/(?<!\.)esp_sleep_enable_ext0_wakeup\s*\(/g, '_a.esp_sleep_enable_ext0_wakeup('],
    [/(?<!\.)esp_sleep_enable_ext1_wakeup\s*\(/g, '_a.esp_sleep_enable_ext1_wakeup('],
    [/(?<!\.)esp_sleep_get_wakeup_cause\s*\(/g, '_a.esp_sleep_get_wakeup_cause('],

    // ── Type stripping for FreeRTOS-specific patterns
    [/\bportMUX_TYPE\s+(\w+)\s*=\s*portMUX_INITIALIZER_UNLOCKED\s*;/g, 'var $1 = {};'],
    [/\bportMUX_TYPE\s+(\w+)\s*;/g, 'var $1 = {};'],
    [/\bTaskHandle_t\s+(\w+)\s*;/g, 'var $1 = null;'],
    [/\bQueueHandle_t\s+(\w+)\s*;/g, 'var $1 = null;'],
    [/\bSemaphoreHandle_t\s+(\w+)\s*;/g, 'var $1 = null;'],
    [/\bEventGroupHandle_t\s+(\w+)\s*;/g, 'var $1 = null;'],
    [/\bBaseType_t\s+(\w+)(?=\s*[=;,])/g, 'var $1'],
    [/\bUBaseType_t\s+(\w+)(?=\s*[=;,])/g, 'var $1'],
    [/\bTickType_t\s+(\w+)(?=\s*[=;,])/g, 'var $1'],
    [/\bconst\s+TickType_t\s+(\w+)/g, 'var $1'],
    [/\bportMUX_TYPE\s*&/g, ''],
    [/\bTaskFunction_t\s+/g, 'var '],
    [/\bStackType_t\s+/g, 'var '],
    [/\bStaticTask_t\s+/g, 'var '],
    [/\bTimerHandle_t\s+/g, 'var '],
  ],

  constants: {
    APP_CPU_NUM: 0,
    PRO_CPU_NUM: 1,
    tskIDLE_PRIORITY: 0,
    configMAX_PRIORITIES: 25,
    portMAX_DELAY: 0xFFFFFFFF,
    portTICK_PERIOD_MS: 1,
    pdMS_TO_TICKS: function(ms) { return Math.max(1, Math.round(ms)); },
    pdTRUE: 1,
    pdFALSE: 0,
    errQUEUE_FULL: 0,
    errQUEUE_EMPTY: 0,
    pdPASS: 1,
    pdFAIL: 0,
    // ESP32 deep sleep wakeup causes (esp_sleep_wakeup_cause_t)
    ESP_SLEEP_WAKEUP_UNDEFINED: 0,
    ESP_SLEEP_WAKEUP_ALL: 1,
    ESP_SLEEP_WAKEUP_EXT0: 2,
    ESP_SLEEP_WAKEUP_EXT1: 3,
    ESP_SLEEP_WAKEUP_TIMER: 4,
    ESP_SLEEP_WAKEUP_TOUCHPAD: 5,
    ESP_SLEEP_WAKEUP_ULP: 6,
    // esp_sleep_enable_ext1_wakeup() modes
    ESP_EXT1_WAKEUP_ALL_LOW: 0,
    ESP_EXT1_WAKEUP_ANY_HIGH: 1,
  },

  constructor: null,

  runtime: function(self) {
    // ══════════════ FreeRTOS State ══════════════
    if (!self._freertosTasks) self._freertosTasks = { 0: [], 1: [] };
    if (!self._freertosQueues) self._freertosQueues = [];
    if (!self._freertosSemaphores) self._freertosSemaphores = [];
    if (!self._freertosEventGroups) self._freertosEventGroups = [];
    if (!self._freertosCurrentTask) self._freertosCurrentTask = {};
    if (!self._freertosCriticalSection) self._freertosCriticalSection = 0;
    if (!self._freertosSuspended) self._freertosSuspended = false;
    if (!self._freertosSuspendCount) self._freertosSuspendCount = 0;

    function _currentCore() {
      return self._freertosCurrentCore || 0;
    }

    // Best-effort lookup of the task that is currently executing on the
    // current core. Used ONLY for cosmetic state bookkeeping (running/blocked) —
    // never for correctness, so a miss is harmless.
    function _findCurrentTask() {
      var core = _currentCore();
      var tasks = self._freertosTasks[core];
      if (!tasks) return null;
      for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].state === 'running' && tasks[i]._promise) return tasks[i];
      }
      for (var j = 0; j < tasks.length; j++) {
        var t = tasks[j];
        if (t._promise && t.state !== 'suspended' && t.state !== 'terminated') return t;
      }
      return null;
    }

    // Starvation guard: a task that spins through immediate (already-resolved)
    // awaits would starve the browser event loop. Every N tight iterations we
    // force a real macrotask yield.
    function _maybeYield() {
      self._iterSinceDelay = (self._iterSinceDelay || 0) + 1;
      if (self._iterSinceDelay > (self._MAX_TIGHT_ITERS || 1000)) {
        self._iterSinceDelay = 0;
        return new Promise(function(r) { setTimeout(r, 0); });
      }
      return null;
    }

    function _wakeTask(task) {
      if (task) task.state = 'running';
    }

    // Abort the current boot and request a deep-sleep restart. The thrown
    // sentinel is swallowed by run()/_startExecution(), which performs the
    // sleep and re-invokes setup() with fresh global state.
    function _deepsleepStart() {
      var cause = 0;
      var sleepMs = 0;

      if (self._deepsleepTimerUs > 0) {
        cause = 4; // ESP_SLEEP_WAKEUP_TIMER
        sleepMs = Math.max(1, Math.round(self._deepsleepTimerUs / 1000));
      } else if (self._deepsleepExt0) {
        cause = 2; // ESP_SLEEP_WAKEUP_EXT0
        sleepMs = 1000;
      } else if (self._deepsleepExt1) {
        cause = 3; // ESP_SLEEP_WAKEUP_EXT1
        sleepMs = 1000;
      }

      if (cause === 0) {
        self._serialLog('[ESP32] Deep sleep with no wakeup source configured // device will not wake\n', 'system');
        self._deepsleepPending = { cause: 0, sleepMs: 0, forever: true };
      } else {
        self._serialLog('[ESP32] Deep sleep for ' + sleepMs + ' ms\n', 'system');
        self._deepsleepPending = { cause: cause, sleepMs: sleepMs, forever: false };
      }

      var err = new Error('ESP_DEEPSLEEP');
      err.isDeepSleep = true;
      throw err;
    }

    // ══════════════ TASK MANAGEMENT ══════════════

    function _createTask(funcOrName, taskName, stackSize, params, priority, handleVar, coreId) {
      var fn;
      if (typeof funcOrName === 'function') {
        fn = funcOrName;
      } else if (typeof funcOrName === 'string') {
        fn = self._freertosTaskRegistry[funcOrName];
        if (!fn) {
          self._serialLog('[FreeRTOS] ERROR: Task function "' + funcOrName + '" not found in registry\n', 'error');
          return -1;
        }
      } else {
        self._serialLog('[FreeRTOS] ERROR: Invalid task function\n', 'error');
        return -1;
      }

      coreId = (coreId === undefined || coreId === null) ? 1 : coreId;
      if (coreId !== 0 && coreId !== 1) coreId = 1;

      var taskObj = {
        name: taskName || 'unnamed',
        asyncFn: fn,
        params: params,
        priority: priority || 1,
        coreId: coreId,
        state: 'ready',
        handle: null,
        _promise: null,
        _wakeTime: 0,
      };

      var handleObj = { _task: taskObj };
      taskObj.handle = handleObj;

      if (handleVar !== null && handleVar !== undefined && typeof handleVar === 'object') {
        handleVar.val = handleObj;
      }

      self._freertosTasks[coreId].push(taskObj);
      self._serialLog('[FreeRTOS] Task "' + taskObj.name + '" created on Core ' + coreId + ' (priority ' + taskObj.priority + ')\n', 'system');

      return 0;
    }

    return {
      // ── Task Creation ──
      xTaskCreatePinnedToCore: function(funcOrName, taskName, stackSize, params, priority, handleVar, coreId) {
        return _createTask(funcOrName, taskName, stackSize, params, priority, handleVar, coreId);
      },

      xTaskCreate: function(funcOrName, taskName, stackSize, params, priority, handleVar) {
        return _createTask(funcOrName, taskName, stackSize, params, priority, handleVar, 1);
      },

      // ── Task Control ──
      vTaskDelay: async function(ticks) {
        if (ticks === 0 || ticks === undefined) {
          // vTaskDelay(0) is a pure yield on real hardware — it must hand the
          // event loop back to the browser, otherwise a `while(true)` loop
          // built on it starves every timer in the page.
          await new Promise(function(r) { setTimeout(r, 0); });
          return;
        }
        var ms;
        if (ticks >= 0xFFFFFFF0) {
          ms = 60000;
        } else {
          ms = ticks;
        }
        self.simTime += ms;
        self._iterSinceDelay = 0;
        await self._delayPromise(ms / self.speed);
      },

      vTaskDelayUntil: async function(lastWakePtr, ticks) {
        var ms = ticks || 1;
        var now = self.simTime;
        var elapsed = now - (lastWakePtr.val || 0);
        var remaining = Math.max(0, ms - elapsed);
        lastWakePtr.val = now + ms;
        if (remaining > 0) {
          self.simTime += remaining;
          self._iterSinceDelay = 0;
          await self._delayPromise(remaining / self.speed);
        }
      },

      vTaskSuspend: function(taskHandle) {
        if (taskHandle && taskHandle._task) {
          taskHandle._task.state = 'suspended';
          self._serialLog('[FreeRTOS] Task "' + taskHandle._task.name + '" suspended\n', 'system');
        }
      },

      vTaskResume: function(taskHandle) {
        if (taskHandle && taskHandle._task) {
          if (taskHandle._task.state === 'suspended') {
            taskHandle._task.state = 'ready';
            self._serialLog('[FreeRTOS] Task "' + taskHandle._task.name + '" resumed\n', 'system');
          }
        }
      },

      vTaskDelete: function(taskHandle) {
        if (taskHandle && taskHandle._task) {
          taskHandle._task.state = 'terminated';
          taskHandle._task._promise = null;
          self._serialLog('[FreeRTOS] Task "' + taskHandle._task.name + '" deleted\n', 'system');
        } else if (taskHandle === null) {
          var selfTask = _findCurrentTask();
          if (selfTask) {
            selfTask.state = 'terminated';
            selfTask._promise = null;
            self._serialLog('[FreeRTOS] Task "' + selfTask.name + '" deleted\n', 'system');
          }
        }
      },

      taskYIELD: async function() {
        await new Promise(function(r) { setTimeout(r, 0); });
      },

      taskENTER_CRITICAL: function() {
        self._freertosCriticalSection++;
      },

      taskEXIT_CRITICAL: function() {
        if (self._freertosCriticalSection > 0) self._freertosCriticalSection--;
      },

      vTaskSuspendAll: function() {
        self._freertosSuspendCount++;
        self._freertosSuspended = true;
      },

      xTaskResumeAll: function() {
        if (self._freertosSuspendCount > 0) {
          self._freertosSuspendCount--;
          if (self._freertosSuspendCount === 0) {
            self._freertosSuspended = false;
          }
        }
        return 1;
      },

      // ══════════════ QUEUE API ══════════════
      xQueueCreate: function(length, itemSize) {
        var q = {
          buffer: [],
          maxLength: length || 10,
          itemSize: itemSize || 4,
          waitingReceivers: [],
          waitingSenders: [],
        };
        var handle = self._freertosQueues.length;
        self._freertosQueues.push(q);
        return { _queue: q, _handle: handle };
      },

      xQueueSend: async function(queueHandle, data, ticksToWait) {
        var q = queueHandle && queueHandle._queue ? queueHandle._queue : null;
        if (!q) return 0;

        // Deliver to any waiting receiver (entries carry their own resolve(),
        // so correctness never depends on finding the calling task).
        function _deliverToReceiver() {
          if (q.waitingReceivers.length === 0) return false;
          var remaining = [];
          var gave = false;
          for (var i = 0; i < q.waitingReceivers.length; i++) {
            var e = q.waitingReceivers[i];
            if (e.peek) {
              e.resolve(q.buffer[0]);
              continue;
            }
            if (!gave) {
              gave = true;
              e.resolve(q.buffer.shift());
              continue;
            }
            remaining.push(e);
          }
          q.waitingReceivers = remaining;
          return gave;
        }

        if (q.buffer.length < q.maxLength) {
          q.buffer.push(data);
          _deliverToReceiver();
          return 1;
        }

        if (ticksToWait === 0 || ticksToWait === undefined) return 0;

        var task = _findCurrentTask();
        if (task) task.state = 'blocked';

        var entry = { task: task, data: data, resolve: null };
        var result = await new Promise(function(resolve) {
          entry.resolve = resolve;
          q.waitingSenders.push(entry);

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              var idx = q.waitingSenders.indexOf(entry);
              if (idx !== -1) {
                q.waitingSenders.splice(idx, 1);
                _wakeTask(entry.task);
                resolve(0);
              }
            }, ticksToWait / self.speed);
          }
        });

        _wakeTask(task);
        var y = _maybeYield();
        if (y) await y;
        return result;
      },

      xQueueReceive: async function(queueHandle, buffer, ticksToWait) {
        var q = queueHandle && queueHandle._queue ? queueHandle._queue : null;
        if (!q) return null;

        function _store(item) {
          if (buffer && typeof buffer === 'object') buffer.val = item;
          return item;
        }

        // Pull an item off the queue, handing our slot to one blocked sender.
        function _take() {
          var item = q.buffer.shift();
          if (q.waitingSenders.length > 0) {
            var sender = q.waitingSenders.shift();
            q.buffer.push(sender.data);
            _wakeTask(sender.task);
            sender.resolve(1);
          }
          return item;
        }

        if (q.buffer.length > 0) {
          var item = _take();
          var y = _maybeYield();
          if (y) await y;
          return _store(item);
        }

        if (ticksToWait === 0 || ticksToWait === undefined) return null;

        var task = _findCurrentTask();
        if (task) task.state = 'blocked';

        var entry = { task: task, peek: false, resolve: null };
        var result = await new Promise(function(resolve) {
          entry.resolve = function(val) { resolve(_store(val)); };
          q.waitingReceivers.push(entry);

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              var idx = q.waitingReceivers.indexOf(entry);
              if (idx !== -1) {
                q.waitingReceivers.splice(idx, 1);
                _wakeTask(entry.task);
                resolve(null);
              }
            }, ticksToWait / self.speed);
          }
        });

        _wakeTask(task);
        return result;
      },

      xQueuePeek: async function(queueHandle, buffer, ticksToWait) {
        var q = queueHandle && queueHandle._queue ? queueHandle._queue : null;
        if (!q) return null;

        if (q.buffer.length > 0) {
          if (buffer && typeof buffer === 'object') buffer.val = q.buffer[0];
          var y0 = _maybeYield();
          if (y0) await y0;
          return q.buffer[0];
        }

        if (ticksToWait === 0 || ticksToWait === undefined) return null;

        var task = _findCurrentTask();
        if (task) task.state = 'blocked';

        var entry = { task: task, peek: true, resolve: null };
        var result = await new Promise(function(resolve) {
          entry.resolve = function(val) {
            if (buffer && typeof buffer === 'object') buffer.val = val;
            resolve(val);
          };
          q.waitingReceivers.push(entry);

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              var idx = q.waitingReceivers.indexOf(entry);
              if (idx !== -1) {
                q.waitingReceivers.splice(idx, 1);
                _wakeTask(entry.task);
                resolve(null);
              }
            }, ticksToWait / self.speed);
          }
        });

        _wakeTask(task);
        return result;
      },

      xQueueSpacesAvailable: function(queueHandle) {
        var q = queueHandle && queueHandle._queue ? queueHandle._queue : null;
        if (!q) return 0;
        return q.maxLength - q.buffer.length;
      },

      xQueueReset: function(queueHandle) {
        var q = queueHandle && queueHandle._queue ? queueHandle._queue : null;
        if (!q) return 0;
        q.buffer = [];
        q.waitingReceivers = [];
        q.waitingSenders = [];
        return 1;
      },

      // ══════════════ SEMAPHORE / MUTEX API ══════════════
      xSemaphoreCreateMutex: function() {
        return { type: 'mutex', count: 1, owner: null, waiting: [] };
      },

      xSemaphoreCreateBinary: function() {
        return { type: 'binary', count: 0, owner: null, waiting: [] };
      },

      xSemaphoreCreateCounting: function(maxCount, initialCount) {
        return { type: 'counting', count: initialCount || 0, maxCount: maxCount || 10, owner: null, waiting: [] };
      },

      xSemaphoreTake: async function(semHandle, ticksToWait) {
        if (!semHandle) return 0;

        if (semHandle.count > 0) {
          semHandle.count--;
          var y0 = _maybeYield();
          if (y0) await y0;
          return 1;
        }

        if (ticksToWait === 0) return 0;

        var task = _findCurrentTask();
        if (task) task.state = 'blocked';

        var entry = { task: task, resolve: null };
        var result = await new Promise(function(resolve) {
          entry.resolve = resolve;
          semHandle.waiting.push(entry);

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              var idx = semHandle.waiting.indexOf(entry);
              if (idx !== -1) {
                semHandle.waiting.splice(idx, 1);
                _wakeTask(entry.task);
                resolve(0);
              }
            }, ticksToWait / self.speed);
          }
        });

        _wakeTask(task);
        return result;
      },

      xSemaphoreGive: function(semHandle) {
        if (!semHandle) return 0;

        semHandle.count++;

        if (semHandle.waiting.length > 0) {
          var entry = semHandle.waiting.shift();
          _wakeTask(entry.task);
          if (entry.resolve) entry.resolve(1);
          semHandle.count--;
        }

        return 1;
      },

      // ══════════════ EVENT GROUP API ══════════════
      xEventGroupCreate: function() {
        return { bits: 0, waiting: [] };
      },

      xEventGroupSetBits: function(eventGroup, bitsToSet) {
        if (!eventGroup) return 0;
        eventGroup.bits |= bitsToSet;

        var stillWaiting = [];
        for (var i = 0; i < eventGroup.waiting.length; i++) {
          var entry = eventGroup.waiting[i];
          var match = entry.waitAll
            ? (eventGroup.bits & entry.bits) === entry.bits
            : (eventGroup.bits & entry.bits) !== 0;
          if (match) {
            _wakeTask(entry.task);
            if (entry.resolve) entry.resolve(eventGroup.bits);
          } else {
            stillWaiting.push(entry);
          }
        }
        eventGroup.waiting = stillWaiting;

        return eventGroup.bits;
      },

      xEventGroupClearBits: function(eventGroup, bitsToClear) {
        if (!eventGroup) return 0;
        var prev = eventGroup.bits;
        eventGroup.bits &= ~bitsToClear;
        return prev;
      },

      xEventGroupWaitBits: async function(eventGroup, bitsToWait, clearOnExit, waitAll, ticksToWait) {
        if (!eventGroup) return 0;

        var match = waitAll
          ? (eventGroup.bits & bitsToWait) === bitsToWait
          : (eventGroup.bits & bitsToWait) !== 0;

        if (match) {
          if (clearOnExit) eventGroup.bits &= ~bitsToWait;
          return eventGroup.bits;
        }

        if (ticksToWait === 0 || ticksToWait === undefined) return eventGroup.bits;

        var task = _findCurrentTask();
        if (task) task.state = 'blocked';

        var entry = { task: task, bits: bitsToWait, waitAll: waitAll, resolve: null };
        var result = await new Promise(function(resolve) {
          entry.resolve = resolve;
          eventGroup.waiting.push(entry);

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              var idx = eventGroup.waiting.indexOf(entry);
              if (idx !== -1) {
                eventGroup.waiting.splice(idx, 1);
                _wakeTask(entry.task);
                resolve(eventGroup.bits);
              }
            }, ticksToWait / self.speed);
          }
        });

        _wakeTask(task);
        return result;
      },

      xEventGroupGetBits: function(eventGroup) {
        return eventGroup ? eventGroup.bits : 0;
      },

      // ══════════════ ESP32 DEEP SLEEP ══════════════
      // A deep-sleep call aborts the current boot by throwing a sentinel error
      // that run()/_startExecution() recognise. They then advance the sim clock
      // by the sleep duration, set the wakeup cause and re-run setup() — i.e.
      // exactly what the silicon does on reset.
      esp_sleep_enable_timer_wakeup: function(timeUs) {
        self._deepsleepTimerUs = Math.max(0, Number(timeUs) || 0);
        return 0;
      },

      esp_sleep_enable_ext0_wakeup: function(gpio, level) {
        self._deepsleepExt0 = { gpio: Number(gpio) || 0, level: Number(level) ? 1 : 0 };
        return 0;
      },

      esp_sleep_enable_ext1_wakeup: function(mask, mode) {
        self._deepsleepExt1 = { mask: Number(mask) || 0, mode: Number(mode) || 0 };
        return 0;
      },

      esp_sleep_disable_wakeup: function() {
        self._deepsleepTimerUs = 0;
        self._deepsleepExt0 = null;
        self._deepsleepExt1 = null;
        return 0;
      },

      esp_sleep_get_wakeup_cause: function() {
        return self._deepsleepWakeupCause || 0;
      },

      esp_deep_sleep: function(timeUs) {
        if (Number(timeUs) > 0) self._deepsleepTimerUs = Number(timeUs);
        return _deepsleepStart();
      },

      esp_deep_sleep_start: function() {
        return _deepsleepStart();
      },

      // ══════════════ SCHEDULER ══════════════
      _freertosHasTasks: function() {
        return (self._freertosTasks[0].length + self._freertosTasks[1].length) > 0;
      },

      _freertosRunCore: async function(coreId) {
        var spinGuard = 0;
        while (self.isRunning && !self._deepsleepPending) {
          if (self._freertosSuspended) {
            await new Promise(function(r) { setTimeout(r, 1); });
            continue;
          }

          var tasks = self._freertosTasks[coreId];

          // Start any ready tasks that aren't already running.
          // `let` gives each iteration its own binding so the .then/.catch
          // closures below always reference THEIR task, never the last one
          // the loop visited (a `var` here silently corrupted task state).
          for (var i = 0; i < tasks.length; i++) {
            let task = tasks[i];
            if (task.state === 'ready' && !task._promise) {
              if (typeof task.asyncFn !== 'function') {
                self._serialLog('[FreeRTOS] ERROR: Task "' + task.name + '" has no callable function\n', 'error');
                task.state = 'terminated';
                continue;
              }
              task.state = 'running';
              self._freertosCurrentCore = coreId;
              self._freertosCurrentTask[coreId] = task;

              var started;
              try {
                started = Promise.resolve(task.asyncFn(task.params));
              } catch (syncErr) {
                self._serialLog('[FreeRTOS] Task "' + task.name + '" error: ' +
                  (syncErr && syncErr.message ? syncErr.message : syncErr) + '\n', 'error');
                task.state = 'terminated';
                task._promise = null;
                continue;
              }

              task._promise = started.then(function() {
                task.state = 'terminated';
                task._promise = null;
              }).catch(function(e) {
                if (e && e.message === 'SIMULATION_STOPPED') {
                  task._promise = null;
                  return;
                }
                if (e && e.isDeepSleep) {
                  // Deep sleep was requested from inside this task — the
                  // scheduler loop exits via self._deepsleepPending.
                  task.state = 'terminated';
                  task._promise = null;
                  return;
                }
                self._serialLog('[FreeRTOS] Task "' + task.name + '" error: ' + (e && e.message ? e.message : e) + '\n', 'error');
                task.state = 'terminated';
                task._promise = null;
              });
            }
          }

          // Clean up terminated tasks
          self._freertosTasks[coreId] = tasks.filter(function(t) { return t.state !== 'terminated'; });

          // Yield to browser event loop — this allows async continuations
          // (delay promises, queue waits, etc.) to resolve
          spinGuard++;
          if (spinGuard > 1000) {
            spinGuard = 0;
            await new Promise(function(r) { setTimeout(r, 1); });
          } else {
            await new Promise(function(r) { setTimeout(r, 0); });
          }
        }
      },

      _freertosScheduler: async function() {
        var rt = self._a;
        var core0Done = rt._freertosRunCore(0);
        var core1Done = rt._freertosRunCore(1);
        await Promise.all([core0Done, core1Done]);
      },
    };
  },
};

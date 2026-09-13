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
//   vTaskSuspendAll, xTaskResumeAll
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
        if (ticks === 0 || ticks === undefined) return;
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
          var core = _currentCore();
          var tasks = self._freertosTasks[core];
          for (var i = tasks.length - 1; i >= 0; i--) {
            if (tasks[i].state === 'running') {
              tasks[i].state = 'terminated';
              tasks[i]._promise = null;
              break;
            }
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

        if (ticksToWait === 0 || ticksToWait === undefined) {
          if (q.buffer.length < q.maxLength) {
            q.buffer.push(data);
            if (q.waitingReceivers.length > 0) {
              var recvTask = q.waitingReceivers.shift();
              recvTask.state = 'ready';
              recvTask._waitResolve(data);
              recvTask._waitResolve = null;
            }
            return 1;
          }
          return 0;
        }

        if (q.buffer.length < q.maxLength) {
          q.buffer.push(data);
          if (q.waitingReceivers.length > 0) {
            var recvTask2 = q.waitingReceivers.shift();
            recvTask2.state = 'ready';
            recvTask2._waitResolve(q.buffer.shift());
            recvTask2._waitResolve = null;
          }
          return 1;
        }

        var task = null;
        var core = _currentCore();
        var tasks = self._freertosTasks[core];
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].state === 'running') { task = tasks[i]; break; }
        }
        if (!task) return 0;

        task.state = 'blocked';

        var result = await new Promise(function(resolve) {
          task._waitResolve = resolve;
          q.waitingSenders.push({ task: task, data: data });

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              for (var j = q.waitingSenders.length - 1; j >= 0; j--) {
                if (q.waitingSenders[j].task === task) {
                  q.waitingSenders.splice(j, 1);
                  task.state = 'ready';
                  task._waitResolve = null;
                  resolve(0);
                  break;
                }
              }
            }, ticksToWait / self.speed);
          }
        });

        return result;
      },

      xQueueReceive: async function(queueHandle, buffer, ticksToWait) {
        var q = queueHandle && queueHandle._queue ? queueHandle._queue : null;
        if (!q) return null;

        if (ticksToWait === 0 || ticksToWait === undefined) {
          if (q.buffer.length > 0) {
            var item = q.buffer.shift();
            if (q.waitingSenders.length > 0) {
              var sender = q.waitingSenders.shift();
              q.buffer.push(sender.data);
              sender.task.state = 'ready';
              sender.task._waitResolve(1);
              sender.task._waitResolve = null;
            }
            if (buffer && typeof buffer === 'object') {
              buffer.val = item;
            }
            return item;
          }
          return null;
        }

        if (q.buffer.length > 0) {
          var item2 = q.buffer.shift();
          if (q.waitingSenders.length > 0) {
            var sender2 = q.waitingSenders.shift();
            q.buffer.push(sender2.data);
            sender2.task.state = 'ready';
            sender2.task._waitResolve(1);
            sender2.task._waitResolve = null;
          }
          if (buffer && typeof buffer === 'object') {
            buffer.val = item2;
          }
          return item2;
        }

        var task = null;
        var core = _currentCore();
        var tasks = self._freertosTasks[core];
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].state === 'running') { task = tasks[i]; break; }
        }
        if (!task) return null;

        task.state = 'blocked';

        var result2 = await new Promise(function(resolve) {
          task._waitResolve = function(val) {
            if (buffer && typeof buffer === 'object') {
              buffer.val = val;
            }
            resolve(val);
          };
          q.waitingReceivers.push(task);

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              for (var j = q.waitingReceivers.length - 1; j >= 0; j--) {
                if (q.waitingReceivers[j] === task) {
                  q.waitingReceivers.splice(j, 1);
                  task.state = 'ready';
                  task._waitResolve = null;
                  resolve(null);
                  break;
                }
              }
            }, ticksToWait / self.speed);
          }
        });

        return result2;
      },

      xQueuePeek: async function(queueHandle, buffer, ticksToWait) {
        var q = queueHandle && queueHandle._queue ? queueHandle._queue : null;
        if (!q) return null;

        if (q.buffer.length > 0) {
          var item = q.buffer[0];
          if (buffer && typeof buffer === 'object') {
            buffer.val = item;
          }
          return item;
        }

        if (ticksToWait === 0) return null;

        var task = null;
        var core = _currentCore();
        var tasks = self._freertosTasks[core];
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].state === 'running') { task = tasks[i]; break; }
        }
        if (!task) return null;

        task.state = 'blocked';

        var result = await new Promise(function(resolve) {
          task._waitResolve = function(val) {
            if (buffer && typeof buffer === 'object') {
              buffer.val = val;
            }
            resolve(val);
          };
          q.waitingReceivers.push({ task: task, peek: true });

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              for (var j = q.waitingReceivers.length - 1; j >= 0; j--) {
                if (q.waitingReceivers[j].task === task) {
                  q.waitingReceivers.splice(j, 1);
                  task.state = 'ready';
                  task._waitResolve = null;
                  resolve(null);
                  break;
                }
              }
            }, ticksToWait / self.speed);
          }
        });

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
          return 1;
        }

        if (ticksToWait === 0) return 0;

        var task = null;
        var core = _currentCore();
        var tasks = self._freertosTasks[core];
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].state === 'running') { task = tasks[i]; break; }
        }
        if (!task) return 0;

        task.state = 'blocked';

        var result = await new Promise(function(resolve) {
          task._waitResolve = resolve;
          semHandle.waiting.push(task);

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              for (var j = semHandle.waiting.length - 1; j >= 0; j--) {
                if (semHandle.waiting[j] === task) {
                  semHandle.waiting.splice(j, 1);
                  task.state = 'ready';
                  task._waitResolve = null;
                  resolve(0);
                  break;
                }
              }
            }, ticksToWait / self.speed);
          }
        });

        return result;
      },

      xSemaphoreGive: function(semHandle) {
        if (!semHandle) return 0;

        semHandle.count++;

        if (semHandle.waiting.length > 0) {
          var task = semHandle.waiting.shift();
          task.state = 'ready';
          if (task._waitResolve) {
            task._waitResolve(1);
            task._waitResolve = null;
          }
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
            entry.task.state = 'ready';
            if (entry.task._waitResolve) {
              entry.task._waitResolve(eventGroup.bits);
              entry.task._waitResolve = null;
            }
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

        if (ticksToWait === 0) return eventGroup.bits;

        var task = null;
        var core = _currentCore();
        var tasks = self._freertosTasks[core];
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].state === 'running') { task = tasks[i]; break; }
        }
        if (!task) return eventGroup.bits;

        task.state = 'blocked';

        var result = await new Promise(function(resolve) {
          task._waitResolve = resolve;
          eventGroup.waiting.push({ task: task, bits: bitsToWait, waitAll: waitAll });

          if (ticksToWait < 0xFFFFFFF0) {
            setTimeout(function() {
              for (var j = eventGroup.waiting.length - 1; j >= 0; j--) {
                if (eventGroup.waiting[j].task === task) {
                  eventGroup.waiting.splice(j, 1);
                  task.state = 'ready';
                  task._waitResolve = null;
                  resolve(eventGroup.bits);
                  break;
                }
              }
            }, ticksToWait / self.speed);
          }
        });

        return result;
      },

      xEventGroupGetBits: function(eventGroup) {
        return eventGroup ? eventGroup.bits : 0;
      },

      // ══════════════ SCHEDULER ══════════════
      _freertosHasTasks: function() {
        return (self._freertosTasks[0].length + self._freertosTasks[1].length) > 0;
      },

      _freertosRunCore: async function(coreId) {
        while (self.isRunning) {
          if (self._freertosSuspended) {
            await new Promise(function(r) { setTimeout(r, 1); });
            continue;
          }

          var tasks = self._freertosTasks[coreId];

          // Start any ready tasks that aren't already running
          for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            if (task.state === 'ready' && !task._promise) {
              task.state = 'running';
              self._freertosCurrentCore = coreId;
              self._freertosCurrentTask[coreId] = task;

              task._promise = task.asyncFn(task.params).then(function() {
                task.state = 'terminated';
                task._promise = null;
              }).catch(function(e) {
                if (e && e.message === 'SIMULATION_STOPPED') {
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
          await new Promise(function(r) { setTimeout(r, 0); });
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

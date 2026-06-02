# Pylontech OpenAPI v1.2 修改 PRD

## 1. 文档信息

| 项目     | 内容                                   |
| ------ | ------------------------------------ |
| 产品     | Pylontech OpenAPI                    |
| 版本     | v1.2                                 |
| 目标用户   | 电力零售商、VPP/DERMS 平台、BESS 运维与ODM云平台开发者 |
| 主要客户输入 | Globird 会议反馈                         |
| 计划周期   | 1 个月内完成核心能力开发与文档更新                   |
| 文档用途   | 给开发、测试对齐需求范围、接口设计规范和验收标准             |

## 2. 背景

当前 Pylontech OpenAPI 已支持站点、设备、遥测数据、能量统计、告警和单一设备控制等基础能力。Globird 在集成评估过程中提出以下问题：

- 当前 API rate limit 为每台设备每分钟 2 次请求，需要明确并在文档中说明。
- 当前控制接口主要面向单设备，客户需要一次性对多台设备下发相同控制策略。
- 客户需要通过 API 配置定时充放电策略，例如每周一 1:00-2:00 以 2 kW 放电。
- 当前 API 网站前端中的文档对数据结构、字段定义、枚举值和响应码说明不足，影响开发集成。
- 客户希望知道设备是否受到 DNSP 控制。
- 客户希望提供遥测数据推送机制，减少持续轮询。

除客户邮件范围外，v1.2 还需要支持 `parallel_system` 并机场景：多台设备在业务层面作为一台设备暴露给 API 使用方，API 仅返回主机，主机的静态能力和动态数据需要叠加从机数据。

## 3. 目标

1. 保持现有单设备查询与控制能力兼容。
2. 新增批量控制能力，支持对多台设备下发同一控制命令。
3. 新增 TOU 定时充放电能力，支持周期性充放电。
4. 完善 configuration 接口，新增站点进出口功率限制字段。
5. 完善 API 网站前端中的文档字段、枚举、响应码、错误码、示例和边界说明，优化UI。
6. 支持并机场景的数据聚合，保证第三方系统看到的设备与可控制对象一致。

## 4. 非目标

以下内容不作为 v1.2 必须交付范围：遥测数据推送机制。该能力需要新增基础设施支持，时间 TBD。



## 5. 术语

| 术语              | 定义                                         |
| --------------- | ------------------------------------------ |
| TOU             | Time-of-Use，按时间段执行的充放电计划                   |
| DNSP            | Distribution Network Service Provider，配电公司 |
| parallel_system | 多台设备作为一个逻辑设备对外暴露的并机场景                      |
| batch command   | 一次 API 请求中对多台设备下发的同一控制命令                   |

## 6. 需求总览

| 编号  | 需求                                                     | 优先级 | 状态             |
| --- | ------------------------------------------------------ | --- | -------------- |
| R1  | 明确 rate limit：每台设备每分钟 2 次请求                            | P0  | v1.2 必须        |
| R2  | 新增批量控制接口                                               | P0  | v1.2 必须        |
| R3  | 新增 TOU 定时充放电接口                                         | P0  | v1.2 必须        |
| R4  | configuration 返回 `siteExportLimitW`、`siteImportLimitW` | P0  | v1.2 必须        |
| R5  | configuration 返回 DNSP 控制状态信息                           | P1  | v1.2 必须确认字段后实现 |
| R6  | 完善 API 文档 schema、字段、枚举、响应码和示例                          | P0  | v1.2 必须        |
| R7  | 支持 `parallel_system` 并机数据聚合与从机隐藏                       | P0  | v1.2 必须        |
| R8  | 遥测数据 push 机制                                           | P2  | TBD，不阻塞 v1.2   |

## 7. Rate Limit

### 7.1 规则

- 控制类 API 的 rate limit 保持为每台设备每分钟 2 次请求。
- 批量接口按目标设备分别计数。例如一次批量请求包含 10 台设备，则每台设备各消耗 1 次控制配额。
- 查询类 API 如已有全局或账号级限制，应在文档中单独说明；若没有新增限制，不应在 v1.2 中暗改。
- 当请求超过限制时，返回 `429 Too Many Requests`。

### 7.2 响应要求

超过限制时建议返回：

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded: 2 requests per minute per device.",
  "details": {
    "deviceId": "device-001",
    "limit": 2,
    "windowSeconds": 60
  },
  "timestamp": "2026-06-02T00:00:00Z"
}
```

响应头建议包含：

- `Retry-After`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## 8. 批量控制

### 8.1 接口

建议使用当前文档资源风格：

- `POST /devices/commands`
- `PUT /devices/commands/{batchCommandId}/cancel`

客户邮件中提到的 `POST /batch-commands` 可作为沟通示例；如需兼容外部承诺，可提供同等语义的 alias，但主文档建议只保留一个标准路径。

### 8.2 请求

批量控制用于对多台设备下发同一条控制命令。

```json
{
  "devices": ["device-001", "device-002"],
  "command": {
    "activePowerControl": {
      "mode": "batteryPowerTargetW",
      "value": 2000
    },
    "reactivePowerControl": {
      "mode": "fixedPowerFactorPercent",
      "value": 100
    },
    "startTime": "2026-06-02T01:00:00Z",
    "endTime": "2026-06-02T02:00:00Z"
  }
}
```

### 8.3 字段规则

| 字段                                  | 规则                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `devices`                           | 必填，1-100 个设备 ID；重复 ID 需要去重或返回参数错误，开发需二选一并写入文档                                                 |
| `command.activePowerControl.mode`   | 支持 `batteryPowerTargetW`、`activePowerTargetW`、`gridExportPowerLimitW`、`gridImportPowerLimitW` |
| `command.activePowerControl.value`  | 单位 W；放电为正，充电为负；必须校验设备能力范围                                                                     |
| `command.reactivePowerControl.mode` | 支持 `reactivePowerTargetVar`、`fixedPowerFactorPercent`                                         |
| `startTime`/`endTime`               | ISO 8601 UTC 时间；`endTime` 必须晚于 `startTime`                                                    |

### 8.4 执行语义

- 接口接收成功返回 `202 Accepted` 和 `batchCommandId`。
- 批量命令应异步执行，不能因为单台设备失败导致整个批次全部失败。
- 每台设备必须有独立执行状态，便于客户定位失败设备。
- 若某台设备不支持控制、离线、故障、超能力范围或 rate limit 超限，该设备结果标记为失败，其他设备继续处理。
- 如果所有设备在入参阶段均非法，可直接返回 `400` 或 `422`。

### 8.5 状态枚举

单设备命令状态建议统一为：

- `received`
- `executing`
- `completed`
- `cancelled`
- `failed`

取消或失败原因建议统一为：

- `manuallyCancel`
- `timeWindowOverlap`
- `startTimeExpired`
- `deviceOffline`
- `deviceFault`
- `notSupported`
- `rateLimitExceeded`
- `capabilityExceeded`
- `dnspControlled`

注意：当前 schema 中存在 `cancellReason` 拼写，建议 v1.2 修正为 `cancelReason`。如需兼容旧字段，可短期同时返回，但文档只推荐新字段。

## 9. TOU 定时充放电

### 9.1 接口

- `GET /devices/{deviceId}/schedule`
- `PUT /devices/{deviceId}/schedule`
- `POST /devices/schedule`

### 9.2 能力说明

设备内部已支持 TOU/定时充放电能力，v1.2 需要通过 API 暴露。客户典型场景：

> 每周一 1:00-2:00，以 2 kW 放电。

对应请求示例：

```json
{
  "schedule": [
    {
      "startTime": "01:00",
      "endTime": "02:00",
      "action": "discharge",
      "targetBatteryPowerW": 2000,
      "daysOfWeek": [1]
    }
  ]
}
```

### 9.3 字段规则

| 字段                    | 规则                                                              |
| --------------------- | --------------------------------------------------------------- |
| `startTime`           | 本地时间，格式 `HH:mm`                                                 |
| `endTime`             | 本地时间，格式 `HH:mm`，必须晚于 `startTime`；是否支持跨天需开发确认                    |
| `action`              | `charge`、`discharge`、`standby`                                  |
| `targetBatteryPowerW` | 单位 W；`charge` 建议使用负值，`discharge` 使用正值；若最终实现按 action 推导方向，文档必须明确 |
| `daysOfWeek`          | 1-7，1 表示周一，7 表示周日；为空表示每天                                        |
| `timezone`            | 以设备 configuration 的 `timezone` 为准                               |

### 9.4 校验规则

- 同一设备的 schedule 时间段不能重叠。
- 每条 schedule 必须校验设备最大充电功率、最大放电功率、SOC 限制和当前设备是否支持 TOU。
- 设置 schedule 时应覆盖旧 schedule，除非接口明确支持局部更新。
- 批量设置 schedule 时，每台设备独立返回结果。
- 并机场景下，对主机设置 schedule 时，系统需按聚合后的并机能力校验功率，并由设备侧或平台侧完成对从机的内部分配。

## 10. Configuration 增强

### 10.1 接口

- `GET /devices/{deviceId}/configuration`
- `PUT /devices/{deviceId}/configuration`
- `POST /devices/configuration`

### 10.2 新增/确认字段

| 字段                     | 类型      | 单位            | 说明                                                                   |
| ---------------------- | ------- | ------------- | -------------------------------------------------------------------- |
| `siteExportLimitW`     | integer | W             | 站点最大向电网输出功率限制                                                        |
| `siteImportLimitW`     | integer | W             | 站点最大从电网输入功率限制                                                        |
| `dnspControlled`       | boolean | -             | 当前设备或站点是否处于 DNSP 控制中                                                 |
| `dnspControlMode`      | string  | -             | DNSP 控制类型，例如 `none`、`exportLimit`、`importLimit`、`activePowerControl` |
| `dnspControlUpdatedAt` | string  | UTC date-time | DNSP 控制状态最近更新时间                                                      |

如果 DNSP 控制信息来自站点级控制而非设备级控制，仍建议在设备 configuration 中返回影响该设备的最终状态，避免客户再额外查询站点。

### 10.3 DNSP 控制下的控制冲突

- 当 `dnspControlled=true` 且客户控制命令会违反 DNSP 限制时，API 必须拒绝或降额执行，具体策略需开发确认。
- 推荐策略：拒绝执行并返回 `422`，错误码 `DNSP_CONTROL_CONFLICT`。
- 如设备侧会自动降额，API 返回值必须说明实际执行值，不能只返回客户请求值。

## 11. Parallel System 并机支持

### 11.1 核心原则

并机场景下，多台设备对外暴露为一台逻辑设备：

- API 只返回主机设备，隐藏从机设备。
- 从机的设备 ID、序列号、静态信息、动态遥测、告警和控制入口不直接暴露给客户。
- 主机设备返回的数据应代表整组并机系统的聚合结果。
- 客户对主机下发控制命令，即视为对整组并机系统下发控制命令。

示例：主机当前电池功率 3 kW，从机当前电池功率 2 kW，则 API 返回主机 `battery.powerKw = 5`，从机不出现在设备列表和站点设备明细中。

### 11.2 设备列表与详情

`GET /devices`、`GET /devices/{deviceId}` 在并机场景下：

- 仅返回主机。
- 主机 `id` 保持为主机设备 ID。
- 建议新增 `systemType`，取值为 `single` 或 `parallel_system`。
- 建议新增 `parallelUnitCount`，表示并机设备数量，只返回数量，不返回从机身份。
- 不返回从机 `serialNumber`、`model`、`deviceId` 等可识别信息。

静态能力聚合规则：

| 字段                     | 聚合规则                                          |
| ---------------------- | --------------------------------------------- |
| `ratedPowerKw`         | 主机 + 从机求和                                     |
| `maxReactivePowerKvar` | 主机 + 从机求和                                     |
| `pvCapacityKw`         | 主机 + 从机求和                                     |
| `batteryCapacityKwh`   | 主机 + 从机求和                                     |
| `maxChargePowerKw`     | 主机 + 从机求和                                     |
| `maxDischargePowerKw`  | 主机 + 从机求和                                     |
| `phaseType`            | 以并机系统最终对外接入类型为准                               |
| `online`               | 推荐所有必要单元在线才为 `true`；如采用主机在线即为 `true`，必须另增健康字段 |
| `faultStatus`          | 任一单元故障则为 `fault`                              |

### 11.3 遥测聚合

`GET /devices/{deviceId}/latestData`、`POST /devices/latestData/query`、`GET /sites/{siteId}/latestData` 需要返回聚合后的主机数据。

动态数据聚合规则：

| 字段                               | 聚合规则                                          |
| -------------------------------- | --------------------------------------------- |
| `battery.powerKw`                | 主机 + 从机求和，放电为正，充电为负                           |
| `battery.currentA`               | 主机 + 从机求和；如不同电压平台不可直接相加，需改由功率为准并明确 current 口径 |
| `battery.socPercent`             | 按电池容量加权平均                                     |
| `battery.sohPercent`             | 按电池容量加权平均                                     |
| `battery.voltageV`               | 以主机或系统母线电压为准，不建议简单求和                          |
| `battery.cumulativeChargeKwh`    | 主机 + 从机求和                                     |
| `battery.cumulativeDischargeKwh` | 主机 + 从机求和                                     |
| `inverter.powerKw`               | 主机 + 从机求和                                     |
| `inverter.reactivePowerKvar`     | 主机 + 从机求和                                     |
| `pv.powerKw`                     | 主机 + 从机求和                                     |
| `pv.cumulativeGenerationKwh`     | 主机 + 从机求和                                     |
| `meter.gridPowerKw`              | 以站点表计或并机系统总表计为准；不能重复叠加多个同源表计                  |
| `timestamp`                      | 使用聚合计算时的最新有效时间；如单元时间差超过阈值，应标记数据质量或返回错误        |

### 11.4 控制与 TOU

- 对主机下发即时控制或 schedule，即对整组并机系统生效。
- API 入参校验使用聚合后的 `maxChargePowerKw`、`maxDischargePowerKw`、`ratedPowerKw`。
- 内部功率分配策略不暴露给客户。
- 若任一必要从机离线或故障导致整组无法执行，主机命令状态返回 `failed`，原因建议为 `parallelSystemUnavailable` 或 `deviceFault`。
- 批量接口中的 `devices` 不允许包含从机 ID；如传入从机 ID，返回 `404` 或 `notSupported`，文档需统一。

### 11.5 告警

从机告警不直接暴露为从机告警，但需要在主机维度体现并机系统异常：

- 主机 `faultStatus` 应聚合从机状态。
- `GET /devices/{deviceId}/alarms` 对主机返回整组并机相关告警。
- 告警内容不得泄露从机设备 ID 或序列号，必要时使用 `parallelUnitIndex` 或通用描述。

## 12. API 文档增强

v1.2 文档必须补充以下内容：

- 所有 request/response schema 的字段类型、单位、是否必填、是否可为空。
- 所有枚举值的语义说明。
- 所有接口的成功响应示例和主要错误响应示例。
- 控制接口的功率正负方向说明。
- 时间字段时区说明：UTC 或设备本地时间。
- rate limit 说明和 `429` 示例。
- `parallel_system` 聚合规则说明。
- DNSP 控制字段说明。
- 批量接口的单设备失败语义。
- TOU schedule 的覆盖语义、时间重叠限制和跨天支持结论。

## 13. 错误码建议

| HTTP 状态码 | 错误码                           | 场景                   |
| -------- | ----------------------------- | -------------------- |
| 400      | `INVALID_REQUEST`             | 参数格式错误、缺少必填字段        |
| 401      | `UNAUTHORIZED`                | token 缺失或无效          |
| 403      | `FORBIDDEN`                   | 无设备或站点授权             |
| 404      | `NOT_FOUND`                   | 设备、站点或命令不存在          |
| 409      | `TIME_WINDOW_OVERLAP`         | 控制窗口或 schedule 时间段冲突 |
| 422      | `CAPABILITY_EXCEEDED`         | 功率、SOC 或配置值超过设备能力    |
| 422      | `DEVICE_NOT_SUPPORTED`        | 设备不支持该控制或 TOU        |
| 422      | `DNSP_CONTROL_CONFLICT`       | 客户控制与 DNSP 控制冲突      |
| 422      | `PARALLEL_SYSTEM_UNAVAILABLE` | 并机系统不可用              |
| 429      | `RATE_LIMIT_EXCEEDED`         | 超出每台设备每分钟 2 次限制      |
| 500      | `INTERNAL_ERROR`              | 服务端内部错误              |

## 14. 验收标准

### 14.1 功能验收

- 单设备控制接口保持兼容。
- 批量控制可对 1-100 台设备下发同一命令，并返回批次 ID。
- 批量控制中单台设备失败不会影响其他设备执行。
- 可查询或取消批量命令。
- 单设备和批量 TOU schedule 均可设置、查询，并能按设备本地时间生效。
- `GET /devices/{deviceId}/configuration` 返回 `siteExportLimitW`、`siteImportLimitW` 和 DNSP 控制状态字段。
- 超过 rate limit 时返回 `429`，并能说明受影响设备。
- 并机场景下 API 只返回主机，静态能力和动态数据按本 PRD 聚合。

### 14.2 文档验收

- OpenAPI JSON 版本更新为 `1.2.0`。
- API Reference 中所有新增字段都有说明、单位、枚举和示例。
- 文档中明确功率正负方向、时区、rate limit、批量失败语义和并机聚合规则。
- 文档中不暴露从机身份信息。

### 14.3 测试建议

- 单设备控制成功、失败、取消、状态查询。
- 批量控制全成功、部分失败、全部失败。
- rate limit 单设备和批量接口计数。
- TOU 时间重叠、非法时间、非法功率、非法 weekdays。
- DNSP 控制冲突。
- 并机系统设备列表隐藏从机。
- 并机系统静态能力求和。
- 并机系统遥测数据求和和加权平均。
- 并机系统从机故障时主机故障状态和命令执行结果。

## 15. 待确认问题

1. `POST /batch-commands` 是否需要作为外部兼容路径，还是统一使用 `POST /devices/commands`。
2. TOU schedule 是否支持跨天时间段，例如 `23:00-01:00`。
3. `targetBatteryPowerW` 在 `charge` action 下是否要求负值，还是由 action 决定方向。
4. DNSP 控制信息最终来自设备侧还是站点侧，字段是否放在 configuration 还是另建状态接口。
5. DNSP 控制冲突时采用拒绝执行、自动降额，还是两者都支持。
6. 并机系统 `online` 字段口径：所有必要单元在线才为 true，还是主机在线即为 true。
7. 并机系统告警是否允许返回 `parallelUnitIndex`，用于区分并机单元但不暴露从机身份。
8. 遥测 push 机制采用 webhook、MQTT、SSE 还是其他方案，是否进入 v1.3 规划。

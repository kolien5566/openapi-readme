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

## 3. 需求

| 编号  | 需求                                          |
| --- | ------------------------------------------- |
| R1  | 明确 rate limit：每台设备每分钟 2 次请求。                |
| R2  | 新增批量控制能力，支持对多台设备下发同一控制命令。                   |
| R3  | 完善批量遥测数据查询能力，支持一次请求查询多个站点或多台设备的最新遥测数据。     |
| R4  | 新增 TOU 定时充放电能力，支持单设备与批量设备下发周期性充放电计划。        |
| R5  | 完善 configuration 接口，新增站点进出口功率限制字段。          |
| R6  | 完善本代码仓库中的 API 文档网站前端，补充字段、枚举、响应码、错误码、示例和边界说明，优化 UI。 |
| R7  | 支持并机场景的数据聚合，保证第三方系统看到的设备与可控制对象一致。           |

## 4. 非目标

以下内容不作为 v1.2 必须交付范围：遥测数据推送机制。该能力需要新增基础设施支持，实现时间 TBD。

## 5. 术语

| 术语              | 定义                                         |
| --------------- | ------------------------------------------ |
| TOU             | Time-of-Use，按时间段执行的充放电计划                   |
| DNSP            | Distribution Network Service Provider，配电公司 |
| parallel_system | 多台设备作为一个逻辑设备对外暴露的并机场景                      |
| batch command   | 一次 API 请求中对多台设备下发的同一控制命令                   |

## 6. 需求变更

### 6.1 Rate Limit

#### 6.1.1 规则

- 上行下行 API 的 rate limit 限制为每台设备每分钟 2 次请求。
- 批量接口按目标设备分别计数。例如一次批量请求包含 10 台设备，则每台设备各消耗 1 次控制配额。
- 当请求超过限制时，建议返回 `429 Too Many Requests`。

#### 6.1.2 响应要求

超过限制时建议返回：

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded: 2 requests per minute per device.",
  "timestamp": "2026-06-02T00:00:00Z"
}
```

### 6.2 批量控制

#### 6.2.1 接口

- `POST /devices/commands`
- `PUT /devices/commands/{batchCommandId}/cancel`


#### 6.2.2 请求

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

#### 6.2.3 执行语义

- 接口接收成功需要返回 `batchCommandId`。
- 批量命令应异步执行，不能因为单台设备失败导致整个批次全部失败。
- 每台设备必须有独立执行状态，便于客户定位失败设备。
- 若某台设备不支持控制、离线、故障、超能力范围或 rate limit 超限，该设备结果标记为失败，其他设备继续处理。


### 6.3 批量遥测数据查询

#### 6.3.1 接口

- `POST /sites/latestData/query`：批量查询多个站点的最新遥测数据。
- `POST /devices/latestData/query`：批量查询多台设备的最新遥测数据。


#### 6.3.2 请求

批量站点最新遥测查询：

```json
{
  "sites": ["site-001", "site-002"]
}
```

批量设备最新遥测查询：

```json
{
  "devices": ["device-001", "device-002"]
}
```

#### 6.3.3 执行语义

- `sites` 或 `devices` 必填，数组长度为 1-100。
- 返回结果应复用现有 `SiteTelemetry` 和 `DeviceTelemetry` schema。
- 如果部分站点或设备不存在、未授权或无数据，接口需要明确返回：过滤无效对象、返回空数据，或按对象返回错误信息。
- 并机场景下，批量查询设备最新遥测数据时不返回从机；主机遥测数据需要按并机聚合规则返回。

### 6.4 TOU 定时充放电

#### 6.4.1 接口

- `GET /devices/{deviceId}/schedule`
- `PUT /devices/{deviceId}/schedule`

- `POST /devices/schedule`：批量下发 TOU schedule，同一请求可对多台设备设置相同的定时充放电计划。

#### 6.4.2 能力说明

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

批量下发时，请求中需要包含目标设备列表和 schedule 内容，接口应按设备维度返回设置结果。

#### 6.4.3 字段规则

| 字段                    | 规则                                                              |
| --------------------- | --------------------------------------------------------------- |
| `startTime`           | 本地时间，格式 `HH:mm`                                                 |
| `endTime`             | 本地时间，格式 `HH:mm`，必须晚于 `startTime`；                    |
| `action`              | `charge`、`discharge`                                 |
| `targetBatteryPowerW` | 单位 W； |
| `daysOfWeek`          | 1-7，1 表示周一，7 表示周日；不能为空                                        |

#### 6.4.4 校验规则

- 同一设备的 schedule 时间段不能重叠。
- 每条 schedule 必须校验设备最大充电功率、最大放电功率。
- 设置新的 schedule 时会直接覆盖旧 schedule。

### 6.5 Configuration 新增字段

#### 6.5.1 接口

- `GET /devices/{deviceId}/configuration`
- `PUT /devices/{deviceId}/configuration`
- `POST /devices/configuration`

#### 6.5.2 新增字段

| 字段                 | 类型      | 单位  | 说明            |
| ------------------ | ------- | --- | ------------- |
| `siteExportLimitW` | integer | W   | 站点最大向电网输出功率限制 |
| `siteImportLimitW` | integer | W   | 站点最大从电网输入功率限制 |


### 6.6 Parallel System 并机支持

#### 6.6.1 核心原则

并机场景下，多台设备对外暴露为一台逻辑设备：

- API 只返回主机设备，隐藏从机设备。
- 从机的设备 ID、SN、静态参数、动态遥测、告警和控制入口不直接暴露给客户。
- 主机设备返回的数据应代表整组并机系统的聚合结果。
- 客户对主机下发控制命令，即视为对整组并机系统下发控制命令。

示例：主机当前电池功率 3 kW，从机当前电池功率 2 kW，则 API 返回主机 `battery.powerKw = 5`，从机不出现在设备列表和站点设备明细中。

#### 6.6.2 设备列表与详情

`GET /devices`、`GET /devices/{deviceId}` 在并机场景下仅返回主机。

静态能力聚合规则：

| 字段                     | 聚合规则                                          |
| ---------------------- | --------------------------------------------- |
| `ratedPowerKw`         | 主机 + 从机求和                                     |
| `maxReactivePowerKvar` | 主机 + 从机求和                                     |
| `pvCapacityKw`         | 主机 + 从机求和                                     |
| `batteryCapacityKwh`   | 主机 + 从机求和                                     |
| `maxChargePowerKw`     | 主机 + 从机求和                                     |
| `maxDischargePowerKw`  | 主机 + 从机求和                                     |
| `phaseType`            | 已主机的phaseType为准                               |
| `online`               | 以主机的online状态为准 |
| `faultStatus`          | 以主机的fault状态为准                              |

#### 6.6.3 遥测聚合

`GET /devices/{deviceId}/latestData`、`POST /devices/latestData/query`、`GET /sites/{siteId}/latestData` 需要返回聚合后的主机数据。

动态数据聚合规则：

| 字段                               | 聚合规则                                          |
| -------------------------------- | --------------------------------------------- |
| `battery.powerKw`                | 主机 + 从机求和，放电为正，充电为负                           |
| `battery.currentA`               | 主机 + 从机求和；如不同电压平台不可直接相加，需改由功率为准并明确 current 口径 |
| `battery.socPercent`             | 按电池容量加权平均                                     |
| `battery.sohPercent`             | 按电池容量加权平均                                     |
| `battery.voltageV`               | 以主机或系统母线电压为准                         |
| `battery.cumulativeChargeKwh`    | 主机 + 从机求和                                     |
| `battery.cumulativeDischargeKwh` | 主机 + 从机求和                                     |
| `inverter.powerKw`               | 主机 + 从机求和                                     |
| `inverter.reactivePowerKvar`     | 主机 + 从机求和                                     |
| `pv.powerKw`                     | 主机 + 从机求和                                     |
| `pv.cumulativeGenerationKwh`     | 主机 + 从机求和                                     |
| `meter.gridPowerKw`              | 以站点表计（主机）为准；不重复叠加多个同源表计                  |
| `timestamp`                      | 以主机上传遥测数据的时间戳为准       |

#### 6.6.4 控制与 TOU

- 对主机下发 configuration 或 schedule 或 command，即对整组并机系统生效。
- API 入参校验使用聚合后的 `maxChargePowerKw`、`maxDischargePowerKw`、`ratedPowerKw`。
- 内部功率分配策略不暴露给客户。
- 若任一必要从机离线或故障导致整组无法执行，主机返回 `failed`。
- 批量接口中的 `devices` 不允许包含从机 ID。


### 6.7 API 文档网站前端优化

本代码仓库是 Pylontech OpenAPI 文档网站，v1.2 需要同步优化前端展示和 OpenAPI 文档内容。必须补充以下内容：

- 所有 request/response schema 的字段类型、单位、是否必填、是否可为空。
- 所有枚举值的语义说明。
- 所有接口的成功响应示例和主要错误响应示例。
- 控制接口的功率正负方向说明。
- 时间字段时区说明：UTC 或设备本地时间。
- rate limit 说明。
- 并机聚合规则说明。
- 批量接口的执行成功/失败语义。
- API集成SOP
- 使用条款 terms & condition

### 6.8 错误码

待补充

## 7. 验收标准

### 7.1 功能验收

- 可对 1-100 台设备下发同一批量命令（batch command），并返回command ID。
- 批量控制中单台设备失败不会影响其他设备执行。
- 可取消批量命令。
- 批量遥测数据查询可在一次请求中查询多个站点或多台设备的最新遥测数据。
- 单设备和批量 TOU schedule 均可设置、查询，并能按设备本地时间生效。
- `GET /devices/{deviceId}/configuration` 返回 `siteExportLimitW`、`siteImportLimitW` 字段。
- `PUT /devices/{deviceId}/configuration` 可设置 `siteExportLimitW`、`siteImportLimitW` 字段。
- 超过 rate limit 时返回 `429`。
- 并机场景下 API 只返回主机，静态能力和动态数据按本 PRD 聚合。

### 7.2 文档验收

- API Reference 中所有新增字段都有说明、单位、枚举和示例。
- 文档中明确功率正负方向、时区、rate limit、批量失败语义和并机聚合规则。
- 有便于使用者理解的SOP。
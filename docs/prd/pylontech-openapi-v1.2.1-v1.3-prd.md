# Pylontech OpenAPI v1.2.1 / v1.3 详细需求规格

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 产品 | Pylontech OpenAPI |
| 基线文件 | `docs/public/openapi.json`（OpenAPI 3.0.3） |
| 前序需求 | `docs/prd/pylontech-openapi-v1.2-prd.md` |
| v1.2.1 交付日期 | 2026-07-31 |
| v1.3 交付日期 | 2026-08-31 |
| 目标读者 | 后端开发、设备协议开发、测试、前端 Developer Portal、产品与交付团队 |
| 文档用途 | 明确实现范围、接口行为、数据口径、错误处理、OAuth2、安全要求和验收标准 |

## 2. 基线与总体原则

### 2.1 当前公开接口基线

本需求以当前 `openapi.json` 中的下列公开能力为基线：

- Site：站点列表、站点详情。
- Device：设备列表、设备详情。
- Telemetry：设备最新遥测、批量最新遥测、设备历史遥测。
- Energy：设备能量统计。
- Fault & Alarm：设备故障与告警列表。
- Command：单设备/批量命令、命令查询、命令取消。
- Schedule：单设备/批量定时策略。
- Configuration：单设备/批量配置。

当前公开 OpenAPI 中没有 site telemetry 和 site energy statistics 路径；相关内部 Schema 仍存在，但不属于本次公开范围。

### 2.2 兼容性原则

- 已公开的 path、HTTP method、请求字段和业务字段，不得在补丁版本中无说明地删除或改名。
- 实现返回必须与 `openapi.json` 中对应 response schema 一致。
- 同一字段在列表、详情、批量接口、单设备接口中的类型、单位、枚举和 nullable 语义必须一致。
- 不允许只修改 Developer Portal 示例而不修改后端实现，也不允许只修改后端而不更新 OpenAPI。
- v1.3 FHM 兼容必须通过内部适配层完成，对外 API path 和字段保持不变。

### 2.3 术语

| 术语 | 定义 |
| --- | --- |
| ACC PV | 接入系统但不由当前储能逆变器直接采集/控制的第三方光伏数据源，以设备拓扑或配置关系判断是否存在 |
| FHM | v1.3 需要兼容的设备/协议类型；通过现有 `deviceId` 访问，不新增专用 API |
| API envelope | 统一业务响应外层：`code`、`msg`、`data` |
| Resource Owner | Authorization Code 模式下授权设备访问权限的终端用户或合法管理员 |
| Service Client | 使用 Client Credentials 的 VPP 服务端应用 |
| Delegated Client | 使用 Authorization Code 代表终端用户访问资源的 VPP 应用 |

## 3. v1.2.1 需求

## 3.1 统一响应体、HTTP 状态码、业务返回码和消息

### 3.1.1 适用范围

本节适用于 `/api/openapi/v1` 下的业务 API。OAuth2 `/authorize` 和 `/token` 端点必须遵循 OAuth2 标准响应格式，不使用业务 API envelope，详见 3.10。

### 3.1.2 删除字段

所有业务 API 的响应体必须删除以下三个布尔辅助字段：

```json
{
  "warn": false,
  "success": true,
  "error": false
}
```

要求：

- 不得在成功或失败响应中返回这三个布尔字段。
- 不得出现 `success=false`、`error=false` 但实际为错误的矛盾状态。
- 本条只删除业务响应中的布尔辅助字段，不得删除 OAuth2 标准错误响应中的字符串字段 `error`，例如 `"error": "invalid_grant"`。

### 3.1.3 统一业务响应结构

成功和失败响应均保留统一 envelope：

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

字段约束：

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `code` | integer | 是 | v1.2.1 统一为实际 HTTP status code，必须与 HTTP response status 完全一致 |
| `msg` | string | 是 | 面向开发者的简短英文消息；不可作为客户端业务分支的唯一判断依据 |
| `data` | object / array / primitive / null | 是 | 成功时为当前 OpenAPI 定义的业务数据；错误且无结构化详情时为 `null` |

本版本不再维护两套数值状态体系。例如 HTTP 404 时 body `code` 也必须是 404，不允许 HTTP 200 + body 404。

如后续需要区分多个相同 HTTP status 下的机器可读业务错误，应另增稳定字符串字段 `errorCode`，不得依赖解析 `msg`。该字段不属于 v1.2.1 强制新增范围。

### 3.1.4 正确示例

成功查询：

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "total": 4,
    "page": 1,
    "size": 20,
    "sites": []
  }
}
```

异步命令已接收：

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
```

```json
{
  "code": 202,
  "msg": "Command accepted",
  "data": {
    "id": "command-001",
    "timestamp": "2026-07-14T08:00:00Z"
  }
}
```

设备不存在：

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
```

```json
{
  "code": 404,
  "msg": "Resource not found",
  "data": null
}
```

### 3.1.5 禁止示例

```http
HTTP/1.1 200 OK
```

```json
{
  "code": 404,
  "msg": "Resource not found",
  "data": null
}
```

### 3.1.6 HTTP status 与默认消息

| HTTP status | body `code` | 使用场景 | 默认 `msg` |
| --- | ---: | --- | --- |
| 200 | 200 | GET/PUT 成功、同步处理成功、批量请求完成 | `success` |
| 202 | 202 | 单设备或批量命令已接收，执行结果需要后续查询 | `Command accepted` |
| 400 | 400 | JSON、query、path 参数格式错误或缺少必填参数 | `Bad request` |
| 401 | 401 | Token 缺失、无效、过期 | `Unauthorized` |
| 403 | 403 | Token 有效，但 scope 不足或不允许执行该操作 | `Forbidden` |
| 404 | 404 | 资源不存在；或为避免泄露资源存在性，资源不属于当前 Client | `Resource not found` |
| 409 | 409 | 当前资源状态与操作冲突，例如已完成命令不可取消 | `Conflict` |
| 422 | 422 | 请求语法正确，但超出设备能力或业务约束 | `Unprocessable entity` |
| 429 | 429 | 超过 rate limit | `Too many requests` |
| 500 | 500 | 未处理的服务端异常 | `Internal server error` |
| 503 | 503 | 下游设备/服务暂时不可用 | `Service unavailable` |

补充规则：

- 批量接口只要批次本身被正确解析和处理，允许返回 HTTP 200，并在 `data.results[]` 中表达单设备成功或失败。
- 单设备命令和批量命令创建接口继续使用当前 OpenAPI 已定义的 HTTP 202。
- 所有错误 HTTP status 均允许并应返回 JSON body，不能因为返回 4xx/5xx 而丢失 `msg`。
- OpenAPI 必须为所有实际可能返回的主要 4xx/5xx 状态声明 response schema。
- Developer Portal、SDK 和测试不得把所有非 2xx 响应转换为 HTTP 200。

### 3.1.7 OpenAPI Schema 要求

当前 OpenAPI 的 200 response 直接引用 `SiteListResponse`、`DeviceDetail` 等业务 Schema。实现采用 envelope 后，OpenAPI 必须同步改为具体的 envelope Schema，例如：

- `SiteListApiResponse.data -> SiteListResponse`
- `DeviceDetailApiResponse.data -> DeviceDetail`
- `DeviceTelemetryApiResponse.data -> DeviceTelemetry`
- `ErrorApiResponse.data -> nullable`

不得仅定义一个 `data: object` 的弱类型通用响应，否则生成的 SDK 会丢失具体业务类型。建议按接口或业务返回类型创建具体 wrapper Schema。

## 3.2 Site telemetry data 和 Site energy statistics 暂不公开

以下接口不得出现在 v1.2.1 的公开 OpenAPI、Developer Portal 或客户 SDK 中：

- `GET /sites/{siteId}/latestData`
- `POST /sites/latestData/query`
- `GET /sites/{siteId}/energy`
- 其他任何 site-level telemetry 或 site-level energy statistics API。

实现要求：

- 本版本不开发、不联调、不修改上述能力。
- 当前 `SiteTelemetry`、`SiteTelemetryHistory`、`EnergyStatistics` 内部 Schema 暂时保持不变。
- 不得因为 device energy statistics 增加字段而同步修改隐藏的 site energy statistics。
- Developer Portal 不得通过菜单、搜索或生成页面暴露这些 endpoint。

验收：公开 `openapi.json` 的 `paths` 中只能存在 `/sites` 和 `/sites/{siteId}` 两个 site-level path。

## 3.3 枚举值与 Developer Portal 一致

### 3.3.1 总体规则

- Developer Portal 是公开枚举名称的产品基线。
- 后端不得返回未写入 OpenAPI `enum` 的值。
- OpenAPI、后端 DTO、协议 mapping、示例和测试数据必须使用完全相同的大小写。
- 不允许通过大小写不敏感、空格、下划线等方式兼容错误值。
- 未识别的内部协议值不得直接透传到公开 API；必须记录日志并按明确 mapping 处理。

### 3.3.2 重点枚举

| 字段 | 公开值 |
| --- | --- |
| `Device.phaseType` | `singlePhase`, `threePhase` |
| `Site.gridConnectionPhaseType` | `singlePhase`, `threePhase` |
| `faultStatus` | `normal`, `fault`, `alarm` |
| `Alarm.alarmLevel` | `fault`, `alarm` |
| `Alarm.status` | `active`, `resolved` |
| `DeviceEnergyStatistics.period` | `15min`, `30min`, `1h`, `day`, `month`, `year` |
| `CommandStatus.status` | `received`, `executing`, `completed`, `cancelled` |
| `SchedulePeriod.action` | `charge`, `discharge`, `standby` |
| `DeviceConfiguration.operationMode` | `selfConsumption`, `feedInPriority`, `backupMode` |

### 3.3.3 当前定义中必须修复的不一致

- `/sites` 和 `/devices` 的 query 参数 `faultStatus` 当前只声明 `normal`, `fault`，必须补充 `alarm`，与返回字段一致。
- `CommandRequest.activePowerControl.mode` 已包含 `gridImportPowerLimitW`，`CommandStatus.activePowerControl.mode` 当前未包含，必须统一。
- 所有重复定义的 enum 必须逐项审计，不能只修复 Schema 而漏掉 query parameter 或 response Schema。

验收：测试应遍历 OpenAPI 中所有 `enum`，验证服务端能返回的值属于对应集合，并验证错误大小写被拒绝为 400/422。

## 3.4 无功功率 var / kvar 单位换算

### 3.4.1 外部 API 单位

| 场景 | 字段/模式 | 对外单位 |
| --- | --- | --- |
| 站点静态能力 | `totalMaxReactivePowerKvar` | kvar |
| 设备静态能力 | `maxReactivePowerKvar` | kvar |
| 电表遥测 | `meter.gridReactivePowerKvar` | kvar |
| 逆变器遥测 | `inverter.reactivePowerKvar` | kvar |
| 命令模式 | `reactivePowerTargetVar` 对应的 `value` | var |
| 功率因数模式 | `fixedPowerFactorPercent` 对应的 `value` | percent，不进行 var/kvar 换算 |

换算规则：

```text
1 kvar = 1000 var
kvar = var / 1000
var = kvar * 1000
```

实现要求：

- 协议层、数据库或设备内部值进入公开 DTO 前必须根据字段单位统一换算。
- `reactivePowerTargetVar` 的 `value` 必须明确按 var 校验和下发，不能按 kvar 解释。
- 遥测和静态能力字段以 kvar 返回，允许小数。
- 单位换算不得改变正负方向；正负方向继续以字段 description 为准。
- 不得根据数值大小猜测单位。
- 单元测试至少覆盖 `0 var -> 0 kvar`、`500 var -> 0.5 kvar`、`1000 var -> 1 kvar`、负数和小数边界。

## 3.5 Device detail 增加 `gridConnected`

接口：

- `GET /devices/{deviceId}`

目标 Schema：`DeviceDetail`。

字段定义：

| 字段 | 类型 | 必填 | nullable | 语义 |
| --- | --- | --- | --- | --- |
| `gridConnected` | boolean | 是 | 否 | `true`=并网/on-grid，`false`=离网/off-grid |

约束：

- 仅要求设备详情接口新增，不要求设备列表 `Device` 同步新增。
- 不允许使用字符串 `"true"`、`"false"`、`"onGrid"`。
- 数据来源必须是当前设备/系统实际并离网状态，而不是是否配置电表或是否在线。

验收：并网和离网设备各准备至少一个测试设备；响应中必须始终存在该字段。

## 3.6 `includeDevices=false` 时返回 `devices: null`

适用接口：

- `GET /sites`
- `GET /sites/{siteId}`

注意：当前 Schema 字段名是复数 `devices`，因此本需求实现为 `devices: null`，不是新增单数字段 `device`。

行为矩阵：

| 请求 | 站点下存在设备 | 返回 |
| --- | --- | --- |
| `includeDevices=true` | 是 | `devices: [{...}]` |
| `includeDevices=true` | 否 | `devices: []` |
| `includeDevices=false` | 任意 | `devices: null` |
| 未传 `includeDevices` | 按当前默认值 `true` | 同 `includeDevices=true` |

OpenAPI 3.0.3 Schema 要求：`devices` 保持 `type: array`，同时增加 `nullable: true`。字段本身必须存在，不能省略。

## 3.7 Device telemetry 的 `thirdPartyPv`

适用接口及复用场景：

- `GET /devices/{deviceId}/latestData`
- `POST /devices/latestData/query`
- `GET /devices/{deviceId}/historicalData` 中的每条 `DeviceTelemetry`。

有 ACC PV 时：

```json
{
  "thirdPartyPv": {
    "powerKw": 0,
    "cumulativeGenerationKwh": 0
  }
}
```

无 ACC PV 时：

```json
{
  "thirdPartyPv": null
}
```

判断规则：

- 是否存在 ACC PV 必须依据设备拓扑、安装关系或配置关系判断。
- 不得因为 `powerKw=0` 判断为“无 ACC PV”；夜间或停机时 0 是合法遥测值。
- 有 ACC PV 时返回实际的 `powerKw` 和 `cumulativeGenerationKwh`；两个字段单位分别为 kW、kWh。
- 无 ACC PV 时字段必须存在且值为 `null`，不能返回 `{}`，不能省略字段。
- OpenAPI 中 `thirdPartyPv` 必须增加 `nullable: true`。
- ACC PV 已配置但暂时无新数据时，沿用设备遥测统一的缺失/陈旧数据策略，不得把“数据暂缺”错误地解释为“无 ACC PV”。

## 3.8 Device energy statistics 增加电网进出口电量

接口：

- `GET /devices/{deviceId}/energy`

目标位置：`DeviceEnergyStatistics.data[]`。

新增字段：

| 字段 | 类型 | 单位 | 语义 |
| --- | --- | --- | --- |
| `gridImportKwh` | number(double) | kWh | 当前统计区间从电网输入的电量 |
| `gridExportKwh` | number(double) | kWh | 当前统计区间向电网输出的电量 |

规则：

- 两个字段是区间统计值，不是累计总表读数。
- 数值正常情况下应为非负数。
- 聚合周期必须与请求 `period` 一致。
- 因 site energy statistics 暂不公开，本需求只修改 device energy statistics。
- 当前 `openapi.json` 已包含这两个字段，后端实现、示例、测试和 Developer Portal 必须补齐。

验收：选取存在电网进口、存在电网出口和双向均为 0 的测试区间，与内部原始表计差值核对。

## 3.9 Device fault and alarm 按海鹏协议映射

接口：

- `GET /devices/{deviceId}/alarms`

公开字段：

```text
alarmLevel = fault | alarm
```

规则：

- 后端必须按照海鹏协议的故障/告警分类表，将每个源协议 code 映射为 `fault` 或 `alarm`。
- `fault` 和 `alarm` 是类型分类；`active` 和 `resolved` 是生命周期状态，两组含义不得混用。
- query 参数 `alarmLevel` 与 response `Alarm.alarmLevel` 必须使用相同枚举。
- 不允许返回中文、数字等级、`warning`、`normal` 或未知源枚举。
- 未识别协议 code 必须记录可检索日志和监控，不得静默映射为 `normal`。

开发前置依赖：海鹏协议 alarm code -> `fault|alarm` 的完整 mapping 表不在当前仓库中，协议负责人必须在开发开始前提供并纳入测试数据。没有 mapping 表时，本项不能仅凭告警名称猜测实现。

## 3.10 OAuth2 实现方式

### 3.10.1 支持的两种模式

| 模式 | 代表身份 | 用户交互 | 设备权限来源 | Token 维护方式 |
| --- | --- | --- | --- | --- |
| Client Credentials | VPP Service Client 自身 | 无 | VPP 与设备的有效绑定/合同授权 | VPP 缓存一个当前有效 Access Token；过期后重新执行 `client_credentials` |
| Authorization Code + PKCE | VPP Delegated Client 代表某个终端用户 | 有 | 终端用户/合法管理员在 Pylontech 授权页确认的设备和 scope | 每条独立用户授权维护独立 Access Token/Refresh Token；Access Token 过期后刷新 |

### 3.10.2 Client 注册规则

- 不同 VPP 客户不得共享同一个 `client_id` 或密钥。
- 同一家 VPP 的测试环境和生产环境必须使用不同 Client 注册。
- v1.2.1 默认采用两个安全边界独立的 Client 注册：
  - Service Client：只允许 `client_credentials`，可申请服务端 scope，包括经审批的设备绑定能力。
  - Delegated Client：只允许 `authorization_code` 和 `refresh_token`，不可申请设备绑定 scope。
- 两个 Client 注册可以关联到同一个内部 VPP tenant/customer 记录。

### 3.10.3 Client Credentials 流程

Token 请求：

```http
POST /api/auth/oauth2/token
Content-Type: application/x-www-form-urlencoded
```

```text
grant_type=client_credentials
client_id=<service-client-id>
client_secret=<service-client-secret>
scope=<requested-scopes>
```

要求：

- Access Token 代表 VPP Client，不代表终端用户。
- 同一个当前有效的 Access Token 可以访问该 Client 已绑定且 scope 允许的所有设备。
- OAuth 不禁止同时存在多个 Access Token，但 VPP 没有必要为每台设备申请 Token，应缓存复用到期前的 Token。
- Client Credentials 默认不签发 Refresh Token；Access Token 过期后重新调用 token endpoint。
- `bind device` 不能只验证 `deviceId`；还必须验证该设备是否通过合同、白名单、claim code、管理员审批或其他可信机制分配给该 VPP。
- 当前公开 `openapi.json` 未定义 device binding endpoint。该接口的 path、请求、绑定凭证、冲突/转移规则必须作为 v1.2.1 开发前置补充，不能仅在后端私有实现而不写公开契约。

### 3.10.4 Authorization Code + PKCE 流程

授权请求至少包含：

```text
response_type=code
client_id=<delegated-client-id>
redirect_uri=<exactly-registered-uri>
scope=<requested-scopes>
state=<random-value>
code_challenge=<pkce-challenge>
code_challenge_method=S256
```

要求：

- 授权请求不得携带并信任 `userId` 来决定资源所有者。
- 用户身份由 Pylontech Authorization Server 登录会话确定。
- 授权页必须展示 VPP 名称、请求 scope 和授权设备范围。
- Authorization Code 一次性使用、短期有效，并绑定 `client_id`、`redirect_uri` 和 PKCE challenge。
- 每名终端用户独立授权时形成独立 Grant；一个 Grant 可以覆盖该用户授权的多台设备，不是一台设备一个 Token。
- Access Token 只能访问该 Grant 下已授权且当前仍有效的设备。
- 如签发 Refresh Token，必须绑定 Client、Grant、scope 和 resource，并使用 Refresh Token Rotation；刷新成功后旧 Refresh Token 失效。
- Refresh Token 返回 `invalid_grant` 时，VPP 必须停止刷新并引导用户重新授权。

### 3.10.5 Scope 建议表

| Scope | 能力 | Client Credentials | Authorization Code |
| --- | --- | --- | --- |
| `sites.read` | 查询站点列表/详情 | 可配置 | 可授权 |
| `devices.read` | 查询设备列表/详情 | 可配置 | 可授权 |
| `telemetry.read` | 设备遥测 | 可配置 | 可授权 |
| `energy.read` | 设备能量统计 | 可配置 | 可授权 |
| `alarms.read` | 故障与告警 | 可配置 | 可授权 |
| `commands.read` | 查询命令及状态 | 可配置 | 可授权 |
| `commands.write` | 下发/取消命令 | 可配置 | 可授权 |
| `schedules.read` / `schedules.write` | 查询/设置 schedule | 可配置 | 可授权 |
| `configuration.read` / `configuration.write` | 查询/设置 configuration | 可配置 | 可授权 |
| `devices.bind` | 绑定设备到 VPP | 经审批可配置 | 禁止 |
| `webhooks.manage` | v1.3 Webhook 管理 | 可配置 | 是否开放待产品确认 |

每个 operation 应在 OpenAPI security requirement 中声明所需 scope，不能只声明一个无 scope 的全局 Bearer Token。

### 3.10.6 Token 格式与有效期

- Token endpoint 成功响应必须使用 OAuth2 标准 snake_case 字段：`access_token`、`token_type`、`expires_in`、`refresh_token`（如有）、`scope`。
- OAuth2 TokenResponse 不使用 `{code,msg,data}` envelope。
- OAuth2 失败响应使用标准 `error` 和可选 `error_description`，例如 `invalid_client`、`invalid_grant`、`invalid_scope`、`unauthorized_client`。
- `expires_in` 是客户端判断 Access Token 到期时间的权威值。
- 当前仓库存在冲突：`api-usage-sop.md` 写“默认 24 小时”，示例返回 `expires_in: 3600`。v1.2.1 发布前必须统一实现、OpenAPI、SOP 和示例；建议统一为 3600 秒，最终以产品/安全确认值为准。

### 3.10.7 OpenAPI 安全定义

当前 `securitySchemes.AccessToken` 只是 `type: http, scheme: bearer`。v1.2.1 应补充 OAuth2 scheme，描述：

- `clientCredentials.tokenUrl`
- `authorizationCode.authorizationUrl`
- `authorizationCode.tokenUrl`
- `authorizationCode.refreshUrl`（如单独定义）
- 全部公开 scope 及说明

资源服务器对每次请求至少校验 Token 签名/有效性、issuer、audience、到期时间、Client、scope 和 Client/User 对目标设备的有效授权关系。

## 4. v1.3 需求

## 4.1 FHM 兼容

### 4.1.1 对外原则

- 不新增 FHM 专用 path。
- 不新增、删除或改名现有公开字段。
- 用户只需要选择 FHM 对应的 `deviceId`，调用方式与其他设备一致。
- FHM 差异全部由内部设备能力识别和协议适配层处理。

### 4.1.2 上行 mapping

覆盖范围：

- Device telemetry data：`DeviceTelemetry` 及历史遥测。
- Device energy statistics：`DeviceEnergyStatistics`。
- Fault & Alarm：`Alarm`、`AlarmListResponse`。

实现要求：

- 为 FHM 建立“源协议字段 -> 标准 OpenAPI 字段”的完整 mapping 表。
- mapping 表必须包含源字段、目标字段、数据类型、缩放系数、单位、正负方向、枚举映射、null/缺失处理和时间戳来源。
- 所有 var/kvar、W/kW、Wh/kWh 换算必须在适配层完成。
- 同一公开字段在 FHM 与现有设备上的业务语义必须一致。
- FHM 不支持的可选字段按公开 Schema 的 nullable 规则返回 `null`，不得填充伪造的 0；本来要求始终存在的必填字段必须提供可靠来源。
- 告警 mapping 同样必须输出 `alarmLevel=fault|alarm`。

### 4.1.3 下行 mapping

覆盖范围：

- Configuration：GET/PUT 单设备与批量配置。
- Command：下发、状态查询、取消、批量命令。
- Schedule：GET/PUT 单设备与批量 schedule。

实现要求：

- 公开请求先校验 OpenAPI 通用规则，再根据 FHM capability 校验设备能力。
- 支持的请求转换为 FHM 协议命令；不支持的 mode/配置项返回 HTTP 422。
- 异步命令状态必须映射到现有 `received`、`executing`、`completed`、`cancelled`。
- 协议失败原因必须记录内部原始错误，公开响应使用统一 HTTP/业务响应规则。
- 批量操作中 FHM 单机失败不得阻塞其他设备，结果按设备返回。

### 4.1.4 FHM 验收

- 使用相同 API 请求分别调用现有设备和 FHM 设备，响应 JSON 结构一致。
- 每个上行字段至少准备一组原始协议报文和期望 OpenAPI JSON 的 golden test。
- 每种下行 mode 至少覆盖成功、不支持、超范围、设备离线和执行失败。
- Developer Portal 不出现 FHM 专用调用说明，只在兼容设备列表/能力说明中注明支持范围。

## 4.2 Webhook 数据推送

### 4.2.1 推送事件

v1.3 至少支持：

| Event type | 数据来源 | `data` Schema |
| --- | --- | --- |
| `device.telemetry.updated` | Device telemetry data | 复用 `DeviceTelemetry` |
| `device.command.status.changed` | Query command execution status | 复用 `CommandStatus` |

遥测事件在产生新的标准化采样点时推送；命令事件只在状态发生变化时推送，不得对同一状态无变化重复主动发送，重试除外。

### 4.2.2 建议的订阅管理接口

当前 OpenAPI 尚无 Webhook path。v1.3 建议新增：

- `POST /webhook-subscriptions`：创建订阅。
- `GET /webhook-subscriptions`：查询当前 Client 的订阅。
- `GET /webhook-subscriptions/{subscriptionId}`：查询订阅详情。
- `PUT /webhook-subscriptions/{subscriptionId}`：更新 callback URL、事件和启用状态。
- `DELETE /webhook-subscriptions/{subscriptionId}`：删除订阅。

订阅至少包含：

```json
{
  "callbackUrl": "https://vpp.example.com/webhooks/pylontech",
  "events": [
    "device.telemetry.updated",
    "device.command.status.changed"
  ],
  "deviceIds": ["device-001", "device-002"],
  "enabled": true
}
```

若 `deviceIds` 省略，表示当前 Client 有权访问的全部设备；服务端仍须在每次发送前检查设备授权是否有效。

### 4.2.3 事件 envelope

Webhook 不使用业务 API 的 `{code,msg,data}` 响应 envelope，而使用事件 envelope：

```json
{
  "id": "evt-01JZ...",
  "type": "device.telemetry.updated",
  "version": "1.0",
  "occurredAt": "2026-08-01T00:00:00Z",
  "subscriptionId": "whsub-001",
  "data": {
    "deviceId": "device-001",
    "timestamp": "2026-08-01T00:00:00Z"
  }
}
```

要求：

- `id` 全局唯一，用于接收方去重。
- `occurredAt` 使用 RFC 3339/ISO 8601 且带时区。
- `data` 必须复用对应 API Schema，禁止另外维护同义字段。
- Event schema 必须有版本号，后续新增可选字段不得破坏已有消费者。

### 4.2.4 安全与投递

- callback URL 只允许 HTTPS。
- 每个订阅生成独立 secret，secret 只在创建/轮换时返回一次。
- 请求头至少包含事件 ID、时间戳和 HMAC-SHA256 签名；签名覆盖原始请求 body 和时间戳。
- 接收方应校验时间戳并防止重放；建议允许的最大时间偏差为 5 分钟。
- 投递语义为 at-least-once，可能重复；VPP 必须按事件 `id` 幂等处理。
- VPP 返回任意 2xx 表示确认；超时、网络失败或非 2xx 触发重试。
- 建议回调超时 5 秒，并使用指数退避；具体最大重试次数和最长保留时间须在联调前确定并写入公开文档。
- 日志必须记录 event ID、subscription ID、目标域名、HTTP status、耗时和重试次数，但不得记录 secret 或完整 Token。

### 4.2.5 Webhook 验收

- 遥测样本产生后可收到结构与 `DeviceTelemetry` 一致的事件。
- 命令状态每次变化均收到事件，且 `commandId` 可用于调用现有查询接口复核。
- 模拟超时和 HTTP 500 后发生重试；重复事件 ID 不变。
- 解除设备授权后，不再向对应 VPP 推送该设备的新事件。
- 错误签名、过期时间戳和非 HTTPS callback 创建请求被拒绝。

## 4.3 15min / 30min / 1h Device energy statistics

### 4.3.1 接口选择

建议继续使用现有单一接口：

```http
GET /devices/{deviceId}/energy
```

理由：

- 返回业务语义和 Schema 与 day/month/year 相同，仅聚合粒度不同。
- 当前 `openapi.json` 已经在同一个 `period` enum 中加入 `15min`、`30min`、`1h`。
- 符合 v1.3 尽量不新增 API 的兼容原则。

因此，除非产品在开发前明确否决，v1.3 按“一个接口、一个 Schema、扩展 period”实现，不拆成第二个接口。

### 4.3.2 参数

| 参数 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `deviceId` | string path | 是 | 当前 Client/User 已授权设备 |
| `period` | string | 是 | `15min`, `30min`, `1h`, `day`, `month`, `year` |
| `startDate` | date | 是 | `YYYY-MM-DD` |
| `endDate` | date | 是 | `YYYY-MM-DD`，按半开区间结束 |

对于 `15min`、`30min`、`1h`：

- 查询范围必须是一个设备本地自然日。
- `endDate` 必须等于 `startDate` 的次日。
- 区间语义为 `[startDate 00:00:00, endDate 00:00:00)`。
- 不满足条件返回 HTTP 400。

示例：

```text
period=15min&startDate=2026-08-01&endDate=2026-08-02
```

### 4.3.3 时区建议

建议使用设备详情中的 `timezone`/所属站点时区解释自然日，而不是固定 UTC 日：

- 输入仍使用 `date`，服务端根据设备时区换算为 UTC 查询区间。
- 响应 `data[].date` 对于小时内粒度必须返回带 offset 的 RFC 3339 时间，例如 `2026-08-01T00:15:00+10:00`。
- 不得返回没有 offset 的本地时间字符串。
- 夏令时切换日可能不是 24 小时，因此 15min 不应强制永远 96 个点、30min 不应强制永远 48 个点、1h 不应强制永远 24 个点。

此时区方案是 v1.3 的建议决策，产品和数据团队必须在开发开始前确认。如果最终选择 UTC 自然日，必须同步修改说明、示例和验收数据。

### 4.3.4 聚合规则

- 每个数据点表示 `[date, date + period)` 半开区间内的能量。
- `batteryChargeKwh`、`batteryDischargeKwh`、`pvGenerationKwh`、`inverterGenerationKwh`、`inverterConsumptionKwh`、`gridImportKwh`、`gridExportKwh` 使用同一时间桶边界。
- 能量优先通过累计表底差值计算；出现表计复位、回绕或缺数时不得产生负电量，需按数据平台既定修正规则处理并记录监控。
- 返回按 `date` 升序排列。
- 没有数据的时间桶是返回 0、null 还是省略，必须沿用统一能量统计缺失数据策略；发布文档中只能保留一种行为。

### 4.3.5 验收

- 普通自然日：15min/30min/1h 的时间桶边界正确，合计值与日统计在允许误差内一致。
- 非法日期范围返回真实 HTTP 400 和 JSON 错误体。
- 跨时区设备按各自设备时区得到不同 UTC 查询边界。
- 覆盖至少一个夏令时切换日测试。
- `gridImportKwh` 和 `gridExportKwh` 在所有粒度下参与聚合。

## 5. OpenAPI 与 Developer Portal 修改清单

v1.2.1：

- 为全部业务 response 增加 `{code,msg,data}` envelope Schema。
- 删除响应示例和 Schema 中的 `warn`、`success`、布尔 `error`。
- 补齐实际 HTTP 400/401/403/404/409/422/429/500/503 responses。
- 保持 site telemetry/site energy paths 隐藏。
- `DeviceDetail.gridConnected` 标记为 required boolean。
- `Site.devices` 和 `SiteDetail.devices` 支持 nullable，并记录 `includeDevices=false` 规则。
- `DeviceTelemetry.thirdPartyPv` 增加 nullable。
- `DeviceEnergyStatistics.data[]` 包含 `gridImportKwh`、`gridExportKwh`。
- enum 与 Developer Portal 一致，并修复 3.3.3 已知不一致。
- 增加 OAuth2 flows 和 operation scopes；TokenResponse 改用标准 snake_case。
- 修复认证指南中 Token 有效期冲突。
- device binding endpoint 在契约确定后加入公开 OpenAPI。

v1.3：

- FHM 不新增公开字段，只补充兼容说明和 capability/错误示例。
- 增加 Webhook subscription paths、event schemas、安全头说明和示例。
- `/devices/{deviceId}/energy` 的 `period` 保持六个枚举，并补充一天范围、时区和时间桶规则。

## 6. 测试与发布门禁

### 6.1 自动化契约测试

- CI 校验 `openapi.json` 是合法 OpenAPI 3.0.3 JSON。
- 对每个 endpoint 校验实际 HTTP status、`Content-Type` 和 response body schema。
- 对全部 4xx/5xx 验证 body `code` 与实际 HTTP status 一致。
- 验证 response 不含 `warn`、`success`、布尔 `error`。
- 验证所有 enum、nullable、required 和单位规则。
- 使用 OpenAPI 生成至少一种客户端类型，确认 envelope 后 `data` 仍为具体类型而不是无类型 object。

### 6.2 回归测试

- Site/device 列表、详情、遥测、能量、告警、命令、schedule、configuration 全量回归。
- Client Credentials 和 Authorization Code 分别完成一次端到端授权与 API 调用。
- 用户撤销 Authorization Code Grant 后，对应 Token/设备访问失效，不影响其他用户 Grant。
- Client Credentials Token 能访问该 VPP 已绑定的多台设备，不能访问未绑定设备。
- v1.3 FHM 与现有设备使用同一 API 测试集合。

### 6.3 文档发布门禁

- Developer Portal 展示的 Schema、枚举、示例、HTTP status 与生产响应一致。
- site telemetry 和 site energy statistics 不可搜索、不可访问。
- OAuth2、Webhook、时区、单位、正负方向和重试规则有独立说明。
- 发布前使用真实测试环境执行文档中的 curl 示例。

## 7. 开发前必须确认/补齐的输入

以下事项当前无法仅从 `openapi.json` 得出，必须在对应开发开始前确认：

| 编号 | 事项 | 建议/当前状态 | 责任方 |
| --- | --- | --- | --- |
| A1 | 海鹏协议 alarm code 分类表 | 必须提供完整 `sourceCode -> fault|alarm` mapping | 协议/设备团队 |
| A2 | Device binding API 契约 | 当前公开 OpenAPI 中不存在；需确定 path、claim/合同凭证、绑定转移和错误码 | 产品、后端、安全 |
| A3 | Access Token 有效期 | 当前文档同时存在 24h 与 3600s；建议统一为 3600s | 产品、安全、后端 |
| A4 | Authorization Code Refresh Token 有效期/闲置期 | 需确定并写入文档；必须支持撤销和轮换 | 产品、安全 |
| A5 | ACC PV 已配置但数据暂缺时的值 | 沿用统一遥测缺失数据策略，并补充明确示例 | 数据/设备团队 |
| A6 | FHM 完整上行/下行 mapping 表 | 必须覆盖字段、单位、缩放、枚举、错误和 capability | FHM 协议团队 |
| A7 | Webhook 最大重试次数和保留时间 | 建议指数退避；联调前固定参数 | 后端/SRE/产品 |
| A8 | 小时内能量统计时区 | 建议设备/站点本地时区 | 产品、数据团队 |
| A9 | 小时内统计接口是否拆分 | 建议不拆，继续使用 `/devices/{deviceId}/energy` | 产品/API Owner |
| A10 | 能量缺失时间桶行为 | 必须在 `0`、`null`、省略三者中统一选择 | 产品、数据团队 |

## 8. 最终验收结论模板

v1.2.1 只有在以下条件全部满足时可交付：

- 业务 API HTTP status、body `code` 和 `msg` 行为统一。
- 无 `warn/success/error` 布尔辅助字段。
- 隐藏接口未暴露。
- enum、单位、nullable 和新增字段符合本 PRD。
- OAuth2 两种流程和设备授权边界通过端到端测试。
- OpenAPI、Developer Portal、测试环境和生产候选版本响应一致。

v1.3 只有在以下条件全部满足时可交付：

- FHM 可通过现有 `deviceId` 和现有 API 完成上行与下行操作。
- 两类 Webhook 事件安全、可重试、可去重并遵守设备授权。
- 15min/30min/1h 能量统计的接口、时区、日期范围和聚合口径完成确认并通过边界测试。

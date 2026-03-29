# 本地 GLM-4.7-Flash MCP Server 实施计划

## Summary

构建一个基于 **TypeScript MCP SDK** 的本地 MCP Server，将 `zai-org/GLM-4.7-Flash` 封装为 7 个**窄职责工具**，供 Claude Code / Codex / Cline 等客户端调用。目标不是替代主模型，而是把**低风险、可结构化、短输出**的子任务下放给本地模型，减少主模型处理长文本和重复性文本任务的 token 消耗。

默认实现为 **stdio transport**，面向本地开发工具接入。模型调用走一个统一的 OpenAI-compatible client 适配层，所有工具共享：超时、重试、最大输出长度、JSON schema 校验、错误包装、日志埋点。

## Key Changes

### 1. 项目结构与运行方式

建立一个独立 MCP 项目，推荐结构：

- `src/server.ts`
- `src/config.ts`
- `src/client/glmClient.ts`
- `src/prompts/*.ts`
- `src/tools/*.ts`
- `src/schemas/*.ts`
- `src/utils/{json,errors,timeout,logger}.ts`

技术约束：

- 使用 **TypeScript MCP SDK**
- 本地 transport 使用 `stdio`
- Node.js 版本固定为 `>=20`
- 输入校验与输出 schema 统一使用 `zod`
- 所有工具返回：
  - 人类可读的简短 `content`
  - 机器可消费的 `structuredContent`
- 所有工具默认 `readOnlyHint: true`
- 不提供通用 `local_llm(prompt)` 工具，避免变成不可控万能代理

环境变量默认值：

- `ZAI_API_KEY`
- `ZAI_BASE_URL`，默认 Anthropic-compatible endpoint
- `ZAI_MODEL`，默认 `glm-4.7-flash`
- `GLM_TIMEOUT_MS`，默认 `20000`
- `GLM_MAX_RETRIES`，默认 `2`
- `GLM_TEMPERATURE`，默认 `0.2`
- BASE_URL=http://127.0.0.1:1234
- MODEL_NAME=`zai-org/glm-4.7-flash`
- api-key : no need. 

### 2. 统一 GLM 适配层

实现 `glmClient.ts`，作为所有工具唯一的模型访问入口，职责如下：

- 接受统一参数：
  - `systemPrompt`
  - `userPrompt`
  - `responseFormat`
  - `maxOutputTokens`
  - `temperature`
  - `timeoutMs`
- 支持两种模式：
  - `json_schema` 严格结构化输出
  - `text` 短文本输出
- 封装失败类型：
  - 配置错误
  - 请求超时
  - 上游 4xx/5xx
  - JSON 解析失败
  - schema 校验失败
  - 空响应
- 默认重试策略：
  - 仅对网络错误、超时、5xx 重试
  - 4xx、schema 错误不重试
- 日志输出最小化：
  - 工具名
  - 调用耗时
  - 输入字符数
  - 输出字符数
  - 是否重试
  - 错误类别
- 不记录完整原文，默认避免把敏感内容写入日志

### 3. 七个 MCP 工具定义

以下 7 个工具作为 v1 固定范围，全部以“短输出、结构化、低风险”为原则。

#### Tool 1: `local_classify`

用途：将输入文本归类到给定标签集合中。  
输入：

- `text: string`
- `labels: string[]`
- `instructions?: string`

输出：

- `label: string`
- `confidence: number`
- `reason: string`，限制 1-2 句

行为约束：

- 输出标签必须来自 `labels`
- 若无法判断，返回置信度较低的最佳标签，不返回自由标签

适用场景：

- 意图分类
- 工单/日志/任务标签化
- 路由决策前预处理

#### Tool 2: `local_extract_json`

用途：从长文本中提取结构化字段。  
输入：

- `text: string`
- `schema_description: string`
- `extraction_goal: string`

输出：

- `data: object`
- `missing_fields: string[]`

行为约束：

- 实际 schema 由 MCP 端定义一层通用 `{ data, missing_fields }`
- `data` 内部字段允许动态 shape，但必须是合法 JSON object
- 缺失字段不臆造，进入 `missing_fields`

适用场景：

- 从文档、日报、issue、日志中抽字段
- 提取任务、负责人、时间、状态

#### Tool 3: `local_summarize_long_text`

用途：将长文本压缩成短摘要，供主模型继续使用。  
输入：

- `text: string`
- `summary_style: "brief" | "bullet" | "decision"`
- `max_points?: number`

输出：

- `summary: string`
- `bullets: string[]`
- `risks: string[]`

行为约束：

- 总输出长度默认控制在约 300-500 中文字内
- 重点保留结论、待办、风险，不做文学化扩写

适用场景：

- 长对话压缩
- 长日志摘要
- 大段文档预读
- diff 解释前压缩上下文

#### Tool 4: `local_rewrite`

用途：对文本做风格重写，而不改变核心事实。  
输入：

- `text: string`
- `style: "concise" | "formal" | "technical" | "friendly" | "cn_en_translation" | "en_cn_translation"`
- `constraints?: string`

输出：

- `rewritten_text: string`

行为约束：

- 默认保留事实，不新增信息
- 翻译属于重写特例，不单独拆工具
- 输出不解释过程，不附加前后说明

适用场景：

- 提示词润色
- 说明文字压缩
- 中英互译
- commit/PR 文案重写

#### Tool 5: `local_codegen_small_patch`

用途：生成**小范围代码片段或函数级修改建议**，不负责全局规划。  
输入：

- `task: string`
- `language?: string`
- `existing_code?: string`
- `constraints?: string`

输出：

- `code: string`
- `explanation: string`
- `risk_notes: string[]`

行为约束：

- 明确限制为“小补丁/小函数/小片段”
- 不生成多文件方案，不做项目级架构设计
- explanation 限制在 3 句以内

适用场景：

- 正则/SQL/脚本片段
- 单函数改写
- 单测样例
- 数据转换代码

#### Tool 6: `local_diff_digest`

用途：将 diff 压缩为主模型更容易消费的结构化变化摘要。  
输入：

- `diff_text: string`
- `focus?: "behavior" | "risk" | "summary"`

输出：

- `changed_areas: string[]`
- `behavior_changes: string[]`
- `risks: string[]`
- `one_paragraph_summary: string`

行为约束：

- 不做代码审查结论，只做变化归纳
- 若 diff 太长，优先抽取行为层变化而不是逐行复述

适用场景：

- 提交前总结
- PR 描述草稿
- 让主模型快速理解大 diff

#### Tool 7: `local_task_extract`

用途：从非结构化文本中抽取可执行任务列表。  
输入：

- `text: string`
- `task_granularity: "coarse" | "normal" | "fine"`

输出：

- `tasks: Array<{ title: string; owner?: string; due?: string; status?: string; notes?: string }>` 

行为约束：

- 不臆造 owner / due
- 每个 task title 必须是可执行动作
- status 限制为 `todo | doing | blocked | done | unknown`

适用场景：

- 会议记录转任务
- 日报转待办
- 需求说明拆任务

### 4. Prompt 与输出策略

每个工具使用独立 `system prompt` 模板，放在 `src/prompts/`，统一要求：

- 优先准确，不追求文风
- 限制输出长度
- 尽量返回 JSON
- 缺信息时显式标记 unknown / missing，不臆造
- 不输出思维链
- 不返回 Markdown 包裹的 JSON

默认采样策略：

- `temperature = 0.1 ~ 0.2`
- 分类/提取类更低
- 重写类可放宽到 `0.3`

输出控制策略：

- 摘要、diff digest、rewrite 设较小 `maxOutputTokens`
- codegen 允许稍高但仍限制为小片段
- 任何工具结果超过阈值时直接截断并返回错误，而不是把超长内容送回主模型

### 5. 错误处理与客户端行为

每个工具必须向 MCP 客户端返回一致错误文案，格式包含：

- 错误类别
- 可操作建议
- 是否建议重试

标准错误类别：

- `CONFIG_ERROR`
- `UPSTREAM_TIMEOUT`
- `UPSTREAM_HTTP_ERROR`
- `EMPTY_MODEL_RESPONSE`
- `INVALID_JSON_RESPONSE`
- `SCHEMA_VALIDATION_FAILED`

工具层行为：

- 配置缺失时立即失败
- JSON 工具解析失败时返回错误，不回退为自然语言
- 文本工具若上游返回空内容，视为失败
- 单次请求超时默认 20 秒
- 不实现队列和并发控制，v1 直接串行调用即可

## Public Interfaces

对外暴露的 MCP tool 列表固定为：

- `local_classify`
- `local_extract_json`
- `local_summarize_long_text`
- `local_rewrite`
- `local_codegen_small_patch`
- `local_diff_digest`
- `local_task_extract`

公共接口约束：

- 所有输入 schema 必须有明确字段描述和示例
- 所有工具都提供 `structuredContent`
- 所有工具都返回简短可读文本摘要，方便不消费 structured output 的客户端
- 不提供资源、prompt 模板发现、streaming tool call 等高级能力，v1 先把基础工具做好

## Test Plan

### 单元测试

覆盖以下内容：

- 配置读取与默认值
- 上游 client 请求组装
- 超时与重试分支
- JSON 解析与 zod 校验
- 各工具输入 schema 校验
- 各工具输出映射逻辑
- 错误分类映射

### 集成测试

对 7 个工具各准备至少 2 组 fixture：

- 正常输入
- 缺字段/噪声输入
- 超长输入
- 上游返回非法 JSON
- 上游超时

集成测试目标：

- 确认 MCP server 能被 Inspector 正常发现并列出工具
- 确认每个工具都能返回 `content + structuredContent`
- 确认失败时错误信息一致且可判定

### 验收场景

以 Claude Code / MCP Inspector 为验收入口，验证以下场景：

1. 输入会议纪要，`local_task_extract` 输出任务列表
2. 输入长 issue 线程，`local_summarize_long_text` 输出短摘要
3. 输入一段说明文，`local_classify` 正确落到给定标签
4. 输入长文本和提取要求，`local_extract_json` 返回合法 JSON
5. 输入 diff，`local_diff_digest` 给出行为变化与风险摘要
6. 输入短代码任务，`local_codegen_small_patch` 返回小片段代码
7. 输入中文或英文说明，`local_rewrite` 完成压缩或翻译

验收标准：

- 工具名、字段名稳定
- 输出长度受控
- 失败可诊断
- 无“万能 prompt 工具”
- 主模型可以把工具结果直接继续用于后续推理

## Assumptions

- 默认上游模型为 `glm-4.7-flash`
- 默认通过 OpenAI-compatible API 访问 Z.AI 服务
- v1 只做文本输入/文本输出，不支持视觉能力
- v1 只做本地 `stdio` MCP，不做远程 HTTP MCP
- v1 不做缓存、并发限流、会话记忆、结果持久化
- v1 不做通用代理型工具，所有工具必须保持窄职责
- `local_codegen_small_patch` 明确不是 autonomous coding agent，只做小片段生成


# Image Generator Tool Design

## Goal

新增一个“图片生成”工具，让用户在 AhuTools 内快速生成指定尺寸、格式和内容的图片，并支持背景图、水印图、裁剪、压缩质量设置和本地下载。

第一版聚焦常用静态图片格式：PNG、JPEG、WebP。不支持 GIF 动图、AVIF、PSD、SVG 导出或批量生成。

## Background

当前项目是 Wails v2 + Go + Vue 3 + Vite 桌面工具箱。工具通过 `frontend/src/tools/index.js` 注册，每个工具以 Vue 单文件组件实现，并使用 `ToolWorkspace`、`ToolPanel` 和 Element Plus 表单组合页面。

图片生成能力适合放在现有工具体系中，核心绘制可由浏览器 Canvas 完成。Canvas 能直接输出 PNG、JPEG、WebP Blob，满足第一版的生成、预览和下载需求。若目标平台的 Wails WebView 对 Blob 下载支持不稳定，再增加一个极薄的 Go 保存方法作为兼容兜底。

## Requirements

### Core Image Generation

- 用户可以手动填写图片宽度和高度。
- 用户可以选择输出格式：PNG、JPEG、WebP。
- 用户可以输入图片中的文字，默认水平和垂直居中。
- 用户可以设置压缩质量。
- 用户可以下载生成后的图片到本地。
- 用户可以开启动态裁剪，设置裁剪区域后输出裁剪后的图片。
- 用户可以选择背景图片。
- 用户可以选择水印图片。
- 背景和水印功能在 UI 和状态上分开配置。

### Format and Compression

- PNG 使用 Canvas 原生 PNG 输出，视为无损输出。第一版不提供 PNG 有损压缩等级，因为 Canvas `toBlob('image/png')` 不支持标准质量参数。
- JPEG 支持质量参数 `0.1..1`，UI 展示为 `10%..100%`。
- WebP 支持质量参数 `0.1..1`，UI 展示为 `10%..100%`。
- 当格式为 PNG 时，质量滑块禁用或显示为“不适用”，避免用户误解。
- 透明背景仅在 PNG 和 WebP 下可用；JPEG 导出前会自动铺白色或用户选择的背景色。

### Background

- 背景配置独立于水印配置。
- 支持背景色。
- 支持上传一张背景图片。
- 背景图片填充方式：
  - 拉伸：铺满画布，可能变形。
  - 等比覆盖：覆盖整个画布，可能裁掉边缘。
  - 等比完整：完整显示图片，可能留白。
  - 平铺：重复铺满画布。
- 背景图读取仅在前端内存中处理，不写入历史记录。

### Text

- 支持输入文本内容。
- 默认居中绘制。
- 第一版支持基础文本样式：
  - 字号。
  - 字体颜色。
  - 粗体开关。
  - 文字透明度。
  - 水平位置：左、中、右。
  - 垂直位置：上、中、下。
- 多行文本按换行符绘制，并以整段文本块居中对齐到目标位置。

### Watermark

- 水印配置独立于背景配置。
- 支持上传一张水印图片。
- 支持水印开关。
- 支持水印位置：左上、上中、右上、左中、居中、右中、左下、下中、右下。
- 支持水印透明度。
- 支持水印宽度比例或固定宽度，第一版推荐宽度比例，默认占画布宽度 `20%`。
- 支持边距配置。

### Crop

- 裁剪配置独立开关。
- 未开启裁剪时，输出尺寸等于用户填写的画布宽高。
- 开启裁剪时，先按画布宽高完成背景、文字和水印绘制，再从成品画布中裁出指定区域。
- 裁剪参数：
  - `x`：裁剪起点横坐标。
  - `y`：裁剪起点纵坐标。
  - `width`：裁剪宽度。
  - `height`：裁剪高度。
- 裁剪区域必须在画布范围内；超出时给出错误提示，不自动静默修正。
- 第一版使用数字输入和预览框，不做拖拽裁剪手柄。拖拽裁剪可作为后续优化。

## UI Design

新增 `ImageGeneratorTool.vue`，沿用现有双栏工具布局。

### Input Panel

输入面板分为五组：

- 基础设置：宽度、高度、输出格式、压缩质量、透明背景。
- 背景：背景色、背景图片上传、填充方式。
- 文字：文本内容、字号、颜色、粗体、透明度、水平位置、垂直位置。
- 水印：水印图片上传、位置、透明度、大小比例、边距。
- 裁剪：开启开关、`x/y/width/height`。

操作按钮：

- 生成预览。
- 下载图片。
- 重置。

### Result Panel

结果面板展示：

- Canvas 预览。
- 输出元信息：输出尺寸、格式、压缩质量、估算文件大小。
- 错误提示：尺寸无效、图片读取失败、裁剪区域越界、格式不支持、导出失败。

Canvas 预览需要限制最大显示尺寸，保持等比缩放，避免大图撑破布局。真实导出尺寸仍使用用户填写的宽高。

## Architecture

### Files

- `frontend/src/tools/ImageGeneratorTool.vue`
  - 工具页面、表单状态、图片文件读取、Canvas 预览、下载流程。
- `frontend/src/tools/index.js`
  - 注册新工具，建议分组为“图片工具”或“开发辅助”。
- `frontend/src/utils/imageTool.js`
  - 放可测试的纯函数：尺寸校验、格式配置、质量映射、裁剪校验、默认文件名、背景绘制计算。
- `frontend/src/utils/imageTool.test.js`
  - 覆盖核心纯函数。
- `frontend/src/style.css`
  - 增加图片预览、表单分组和上传摘要的少量样式。

### Data Flow

```
用户配置
  -> 校验尺寸、格式、质量、裁剪参数
  -> FileReader 读取背景图和水印图
  -> Image 解码为 HTMLImageElement
  -> Canvas 按顺序绘制背景、背景图、文字、水印
  -> 可选裁剪到第二个 Canvas
  -> canvas.toBlob 输出 Blob
  -> 预览 Blob URL
  -> 下载 Blob 到本地
```

绘制顺序固定为：

1. 背景色或透明背景。
2. 背景图片。
3. 文字。
4. 水印图片。
5. 可选裁剪输出。

### State

工具组件内部保存配置状态：

- `width`、`height`。
- `format`。
- `quality`。
- `transparentBackground`。
- `backgroundColor`。
- `backgroundImageFile`、`backgroundImageUrl`。
- `backgroundFit`。
- `text`、`fontSize`、`textColor`、`textBold`、`textOpacity`、`textAlign`、`textVerticalAlign`。
- `watermarkEnabled`、`watermarkFile`、`watermarkUrl`、`watermarkPosition`、`watermarkOpacity`、`watermarkScale`、`watermarkMargin`。
- `cropEnabled`、`cropX`、`cropY`、`cropWidth`、`cropHeight`。
- `previewUrl`、`outputBlob`、`outputMeta`、`error`。

历史记录只保存可序列化配置，不保存背景图和水印图二进制内容，也不保存 Blob URL。恢复历史时提示用户需要重新选择本地图片文件。

## Validation

- 宽度和高度必须是整数，建议范围 `1..8000`。
- 画布像素总量超过 `16000000` 时提示性能风险，但允许用户继续生成。
- 格式必须是 `png`、`jpeg` 或 `webp`。
- JPEG/WebP 质量必须在 `0.1..1`。
- PNG 禁用质量参数。
- 裁剪宽高必须大于 0。
- 裁剪区域不能超出当前画布范围。
- 背景图和水印图必须是浏览器可解码的图片文件。
- 导出 Blob 失败时展示“图片导出失败，请调整格式或尺寸后重试”。

## Download Behavior

优先使用前端 Blob 下载：

- 通过 `URL.createObjectURL(blob)` 生成下载 URL。
- 创建临时 `<a download>` 元素触发下载。
- 文件名格式：`ahu-tools-image-YYYYMMDD-HHmmss.<ext>`。

如果实际验证发现 Wails WebView 在 macOS 或 Windows 上不触发下载，再补充 Go 后端方法：

- `SaveGeneratedImage(defaultFileName, base64Data)`.
- 后端调用 `runtime.SaveFileDialog` 选择保存路径。
- 后端解码 base64 并写入用户选择的位置。

第一版实现时先验证前端下载是否满足桌面端保存要求，再决定是否启用后端兜底。

## Error Handling

- 文件读取失败：提示“图片读取失败，请重新选择文件”。
- 图片解码失败：提示“图片格式不受支持或文件已损坏”。
- 尺寸无效：提示具体字段和允许范围。
- 裁剪越界：提示“裁剪区域不能超出画布范围”。
- PNG 质量设置：UI 禁用质量控件，文案说明 PNG 为无损输出。
- JPEG 透明背景：导出前自动转为白底或用户选择的背景色，并在 UI 中禁用透明背景。
- 下载失败：提示“下载失败，请重新生成后再试”。

所有错误只展示适合 UI 的简体中文文案，不展示 raw exception。

## Testing

### Unit Tests

新增 `frontend/src/utils/imageTool.test.js`，覆盖：

- 尺寸范围校验。
- 格式配置和扩展名映射。
- PNG 质量禁用逻辑。
- JPEG/WebP 质量归一化。
- 裁剪区域合法和越界判断。
- 背景图 cover/contain/stretch 目标矩形计算。
- 默认文件名格式。

### Manual Verification

- 生成 `800 x 450` PNG，文字居中，下载成功。
- 生成 JPEG，质量设置为 `30%` 和 `90%` 时文件大小有明显差异。
- 生成 WebP，质量设置生效。
- 使用背景图，分别验证拉伸、覆盖、完整、平铺。
- 使用水印图，验证九宫格位置、透明度、缩放和边距。
- 开启裁剪，验证输出尺寸等于裁剪宽高。
- 裁剪越界时展示错误，不生成错误图片。
- 超大尺寸时有性能提示。
- 历史记录恢复后，基础配置恢复，背景图和水印图不恢复并给出提示。

### Commands

- `npm run test --prefix frontend`
- `npm run build --prefix frontend`
- 如后续增加 Go 保存兜底，再运行 `go test ./...`

## Out of Scope

- 不支持 GIF 动图生成。
- 不支持 AVIF 导出。
- 不支持 SVG 编辑或 SVG 导出。
- 不做批量生成。
- 不做拖拽式裁剪手柄。
- 不做高级滤镜、图片调色、模糊、阴影或图层管理。
- 不保存用户上传的背景图、水印图到历史记录或本地缓存。
- 不引入重量级图片编辑器。

## Acceptance Criteria

- 左侧工具栏出现“图片生成”入口。
- 用户可以输入宽高并生成对应尺寸图片。
- 用户可以选择 PNG、JPEG、WebP。
- PNG 显示为无损输出，不展示可误解的压缩等级。
- JPEG/WebP 可以设置质量等级。
- 用户可以输入文字，默认居中绘制。
- 用户可以选择背景图片，且背景配置和水印配置分开。
- 用户可以选择水印图片，并调整位置、透明度、大小和边距。
- 用户可以开启裁剪并输出裁剪后的图片。
- 用户可以下载生成图片到本地。
- 输入错误和导出错误有清晰中文提示。
- 新增工具遵循现有 `ToolWorkspace`、`ToolPanel` 和工具注册模式。
- `npm run test --prefix frontend` 和 `npm run build --prefix frontend` 通过。

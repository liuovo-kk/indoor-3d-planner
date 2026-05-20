# Web-VR 场景同步数据协议 (Draft v1.0)

## 1. 坐标系换算规则 (核心)

**由 Web 前端在导出数据时主动进行坐标转换**：

- **Position:** Web (右手系) -> Unity (左手系)。规则：`Unity.Z = -Web.Z`
- **Rotation:** Web 弧度制 -> Unity 角度制欧拉角。规则：`Unity.Y = -Web.Y * (180 / Math.PI)`

## 2. 标准 JSON Schema

VR 端无需关心前端状态，仅需解析以下格式的 JSON 并实例化 Prefab：

```json
{
  "scene_id": "room_20260513_001",
  "timestamp": 1715600000000,
  "items": [
    {
      "instance_id": "uuid-abcd-1234",
      "model_id": "sofa_modern_01",
      "position": { "x": 2.5, "y": 0.0, "z": -1.2 },
      "rotation": { "x": 0.0, "y": -90.0, "z": 0.0 },
      "scale": { "x": 1.0, "y": 1.0, "z": 1.0 }
    }
  ]
}
```

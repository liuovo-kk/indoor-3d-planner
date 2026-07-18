import { useState } from 'react';
import useStore from '../../store/useStore';
import * as THREE from 'three';
import { Sparkles, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';

export default function AILayoutPanel() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [useLLM, setUseLLM] = useState(true);

  // 用于存储并展示 AI 思考的解析结果
  const [aiResult, setAiResult] = useState<any>(null);

  const addPlacedItem = useStore((s) => s.addPlacedItem);

  const currentScene = useStore((s) => s.currentScene);
  const clearSceneItems = useStore((s) => s.clearSceneItems);
  const setRoomSize = useStore((s) => s.setRoomSize);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setAiResult(null); // 清空上次的结果

    try {
      const response = await fetch('http://172.31.227.222:8010/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: prompt,
          // 如果后端支持，可以把 checkbox 的状态传过去
          // use_optimizer: useLLM
        }),
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const data = await response.json();

      // =====================================================================
      // 🚀 【Mock 挡板数据】使用学长给的 JSON 数据模拟请求成功
      // =====================================================================
      /*
      // 模拟 1.5 秒的网络延迟，让用户感觉 AI 真的在思考
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockData = {
        status: 'ok',
        answer:
          '{\n  "summary": "已完成卧室布局：一张床、床头左右两侧床头柜，以及床尾朝向床的电视柜均已就位。",\n  "design_decisions": [\n    "保留核心卧室组合，清理了与需求无关且影响动线的家具。",\n    "将床作为房间主轴布置，两只床头柜分别放在床头左右两侧，形成对称床头区。",\n    "将电视柜布置在床尾方向，并校正朝向，使其面向床。",\n    "为保证家具组合可容纳且不越界，已适当扩展房间边界。"\n  ]\n}',
        scene_json: {
          room_size: {
            x: 2.7547785168451258,
            y: 2.6006376014627453,
            z: 3.754590208733789,
          },
          bboxes: [
            {
              model_jid: '22da2ff5-6dd3-4c99-b179-b075a35eb3eb',
              position: [0.20196855579570988, 0.0, -0.7235556244850159],
              rotation: [0.0, 0.0, 0.0, 1.0],
              label: 'king-size bed',
            },
            {
              model_jid: '0484c891-8b77-4ffc-9488-0fb020589d7c',
              position: [-0.9723779086342108, 0.0, -1.35],
              rotation: [0.0, 0.0, 0.0, 1.0],
              label: 'Nightstand',
            },
            {
              model_jid: '0484c891-8b77-4ffc-9488-0fb020589d7c',
              position: [1.3750683284396974, 0.0, -1.35],
              rotation: [0.0, 0.0, 0.0, 1.0],
              label: 'Nightstand',
            },
            {
              model_jid: '1b177d51-d465-49c3-8580-9b2c81e24f95',
              position: [0.215, 0.0, 1.05],
              rotation: [0.0, 1.0, 0.0, 6.123233995736766e-17],
              label: 'TV Stand',
            },
          ],
        },
      };

      const data = mockData; // 将 mockData 赋值给 data 走接下来的正常渲染流程
*/
      // ================= 1. 解析 AI 的设计决策并在 UI 展示 =================
      if (data.answer) {
        try {
          const parsedAnswer = JSON.parse(data.answer);
          setAiResult(parsedAnswer);
        } catch (e) {
          console.warn('解析 AI Answer JSON 失败', e);
        }
      }

      // 1. 瞬间清空当前房间的所有家具，为 AI 腾出干净的画布
      clearSceneItems(currentScene);

      // 2. 提取 AI 设定的房间尺寸，并重塑物理边界
      if (data.scene_json?.room_size) {
        // const { x, y, z } = data.scene_json.room_size;
        // setRoomSize(x, z, y);
        setRoomSize(4, 4, 2.8); // 暂时固定为默认尺寸，AI 生成的尺寸有问题
      }

      // ================= 2. 提取 3D 边界框并渲染到场景中 =================
      const bboxes = data.scene_json?.bboxes || [];

      bboxes.forEach((bbox: any) => {
        // 后端返回的是四元数 [x, y, z, w]，前端组件需要欧拉角 [x, y, z]
        const q = bbox.rotation;
        const quaternion = new THREE.Quaternion(q[0], q[1], q[2], q[3]);
        const euler = new THREE.Euler().setFromQuaternion(quaternion);

        // 生成唯一实例 ID
        const instanceId = `ai_${Math.random().toString(36).substring(2, 9)}`;

        // 调用 Zustand store，把家具扔进 3D 画布
        addPlacedItem({
          instanceId: instanceId,
          model_id: bbox.model_jid, // 使用后端的模型 ID
          position: [bbox.position[0], bbox.position[1], bbox.position[2]],
          rotation: [euler.x, euler.y, euler.z],
          category: bbox.label || 'AI_Generated', // 用后端返回的 label 作为分类名
          image: '',
        });
      });
    } catch (error) {
      console.error('AI 布局生成报错:', error);
      alert('生成失败！请检查后端服务是否启动，或者是否存在跨域 (CORS) 拦截。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar">
      {/* 提示说明区域 (当生成结果存在时，收起或替换它以节省空间) */}
      {!aiResult && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-5 text-sm text-gray-700">
          <h4 className="font-bold text-[#82b7e5] mb-2 flex items-center text-base gap-1.5">
            <Sparkles size={18} /> 智能布局助手
          </h4>
          <p className="mb-1 leading-relaxed">
            <strong>用法示例 1：</strong>生成一个有桌子和床的房间
          </p>
          <p className="mb-2 leading-relaxed">
            <strong>用法示例 2：</strong>
            我想要一个有床的房间，床头两侧有床头柜，还有一个电视柜在床尾。
          </p>
          <div className="mt-3 text-xs text-gray-500 border-t border-blue-200 pt-3 leading-relaxed">
            支持家具：床, 沙发, 桌子, 办公桌, 咖啡桌, 衣柜, 梳妆台, 电视架,
            落地灯等。
          </div>
        </div>
      )}

      {/* 🌟 AI 解析结果展示卡片*/}
      {aiResult && (
        <div className="bg-green-50/50 border border-green-200 rounded-xl p-4 mb-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <h4 className="font-bold text-green-700 mb-2 flex items-center text-sm gap-1.5">
            <CheckCircle2 size={16} /> AI 布局已完成
          </h4>
          <p className="text-xs text-gray-700 leading-relaxed font-medium mb-3">
            {aiResult.summary}
          </p>

          <div className="border-t border-green-100 pt-3 mt-3">
            <h5 className="text-xs font-bold text-green-600 mb-2 flex items-center justify-between">
              设计决策 (Design Decisions)
            </h5>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
              {aiResult.design_decisions?.map((desc: string, i: number) => (
                <li key={i}>{desc}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Prompt 输入区 */}
      <div className="flex-1 min-h-32 flex flex-col mb-4">
        <textarea
          className="flex-1 w-full p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#9fc7ea] focus:border-transparent transition-all text-sm leading-relaxed shadow-sm bg-gray-50 focus:bg-white"
          placeholder="输入你的布局需求，例如：我想要一个有床的房间，床头两侧有床头柜..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      {/* 操作按钮区 */}
      <div className="flex flex-col gap-3 mt-auto shrink-0">
        <label className="flex items-center text-sm text-gray-600 cursor-pointer mb-1 w-fit hover:text-black transition-colors">
          <input
            type="checkbox"
            checked={useLLM}
            onChange={(e) => setUseLLM(e.target.checked)}
            className="mr-2 rounded w-4 h-4 border-gray-300 text-[#157fe2] focus:ring-[#157fe2]"
          />
          启用大模型优化器
        </label>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3.5 rounded-xl font-bold transition-all text-sm tracking-wide flex items-center justify-center gap-2 ${
            isGenerating || !prompt.trim()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#157fe2] hover:bg-[#0058a3] hover:shadow-lg hover:-translate-y-0.5 text-white shadow-md'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              正在生成专属布局...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              一键生成布局
            </>
          )}
        </button>
      </div>
    </div>
  );
}

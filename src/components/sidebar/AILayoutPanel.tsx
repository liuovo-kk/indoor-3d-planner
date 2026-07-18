import { useState } from 'react';
import useStore from '../../store/useStore';
import * as THREE from 'three';
import { Sparkles, CheckCircle2, Loader2, Plus } from 'lucide-react';

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

  // AI 对话上下文
  const conversationId = useStore((s) => s.conversationId);
  const setConversationId = useStore((s) => s.setConversationId);

  // 回到最原始状态的处理函数
  const handleResetConversation = () => {
    setPrompt('');
    setAiResult(null);
    setConversationId(null);
    clearSceneItems(currentScene);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setAiResult(null);

    try {
      const requestBody: any = {
        query: prompt,
      };
      if (conversationId) {
        requestBody.conversation_id = conversationId;
      }

      const response = await fetch('http://172.31.227.222:8010/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const data = await response.json();

      console.log('后端返回的完整原始数据:', data);

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      if (data.answer) {
        try {
          const jsonMatch = data.answer.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedAnswer = JSON.parse(jsonMatch[0]);
            setAiResult(parsedAnswer);
          }
        } catch (err) {
          console.error('正则提取 AI Answer 失败', err);
        }
      }

      // 清空当前房间家具
      clearSceneItems(currentScene);

      // 直接读取房间尺寸
      let roomW = 4,
        roomD = 4,
        roomH = 2.8; // 默认尺寸

      const roomBBox = data.scene_json?.room_bbox_aabb;
      const rSize = data.scene_json?.room_size;

      if (roomBBox && roomBBox.min && roomBBox.max) {
        // 使用真正的边界框来计算房间的长宽
        roomW = roomBBox.max[0] - roomBBox.min[0];
        roomD = roomBBox.max[2] - roomBBox.min[2];

        // 高度用 rSize.y
        roomH = rSize?.y || 2.8;
      } else if (rSize && rSize.x !== undefined) {
        // 兜底方案：如果没传 bbox，再勉强用 room_size
        roomW = rSize.x;
        roomD = rSize.z;
        roomH = rSize.y || 2.8;
      }

      // 更新 3D 房间墙壁尺寸
      setRoomSize(roomW, roomD, roomH);

      // 渲染家具
      const bboxes = data.scene_json?.bboxes || [];
      bboxes.forEach((bbox: any) => {
        const q = bbox.rotation;
        const quaternion = new THREE.Quaternion(q[0], q[1], q[2], q[3]);
        const euler = new THREE.Euler().setFromQuaternion(quaternion);

        const instanceId = `ai_${Math.random().toString(36).substring(2, 9)}`;

        addPlacedItem({
          instanceId: instanceId,
          model_id: bbox.model_jid,
          position: [bbox.position[0], bbox.position[1], bbox.position[2]],
          rotation: [euler.x, euler.y, euler.z],
          category: bbox.label || 'AI_Generated',
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
    <div className="flex flex-col h-full p-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* 🌟 头部区域：标题与新对话按钮 */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <Sparkles className="text-[#157fe2]" size={18} />
          智能布局助手
        </h3>

        {(aiResult || conversationId) && (
          <button
            onClick={handleResetConversation}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-[#157fe2] transition-colors"
            title="清空当前场景与对话"
          >
            <Plus size={14} />
            开启新对话
          </button>
        )}
      </div>

      {/* 提示说明区域 (无结果时展示) */}
      {!aiResult && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 mb-4 text-sm text-gray-700">
          <p className="mb-1.5 leading-relaxed">
            <strong>用法示例 1：</strong>生成一个有桌子和床的房间
          </p>
          <p className="mb-1.5 leading-relaxed">
            <strong>用法示例 2：</strong>
            我想要一个有床的房间，床头两侧有床头柜，还有一个电视柜在床尾。
          </p>
          <div className="mt-2 text-xs text-gray-500 border-t border-blue-200/60 pt-2 leading-relaxed">
            支持家具：床, 沙发, 桌子, 办公桌, 咖啡桌, 衣柜, 梳妆台, 电视架,
            落地灯等。
          </div>
        </div>
      )}

      {/* AI 解析结果展示卡片 */}
      {aiResult && (
        <div className="bg-green-50/60 border border-green-200 rounded-xl p-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <h4 className="font-bold text-green-700 mb-2 flex items-center text-sm gap-1.5">
            <CheckCircle2 size={16} /> 布局已完成
          </h4>
          <p className="text-xs text-gray-700 leading-relaxed font-medium mb-2">
            {aiResult.summary}
          </p>

          <div className="border-t border-green-100 pt-2 mt-2">
            <h5 className="text-xs font-bold text-green-600 mb-1.5">
              设计决策 (Design Decisions)
            </h5>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              {aiResult.design_decisions?.map((desc: string, i: number) => (
                <li key={i}>{desc}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Prompt 输入区 */}
      <div className="flex-1 min-h-[80px] flex flex-col mb-3">
        <textarea
          className="flex-1 w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#9fc7ea] focus:border-transparent transition-all text-sm leading-relaxed shadow-sm bg-gray-50 focus:bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          placeholder={
            conversationId
              ? '继续补充要求，例如：把床换个方向，或加个衣柜...'
              : '输入你的布局需求，例如：我想要一个有床的房间...'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      {/* 操作按钮区 */}
      <div className="flex flex-col gap-2 mt-auto shrink-0">
        <label className="flex items-center text-xs text-gray-600 cursor-pointer mb-1 w-fit hover:text-black transition-colors">
          <input
            type="checkbox"
            checked={useLLM}
            onChange={(e) => setUseLLM(e.target.checked)}
            className="mr-2 rounded w-3.5 h-3.5 border-gray-300 text-[#157fe2] focus:ring-[#157fe2]"
          />
          启用大模型优化器
        </label>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 rounded-xl font-bold transition-all text-sm tracking-wide flex items-center justify-center gap-2 ${
            isGenerating || !prompt.trim()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#157fe2] hover:bg-[#0058a3] hover:shadow-lg hover:-translate-y-0.5 text-white shadow-md'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              正在生成...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {conversationId ? '在此基础上调整' : '一键生成布局'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

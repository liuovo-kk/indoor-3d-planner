import { useState } from 'react';

export default function AILayoutPanel() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('接口开发中：准备生成布局...');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      {/* 提示说明区域 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-5 text-sm text-gray-700">
        <h4 className="font-bold text-[#82b7e5] mb-2 flex items-center text-base">
          智能布局助手
        </h4>
        <p className="mb-1 leading-relaxed">
          <strong>用法示例 1：</strong>生成一个有桌子和床的房间
        </p>
        <p className="mb-2 leading-relaxed">
          <strong>用法示例 2：</strong>添加房间中的桌子
        </p>
        <div className="mt-3 text-xs text-gray-500 border-t border-blue-200 pt-3 leading-relaxed">
          支持家具：床, 单人床, 沙发, 桌子, 办公桌, 咖啡桌, 侧桌, 衣柜, 儿童柜,
          梳妆台, 电视架, 落地灯, 吊灯等。
        </div>
      </div>

      {/* Prompt 输入区 */}
      <div className="flex-1 min-h-32.5 flex flex-col mb-4">
        <textarea
          className="flex-1 w-full p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#9fc7ea] focus:border-transparent transition-all text-sm leading-relaxed"
          placeholder="输入 prompt，示例：生成一个有桌子和床的房间..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {/* 操作按钮区 */}
      <div className="flex flex-col gap-3 mt-auto">
        <label className="flex items-center text-sm text-gray-600 cursor-pointer mb-1">
          <input
            type="checkbox"
            className="mr-2 rounded w-4 h-4 border-gray-300 bg-[#0058a3] focus:ring-blue-500"
          />
          启用大模型
        </label>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 rounded-xl font-bold transition-all text-sm tracking-wide ${
            isGenerating || !prompt.trim()
              ? 'bg-gray-300 text-white cursor-not-allowed'
              : 'bg-[#95c3ea] hover:bg-[#789fc0] hover:shadow-md hover:-translate-y-0.5 text-white shadow-sm'
          }`}
        >
          {isGenerating ? '生成中...' : '生成布局'}
        </button>

        <button className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm tracking-wide">
          保存当前布局
        </button>
      </div>
    </div>
  );
}

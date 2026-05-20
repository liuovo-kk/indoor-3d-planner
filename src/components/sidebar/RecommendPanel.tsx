// src/components/sidebar/RecommendPanel.tsx
import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { FurnitureData } from '../../types';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function RecommendPanel() {
  const currentItem = useStore((state) => state.currentRecommendItem);
  const furnitureList = useStore((state) => state.furnitureList);
  const setActiveTab = useStore((state) => state.setActiveSidebarTab);
  const addPlacedItem = useStore((state) => state.addPlacedItem);

  // 点击推荐卡片时，添加到场景，并将其设为新的推荐基准
  const handleRecommendClick = (item: FurnitureData) => {
    const newItem = {
      ...item,
      instanceId: Math.random().toString(36).substring(7),
      position: [Math.random() - 0.5, 0, Math.random() - 0.5] as [
        number,
        number,
        number,
      ],
    };
    addPlacedItem(newItem);
    useStore.getState().setCurrentRecommendItem(item);
  };

  // 🌟 核心算法升级：分别找出同分类、同风格、同材质的所有模型
  const recommendations = useMemo(() => {
    if (!currentItem) return { category: [], style: [], material: [] };

    // 过滤掉当前正在展示的家具本身
    const others = furnitureList.filter(
      (i) => i.model_id !== currentItem.model_id,
    );

    const sameCategory = others.filter(
      (i) =>
        i.category?.category &&
        i.category.category === currentItem.category?.category,
    );
    const sameStyle = others.filter(
      (i) =>
        i.category?.style && i.category.style === currentItem.category?.style,
    );
    const sameMaterial = others.filter(
      (i) =>
        i.category?.material &&
        i.category.material === currentItem.category?.material,
    );

    return { category: sameCategory, style: sameStyle, material: sameMaterial };
  }, [currentItem, furnitureList]);

  // 保护：如果没有选中任何家具
  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
        <Sparkles size={48} className="mb-4 text-gray-200" />
        <p>No furniture selected.</p>
        <button
          onClick={() => setActiveTab('add')}
          className="mt-6 px-6 py-2 bg-black text-white rounded-full font-bold hover:bg-gray-800"
        >
          Explore Furniture
        </button>
      </div>
    );
  }

  const hasAnyRecommendations =
    recommendations.category.length > 0 ||
    recommendations.style.length > 0 ||
    recommendations.material.length > 0;

  // 封装渲染横向滚动行的组件
  const renderRecommendRow = (title: string, items: FurnitureData[]) => {
    if (!items || items.length === 0) return null; // 🌟 如果该分类没有数据，直接不渲染这一行

    return (
      <div className="mb-6">
        <h4 className="font-extrabold text-sm mb-3 text-gray-800 flex items-center gap-1.5">
          <span className="w-1 h-3 bg-[#4490d2] rounded-full"></span>
          {title}
        </h4>
        {/* 横向滚动容器，隐藏滚动条 */}
        <div
          className="flex overflow-x-auto gap-3 pb-2 snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* CSS 小技巧：隐藏 webkit 滚动条 */}
          <style>{`
            .flex::-webkit-scrollbar { display: none; }
          `}</style>

          {items.map((item, idx) => (
            <div
              key={`${item.model_id}-${idx}`}
              className="shrink-0 w-24 cursor-pointer group snap-start"
              onClick={() => handleRecommendClick(item)}
            >
              <div className="w-24 h-24 bg-[#f5f5f5] rounded-xl p-2 mix-blend-multiply mb-2 group-hover:bg-gray-200 transition-colors">
                <img
                  src={item.image}
                  alt={item.category?.category}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  onError={(e: any) => {
                    e.target.src =
                      'https://via.placeholder.com/150?text=No+Image';
                  }}
                />
              </div>
              <div className="font-bold text-[10px] uppercase truncate text-gray-700 tracking-wider">
                {item.category?.category || 'ITEM'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ scrollbarWidth: 'thin' }}
    >
      {/* 顶部返回按钮 */}
      <div
        className="p-5 pb-2 flex items-center gap-2 cursor-pointer text-[#767676] hover:text-black font-bold text-sm transition-colors"
        onClick={() => setActiveTab('add')}
      >
        <ArrowLeft size={18} strokeWidth={2.5} /> Back to Add
      </div>

      {/* ================= 1. 当前选中家具展示 (左右布局) ================= */}
      <div className="p-5 border-b border-gray-100 flex gap-4 items-center">
        {/* 左侧：变小的图片 */}
        <div className="w-28 h-28 shrink-0 bg-[#f5f5f5] rounded-2xl flex items-center justify-center p-3 mix-blend-multiply">
          <img
            src={currentItem.image}
            alt="Selected"
            className="max-w-full max-h-full object-contain drop-shadow-md"
          />
        </div>

        {/* 右侧：家具信息 */}
        <div className="flex flex-col justify-center flex-1 overflow-hidden">
          <h2 className="font-extrabold text-lg uppercase leading-tight line-clamp-2 text-black">
            {currentItem.category?.category || 'FURNITURE'}
          </h2>
          <div className="flex flex-col gap-1.5 mt-2.5">
            {currentItem.category?.style && (
              <span className="bg-[#f5f5f5] text-[#484848] px-3 py-1 rounded-full text-[10px] font-bold w-fit truncate max-w-full border border-gray-200/60">
                Style: {currentItem.category.style}
              </span>
            )}
            {currentItem.category?.material && (
              <span className="bg-[#f5f5f5] text-[#484848] px-3 py-1 rounded-full text-[10px] font-bold w-fit truncate max-w-full border border-gray-200/60">
                Material: {currentItem.category.material}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. 分类推荐横向滚动展示 ================= */}
      <div className="p-5">
        <h3 className="font-bold text-[15px] mb-5 flex items-center gap-2">
          <Sparkles size={18} className="text-[#4490d2]" /> 相关推荐
        </h3>

        {!hasAnyRecommendations ? (
          <div className="text-gray-400 text-sm text-center py-8 bg-[#f5f5f5] rounded-xl font-medium">
            No similar items found in the current library.
          </div>
        ) : (
          <div>
            {renderRecommendRow('Same Category', recommendations.category)}
            {renderRecommendRow('Same Style', recommendations.style)}
            {renderRecommendRow('Same Material', recommendations.material)}
          </div>
        )}
      </div>
    </div>
  );
}

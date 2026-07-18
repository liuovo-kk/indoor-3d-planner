import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { FurnitureData } from '../../types';
import { fetchFurnitureList } from '../../api/furniture';
import { sendCreateFurniture } from '../../hooks/useCollabSync';
import { findValidPlacement } from '../../utils/placement';

export default function AddPanel() {
  const furnitureList = useStore((state) => state.furnitureList);
  const setFurnitureList = useStore((state) => state.setFurnitureList);
  const addPlacedItem = useStore((state) => state.addPlacedItem);

  const setActiveSidebarTab = useStore((state) => state.setActiveSidebarTab);
  const setCurrentRecommendItem = useStore(
    (state) => state.setCurrentRecommendItem,
  );

  const handleSelectAndPlace = (item: FurnitureData) => {
    const categoryName = item.category?.category?.toLowerCase() || '';
    const isCeilingItem =
      (categoryName.includes('lamp') ||
        categoryName.includes('light') ||
        categoryName.includes('chandelier') ||
        categoryName.includes('pendant')) &&
      !categoryName.includes('floor');

    // 从 store 获取当前房间状态，计算一个不碰撞的合法放置位置
    const state = useStore.getState();
    const position = findValidPlacement(
      [1.0, 1.0, 1.0], // 新家具默认估算尺寸（模型尚未加载，真实尺寸后续由 AsyncModel 更新）
      isCeilingItem,
      {
        width: state.roomWidth,
        depth: state.roomDepth,
        height: state.roomHeight,
      },
      state.placedItems.map((p) => ({
        position: p.position,
        size: p.size || [1, 1, 1],
        rotation: p.rotation,
      })),
      state.staticObstacles.map((o) => ({
        position: [o.x, o.y, o.z] as [number, number, number],
        size: [o.w, o.h, o.d] as [number, number, number],
      })),
    );

    const newItem = {
      ...item,
      instanceId: Math.random().toString(36).substring(7),
      position,
    };
    addPlacedItem(newItem);

    sendCreateFurniture(
      item.model_id,
      { x: newItem.position[0], y: newItem.position[1], z: newItem.position[2] },
      { x: 0, y: 0, z: 0 },
      newItem.instanceId,
    );

    // 🌟 2. 新增逻辑：设置当前推荐项，并跳转 Tab
    setCurrentRecommendItem(item);
    setActiveSidebarTab('recommend');
  };

  // --- 无限滚动状态 ---
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef(furnitureList);
  useEffect(() => {
    listRef.current = furnitureList;
  }, [furnitureList]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore)
            setPage((prevPage) => prevPage + 1);
        },
        { root: scrollContainerRef.current, rootMargin: '0px 0px 400px 0px' },
      );
      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  // --- 发请求逻辑 ---
  useEffect(() => {
    const loadData = async () => {
      if (!hasMore) return;
      setLoading(true);
      try {
        const newData = await fetchFurnitureList(page, 15);
        if (newData.length < 15) setHasMore(false);
        if (page === 1) setFurnitureList(newData);
        else setFurnitureList([...listRef.current, ...newData]);
      } catch (err) {
        console.error('加载列表失败', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [page]);

  return (
    <div className="flex flex-col h-full">
      {/* 搜索和分类栏 */}
      <div className="p-6 pb-3 shrink-0">
        <div className="bg-[#f5f5f5] rounded-3xl py-3 px-5 text-[#767676] text-base flex items-center gap-2">
          <Search size={18} /> 你在找什么家具？
        </div>
        <h2 className="text-base my-6 font-bold flex items-center gap-1 cursor-pointer w-fit hover:opacity-70 transition-opacity">
          卧室 <ChevronDown size={18} strokeWidth={2.5} className="mt-0.5" />
        </h2>
        <div className="flex flex-wrap gap-2">
          <span className="bg-[#f5f5f5] px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer hover:bg-gray-200">
            椅子
          </span>
          <span className="bg-[#f5f5f5] px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer hover:bg-gray-200">
            沙发
          </span>
          <span className="bg-[#f5f5f5] px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer hover:bg-gray-200">
            台灯
          </span>
          <span className="bg-[#f5f5f5] px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer hover:bg-gray-200">
            床
          </span>
        </div>
      </div>

      {/* 列表滚动区 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 relative"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#ccc transparent' }}
      >
        <div className="grid grid-cols-3 gap-4">
          {furnitureList.map((item: FurnitureData, index: number) => {
            const isLastElement = furnitureList.length === index + 1;
            return (
              <div
                key={item.model_id}
                ref={isLastElement ? lastItemRef : null}
                onClick={() => handleSelectAndPlace(item)}
                className="cursor-pointer p-2 rounded-lg transition-all duration-100 group hover:bg-gray-100 active:scale-95"
              >
                <div className="w-full aspect-square bg-[#f5f5f5] flex justify-center items-center rounded-md overflow-hidden mix-blend-multiply">
                  <img
                    src={item.image}
                    alt={item.category?.category}
                    className="max-w-[90%] max-h-[90%] object-contain group-hover:scale-105 transition-transform duration-300"
                    onError={(e: any) => {
                      e.target.src =
                        'https://via.placeholder.com/150?text=No+Image';
                    }}
                  />
                </div>
                <div className="mt-3">
                  <div className="font-bold text-xs mb-1 uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.category?.category || 'UNKNOWN'}
                  </div>
                  <div className="text-[#484848] text-xs truncate">
                    {[item.category?.material, item.category?.style]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {loading && (
          <div className="flex items-center justify-center py-6 text-gray-500 w-full col-span-3">
            <Loader2 className="animate-spin mr-2" size={20} />
            加载更多家具中...
          </div>
        )}
        {!hasMore && furnitureList.length > 0 && (
          <div className="text-center py-6 text-gray-400 text-sm w-full col-span-3 font-bold">
            —— 到底啦，没有更多模型了 ——
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/Sidebar.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import useStore from '../store/useStore';
import { FurnitureData } from '../types';
import {
  Search,
  PlusCircle,
  ClipboardList,
  Heart,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { fetchFurnitureList } from '../api/furniture';

// 左侧专属的 NavItem 组件 (保持不变)
interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  isActive?: boolean;
}

function NavItem({ icon, text, isActive }: NavItemProps) {
  return (
    <div
      className={`
      flex-1 flex justify-center items-center gap-2 h-full cursor-pointer font-bold transition-colors whitespace-nowrap text-base
      ${isActive ? 'border-b-2 border-black text-black' : 'text-[#767676] hover:text-black'}
    `}
    >
      {icon} {text}
    </div>
  );
}

export default function Sidebar() {
  const furnitureList = useStore((state) => state.furnitureList);
  const setFurnitureList = useStore((state) => state.setFurnitureList);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);

  const addPlacedItem = useStore((state) => state.addPlacedItem);

  const handleSelectAndPlace = (item: FurnitureData) => {
    // 直接在 3D 场景中心 [0, 0.5, 0] 生成该家具
    const newItem = {
      ...item,
      instanceId: Math.random().toString(36).substring(7), // 生成唯一 ID
      // 这里我稍微加了一点点随机偏移( -0.5 到 0.5 之间 )
      // 原因是如果严格都在 [0, 0.5, 0] 生成，连续点几次同样的家具，它们会完美重叠在一起，用户会以为没点上
      position: [Math.random() - 0.5, 0, Math.random() - 0.5] as [
        number,
        number,
        number,
      ],
    };

    addPlacedItem(newItem);
  };

  // ================= 无限滚动核心状态 =================
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true); // 是否还有更多数据

  // Pro-tip: 用一个 ref 来时刻保存最新的列表数据，解决 useEffect 的闭包陷阱
  const listRef = useRef(furnitureList);
  useEffect(() => {
    listRef.current = furnitureList;
  }, [furnitureList]);

  // 🌟 1. 新增：抓取滚动区域的容器
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ================= 交叉观察器 (绊马索) =================
  const observer = useRef<IntersectionObserver | null>(null);

  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return; // 正在加载时，不要重复触发
      if (observer.current) observer.current.disconnect(); // 断开上一个监听

      // 创建新的监听器
      observer.current = new IntersectionObserver(
        (entries) => {
          // 如果最后一个元素露脸了，并且还有更多数据，就页码 +1
          if (entries[0].isIntersecting && hasMore) {
            setPage((prevPage) => prevPage + 1);
          }
        },
        {
          // 把观察区域向下扩大 400px
          // 当目标元素距离视口底部还有 400px 时，提前触发
          root: scrollContainerRef.current,
          rootMargin: '0px 0px 400px 0px',
        },
      );

      if (node) observer.current.observe(node); // 把绊马索绑在最后一个节点上
    },
    [loading, hasMore],
  );

  // ================= 核心发请求逻辑 =================
  useEffect(() => {
    const loadData = async () => {
      if (!hasMore) return;

      setLoading(true);
      try {
        // 调用封装好的接口
        const newData = await fetchFurnitureList(page, 15); // 每次拉取 15 个

        // 如果后端返回的数据少于 15 个，说明到底了，以后不用再请求了
        if (newData.length < 15) {
          setHasMore(false);
        }

        if (page === 1) {
          setFurnitureList(newData); // 第一页，直接覆盖
        } else {
          // 第二页开始，把新数据拼接到老数据后面
          setFurnitureList([...listRef.current, ...newData]);
        }
      } catch (err) {
        console.error('加载列表失败', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [page]); // 只要 page 变了，就会自动触发请求！

  return (
    <aside
      className={`
      flex-shrink-0 bg-white border-gray-200 transition-all duration-300 ease-in-out flex flex-col z-20 overflow-hidden
      ${isSidebarOpen ? 'w-[500px] border-r' : 'w-0 border-none'}
    `}
    >
      <div className="w-[500px] flex flex-col h-full">
        {/* ================= 头部导航和搜索  ================= */}
        <div className="h-16 flex items-center px-2 border-b border-gray-200 flex-shrink-0">
          <NavItem
            icon={<PlusCircle size={20} strokeWidth={2.5} />}
            text="Add"
            isActive={true}
          />
          <NavItem
            icon={<ClipboardList size={20} strokeWidth={2.5} />}
            text="List"
          />
          <NavItem
            icon={<Heart size={20} strokeWidth={2.5} />}
            text="Favorites"
          />
        </div>

        <div className="p-6 pb-3 flex-shrink-0">
          <div className="bg-[#f5f5f5] rounded-3xl py-3 px-5 text-[#767676] text-base flex items-center gap-2">
            <Search size={18} /> What are you looking for?
          </div>
          <h2 className="text-base my-6 font-bold flex items-center gap-1 cursor-pointer w-fit hover:opacity-70 transition-opacity">
            Living room{' '}
            <ChevronDown size={18} strokeWidth={2.5} className="mt-[2px]" />
          </h2>
          <div className="flex flex-wrap gap-2">
            <span className="bg-[#f5f5f5] px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer hover:bg-gray-200">
              Armchairs
            </span>
            <span className="bg-[#f5f5f5] px-4 py-2 rounded-2xl text-sm font-bold cursor-pointer hover:bg-gray-200">
              Sofas
            </span>
          </div>
        </div>

        {/* ================= 商品列表区 (无限滚动) ================= */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 relative"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#ccc transparent' }}
        >
          <div className="grid grid-cols-3 gap-4">
            {furnitureList.map((item: FurnitureData, index: number) => {
              // 重点判断：是不是当前数组的最后一个元素
              const isLastElement = furnitureList.length === index + 1;

              return (
                <div
                  key={item.model_id}
                  // 如果是最后一个元素，就把“绊马索”挂在它身上
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

          {/* ================= 底部加载状态反馈 ================= */}
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
    </aside>
  );
}

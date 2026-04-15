// src/api/furniture.ts
import request from './request';
import { FurnitureData } from '../types';

// 定义接口的返回类型
interface FurnitureListResponse {
  data: FurnitureData[];
}

/**
 * 获取家具列表
 * @param page 当前页码
 * @param pageSize 每页数量
 */
export const fetchFurnitureList = async (
  page: number = 1,
  pageSize: number = 10,
) => {
  // Axios 会自动把 params 里的对象转换成 url 后面的问号参数
  // 泛型 <any, FurnitureListResponse> 会让这个函数的返回值自动带上类型提示
  const res = await request.get<any, FurnitureListResponse>(
    '/api/furniturelist',
    {
      params: {
        page: page,
        page_size: pageSize,
      },
    },
  );

  // 经过前面的拦截器，这里的 res 已经是真正的响应体了，再剥离一层拿到数组
  return res.data;
};

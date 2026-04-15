// src/api/model.ts
import request from './request'; // 引入你封装好的 Axios 实例

/**
 * 下载 GLB 模型的二进制流
 * @param modelId 模型的 ID (例如: "bed_002")
 * @returns 返回 Blob 格式的二进制数据
 */
export const fetchGlbModel = async (modelId: string) => {
  const response = await request.post(
    '/load_model_glb',
    { id: modelId, type: 'model' },
    {
      // 🌟 极其重要：明确告诉 axios 我们要的是二进制文件流！
      responseType: 'blob',
    },
  );

  // console.log('接口返回：', response);

  return response;
};

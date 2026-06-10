// src/api/request.ts
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';

// 创建 Axios 实例
const request: AxiosInstance = axios.create({
  baseURL: 'http://172.31.227.203:15000', // 统一接口前缀
  timeout: 10000, // 超时时间：10秒 (防止请求卡死)
});

// 请求拦截器 (Request Interceptor) - 发出去之前执行
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 如果以后项目加了登录，这里统一把 Token 塞进请求头里
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// 响应拦截器 (Response Interceptor) - 收到数据后执行
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;

    // 如果接口有标准的错误码规范
    // 在这里统一拦截弹窗提示
    /*
    if (res.code && res.code !== 0) {
      console.error(res.message || '业务报错');
      return Promise.reject(new Error(res.message || 'Error'));
    }
    */

    // 因为前面解构了 response.data，基于之前的代码，返回的结构里还有一层 `data`
    // 所以这里直接返回剥离后的结果
    return res;
  },
  (error: AxiosError) => {
    // 统一处理 HTTP 状态码灾难
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error('未登录或登录过期');
          break;
        case 403:
          console.error('没有权限访问');
          break;
        case 404:
          console.error('请求的接口不存在');
          break;
        case 500:
          console.error('服务器崩溃啦！');
          break;
        default:
          console.error('网络开了小差');
      }
    } else {
      console.error('网络连接断开，请检查网络');
    }
    return Promise.reject(error);
  },
);

export default request;

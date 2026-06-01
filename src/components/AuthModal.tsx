import { useState } from 'react';
import { X, Mail, Lock, User as UserIcon } from 'lucide-react';
import useStore from '../store/useStore';

export default function AuthModal() {
  const isAuthModalOpen = useStore((state) => state.isAuthModalOpen);
  const setAuthModalOpen = useStore((state) => state.setAuthModalOpen);
  const loginSuccess = useStore((state) => state.loginSuccess);

  const [isLogin, setIsLogin] = useState(true); // true 为登录，false 为注册
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🌟 这里替换为你真实的后端 API 请求 (axios.post)
      // 模拟网络请求延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (isLogin) {
        // 模拟登录成功
        console.log('登录参数:', { email, password });
        loginSuccess('mock_jwt_token_123', {
          id: 'u001',
          username: email.split('@')[0],
        });
      } else {
        // 模拟注册成功
        console.log('注册参数:', { username, email, password });
        loginSuccess('mock_jwt_token_456', { id: 'u002', username });
      }
    } catch (error) {
      alert('请求失败，请检查网络！');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 黑色半透明遮罩层 (z-index 要极高，挡住底下的 UI)
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
      {/* 弹窗主体 */}
      <div className="bg-white w-[400px] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* 右上角关闭按钮 */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* 顶部 Tab 切换 */}
        <div className="flex text-center font-bold text-base bg-gray-50 border-b border-gray-100">
          <div
            className={`flex-1 py-4 cursor-pointer transition-colors ${isLogin ? 'text-black bg-white border-t-[3px] border-black' : 'text-gray-400 hover:bg-gray-100 border-t-[3px] border-transparent'}`}
            onClick={() => setIsLogin(true)}
          >
            登录
          </div>
          <div
            className={`flex-1 py-4 cursor-pointer transition-colors ${!isLogin ? 'text-black bg-white border-t-[3px] border-black' : 'text-gray-400 hover:bg-gray-100 border-t-[3px] border-transparent'}`}
            onClick={() => setIsLogin(false)}
          >
            注册
          </div>
        </div>

        {/* 表单区域 */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900">
              {isLogin ? '欢迎回来' : '加入我们'}
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              {isLogin
                ? '登录后即可保存并访问您的 3D 空间设计。'
                : '创建账号，开启您的 3D 设计之旅。'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  required
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-black focus:bg-white transition-colors"
                />
              </div>
            )}

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                required
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="password"
                required
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 tracking-widest"
            >
              {loading ? '登录中...' : isLogin ? '登 录' : '注 册'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

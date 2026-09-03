import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/hooks';
import type { LoginRequest } from '@/types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<LoginRequest>({
    identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState({ identifier: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    clearError();
  };

  const validate = (): boolean => {
    const newErrors = { identifier: '', password: '' };
    let isValid = true;

    if (!formData.identifier) {
      newErrors.identifier = 'Email ou RA é obrigatório';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const success = await login(formData);
    if (success) {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <div className='flex justify-center items-center'>
            <div className='w-48'>
              <Logo />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Bem-vindo de volta</h2>
          <p className="text-sm text-gray-600">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-2">
              {error}
            </div>
          )}

          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
            <Input
              type="text"
              name="identifier"
              placeholder="Email ou RA"
              value={formData.identifier}
              onChange={handleChange}
              error={errors.identifier}
              disabled={loading}
              className="pl-11"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Digite sua senha"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={loading}
              className="pl-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-primary text-sm font-medium hover:text-primary-dark hover:underline transition-colors">
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
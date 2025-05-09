import React from 'react';
import Logo from '../components/comum/Logo';
import FormEntrar from '../components/entrar/FormEntrar';

const EntrarPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <h2 className="mt-4 text-2xl font-medium text-white">
            Bem-vindo de volta
          </h2>
          <p className="mt-2 text-gray-400">
            Entre com seus dados para acessar sua conta
          </p>
        </div>
        
        <div className="form-container">
          <FormEntrar />
        </div>
      </div>
    </div>
  );
};

export default EntrarPage;
import React from 'react';
import Logo from '../components/comum/Logo';
import FormCadastro from '../components/cadastro/FormCadastro';

const CadastrarPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <h2 className="mt-4 text-2xl font-medium text-white">
            Criar uma nova conta
          </h2>
          <p className="mt-2 text-gray-400">
            Preencha os dados abaixo para se cadastrar
          </p>
        </div>
        
        <div className="form-container">
          <FormCadastro />
        </div>
      </div>
    </div>
  );
};

export default CadastrarPage;
#!/usr/bin/env python3
"""
Teste de conexão SSH com a VPS
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def test_status():
    """Testar status do SSH Manager"""
    print("🔍 Testando status do SSH Manager...")
    try:
        response = requests.get(f"{BASE_URL}/status")
        if response.status_code == 200:
            data = response.json()
            print("✅ SSH Manager online")
            print(f"   Host: {data['config']['host']}")
            print(f"   Usuário: {data['config']['user']}")
            return True
        else:
            print(f"❌ Erro: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        return False

def test_connect():
    """Testar conexão SSH"""
    print("\n🔗 Testando conexão SSH...")
    try:
        response = requests.post(f"{BASE_URL}/connect")
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                print("✅ Conexão SSH estabelecida")
                return True
            else:
                print(f"❌ Falha na conexão: {data['message']}")
                return False
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_command():
    """Testar execução de comando"""
    print("\n🔧 Testando execução de comando...")
    try:
        payload = {"command": "whoami && pwd && date"}
        response = requests.post(f"{BASE_URL}/execute", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                print("✅ Comando executado com sucesso")
                print(f"   Output: {data['output'].strip()}")
                return True
            else:
                print(f"❌ Falha no comando: {data['error']}")
                return False
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def test_nfe_debug():
    """Testar debug da API NFe"""
    print("\n🐛 Testando debug da API NFe...")
    try:
        response = requests.get(f"{BASE_URL}/nfe/debug")
        if response.status_code == 200:
            data = response.json()
            print("✅ Debug executado")
            print(f"   Comandos executados: {len(data['results'])}")
            
            for i, result in enumerate(data['results']):
                if result['success']:
                    print(f"   ✅ Comando {i+1}: OK")
                else:
                    print(f"   ❌ Comando {i+1}: {result['error']}")
            return True
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Teste de Conexão SSH - VPS NFe")
    print("=" * 50)
    
    # Aguardar servidor iniciar
    print("⏳ Aguardando SSH Manager iniciar...")
    time.sleep(2)
    
    # Executar testes
    tests = [
        ("Status", test_status),
        ("Conexão", test_connect),
        ("Comando", test_command),
        ("Debug NFe", test_nfe_debug)
    ]
    
    results = []
    for name, test_func in tests:
        result = test_func()
        results.append((name, result))
    
    # Resumo
    print("\n" + "=" * 50)
    print("📊 RESUMO DOS TESTES:")
    for name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"   {name}: {status}")
    
    success_count = sum(1 for _, result in results if result)
    print(f"\n🎯 Resultado: {success_count}/{len(results)} testes passaram")
    
    if success_count == len(results):
        print("🎉 Todos os testes passaram! SSH Manager funcionando perfeitamente.")
    else:
        print("⚠️ Alguns testes falharam. Verifique a configuração.")

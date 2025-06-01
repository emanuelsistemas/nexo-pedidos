#!/usr/bin/env python3
"""
SSH Manager para VPS - Sistema NFe/NFC-e
Permite conexão direta e execução de comandos na VPS
"""

import os
import sys
import json
import time
import paramiko
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
CORS(app)

class VPSManager:
    def __init__(self):
        self.host = os.getenv('VPS_HOST')
        self.port = int(os.getenv('VPS_PORT', 22))
        self.user = os.getenv('VPS_USER')
        self.password = os.getenv('VPS_PASSWORD')
        self.key_path = os.getenv('VPS_KEY_PATH')
        self.timeout = int(os.getenv('SSH_TIMEOUT', 30))
        self.debug = os.getenv('DEBUG_MODE', 'true').lower() == 'true'
        
        self.api_dir = os.getenv('API_DIR', '/var/www/html')
        self.nginx_log_dir = os.getenv('NGINX_LOG_DIR', '/var/log/nginx')
        self.php_log_dir = os.getenv('PHP_LOG_DIR', '/var/log')
        
        self.client = None
        
    def connect(self):
        """Conectar via SSH"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            if self.debug:
                print(f"🔗 Conectando em {self.user}@{self.host}:{self.port}")
            
            # Conectar com senha ou chave
            if self.key_path and os.path.exists(self.key_path):
                self.client.connect(
                    hostname=self.host,
                    port=self.port,
                    username=self.user,
                    key_filename=self.key_path,
                    timeout=self.timeout
                )
            else:
                self.client.connect(
                    hostname=self.host,
                    port=self.port,
                    username=self.user,
                    password=self.password,
                    timeout=self.timeout
                )
            
            if self.debug:
                print("✅ Conexão SSH estabelecida")
            return True
            
        except Exception as e:
            if self.debug:
                print(f"❌ Erro na conexão SSH: {e}")
            return False
    
    def disconnect(self):
        """Desconectar SSH"""
        if self.client:
            self.client.close()
            self.client = None
            if self.debug:
                print("🔌 Conexão SSH fechada")
    
    def execute_command(self, command, timeout=30):
        """Executar comando via SSH"""
        if not self.client:
            if not self.connect():
                return {"success": False, "error": "Falha na conexão SSH"}
        
        try:
            if self.debug:
                print(f"🔧 Executando: {command}")
            
            stdin, stdout, stderr = self.client.exec_command(command, timeout=timeout)
            
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            exit_code = stdout.channel.recv_exit_status()
            
            result = {
                "success": exit_code == 0,
                "output": output,
                "error": error,
                "exit_code": exit_code,
                "command": command,
                "timestamp": datetime.now().isoformat()
            }
            
            if self.debug:
                print(f"📤 Resultado: {exit_code} | Output: {len(output)} chars | Error: {len(error)} chars")
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "command": command,
                "timestamp": datetime.now().isoformat()
            }

# Instância global do manager
vps = VPSManager()

@app.route('/api/status', methods=['GET'])
def api_status():
    """Status da conexão SSH"""
    return jsonify({
        "status": "SSH Manager Online",
        "timestamp": datetime.now().isoformat(),
        "config": {
            "host": vps.host,
            "port": vps.port,
            "user": vps.user,
            "connected": vps.client is not None
        }
    })

@app.route('/api/connect', methods=['POST'])
def api_connect():
    """Conectar na VPS"""
    success = vps.connect()
    return jsonify({
        "success": success,
        "message": "Conectado com sucesso" if success else "Falha na conexão",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/disconnect', methods=['POST'])
def api_disconnect():
    """Desconectar da VPS"""
    vps.disconnect()
    return jsonify({
        "success": True,
        "message": "Desconectado",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/execute', methods=['POST'])
def api_execute():
    """Executar comando na VPS"""
    data = request.get_json()
    command = data.get('command', '')
    timeout = data.get('timeout', 30)
    
    if not command:
        return jsonify({"success": False, "error": "Comando não fornecido"})
    
    result = vps.execute_command(command, timeout)
    return jsonify(result)

@app.route('/api/logs/nginx', methods=['GET'])
def api_nginx_logs():
    """Ver logs do Nginx"""
    lines = request.args.get('lines', 50)
    log_type = request.args.get('type', 'error')  # error, access
    
    log_file = f"{vps.nginx_log_dir}/{log_type}.log"
    command = f"tail -{lines} {log_file}"
    
    result = vps.execute_command(command)
    return jsonify(result)

@app.route('/api/logs/php', methods=['GET'])
def api_php_logs():
    """Ver logs do PHP"""
    lines = request.args.get('lines', 50)
    
    # Tentar diferentes locais de log do PHP
    commands = [
        f"tail -{lines} /var/log/php8.3-fpm.log",
        f"tail -{lines} /var/log/php-fpm.log",
        f"tail -{lines} /var/log/php/error.log"
    ]
    
    for command in commands:
        result = vps.execute_command(command)
        if result["success"]:
            return jsonify(result)
    
    return jsonify({"success": False, "error": "Logs do PHP não encontrados"})

@app.route('/api/nfe/debug', methods=['GET'])
def api_nfe_debug():
    """Debug específico da API NFe"""
    commands = [
        f"ls -la {vps.api_dir}",
        f"ls -la {vps.api_dir}/api",
        "php -v",
        "nginx -v",
        "systemctl status nginx",
        "systemctl status php8.3-fpm"
    ]
    
    results = []
    for command in commands:
        result = vps.execute_command(command)
        results.append(result)
    
    return jsonify({
        "success": True,
        "results": results,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("🚀 SSH Manager para VPS - Sistema NFe/NFC-e")
    print("📋 Configuração:")
    print(f"   Host: {vps.host}")
    print(f"   Porta: {vps.port}")
    print(f"   Usuário: {vps.user}")
    print(f"   API Dir: {vps.api_dir}")
    print("")
    print("🌐 Servidor rodando em: http://localhost:5000")
    print("📖 Endpoints disponíveis:")
    print("   GET  /api/status - Status da conexão")
    print("   POST /api/connect - Conectar na VPS")
    print("   POST /api/execute - Executar comando")
    print("   GET  /api/logs/nginx - Logs do Nginx")
    print("   GET  /api/logs/php - Logs do PHP")
    print("   GET  /api/nfe/debug - Debug da API NFe")
    print("")
    
    app.run(host='0.0.0.0', port=5000, debug=True)

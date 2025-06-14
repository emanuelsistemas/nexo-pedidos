# 🔧 TROUBLESHOOTING AVANÇADO - NEXO PEDIDOS

## 📋 ÍNDICE
- [Problemas de Biblioteca](#problemas-de-biblioteca)
- [Erros de Certificado](#erros-de-certificado)
- [Problemas de Numeração](#problemas-de-numeração)
- [Erros SEFAZ](#erros-sefaz)
- [Problemas de Banco](#problemas-de-banco)
- [Debug Avançado](#debug-avançado)

---

## 📚 PROBLEMAS DE BIBLIOTECA

### **❌ Erro: "Class 'NFePHP\NFe\Make' not found"**
```bash
# Diagnóstico
cd backend
composer show | grep nfephp

# Solução
composer require nfephp-org/sped-nfe:^5.1.27
composer dump-autoload

# Verificação
php -r "require 'vendor/autoload.php'; echo 'Autoload OK';"
```

### **❌ Erro: "Call to undefined method"**
```bash
# Verificar versão exata
composer show nfephp-org/sped-nfe

# Deve mostrar: 5.1.27
# Se diferente, corrigir:
composer require nfephp-org/sped-nfe:5.1.27 --no-update
composer update nfephp-org/sped-nfe
```

### **❌ Erro: "Namespace not found"**
```php
// Verificar imports obrigatórios
use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\NFe\Common\Standardize;
use NFePHP\Common\Certificate;

// Verificar autoload
require_once __DIR__ . '/vendor/autoload.php';
```

---

## 🔐 ERROS DE CERTIFICADO

### **❌ Erro: "Certificado não encontrado"**
```bash
# Verificar estrutura
ls -la backend/storage/certificados/
# Deve mostrar: drwx------ www-data www-data

# Verificar empresa específica
ls -la backend/storage/certificados/{empresa_id}/
# Deve mostrar: certificado.pfx

# Corrigir permissões
sudo chown -R www-data:www-data backend/storage/certificados/
sudo chmod -R 700 backend/storage/certificados/
```

### **❌ Erro: "Certificado inválido ou senha incorreta"**
```bash
# Testar certificado manualmente
openssl pkcs12 -info -in certificado.pfx -noout
# Deve pedir senha e mostrar informações

# Verificar no PHP
php -r "
$cert = file_get_contents('certificado.pfx');
$senha = 'sua_senha';
if (openssl_pkcs12_read(\$cert, \$certs, \$senha)) {
    echo 'Certificado válido';
} else {
    echo 'Certificado inválido: ' . openssl_error_string();
}
"
```

### **❌ Erro: "Certificado expirado"**
```php
// Verificar validade do certificado
$certificadoContent = file_get_contents($certificadoPath);
openssl_pkcs12_read($certificadoContent, $certs, $senha);

$certInfo = openssl_x509_parse($certs['cert']);
$validTo = $certInfo['validTo_time_t'];

if (time() > $validTo) {
    throw new Exception('Certificado expirado em ' . date('d/m/Y', $validTo));
}
```

---

## 🔢 PROBLEMAS DE NUMERAÇÃO

### **❌ Erro: "Numeração duplicada"**
```sql
-- Verificar duplicatas
SELECT numero_documento, COUNT(*) 
FROM pdv 
WHERE empresa_id = 'uuid-empresa' 
  AND modelo_documento = 65 
  AND numero_documento IS NOT NULL
GROUP BY numero_documento 
HAVING COUNT(*) > 1;

-- Corrigir duplicatas
UPDATE pdv 
SET numero_documento = (
    SELECT COALESCE(MAX(numero_documento), 0) + ROW_NUMBER() OVER (ORDER BY created_at)
    FROM pdv p2 
    WHERE p2.empresa_id = pdv.empresa_id 
      AND p2.modelo_documento = 65
)
WHERE empresa_id = 'uuid-empresa' 
  AND modelo_documento = 65 
  AND numero_documento IN (SELECT numero_documento FROM duplicatas);
```

### **❌ Erro: "Número não reservado"**
```typescript
// Debug da função de geração
const gerarProximoNumeroNFCe = async (empresaId: string): Promise<number> => {
    console.log('🔍 Gerando número para empresa:', empresaId);
    
    const { data, error } = await supabase
        .from('pdv')
        .select('numero_documento')
        .eq('empresa_id', empresaId)
        .eq('modelo_documento', 65)
        .not('numero_documento', 'is', null)
        .order('numero_documento', { ascending: false })
        .limit(1);

    console.log('🔍 Query result:', { data, error });

    if (error) {
        console.error('❌ Erro na query:', error);
        throw new Error('Erro ao buscar último número');
    }

    let proximoNumero = 1;
    if (data && data.length > 0 && data[0].numero_documento) {
        proximoNumero = data[0].numero_documento + 1;
    }

    console.log('✅ Próximo número gerado:', proximoNumero);
    return proximoNumero;
};
```

### **❌ Erro: "Sequência quebrada"**
```sql
-- Encontrar buracos na sequência
WITH sequencia AS (
    SELECT generate_series(1, (SELECT MAX(numero_documento) FROM pdv WHERE empresa_id = 'uuid' AND modelo_documento = 65)) AS numero
),
faltando AS (
    SELECT s.numero
    FROM sequencia s
    LEFT JOIN pdv p ON s.numero = p.numero_documento 
        AND p.empresa_id = 'uuid' 
        AND p.modelo_documento = 65
    WHERE p.numero_documento IS NULL
)
SELECT * FROM faltando ORDER BY numero;

-- Resequenciar se necessário
UPDATE pdv 
SET numero_documento = ROW_NUMBER() OVER (ORDER BY created_at)
WHERE empresa_id = 'uuid' AND modelo_documento = 65;
```

---

## 🌐 ERROS SEFAZ

### **❌ Erro: "Rejeição 204 - Duplicidade de NF-e"**
```php
// Verificar se número já foi usado no SEFAZ
$consultaResponse = $tools->sefazConsultaChave($chave);
$std = $standardize->toStd($consultaResponse);

if ($std->cStat == '100') {
    // NFe já autorizada no SEFAZ
    throw new Exception("Número {$numero} já foi utilizado no SEFAZ");
}

// Gerar novo número
$novoNumero = $this->gerarProximoNumero($empresaId);
```

### **❌ Erro: "Rejeição 215 - Falha no schema XML"**
```php
// Validar XML antes de enviar
$xmlString = $make->getXML();
$dom = new DOMDocument();
$dom->loadXML($xmlString);

// Verificar elementos obrigatórios
$xpath = new DOMXPath($dom);
$elementos = [
    '//infNFe' => 'Informações da NFe',
    '//emit' => 'Dados do emitente',
    '//det' => 'Detalhes dos produtos'
];

foreach ($elementos as $path => $nome) {
    if ($xpath->query($path)->length == 0) {
        throw new Exception("Elemento obrigatório ausente: {$nome}");
    }
}
```

### **❌ Erro: "Timeout na comunicação"**
```php
// Configurar timeout adequado
$tools->setEnvironment($ambiente);
$tools->setDebugMode(true);

// Aumentar timeout para conexões lentas
ini_set('default_socket_timeout', 60);
ini_set('max_execution_time', 120);

// Retry automático
$maxTentativas = 3;
$tentativa = 0;

while ($tentativa < $maxTentativas) {
    try {
        $response = $tools->sefazEnviaLote([$xmlString], $idLote);
        break;
    } catch (Exception $e) {
        $tentativa++;
        if ($tentativa >= $maxTentativas) {
            throw new Exception("Falha após {$maxTentativas} tentativas: " . $e->getMessage());
        }
        sleep(2); // Aguardar 2 segundos antes de tentar novamente
    }
}
```

---

## 🗄️ PROBLEMAS DE BANCO

### **❌ Erro: "RLS Policy violation"**
```sql
-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('pdv', 'pdv_itens', 'empresas');

-- Desabilitar RLS temporariamente para debug
ALTER TABLE pdv DISABLE ROW LEVEL SECURITY;
-- Lembrar de reabilitar depois
ALTER TABLE pdv ENABLE ROW LEVEL SECURITY;
```

### **❌ Erro: "Foreign key constraint"**
```sql
-- Verificar referências
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'pdv_itens';

-- Verificar se empresa existe
SELECT id FROM empresas WHERE id = 'uuid-empresa';

-- Verificar se produto existe
SELECT id FROM produtos WHERE id = 'uuid-produto';
```

### **❌ Erro: "Connection timeout"**
```typescript
// Configurar timeout do Supabase
const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
        db: {
            schema: 'public',
        },
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        },
        global: {
            headers: {
                'x-my-custom-header': 'nexo-pedidos',
            },
        },
        // Configurar timeout
        realtime: {
            timeout: 30000,
        }
    }
);
```

---

## 🔍 DEBUG AVANÇADO

### **Payload Search Technique:**
```javascript
// Frontend - Interceptar todas as requisições
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('🔍 FETCH REQUEST:', args);
    return originalFetch.apply(this, args).then(response => {
        console.log('🔍 FETCH RESPONSE:', response);
        return response;
    });
};

// Buscar payload específico
const searchPayload = (searchTerm) => {
    const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
    return logs.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
    );
};
```

### **PHP Debug Avançado:**
```php
// Habilitar debug detalhado
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php_errors.log');

// Logger customizado
class DebugLogger {
    public static function log($message, $data = null) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[{$timestamp}] {$message}";
        
        if ($data !== null) {
            $logEntry .= "\nData: " . json_encode($data, JSON_PRETTY_PRINT);
        }
        
        error_log($logEntry);
        
        // Salvar também em arquivo específico
        file_put_contents(
            '/var/log/nexo_debug.log', 
            $logEntry . "\n\n", 
            FILE_APPEND | LOCK_EX
        );
    }
}

// Usar em pontos críticos
DebugLogger::log('Iniciando emissão NFC-e', [
    'empresa_id' => $empresaId,
    'numero' => $numero,
    'ambiente' => $ambiente
]);
```

### **Monitoramento em Tempo Real:**
```bash
# Terminal 1 - Logs Nginx
sudo tail -f /var/log/nginx/error.log | grep -i "nexo\|nfe\|error"

# Terminal 2 - Logs PHP
sudo tail -f /var/log/php7.4-fpm.log | grep -i "error\|warning"

# Terminal 3 - Logs customizados
tail -f /var/log/nexo_debug.log

# Terminal 4 - Monitorar arquivos gerados
watch -n 1 'find backend/storage/ -name "*.xml" -o -name "*.pdf" | tail -10'
```

### **Verificação de Integridade:**
```bash
#!/bin/bash
# Script de verificação completa

echo "🔍 Verificando integridade do sistema..."

# 1. Verificar dependências
echo "📦 Verificando dependências..."
cd backend
composer validate
composer show nfephp-org/sped-nfe | grep "versions"

# 2. Verificar permissões
echo "🔐 Verificando permissões..."
ls -la storage/certificados/
ls -la storage/xml/
ls -la storage/pdf/

# 3. Verificar configuração Nginx
echo "🌐 Verificando Nginx..."
sudo nginx -t

# 4. Verificar PHP
echo "🐘 Verificando PHP..."
php -v
php -m | grep -E "(curl|xml|mbstring|soap|zip|gd|json)"

# 5. Testar conectividade Supabase
echo "🗄️ Testando Supabase..."
curl -s -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/empresas?select=id&limit=1"

echo "✅ Verificação concluída!"
```

### **Backup e Restore de Debug:**
```bash
# Backup de configuração
tar -czf nexo_config_backup.tar.gz \
    .env \
    backend/composer.json \
    backend/composer.lock \
    /etc/nginx/sites-available/nexo-backend

# Backup de certificados (criptografado)
tar -czf certificados_backup.tar.gz backend/storage/certificados/
gpg --symmetric --cipher-algo AES256 certificados_backup.tar.gz

# Backup de logs
tar -czf logs_backup.tar.gz \
    /var/log/nginx/ \
    /var/log/php7.4-fpm.log \
    /var/log/nexo_debug.log

# Restore rápido
tar -xzf nexo_config_backup.tar.gz
sudo systemctl reload nginx php7.4-fpm
```

---

## 🚨 CHECKLIST DE EMERGÊNCIA

### **Sistema não responde:**
- [ ] Verificar status Nginx: `sudo systemctl status nginx`
- [ ] Verificar status PHP-FPM: `sudo systemctl status php7.4-fpm`
- [ ] Verificar logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Reiniciar serviços: `sudo systemctl restart nginx php7.4-fpm`

### **NFe/NFC-e não emite:**
- [ ] Verificar certificado: `ls -la backend/storage/certificados/`
- [ ] Testar certificado: `openssl pkcs12 -info -in certificado.pfx -noout`
- [ ] Verificar biblioteca: `composer show nfephp-org/sped-nfe`
- [ ] Verificar logs: `tail -f /var/log/nexo_debug.log`

### **Banco não conecta:**
- [ ] Verificar .env: `cat .env | grep SUPABASE`
- [ ] Testar conectividade: `curl -s $SUPABASE_URL/rest/v1/`
- [ ] Verificar RLS: `SELECT * FROM pg_policies WHERE tablename = 'pdv';`
- [ ] Verificar usuário: `SELECT * FROM auth.users LIMIT 1;`

### **Frontend não carrega:**
- [ ] Verificar build: `ls -la dist/`
- [ ] Verificar Nginx: `sudo nginx -t`
- [ ] Verificar console: F12 > Console
- [ ] Rebuild: `npm run build && sudo systemctl reload nginx`

---

**🎯 Este guia de troubleshooting cobre os problemas mais comuns e suas soluções definitivas.**

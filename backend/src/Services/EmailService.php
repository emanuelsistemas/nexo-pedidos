<?php

namespace NexoNFe\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    private $mailer;
    private $config;

    public function __construct()
    {
        $this->loadConfig();
        $this->setupMailer();
    }

    /**
     * Carregar configurações de email do .env
     */
    private function loadConfig()
    {
        // Carregar variáveis do .env se existir
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                    list($key, $value) = explode('=', $line, 2);
                    $_ENV[trim($key)] = trim($value);
                }
            }
        }

        $this->config = [
            'host' => $_ENV['MAIL_HOST'] ?? 'smtp.gmail.com',
            'port' => $_ENV['MAIL_PORT'] ?? 587,
            'username' => $_ENV['MAIL_USERNAME'] ?? '',
            'password' => $_ENV['MAIL_PASSWORD'] ?? '',
            'encryption' => $_ENV['MAIL_ENCRYPTION'] ?? 'tls',
            'from_address' => $_ENV['MAIL_FROM_ADDRESS'] ?? '',
            'from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'Sistema Nexo NFe'
        ];
    }

    /**
     * Configurar PHPMailer
     */
    private function setupMailer()
    {
        $this->mailer = new PHPMailer(true);

        try {
            // Configurações do servidor SMTP
            $this->mailer->isSMTP();
            $this->mailer->Host = $this->config['host'];
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = $this->config['username'];
            $this->mailer->Password = $this->config['password'];
            $this->mailer->SMTPSecure = $this->config['encryption'];
            $this->mailer->Port = $this->config['port'];

            // Configurações de charset
            $this->mailer->CharSet = 'UTF-8';
            $this->mailer->Encoding = 'base64';

            // Configurações de debug (desabilitado por padrão)
            $this->mailer->SMTPDebug = 0;
            $this->mailer->Debugoutput = 'error_log';

            // Configurar remetente padrão
            $this->mailer->setFrom($this->config['from_address'], $this->config['from_name']);

        } catch (Exception $e) {
            error_log("Erro ao configurar PHPMailer: " . $e->getMessage());
            throw new \Exception("Erro na configuração do email: " . $e->getMessage());
        }
    }

    /**
     * Enviar email simples (teste)
     */
    public function enviarEmailTeste($destinatario, $assunto = 'Teste do Sistema Nexo NFe')
    {
        try {
            // Limpar destinatários anteriores
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();

            // Configurar destinatário
            $this->mailer->addAddress($destinatario);

            // Configurar email
            $this->mailer->isHTML(true);
            $this->mailer->Subject = $assunto;
            $this->mailer->Body = $this->getEmailTesteTemplate();

            // Enviar
            $resultado = $this->mailer->send();

            return [
                'success' => true,
                'message' => 'Email de teste enviado com sucesso!',
                'destinatario' => $destinatario
            ];

        } catch (Exception $e) {
            error_log("Erro ao enviar email de teste: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'destinatario' => $destinatario,
                'debug_info' => [
                    'host' => $this->config['host'],
                    'port' => $this->config['port'],
                    'username' => $this->config['username'],
                    'password_length' => strlen($this->config['password']),
                    'password_preview' => substr($this->config['password'], 0, 4) . '...',
                    'from_address' => $this->config['from_address']
                ]
            ];
        }
    }

    /**
     * Enviar NFe por email (XML + PDF)
     */
    public function enviarNFe($destinatario, $nfeData, $xmlPath = null, $pdfPath = null)
    {
        try {
            // Limpar destinatários e anexos anteriores
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();

            // Se não foram fornecidos os caminhos, tentar localizar automaticamente
            if (!$xmlPath || !$pdfPath) {
                $arquivos = $this->localizarArquivosNFe($nfeData);
                $xmlPath = $xmlPath ?: $arquivos['xml'];
                $pdfPath = $pdfPath ?: $arquivos['pdf'];
            }

            // Configurar destinatário
            $this->mailer->addAddress($destinatario);

            // Configurar assunto
            $assunto = $this->gerarAssuntoEmail($nfeData);
            $this->mailer->Subject = $assunto;

            // Configurar corpo do email usando templates
            $this->mailer->isHTML(true);
            $this->mailer->Body = $this->carregarTemplateHtml($nfeData);
            $this->mailer->AltBody = $this->carregarTemplateTexto($nfeData);

            // Anexar arquivos se existirem
            $anexos = [];
            if ($xmlPath && file_exists($xmlPath)) {
                $nomeXml = "NFe-{$nfeData['numero']}-{$nfeData['serie']}.xml";
                $this->mailer->addAttachment($xmlPath, $nomeXml);
                $anexos[] = $nomeXml;
            }

            if ($pdfPath && file_exists($pdfPath)) {
                $nomePdf = "DANFE-{$nfeData['numero']}-{$nfeData['serie']}.pdf";
                $this->mailer->addAttachment($pdfPath, $nomePdf);
                $anexos[] = $nomePdf;
            }

            // Enviar
            $resultado = $this->mailer->send();

            return [
                'success' => true,
                'message' => 'NFe enviada por email com sucesso!',
                'destinatario' => $destinatario,
                'nfe_numero' => $nfeData['numero'],
                'anexos' => $anexos,
                'arquivos_localizados' => [
                    'xml' => $xmlPath,
                    'pdf' => $pdfPath
                ]
            ];

        } catch (Exception $e) {
            error_log("Erro ao enviar NFe por email: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'destinatario' => $destinatario,
                'arquivos_tentados' => [
                    'xml' => $xmlPath,
                    'pdf' => $pdfPath
                ]
            ];
        }
    }

    /**
     * Localizar arquivos XML e PDF da NFe automaticamente
     */
    private function localizarArquivosNFe($nfeData)
    {
        $chave = $nfeData['chave'] ?? '';
        $empresaId = $nfeData['empresa_id'] ?? '';

        // Determinar ambiente e modelo baseado na chave NFe
        $ambiente = 'homologacao'; // Padrão
        $modelo = '55'; // Padrão NFe

        if (strlen($chave) === 44) {
            // Posição 20 indica ambiente (1=produção, 2=homologação)
            $ambiente_codigo = substr($chave, 20, 1);
            $ambiente = ($ambiente_codigo === '1') ? 'producao' : 'homologacao';

            // Posição 21-22 indica modelo (55=NFe, 65=NFCe)
            $modelo_codigo = substr($chave, 20, 2);
            $modelo = (substr($modelo_codigo, 1, 2) === '65') ? '65' : '55';
        }

        // Extrair ano e mês da chave NFe (posições 2-5 = AAMM)
        $ano_mes = substr($chave, 2, 4);
        $ano = '20' . substr($ano_mes, 0, 2);
        $mes = substr($ano_mes, 2, 2);

        // Construir caminhos baseado na estrutura de storage
        $base_path = "/root/nexo/nexo-pedidos/storage";

        $xml_path = "{$base_path}/xml/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave}-nfe.xml";
        $pdf_path = "{$base_path}/pdf/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave}-danfe.pdf";

        return [
            'xml' => $xml_path,
            'pdf' => $pdf_path,
            'ambiente' => $ambiente,
            'modelo' => $modelo,
            'ano' => $ano,
            'mes' => $mes
        ];
    }

    /**
     * Gerar assunto do email
     */
    private function gerarAssuntoEmail($nfeData)
    {
        $numero = $nfeData['numero'] ?? 'S/N';
        $serie = $nfeData['serie'] ?? '1';
        $empresa = $nfeData['empresa_nome'] ?? 'Sistema Nexo';

        return "📄 NFe nº {$numero}/{$serie} - {$empresa}";
    }

    /**
     * Carregar template HTML
     */
    private function carregarTemplateHtml($nfeData)
    {
        $templatePath = __DIR__ . '/../../templates/email-nfe.html';

        if (file_exists($templatePath)) {
            $template = file_get_contents($templatePath);
            return $this->substituirVariaveisTemplate($template, $nfeData);
        }

        // Fallback para template inline
        return $this->getNFeEmailTemplate($nfeData);
    }

    /**
     * Carregar template de texto
     */
    private function carregarTemplateTexto($nfeData)
    {
        $templatePath = __DIR__ . '/../../templates/email-nfe.txt';

        if (file_exists($templatePath)) {
            $template = file_get_contents($templatePath);
            return $this->substituirVariaveisTemplate($template, $nfeData);
        }

        // Fallback para template simples
        return $this->gerarEmailTextoSimples($nfeData);
    }

    /**
     * Substituir variáveis no template
     */
    private function substituirVariaveisTemplate($template, $nfeData)
    {
        $variaveis = [
            '{{cliente_nome}}' => $nfeData['cliente_nome'] ?? 'Cliente',
            '{{numero_nfe}}' => $nfeData['numero'] ?? 'S/N',
            '{{serie_nfe}}' => $nfeData['serie'] ?? '1',
            '{{data_emissao}}' => date('d/m/Y'),
            '{{valor_total}}' => number_format($nfeData['valor_total'] ?? 0, 2, ',', '.'),
            '{{chave_nfe}}' => $nfeData['chave'] ?? '',
            '{{empresa_nome}}' => $nfeData['empresa_nome'] ?? 'Sistema Nexo',
            '{{empresa_endereco}}' => $nfeData['empresa_endereco'] ?? '',
            '{{empresa_cnpj}}' => $nfeData['empresa_cnpj'] ?? '',
            '{{empresa_telefone}}' => $nfeData['empresa_telefone'] ?? '',
            '{{empresa_email}}' => $nfeData['empresa_email'] ?? '',
            '{{empresa_website}}' => $nfeData['empresa_website'] ?? ''
        ];

        return str_replace(array_keys($variaveis), array_values($variaveis), $template);
    }

    /**
     * Gerar email de texto simples (fallback)
     */
    private function gerarEmailTextoSimples($nfeData)
    {
        $numero = $nfeData['numero'] ?? 'S/N';
        $serie = $nfeData['serie'] ?? '1';
        $cliente = $nfeData['cliente_nome'] ?? 'Cliente';
        $empresa = $nfeData['empresa_nome'] ?? 'Sistema Nexo';
        $valor = number_format($nfeData['valor_total'] ?? 0, 2, ',', '.');

        return "
NOTA FISCAL ELETRÔNICA

Olá, {$cliente}!

Segue em anexo a Nota Fiscal Eletrônica:

Número: {$numero}
Série: {$serie}
Data: " . date('d/m/Y') . "
Valor: R$ {$valor}

Arquivos em anexo:
- XML da NFe (arquivo fiscal)
- DANFE em PDF (documento auxiliar)

Atenciosamente,
{$empresa}

---
Este email foi enviado automaticamente pelo Sistema Nexo NFe.
        ";
    }

    /**
     * Template para email de teste
     */
    private function getEmailTesteTemplate()
    {
        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Teste do Sistema Nexo NFe</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">🚀 Teste do Sistema de Email</h2>
                
                <p>Olá!</p>
                
                <p>Este é um email de teste do <strong>Sistema Nexo NFe</strong>.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #059669;">✅ Configuração Funcionando!</h3>
                    <p style="margin-bottom: 0;">
                        Se você recebeu este email, significa que as configurações de SMTP estão corretas 
                        e o sistema está pronto para enviar NFes por email.
                    </p>
                </div>
                
                <p><strong>Próximos passos:</strong></p>
                <ul>
                    <li>✅ Configuração de email funcionando</li>
                    <li>🔄 Implementar envio automático de NFe</li>
                    <li>📧 Testar envio de XML e DANFE</li>
                </ul>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <p style="font-size: 12px; color: #6b7280;">
                    Este email foi enviado automaticamente pelo Sistema Nexo NFe.<br>
                    Data/Hora: ' . date('d/m/Y H:i:s') . '
                </p>
            </div>
        </body>
        </html>';
    }

    /**
     * Template para email de NFe
     */
    private function getNFeEmailTemplate($nfeData)
    {
        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>NFe nº ' . $nfeData['numero'] . '</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">📄 Nota Fiscal Eletrônica</h2>
                
                <p>Prezado(a) <strong>' . ($nfeData['cliente_nome'] ?? 'Cliente') . '</strong>,</p>
                
                <p>Segue em anexo a Nota Fiscal Eletrônica emitida:</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #059669;">Dados da NFe</h3>
                    <p><strong>Número:</strong> ' . $nfeData['numero'] . '</p>
                    <p><strong>Série:</strong> ' . ($nfeData['serie'] ?? '1') . '</p>
                    <p><strong>Data de Emissão:</strong> ' . date('d/m/Y') . '</p>
                    <p><strong>Valor Total:</strong> R$ ' . number_format($nfeData['valor_total'] ?? 0, 2, ',', '.') . '</p>
                    <p style="margin-bottom: 0;"><strong>Empresa:</strong> ' . ($nfeData['empresa_nome'] ?? 'Nexo') . '</p>
                </div>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #d97706;">📎 Arquivos em Anexo</h4>
                    <ul style="margin-bottom: 0;">
                        <li><strong>XML da NFe:</strong> Arquivo fiscal obrigatório</li>
                        <li><strong>DANFE (PDF):</strong> Documento auxiliar para impressão</li>
                    </ul>
                </div>
                
                <p>Em caso de dúvidas, entre em contato conosco.</p>
                
                <p>Atenciosamente,<br>
                <strong>' . ($nfeData['empresa_nome'] ?? 'Sistema Nexo NFe') . '</strong></p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <p style="font-size: 12px; color: #6b7280;">
                    Este email foi enviado automaticamente pelo Sistema Nexo NFe.<br>
                    Data/Hora: ' . date('d/m/Y H:i:s') . '
                </p>
            </div>
        </body>
        </html>';
    }

    /**
     * Habilitar debug do SMTP
     */
    public function enableDebug()
    {
        $this->mailer->SMTPDebug = SMTP::DEBUG_SERVER;
    }

    /**
     * Verificar configurações
     */
    public function verificarConfiguracao()
    {
        $problemas = [];

        if (empty($this->config['username'])) {
            $problemas[] = 'MAIL_USERNAME não configurado';
        }

        if (empty($this->config['password'])) {
            $problemas[] = 'MAIL_PASSWORD não configurado';
        }

        if (empty($this->config['from_address'])) {
            $problemas[] = 'MAIL_FROM_ADDRESS não configurado';
        }

        return [
            'configurado' => empty($problemas),
            'problemas' => $problemas,
            'config' => [
                'host' => $this->config['host'],
                'port' => $this->config['port'],
                'encryption' => $this->config['encryption'],
                'from_name' => $this->config['from_name']
            ]
        ];
    }
}

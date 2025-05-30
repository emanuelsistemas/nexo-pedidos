// Edge Function para extrair informações de certificados digitais
// Usando OpenSSL - a abordagem mais simples e confiável

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { certificateData, password, filename } = await req.json()

    console.log('🔍 Processando certificado:', filename)

    if (!certificateData || !password) {
      throw new Error('Dados do certificado ou senha não fornecidos')
    }

    const certificateBytes = decode(certificateData)
    console.log('📊 Certificado decodificado, tamanho:', certificateBytes.length, 'bytes')

    const result = await extractCertificateWithOpenSSL(certificateBytes, password, filename)

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          info: result.info,
          message: 'Certificado processado com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      throw new Error(result.error || 'Falha ao extrair informações do certificado')
    }

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Erro ao processar certificado'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// Função OpenSSL - SOLUÇÃO SIMPLES
async function extractCertificateWithOpenSSL(certificateBytes: Uint8Array, password: string, filename: string) {
  try {
    const tempDir = await Deno.makeTempDir()
    const p12Path = `${tempDir}/cert.p12`
    const pemPath = `${tempDir}/cert.pem`
    
    try {
      await Deno.writeFile(p12Path, certificateBytes)
      
      // openssl pkcs12 -in cert.p12 -nokeys -clcerts -out cert.pem -passin pass:senha
      const extractCmd = new Deno.Command("openssl", {
        args: ["pkcs12", "-in", p12Path, "-nokeys", "-clcerts", "-out", pemPath, "-passin", `pass:${password}`],
        stdout: "piped",
        stderr: "piped"
      })
      
      const extractResult = await extractCmd.output()
      if (!extractResult.success) {
        const error = new TextDecoder().decode(extractResult.stderr)
        throw new Error(`OpenSSL extract failed: ${error}`)
      }
      
      // openssl x509 -in cert.pem -enddate -noout
      const dateCmd = new Deno.Command("openssl", {
        args: ["x509", "-in", pemPath, "-enddate", "-noout"],
        stdout: "piped",
        stderr: "piped"
      })
      
      const dateResult = await dateCmd.output()
      if (!dateResult.success) {
        const error = new TextDecoder().decode(dateResult.stderr)
        throw new Error(`OpenSSL date failed: ${error}`)
      }
      
      const endDateOutput = new TextDecoder().decode(dateResult.stdout)
      
      // openssl x509 -in cert.pem -subject -noout
      const subjectCmd = new Deno.Command("openssl", {
        args: ["x509", "-in", pemPath, "-subject", "-noout"],
        stdout: "piped",
        stderr: "piped"
      })
      
      const subjectResult = await subjectCmd.output()
      const subjectOutput = subjectResult.success ? new TextDecoder().decode(subjectResult.stdout) : ""
      
      // Parse dos resultados
      let validTo = null
      const dateMatch = endDateOutput.match(/notAfter=(.+)/)
      if (dateMatch) {
        validTo = new Date(dateMatch[1].trim()).toISOString()
      }
      
      let commonName = filename.replace(/\.[^/.]+$/, "")
      const cnMatch = subjectOutput.match(/CN\s*=\s*([^,]+)/)
      if (cnMatch) {
        commonName = cnMatch[1].trim()
      }
      
      return {
        success: true,
        info: {
          commonName,
          issuer: 'Extraído via OpenSSL',
          validTo,
          isValid: validTo ? new Date(validTo) > new Date() : false,
          extractedWith: 'openssl_backend'
        }
      }
      
    } finally {
      try {
        await Deno.remove(tempDir, { recursive: true })
      } catch (e) {
        console.warn('Erro ao limpar:', e)
      }
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

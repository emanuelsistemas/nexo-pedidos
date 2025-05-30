# 🚀 Referência Rápida - Certificados Digitais

## ✅ SOLUÇÃO QUE FUNCIONA

**Biblioteca:** `node-forge`
**Comando:** `npm install node-forge`
**Resultado:** 100% funcional

---

## 📋 CÓDIGO ESSENCIAL

```javascript
// 1. VALIDAR SENHA (NOVO - IMPORTANTE!)
const forge = await import('node-forge');
const arrayBuffer = await file.arrayBuffer();
const bytes = new Uint8Array(arrayBuffer);
let binaryString = '';
for (let i = 0; i < bytes.length; i++) {
  binaryString += String.fromCharCode(bytes[i]);
}

const asn1 = forge.asn1.fromDer(binaryString);
const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

// Verificar se tem certificados E chaves privadas
const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

if (!certBags[forge.pki.oids.certBag] || !keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
  throw new Error('Senha incorreta');
}

// 2. EXTRAIR INFORMAÇÕES
const cert = certBags[forge.pki.oids.certBag][0].cert;
const nome = cert.subject.getField('CN')?.value;
const emissor = cert.issuer.getField('CN')?.value;
const validFrom = cert.validity.notBefore;
const validTo = cert.validity.notAfter;
const isValid = validTo > new Date() && validFrom <= new Date();
```

---

## 🎯 RESULTADO

```
✅ Nome: EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA:24163237000151
✅ Emissor: AC SAFEWEB RFB v5
✅ Válido até: 24/04/2026
✅ Status: Ativo
```

---

## 📁 ARQUIVOS MODIFICADOS

- `src/api/certificateApi.js` - Lógica principal
- `src/pages/dashboard/ConfiguracoesPage.tsx` - Interface
- `package.json` - Dependência node-forge

---

## 🔐 VALIDAÇÃO DE SENHA

**IMPORTANTE:** Sempre validar senha antes de aceitar certificado!

```javascript
// Verificar certificados E chaves privadas
const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

if (!certBags[forge.pki.oids.certBag] || !keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
  throw new Error('Senha incorreta');
}
```

**Benefício:** Evita erro na hora de emitir NFe!

## 🧹 LIMPEZA DE CAMPOS

**IMPORTANTE:** Sempre limpar campos após remoção ou erro!

```javascript
const limparCamposCertificado = () => {
  setCertificadoFile(null);
  setCertificadoSenha('');
  setCertificadoInfo(null);

  // Limpar o input file
  const fileInput = document.querySelector('input[type="file"][accept=".p12,.pfx"]') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
};
```

**Benefício:** Formulário sempre pronto para novo certificado!

---

## 💡 DICA IMPORTANTE

**Sempre use node-forge para certificados PKCS#12!**
É a biblioteca padrão da indústria e funciona perfeitamente.

**Sempre valide a senha** antes de aceitar o certificado para evitar problemas na NFe.

Não tente fazer parsing manual - é complexo e desnecessário.

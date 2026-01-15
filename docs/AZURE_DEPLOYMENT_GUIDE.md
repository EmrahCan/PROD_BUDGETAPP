# BudgetApp - Azure Deployment Guide

Bu doküman, BudgetApp uygulamasının Microsoft Azure platformunda kurulumu için adım adım rehber niteliğindedir.

---

## 📐 Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AZURE CLOUD                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │   Azure CDN      │───▶│  Azure Web App   │───▶│ Azure Functions  │       │
│  │  (Static Files)  │    │   (React SPA)    │    │  (Edge Functions)│       │
│  └──────────────────┘    └────────┬─────────┘    └────────┬─────────┘       │
│                                   │                        │                 │
│                                   ▼                        ▼                 │
│                          ┌──────────────────────────────────┐               │
│                          │     Azure Database for          │               │
│                          │     PostgreSQL Flexible         │               │
│                          └──────────────────────────────────┘               │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  Azure Blob      │    │   Azure AD B2C   │    │  Azure Key       │       │
│  │  Storage         │    │  (Authentication)│    │  Vault           │       │
│  │  (Receipts)      │    │                  │    │  (Secrets)       │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐                               │
│  │  Azure Monitor   │    │ Application      │                               │
│  │  & Log Analytics │    │ Insights         │                               │
│  └──────────────────┘    └──────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Gerekli Azure Servisleri

| Servis | Amaç | Tahmini Maliyet (Aylık) |
|--------|------|------------------------|
| Azure Web App (B1) | React SPA hosting | ~$13 |
| Azure Database for PostgreSQL (Burstable B1ms) | Veritabanı | ~$15 |
| Azure Blob Storage | Fiş/fatura resimleri | ~$5 |
| Azure Functions (Consumption) | Backend logic | ~$0-10 (kullanıma bağlı) |
| Azure AD B2C | Kimlik doğrulama | 50K MAU ücretsiz |
| Azure Key Vault | API anahtarları | ~$1 |
| Azure CDN | Statik dosya dağıtımı | ~$3 |

**Tahmini Toplam:** ~$40-50/ay (düşük trafik için)

---

## 📋 Ön Gereksinimler

1. **Azure Hesabı** - [portal.azure.com](https://portal.azure.com)
2. **Azure CLI** kurulu - [Kurulum](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Node.js 18+** ve **npm/pnpm**
4. **Git**

```bash
# Azure CLI kurulumu doğrulama
az --version

# Azure'a giriş
az login
```

---

## 🚀 Adım Adım Kurulum

### Adım 1: Resource Group Oluşturma

```bash
# Değişkenler
RESOURCE_GROUP="rg-budgetapp-prod"
LOCATION="westeurope"  # veya "northeurope", "germanywestcentral"

# Resource group oluştur
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

---

### Adım 2: PostgreSQL Veritabanı Kurulumu

```bash
# Değişkenler
DB_SERVER_NAME="budgetapp-db-server"
DB_NAME="budgetapp"
DB_ADMIN_USER="budgetadmin"
DB_ADMIN_PASSWORD="GüçlüŞifre123!"  # Güçlü şifre kullanın!

# PostgreSQL Flexible Server oluştur
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0

# Veritabanı oluştur
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# UUID extension'ı etkinleştir
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name azure.extensions \
  --value "UUID-OSSP,PGCRYPTO"
```

#### Veritabanı Schema'sını Import Etme

```bash
# Connection string al
CONNECTION_STRING=$(az postgres flexible-server show-connection-string \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --query connectionStrings.psql -o tsv)

# Schema'yı import et (docs/database-export.sql dosyasını kullan)
psql "$CONNECTION_STRING" -f docs/database-export.sql
```

---

### Adım 3: Blob Storage Kurulumu (Fiş Resimleri İçin)

```bash
# Storage account oluştur
STORAGE_ACCOUNT="budgetappstorage"

az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Container oluştur
az storage container create \
  --name "receipts" \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob

# Connection string al
STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)
```

---

### Adım 4: Azure AD B2C Kurulumu (Authentication)

> **Not:** Azure AD B2C kurulumu Azure Portal üzerinden yapılması daha kolaydır.

#### Portal Üzerinden:

1. **Azure Portal** → **Create a resource** → **Azure AD B2C**
2. **Create a new Azure AD B2C Tenant** seçin
3. Tenant bilgilerini girin:
   - Organization name: `BudgetApp`
   - Initial domain name: `budgetappauth`
4. **User flows** oluşturun:
   - Sign up and sign in (B2C_1_signupsignin)
   - Password reset (B2C_1_passwordreset)
5. **App registration** oluşturun:
   - Name: `BudgetApp Web`
   - Redirect URI: `https://your-webapp.azurewebsites.net/auth/callback`

#### Alternatif: Basit Auth (JWT ile)

Azure AD B2C yerine daha basit bir çözüm için Azure Functions ile JWT tabanlı auth kullanabilirsiniz.

---

### Adım 5: Azure Functions Kurulumu

```bash
# Function App oluştur
FUNCTION_APP="budgetapp-functions"

az functionapp create \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name $FUNCTION_APP \
  --storage-account $STORAGE_ACCOUNT

# Environment variables ayarla
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "DATABASE_URL=postgresql://$DB_ADMIN_USER:$DB_ADMIN_PASSWORD@$DB_SERVER_NAME.postgres.database.azure.com:5432/$DB_NAME?sslmode=require" \
    "STORAGE_CONNECTION=$STORAGE_CONNECTION" \
    "JWT_SECRET=your-secret-key"
```

#### Edge Functions'ı Azure Functions'a Dönüştürme

`supabase/functions/` altındaki her fonksiyon için Azure Function oluşturun:

```
azure-functions/
├── host.json
├── package.json
├── financial-chat/
│   ├── function.json
│   └── index.ts
├── receipt-scanner/
│   ├── function.json
│   └── index.ts
└── ... (diğer fonksiyonlar)
```

**Örnek function.json:**
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

---

### Adım 6: Web App Kurulumu

```bash
# App Service Plan oluştur
APP_PLAN="budgetapp-plan"

az appservice plan create \
  --name $APP_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Web App oluştur
WEB_APP="budgetapp-web"

az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN \
  --name $WEB_APP \
  --runtime "NODE:18-lts"

# Environment variables ayarla
az webapp config appsettings set \
  --name $WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "VITE_API_URL=https://$FUNCTION_APP.azurewebsites.net/api" \
    "VITE_STORAGE_URL=https://$STORAGE_ACCOUNT.blob.core.windows.net" \
    "VITE_AUTH_DOMAIN=budgetappauth.b2clogin.com"
```

---

### Adım 7: Key Vault Kurulumu (Secrets)

```bash
# Key Vault oluştur
KEY_VAULT="budgetapp-vault"

az keyvault create \
  --name $KEY_VAULT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Secrets ekle
az keyvault secret set --vault-name $KEY_VAULT --name "DatabasePassword" --value "$DB_ADMIN_PASSWORD"
az keyvault secret set --vault-name $KEY_VAULT --name "JwtSecret" --value "your-jwt-secret"
az keyvault secret set --vault-name $KEY_VAULT --name "OpenAiApiKey" --value "your-openai-key"
az keyvault secret set --vault-name $KEY_VAULT --name "ResendApiKey" --value "your-resend-key"

# Function App'e Key Vault erişimi ver
az webapp identity assign --name $FUNCTION_APP --resource-group $RESOURCE_GROUP
FUNCTION_IDENTITY=$(az webapp identity show --name $FUNCTION_APP --resource-group $RESOURCE_GROUP --query principalId -o tsv)

az keyvault set-policy \
  --name $KEY_VAULT \
  --object-id $FUNCTION_IDENTITY \
  --secret-permissions get list
```

---

### Adım 8: CDN Kurulumu (Opsiyonel)

```bash
# CDN profile oluştur
az cdn profile create \
  --name "budgetapp-cdn" \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_Microsoft

# CDN endpoint oluştur
az cdn endpoint create \
  --name "budgetapp-endpoint" \
  --profile-name "budgetapp-cdn" \
  --resource-group $RESOURCE_GROUP \
  --origin "$WEB_APP.azurewebsites.net" \
  --origin-host-header "$WEB_APP.azurewebsites.net"
```

---

### Adım 9: CI/CD Pipeline (GitHub Actions)

`.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

env:
  AZURE_WEBAPP_NAME: budgetapp-web
  AZURE_FUNCTIONAPP_NAME: budgetapp-functions
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_STORAGE_URL: ${{ secrets.VITE_STORAGE_URL }}

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./dist

      - name: Deploy Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
          package: ./azure-functions
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

---

## 🔄 Supabase → Azure Eşleştirmesi

| Supabase Özelliği | Azure Karşılığı |
|-------------------|-----------------|
| PostgreSQL Database | Azure Database for PostgreSQL |
| Edge Functions | Azure Functions |
| Storage | Azure Blob Storage |
| Auth | Azure AD B2C |
| Realtime | Azure SignalR Service |
| Row Level Security | PostgreSQL RLS + Azure AD |
| Secrets | Azure Key Vault |
| pg_cron | Azure Logic Apps / Azure Scheduler |

---

## 🔒 Güvenlik Yapılandırması

### 1. Network Security

```bash
# Web App'e IP kısıtlaması ekle (opsiyonel)
az webapp config access-restriction add \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP \
  --rule-name "AllowCDN" \
  --priority 100 \
  --ip-address "AzureFrontDoor.Backend"

# PostgreSQL firewall kuralı
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 2. SSL/TLS

```bash
# Custom domain ve SSL ekle
az webapp config hostname add \
  --webapp-name $WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --hostname "app.budgetapp.com"

# Managed SSL sertifikası
az webapp config ssl create \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP \
  --hostname "app.budgetapp.com"
```

### 3. RLS Politikaları

`database-export.sql` dosyasındaki RLS politikaları Azure PostgreSQL'de de çalışır. Sadece `auth.uid()` fonksiyonunu Azure AD token'ından alınan user ID ile değiştirmeniz gerekir.

---

## 📊 Monitoring Kurulumu

```bash
# Application Insights oluştur
az monitor app-insights component create \
  --app "budgetapp-insights" \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Web App'e bağla
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app "budgetapp-insights" \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

az webapp config appsettings set \
  --name $WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=$INSTRUMENTATION_KEY"
```

---

## 📝 Kod Değişiklikleri

### 1. Supabase Client → Azure SDK

```typescript
// Önceki (Supabase)
import { supabase } from "@/integrations/supabase/client";

// Sonraki (Azure)
import { createClient } from "@/integrations/azure/client";
```

### 2. Yeni Azure Client

```typescript
// src/integrations/azure/client.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

// Storage client
import { BlobServiceClient } from '@azure/storage-blob';

export const blobService = BlobServiceClient.fromConnectionString(
  import.meta.env.VITE_STORAGE_CONNECTION
);
```

### 3. Auth Değişiklikleri

```typescript
// src/integrations/azure/auth.ts
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: import.meta.env.VITE_AZURE_AUTHORITY,
    redirectUri: window.location.origin,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
```

---

## ✅ Deployment Checklist

- [ ] Resource Group oluşturuldu
- [ ] PostgreSQL server kuruldu
- [ ] Database schema import edildi
- [ ] Blob Storage kuruldu
- [ ] Azure AD B2C tenant oluşturuldu
- [ ] Azure Functions deploy edildi
- [ ] Web App deploy edildi
- [ ] Key Vault secrets eklendi
- [ ] CDN kuruldu (opsiyonel)
- [ ] Custom domain eklendi
- [ ] SSL sertifikası aktif
- [ ] Application Insights bağlandı
- [ ] GitHub Actions CI/CD kuruldu

---

## 🆘 Sorun Giderme

### Veritabanı Bağlantı Hatası
```bash
# Firewall kurallarını kontrol et
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME

# SSL modunu kontrol et
# Connection string'de ?sslmode=require olmalı
```

### Function App 500 Hatası
```bash
# Logları kontrol et
az functionapp log tail --name $FUNCTION_APP --resource-group $RESOURCE_GROUP
```

### Deployment Başarısız
```bash
# Deployment loglarını kontrol et
az webapp log deployment show --name $WEB_APP --resource-group $RESOURCE_GROUP
```

---

## 📚 Faydalı Linkler

- [Azure Database for PostgreSQL Docs](https://docs.microsoft.com/en-us/azure/postgresql/)
- [Azure Functions Node.js Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure AD B2C Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)
- [Azure Blob Storage SDK](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-nodejs)

---

## 💰 Maliyet Optimizasyonu İpuçları

1. **Dev/Test ortamları için:** B1ms yerine Burstable B1 kullanın
2. **Storage:** Hot tier yerine Cool tier (az erişilen dosyalar için)
3. **Functions:** Consumption plan kullanın (düşük trafik)
4. **Reserved Instances:** 1 yıllık rezervasyon ile %30-40 tasarruf

---

*Bu doküman BudgetApp v1.0 için hazırlanmıştır. Son güncelleme: Ocak 2026*

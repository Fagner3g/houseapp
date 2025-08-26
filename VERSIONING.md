# Versionamento Semântico - HouseApp

Este documento explica como funciona o versionamento semântico implementado no CI/CD do projeto.

## 📋 Estratégia de Versionamento

### **Branches de Desenvolvimento (`develop`)**
- **Formato:** `0.1.0-YYYYMMDD-SHA`
- **Exemplo:** `0.1.0-20250709-a1b2c3d`
- **Uso:** Desenvolvimento e testes

### **Branch Principal (`main`)**
- **Formato:** `1.0.0-YYYYMMDD-SHA`
- **Exemplo:** `1.0.0-20250709-a1b2c3d`
- **Uso:** Produção e releases

### **Releases Oficiais**
- **Formato:** `v1.0.0`, `v1.1.0`, `v2.0.0`
- **Exemplo:** `v1.0.0`
- **Uso:** Releases estáveis

## 🔄 Como Funciona

### **1. Push para Branches**
Quando você faz push para `develop` ou `main`:

```bash
# Para develop
ghcr.io/fagner3g/houseapp-api:0.1.0-20250709-a1b2c3d
ghcr.io/fagner3g/houseapp-api:develop
ghcr.io/fagner3g/houseapp-api:a1b2c3d

# Para main
ghcr.io/fagner3g/houseapp-api:1.0.0-20250709-a1b2c3d
ghcr.io/fagner3g/houseapp-api:main
ghcr.io/fagner3g/houseapp-api:a1b2c3d
```

### **2. Release Oficial**
Quando você cria um release no GitHub:

```bash
# Release v1.0.0
ghcr.io/fagner3g/houseapp-api:v1.0.0
ghcr.io/fagner3g/houseapp-api:1.0.0-20250709-a1b2c3d
ghcr.io/fagner3g/houseapp-api:main
ghcr.io/fagner3g/houseapp-api:a1b2c3d
```

## 🚀 Deploy Automático

### **Desenvolvimento**
- **Branch:** `develop`
- **Tag usado:** `0.1.0-YYYYMMDD-SHA`
- **Ambiente:** Staging

### **Produção**
- **Branch:** `main`
- **Tag usado:** `1.0.0-YYYYMMDD-SHA`
- **Ambiente:** Production

### **Release**
- **Trigger:** GitHub Release
- **Tag usado:** `v1.0.0` (tag do release)
- **Ambiente:** Production

## 📊 Vantagens

1. **Rastreabilidade:** Cada build tem uma versão única
2. **Rollback:** Fácil voltar para versões anteriores
3. **Ambientes:** Separação clara entre dev/prod
4. **Releases:** Versionamento oficial para releases
5. **Debugging:** SHA do commit sempre disponível

## 🔧 Como Usar

### **Desenvolvimento Local**
```bash
# Fazer push para develop
git push origin develop
# Gera: 0.1.0-20250709-a1b2c3d
```

### **Deploy para Produção**
```bash
# Fazer push para main
git push origin main
# Gera: 1.0.0-20250709-a1b2c3d
```

### **Criar Release**
1. Criar tag no GitHub: `v1.0.0`
2. Criar release no GitHub
3. Deploy automático com tag `v1.0.0`

## 📝 Exemplos de Tags

```
# Desenvolvimento
0.1.0-20250709-a1b2c3d
0.1.0-20250709-e4f5g6h

# Produção
1.0.0-20250709-a1b2c3d
1.0.0-20250709-e4f5g6h

# Releases
v1.0.0
v1.1.0
v2.0.0
```

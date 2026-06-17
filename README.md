# OpenCommit — AI Commit Message Generator

Generate **conventional commit messages** from your git diffs using AI (OpenCode Zen, OpenAI, OpenRouter, DeepSeek, Groq, Ollama, or local OpenCode CLI) — directly in VS Code's Source Control panel.

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=cihatksm.opencommit"><img src="https://img.shields.io/visual-studio-marketplace/v/cihatksm.opencommit?label=VS%20Marketplace&style=for-the-badge&color=007ACC" alt="Marketplace"></a>
  <a href="https://github.com/cihatksm/opencommit/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/cihatksm/opencommit"><img src="https://img.shields.io/badge/repo-github-181717?style=for-the-badge&logo=github" alt="Repository"></a>
</p>

|                |                                                                 |
| -------------- | --------------------------------------------------------------- |
| **Identifier** | `cihatksm.opencommit`                                           |
| **Categories** | SCM Providers, Other                                            |
| **Publisher**  | [Cihat Kösem](https://cihatksm.com)                             |
| **License**    | [MIT](https://github.com/cihatksm/opencommit/blob/main/LICENSE) |

| Resources                                                                              |                                |
| -------------------------------------------------------------------------------------- | ------------------------------ |
| [Repository](https://github.com/cihatksm/opencommit)                                   | Source code on GitHub          |
| [Issues](https://github.com/cihatksm/opencommit/issues)                                | Report bugs & request features |
| [Marketplace](https://marketplace.visualstudio.com/items?itemName=cihatksm.opencommit) | Install from VS Marketplace    |
| [Author](https://cihatksm.com)                                                         | More by Cihat Kösem            |

---

## ✨ Features

- **One-click commit messages** — Button in the Source Control panel
- **Model picker** — Choose from 20+ free & paid models, remembered for future use
- **Any AI provider** — OpenCode Zen (default), OpenAI, OpenRouter, DeepSeek, Groq, Ollama, LM Studio, or local OpenCode CLI
- **Conventional Commits** — `feat:`, `fix:`, `refactor:` and more
- **Multi-line support** — Optional body explaining WHAT and WHY
- **Smart diff handling** — Auto-truncates large diffs to fit the API
- **Secure token storage** — Uses VS Code SecretStorage
- **Regenerate** — Re-generate the message if you don't like the first one

---

## 🚀 Getting Started

### 1. Get an API Token

**Default provider is OpenCode Zen** (free tier available). Choose a provider:

- **OpenCode Zen** → https://opencode.ai/zen (includes free tier)
- **OpenAI** → https://platform.openai.com/api-keys
- **OpenRouter** → https://openrouter.ai/keys
- **Groq** → https://console.groq.com/keys
- **DeepSeek** → https://platform.deepseek.com/api_keys
- **Ollama** (local) → no key needed, use `ollama` as token

### 2. Configure Settings

Open VS Code Settings (`Ctrl+,`) and search for `OpenCommit`:

| Setting               | Default value                                 |
| --------------------- | --------------------------------------------- |
| `Api Base Url`        | `https://opencode.ai/zen/v1/chat/completions` |
| `Model`               | `deepseek-v4-flash-free`                      |
| `Conventional Commit` | `true`                                        |

Or for local OpenCode CLI, set `Api Base Url` to `opencode-cli`.

### 3. Set Your Token

Open the Command Palette (`Ctrl+Shift+P`) and run:

```
OpenCommit: Set API Token
```

### 4. Generate a Commit Message

- Stage some changes in Source Control, then click the **✨ AI Commit** button, OR
- Run `OpenCommit: Generate Commit` from the Command Palette
- On first use, a model picker will appear — choose your preferred model (it will be remembered)
- To regenerate the message, run `OpenCommit: Regenerate`

---

## ⚙️ Settings

| Setting                                     | Default                                       | Description                         |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------- |
| `commitMessageGenerator.apiBaseUrl`         | `https://opencode.ai/zen/v1/chat/completions` | API endpoint (OpenAI-compatible)    |
| `commitMessageGenerator.model`              | `deepseek-v4-flash-free`                      | AI model name                       |
| `commitMessageGenerator.promptModel`        | `true`                                        | Show model picker before generating |
| `commitMessageGenerator.conventionalCommit` | `true`                                        | Conventional Commit format          |
| `commitMessageGenerator.multiLine`          | `false`                                       | Multi-line with body                |
| `commitMessageGenerator.maxDiffLength`      | `4000`                                        | Max diff chars sent to API          |

### Provider Examples

| Provider               | API Base URL                                      |
| ---------------------- | ------------------------------------------------- |
| OpenCode Zen (default) | `https://opencode.ai/zen/v1/chat/completions`     |
| OpenCode Zen Go        | `https://opencode.ai/zen/go/v1/chat/completions`  |
| OpenAI                 | `https://api.openai.com/v1/chat/completions`      |
| OpenRouter             | `https://openrouter.ai/api/v1/chat/completions`   |
| Groq                   | `https://api.groq.com/openai/v1/chat/completions` |
| DeepSeek               | `https://api.deepseek.com/v1/chat/completions`    |
| Ollama (local)         | `http://localhost:11434/v1/chat/completions`      |
| LM Studio (local)      | `http://localhost:1234/v1/chat/completions`       |
| OpenCode CLI           | `opencode-cli` (runs locally)                     |

---

## 🔐 Security

- API tokens stored in VS Code **SecretStorage** (encrypted)
- Tokens **never logged** to console
- Only the diff is sent — no full file contents

---

## 📦 Build

```bash
npm install
npm run compile
npm run package
```

Or use the all-in-one build & install script:

```bash
npm run build-install          # patch bump
npm run build-install:minor    # minor bump
npm run build-install:major    # major bump
```

---

## 📄 License

MIT

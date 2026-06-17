# OpenCommit — AI Commit Message Generator

Generate **conventional commit messages** from your git diffs using AI (OpenAI, OpenRouter, DeepSeek, Groq, Ollama, or local OpenCode CLI) — directly in VS Code's Source Control panel.

---

## ✨ Features

- **One-click commit messages** — Button in the Source Control panel
- **Any AI provider** — OpenAI, OpenRouter, DeepSeek, Groq, Ollama, LM Studio, or local OpenCode CLI
- **Conventional Commits** — `feat:`, `fix:`, `refactor:` and more
- **Multi-line support** — Optional body explaining WHAT and WHY
- **Smart diff handling** — Auto-truncates large diffs to fit the API
- **Secure token storage** — Uses VS Code SecretStorage
- **Command Palette** — `OpenCommit: Generate Commit Message`

---

## 🚀 Getting Started

### 1. Get an API Token

Choose a provider:

- **OpenAI** → https://platform.openai.com/api-keys
- **OpenRouter** → https://openrouter.ai/keys
- **Groq** → https://console.groq.com/keys
- **DeepSeek** → https://platform.deepseek.com/api_keys
- **Ollama** (local) → no key needed, use `ollama` as token

### 2. Configure Settings

Open VS Code Settings (`Ctrl+,`) and search for `OpenCommit`:

| Setting               | Recommended value                            |
| --------------------- | -------------------------------------------- |
| `Api Base Url`        | `https://api.openai.com/v1/chat/completions` |
| `Model`               | `gpt-4o-mini`                                |
| `Conventional Commit` | `true`                                       |

Or for local OpenCode CLI, set `Api Base Url` to `opencode-cli`.

### 3. Set Your Token

Open the Command Palette (`Ctrl+Shift+P`) and run:

```
OpenCommit: Set AI API Token
```

### 4. Generate a Commit Message

- Stage some changes in Source Control, then click the **AI Commit** button in the status bar, OR
- Run `OpenCommit: Generate Commit Message` from the Command Palette

---

## ⚙️ Settings

| Setting                                     | Default                                      | Description                      |
| ------------------------------------------- | -------------------------------------------- | -------------------------------- |
| `commitMessageGenerator.apiBaseUrl`         | `https://api.openai.com/v1/chat/completions` | API endpoint (OpenAI-compatible) |
| `commitMessageGenerator.model`              | `gpt-4o-mini`                                | AI model name                    |
| `commitMessageGenerator.conventionalCommit` | `true`                                       | Conventional Commit format       |
| `commitMessageGenerator.multiLine`          | `false`                                      | Multi-line with body             |
| `commitMessageGenerator.maxDiffLength`      | `4000`                                       | Max diff chars sent to API       |

### Provider Examples

| Provider          | API Base URL                                      |
| ----------------- | ------------------------------------------------- |
| OpenAI            | `https://api.openai.com/v1/chat/completions`      |
| OpenRouter        | `https://openrouter.ai/api/v1/chat/completions`   |
| Groq              | `https://api.groq.com/openai/v1/chat/completions` |
| DeepSeek          | `https://api.deepseek.com/v1/chat/completions`    |
| Ollama (local)    | `http://localhost:11434/v1/chat/completions`      |
| LM Studio (local) | `http://localhost:1234/v1/chat/completions`       |
| OpenCode CLI      | `opencode-cli` (runs locally)                     |

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

---

## 📄 License

MIT

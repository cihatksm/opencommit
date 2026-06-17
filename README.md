# OpenCommit — AI Commit Message Generator

Generate **conventional commit messages** from your git diffs using the [OpenCode AI](https://opencode.ai/) API — directly in VS Code's Source Control panel.

---

## ✨ Features

- **One-click commit messages** — Button in the Source Control panel
- **AI-powered** — Uses OpenCode API with your choice of model
- **Conventional Commits** — `feat:`, `fix:`, `refactor:` and more
- **Multi-line support** — Optional body explaining WHAT and WHY
- **Smart diff handling** — Auto-truncates large diffs to fit the API
- **Secure token storage** — Uses VS Code SecretStorage
- **Command Palette** — `OpenCommit: Generate Commit Message`

---

## 🚀 Getting Started

### 1. Get an OpenCode API Token

Visit [https://opencode.ai/](https://opencode.ai/) and get your API token.

### 2. Set Your Token

Open the Command Palette (`Ctrl+Shift+P`) and run:

```
OpenCommit: Set OpenCode API Token
```

Enter your token. It's stored **securely** in VS Code's SecretStorage.

### 3. Generate a Commit Message

- Stage some changes in Source Control, then click the **AI Commit** button in the status bar, OR
- Run `OpenCommit: Generate Commit Message` from the Command Palette

The message is automatically inserted into the Source Control commit input — edit it if needed, then commit!

---

## ⚙️ Settings

| Setting                                     | Default       | Description                    |
| ------------------------------------------- | ------------- | ------------------------------ |
| `commitMessageGenerator.model`              | `gpt-4o-mini` | AI model to use                |
| `commitMessageGenerator.conventionalCommit` | `true`        | Use Conventional Commit format |
| `commitMessageGenerator.multiLine`          | `false`       | Generate body with explanation |
| `commitMessageGenerator.maxDiffLength`      | `4000`        | Max diff length sent to API    |

### Available Models

`gpt-4o-mini`, `gpt-4o`, `claude-3-5-sonnet`, `claude-3-opus`, `claude-3-haiku`, `gemini-2.0-flash`, `gemini-1.5-pro`, `deepseek-v3`, `grok-2`

---

## 🔐 Security

- API tokens are stored in VS Code's **SecretStorage** (encrypted)
- Tokens are **never logged** to the console
- Only the diff is sent to the API — no file contents beyond the diff

---

## 📦 Manual Build

```bash
npm install
npm run compile
```

---

## 📄 License

MIT

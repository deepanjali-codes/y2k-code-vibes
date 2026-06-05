# 🤖 AI Code Reviewer

An automated code review assistant designed to analyze Pull Requests (PRs), flag bugs, ensure style guide adherence, and provide actionable optimization feedback before human review.

---

## 🚀 Quick Start

### 1. Installation
Install dependencies to your project repository:
```bash
npm install ai-code-reviewer --save-dev
# or using python
pip install ai-code-reviewer
```

### 2. Configure Environment
Create a `.env` file in your root directory and add your API credentials:
```env
AI_REVIEWER_API_KEY=your_api_key_here
LLM_PROVIDER=openai # openai, anthropic, or local
```

### 3. Run Locally
Execute a review on your local unstaged changes:
```bash
npx ai-code-reviewer run --branch=main
```

---

## ⚙️ CI/CD Integration

### GitHub Actions
Add this workflow to `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run AI Reviewer
        uses: your-org/ai-code-reviewer-action@v1
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          AI_REVIEWER_API_KEY: \${{ secrets.AI_REVIEWER_API_KEY }}
```

---

## 🛠️ Configuration (`.aireviewrc.json`)

Customize the behavior, focus areas, and language rules using a local configuration file.

```json
{
  "model": "gpt-4o",
  "temperature": 0.2,
  "max_comments_per_pr": 10,
  "review_scope": ["security", "performance", "readability"],
  "exclude_patterns": [
    "**/node_modules/**",
    "**/*.min.js",
    "package-lock.json",
    "pnpm-lock.yaml"
  ]
}
```

---

## 🎯 Focus Areas & Guardrails

* **Security**: Flags hardcoded secrets, SQL injection vulnerabilities, and broken access controls.
* **Performance**: Detects redundant database queries, heavy loops, and memory leaks.
* **Consistency**: Validates code against project-specific styling rules and lint standards.
* **No Noise Rule**: The bot remains silent if the PR meets standard requirements, avoiding trivial praise comments.

---

## 🤝 Contributing

1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

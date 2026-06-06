#!/bin/bash

# =====================================
# Установка Git Hooks для проверки сборки
# =====================================
# Этот скрипт устанавливает pre-push hook, который
# автоматически проверяет продакшен сборку перед пушем

set -e

# Определяем расположение .git директории
if [ -d ".git" ]; then
  GIT_DIR=".git"
elif [ -d "../.git" ]; then
  GIT_DIR="../.git"
else
  echo "❌ Error: Not in a git repository"
  echo "   Make sure you're running this from the project directory"
  exit 1
fi

HOOKS_DIR="$GIT_DIR/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

echo "🔧 Installing Git hooks..."
echo ""

# Создаем директорию hooks если её нет
mkdir -p "$HOOKS_DIR"

# Создаем pre-commit hook для автогенерации миграций
cat > "$PRE_COMMIT_HOOK" <<'EOF'
#!/bin/bash

# Pre-commit hook: Автоматическая генерация миграций
# Запускается перед каждым git commit

# Переходим в директорию web (если мы в корне репозитория)
if [ -d "web" ]; then
  cd web
fi

# Проверяем, изменился ли schema.ts
if git diff --cached --name-only | grep -q "src/db/schema.ts"; then
  echo ""
  echo "🔍 Detected changes in database schema..."
  echo "📝 Generating migration files..."
  echo ""

  # Генерируем миграции
  npm run db:generate || {
    echo ""
    echo "❌ Migration generation failed!"
    echo "   Fix the schema errors before committing."
    echo "   Or use 'git commit --no-verify' to skip (NOT recommended)."
    exit 1
  }

  # Добавляем сгенерированные миграции в коммит
  git add drizzle/

  echo ""
  echo "✅ Migrations generated and added to commit"
  echo ""
fi

exit 0
EOF

chmod +x "$PRE_COMMIT_HOOK"

# Создаем pre-push hook
cat > "$PRE_PUSH_HOOK" <<'EOF'
#!/bin/bash

# Pre-push hook: Проверка продакшен сборки
# Этот hook запускается перед каждым git push

echo ""
echo "🔍 Running pre-push checks..."
echo ""

# Переходим в директорию web (если мы в корне репозитория)
if [ -d "web" ]; then
  cd web
fi

# Опция: пропустить проверку с помощью --no-verify
# Пример: git push --no-verify

echo "1️⃣  Running linter..."
npm run lint || {
  echo ""
  echo "❌ Linting failed! Fix the issues before pushing."
  echo "   Or use 'git push --no-verify' to skip this check."
  exit 1
}

echo "✅ Linting passed"
echo ""

echo "2️⃣  Building Docker image..."
echo "   (This ensures production build will work)"
docker build . -t modelka-pre-push-check || {
  echo ""
  echo "❌ Docker build failed!"
  echo "   Your production deployment will fail with these changes."
  echo "   Fix the build errors before pushing."
  echo ""
  echo "   Or use 'git push --no-verify' to skip this check (NOT recommended)."
  docker rmi modelka-pre-push-check 2>/dev/null || true
  exit 1
}

echo "✅ Docker build successful"
echo ""

# Cleanup
docker rmi modelka-pre-push-check 2>/dev/null || true

echo "✅ All pre-push checks passed!"
echo "   Proceeding with push..."
echo ""

exit 0
EOF

# Делаем hook исполняемым
chmod +x "$PRE_PUSH_HOOK"

echo "✅ Git hooks installed successfully!"
echo ""
echo "📋 What was installed:"
echo "   • pre-commit hook: Auto-generates migrations when schema.ts changes"
echo "   • pre-push hook: Runs linter and Docker build before each push"
echo ""
echo "💡 Tips:"
echo "   • To skip hooks: git commit --no-verify / git push --no-verify"
echo "   • To uninstall: rm $PRE_COMMIT_HOOK $PRE_PUSH_HOOK"
echo ""
echo "🎉 You're all set! Migrations will auto-generate on commit!"
echo ""

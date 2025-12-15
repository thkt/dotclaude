#!/bin/bash
# Claude Code Sandbox Setup Script
# This script sets up the sandbox runtime for secure command execution

set -e

echo "🔧 Setting up Claude Code sandbox feature..."
echo ""

# Check for ripgrep
echo "📋 Checking dependencies..."
if ! command -v rg &> /dev/null; then
    echo "❌ ripgrep not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install ripgrep
        echo "✅ ripgrep installed successfully"
    else
        echo "⚠️  Homebrew not found. Please install ripgrep manually:"
        echo "   https://github.com/BurntSushi/ripgrep#installation"
        exit 1
    fi
else
    echo "✅ ripgrep already installed ($(rg --version | head -1))"
fi

echo ""

# Check if sandbox runtime is already installed
if command -v srt &> /dev/null; then
    echo "✅ @anthropic-ai/sandbox-runtime already installed (v$(srt --version))"
    echo ""
    echo "🎉 Setup complete!"
else
    # Install sandbox runtime
    echo "📦 Installing @anthropic-ai/sandbox-runtime..."
    if npm install -g @anthropic-ai/sandbox-runtime; then
        echo "✅ Sandbox runtime installed successfully!"
        echo ""

        # Verify installation
        if command -v srt &> /dev/null; then
            echo "✅ Verification: srt command available (v$(srt --version))"
        else
            echo "⚠️  Installation succeeded, but 'srt' command not found in PATH"
            echo "   You may need to restart your terminal or update your PATH"
        fi
    else
        echo "❌ Global install failed. Trying local installation..."
        echo ""

        # Fallback to local installation
        if npm install --prefix "$HOME/.local" @anthropic-ai/sandbox-runtime; then
            echo "✅ Local installation succeeded!"
            echo ""
            echo "⚠️  Please add the following to your shell profile (~/.bashrc, ~/.zshrc):"
            echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
            echo ""
            echo "Then restart your terminal or run:"
            echo "   source ~/.bashrc  # or ~/.zshrc"
        else
            echo "❌ Failed to install sandbox runtime (both global and local)"
            echo "   Please try manual installation:"
            echo "   npm install -g @anthropic-ai/sandbox-runtime"
            echo "   or"
            echo "   npm install --prefix ~/.local @anthropic-ai/sandbox-runtime"
            exit 1
        fi
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Next Steps:"
echo ""
echo "1. Start a new Claude Code session"
echo "2. Run the following command:"
echo "   /sandbox"
echo ""
echo "3. Select option 1 (recommended):"
echo "   'Sandbox BashTool, with auto-allow in accept edits mode'"
echo ""
echo "4. (Optional) Create ~/.srt-settings.json for custom configuration"
echo ""
echo "For more information, see:"
echo "https://azukiazusa.dev/blog/claude-code-sandbox-feature/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

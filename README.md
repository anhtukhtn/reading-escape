# Reading Escape Mode - Chrome Extension

A minimalist Chrome extension that transforms any webpage into a distraction-free reading experience by filtering out ads, sidebars, navigation elements, and other visual clutter.

## 🚀 Features

- **One-Click Activation**: Toggle reading mode with a simple keyboard shortcut or browser action
- **Three Reading States**: 
  - **Off**: Normal webpage view
  - **Narrow**: 400px focused reading column
  - **Wide**: 800px expanded reading view
- **Smart Content Detection**: Automatically finds and preserves main article content
- **Comprehensive Filtering**: Removes ads, sidebars, social buttons, newsletters, popups, and other distractions
- **Comment Preservation**: Keeps relevant comment sections when available
- **Universal Compatibility**: Works on most news sites, blogs, and article pages

## 📖 How It Works

Reading Escape Mode intelligently analyzes webpage structure to:

1. **Identify Main Content**: Uses smart selectors to find article text
2. **Filter Distractions**: Removes 100+ types of unwanted elements
3. **Preserve Context**: Keeps relevant comments and discussions
4. **Create Clean Layout**: Presents content in a readable, distraction-free format

## 🎯 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](#) (link pending publication)
2. Click "Add to Chrome"
3. Confirm installation

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder

## ⌨️ Usage

### Keyboard Shortcut
- **Default**: `Alt+R` (Windows/Linux) or `Option+R` (Mac)
- Cycles through: Off → Narrow → Wide → Off

### Browser Action
- Click the Reading Escape Mode icon in the toolbar
- Same cycling behavior as keyboard shortcut

### Customization
- Right-click the extension icon → Options to modify keyboard shortcuts
- Go to `chrome://extensions/shortcuts` for detailed shortcut management

## 🛠️ Technical Details

### Supported Content Types
- News articles
- Blog posts
- Documentation
- Medium articles
- Wikipedia pages
- Academic papers
- Forum discussions (Reddit, Hacker News, etc.)

### Filtered Elements
The extension removes:
- **Advertisements**: Google Ads, banner ads, sponsored content
- **Navigation**: Headers, footers, breadcrumbs, menus
- **Social Elements**: Share buttons, follow widgets, social media embeds
- **Distractions**: Sidebars, related articles, trending sections
- **Interruptions**: Popups, modals, newsletter signups
- **Legal Notices**: Cookie banners, GDPR notices
- **Media**: Auto-play videos, audio players (when not part of main content)

### Browser Compatibility
- Chrome 88+
- Chromium-based browsers (Edge, Brave, Opera)

## 🔒 Privacy & Security

- **No Data Collection**: Extension doesn't collect, store, or transmit any personal data
- **Local Processing**: All content filtering happens locally in your browser
- **No External Requests**: No communication with external servers
- **Minimal Permissions**: Only requires access to webpage content for filtering

## 🐛 Troubleshooting

### Reading Mode Not Working?
1. **Refresh the page** and try again
2. **Check content type**: Works best on article-based pages
3. **Try different websites**: Some sites may have unusual layouts

### Content Missing?
1. **Cycle through modes**: Try narrow → wide to see more content
2. **Check original page**: Some sites may have minimal content
3. **Report issues**: Help us improve by reporting problematic sites

### Keyboard Shortcut Conflicts?
1. Go to `chrome://extensions/shortcuts`
2. Find "Reading Escape Mode"
3. Set a custom shortcut

## 📝 Release Notes

### Version 1.0.0
- Initial release
- Smart content detection
- Three reading modes
- Comprehensive ad and distraction filtering
- Comment section preservation

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Setup
```bash
git clone https://github.com/yourusername/reading-escape-mode
cd reading-escape-mode
# Load unpacked extension in Chrome for testing
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs on [GitHub Issues](#)
- **Feature Requests**: Suggest improvements via GitHub
- **Contact**: [your-email@example.com]

## 🙏 Acknowledgments

- Inspired by browser reading modes and reader view extensions
- Built with focus on reducing cognitive load and improving reading experience
- Thanks to all users providing feedback and suggestions

---

**Enjoy distraction-free reading!** 📚✨
# reading-escape

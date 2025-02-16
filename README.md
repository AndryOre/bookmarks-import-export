![Bookmark Import/Export](https://res.cloudinary.com/dhwxnbnaj/image/upload/v1722710029/Bookmark%20ImportExport/Cover_zvlu4x.png)

# Bookmark Import/Export

**Bookmark Import/Export** is a web extension designed to help you import and export your bookmarks with ease. This tool simplifies the process of managing your bookmarks, making it easier to keep your important links organized, accessible, and transferable between browsers.

## Features 🌟

- ⬇️ **Bookmark Exporting**: Easily export your bookmarks to different formats (HTML, JSON, CSV) for better accessibility and management.
- ⬆️ **Bookmark Importing**: Import bookmarks from JSON and HTML files, allowing you to transfer your bookmarks between browsers or restore from backups.
- 🔍 **Advanced Export**: Use the advanced export feature to selectively export bookmarks, search through your bookmark collection, and customize export settings.
- 🌐 **Browser Compatibility**: Works seamlessly with Chromium-based web browsers, ensuring smooth operation across different platforms.
- 📑 **Minimal Interface**: Clean and easy-to-use interface for quick access and efficient management of bookmarks.

## Tech Stack 🧰

- [![Plasmo][Plasmo]][Plasmo-url]
- [![React][React]][React-url]
- [![Tailwind CSS][TailwindCSS]][TailwindCSS-url]
- [![shadcn/ui][Shadcn/UI]][Shadcn/UI-url]
- [![Lucide Icons][Lucide]][Lucide-url]
- [![TypeScript][TypeScript]][TypeScript-url]

## Installation 🔧

To install the extension, visit the Chrome Web Store:

[![Chrome Web Store][Chrome Web Store]][Chrome Web Store-url]

Note: While this extension is primarily listed on the Chrome Web Store, it is compatible with all Chromium-based browsers, including Microsoft Edge, Opera, and Brave. You can install it directly from the Chrome Web Store on these browsers as well.

## Usage 📚

1. Click on the extension icon in your browser toolbar to open the popup.
2. Choose between "Export" and "Import" tabs.
3. For basic exporting:
   - Select either HTML, JSON or CSV format.
   - Click the corresponding button to export your bookmarks.
   - Choose a location on your device to save the exported file.
4. For advanced exporting:
   - Click the "Advanced Export" button.
   - Use the search bar to find specific bookmarks.
   - Select individual bookmarks or folders.
   - Customize export settings (include dates, hide specific folders, etc.).
   - Choose the export format and click the export button.
5. For importing:
   - Click the "Import" button.
   - Select a CSV, JSON or HTML file containing bookmarks.
   - The extension will automatically detect the format and import the bookmarks.

## Local Development 🛠️

To set up the project for local development:

1. Clone the repository
```bash
git clone <your-repo-url>
cd bookmarks-import-export
```

2. Install dependencies
```bash
pnpm install
```

3. Start the development server
```bash
pnpm dev
```

4. Load the extension in your browser:
   - Open Chrome/Edge/Brave browser
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` directory

5. Build for production
```bash
pnpm build
```

6. Package the extension
```bash
pnpm package
```

## Contributors 🤝

**We welcome your contributions!** If you'd like to be part of this list, simply fork this repository, make your changes, and open a pull request. Once merged, your avatar will appear below automatically.

<!-- readme: contributors,AndryOre/- -start -->
<table>
	<tbody>
		<tr>
            <td align="center">
                <a href="https://github.com/AndryOre">
                    <img src="https://avatars.githubusercontent.com/u/44151183?v=4" width="100;" alt="AndryOre"/>
                    <br />
                    <sub><b>AndryOre</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/aam1r">
                    <img src="https://avatars.githubusercontent.com/u/566418?v=4" width="100;" alt="aam1r"/>
                    <br />
                    <sub><b>aam1r</b></sub>
                </a>
            </td>
		</tr>
	<tbody>
</table>
<!-- readme: contributors,AndryOre/- -end -->


## License 📄

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

[Plasmo]: https://img.shields.io/badge/Plasmo-0F0C29.svg?style=for-the-badge&logo=Plasmo&logoColor=white
[Plasmo-url]: https://plasmo.com/
[React]: https://img.shields.io/badge/React-61DAFB.svg?style=for-the-badge&logo=React&logoColor=black
[React-url]: https://react.dev/
[TailwindCSS]: https://img.shields.io/badge/Tailwind%20CSS-06B6D4.svg?style=for-the-badge&logo=Tailwind-CSS&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/
[Shadcn/UI]: https://img.shields.io/badge/shadcn/ui-000000.svg?style=for-the-badge&logo=shadcn/ui&logoColor=white
[Shadcn/UI-url]: https://ui.shadcn.com/
[Lucide]: https://img.shields.io/badge/Lucide-f67373.svg?style=for-the-badge&logo=lucide&logoColor=white
[Lucide-url]: https://lucide.dev/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Chrome Web Store]: https://img.shields.io/badge/Chrome%20Web%20Store-4285F4.svg?style=for-the-badge&logo=Chrome-Web-Store&logoColor=white
[Chrome Web Store-url]: https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn

# i18n Google Sheet Extension

A VS Code extension to sync translations between Google Sheets and JSON files. This extension helps you manage your application's translations by using Google Sheets as a central management tool.

## Features

- **Two-way Sync**: Sync translations between Google Sheets and JSON files in both directions
- **Multiple Language Support**: Handle multiple languages and translation files
- **Secure Authentication**: Uses OAuth 2.0 for secure access to Google Sheets
- **Progress Tracking**: Visual progress indicators during sync operations
- **Error Handling**: Comprehensive error handling and user feedback

## Prerequisites

Before using this extension, you need to:

1. Create a Google Cloud Project
2. Enable the Google Sheets API
3. Create OAuth 2.0 credentials (Desktop application)
4. Have a Google Sheet ready for translations

### Setting up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop application"
   - Give it a name (e.g., "i18n Translation Tool")
   - Save your Client ID and Client Secret

### Preparing Google Sheet

1. Create a new Google Sheet
2. Set up your sheet with the following structure:
   - First column header must be "key"
   - Additional columns should be language codes (e.g., "en", "fr", "es")
   - Each row represents a translation key and its values

Example sheet structure:
| key | en | fr | es |
|-----|----|----|----| 
| welcome | Welcome | Bienvenue | Bienvenido |
| goodbye | Goodbye | Au revoir | Adiós |

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "i18n Google Sheet"
4. Click Install

## Usage

### Initial Setup

1. Open Command Palette (Ctrl+Shift+P)
2. Run "I18n Google Sheet: Setup"
3. Enter the required information:
   - Google Sheet ID (from your sheet's URL)
   - Client ID (from Desktop application credentials)
   - Client Secret (from Desktop application credentials)
4. Complete the OAuth authentication process:
   - A browser window will open for Google authentication
   - Sign in to your Google account
   - Grant the required permissions
   - The authentication code will be automatically filled in VS Code
   - Press Enter to confirm the code

### Syncing from Google Sheets to JSON

1. Open Command Palette
2. Run "I18n Google Sheet: Sync from Google Sheets to JSON"
3. Wait for the sync to complete
4. JSON files will be created in the `locales` directory

### Syncing from JSON to Google Sheets

1. Open Command Palette
2. Run "I18n Google Sheet: Sync from JSON to Google Sheets"
3. Wait for the sync to complete
4. Your Google Sheet will be updated with the latest translations

## File Structure

The extension creates and maintains the following structure in your project:

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
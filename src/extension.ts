import * as vscode from 'vscode';
import { GoogleSheetService } from './services/googleSheetService';
import { LocaleFileService } from './services/localeFileService';
import { TranslationProcessor } from './services/translationProcessor';
import { ReverseTranslationProcessor } from './services/reverseTranslationProcessor';

export async function activate(context: vscode.ExtensionContext) {
    // Register commands
    let disposable = vscode.commands.registerCommand('i18n-google-sheet.setup', async () => {
        try {
            // Show setup instructions first
            const startSetup = await vscode.window.showInformationMessage(
                'You need to prepare:\n' +
                '1. Google Sheet ID (from sheet URL)\n' +
                '2. Google Cloud Project with Sheets API enabled\n' +
                '3. OAuth Client ID and Secret from Google Cloud Console\n\n' +
                'Are you ready to continue?',
                'Continue',
                'View Guide',
                'Cancel'
            );

            if (startSetup === 'View Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://developers.google.com/sheets/api/quickstart/nodejs'));
                return;
            } else if (startSetup !== 'Continue') {
                return;
            }

            // Show input box for Google Sheet ID
            const sheetId = await vscode.window.showInputBox({
                prompt: 'Enter Google Sheet ID',
                placeHolder: 'ID between /d/ and /edit in sheet URL',
                ignoreFocusOut: true,
                validateInput: text => {
                    return text.length > 0 ? null : 'Sheet ID cannot be empty';
                }
            });

            if (!sheetId) {
                return;
            }

            // Show input box for Client ID
            const clientId = await vscode.window.showInputBox({
                prompt: 'Enter Google Client ID',
                placeHolder: 'Get from Google Cloud Console',
                ignoreFocusOut: true,
                validateInput: text => {
                    return text.length > 0 ? null : 'Client ID cannot be empty';
                }
            });

            if (!clientId) {
                return;
            }

            // Show input box for Client Secret
            const clientSecret = await vscode.window.showInputBox({
                prompt: 'Enter Google Client Secret',
                placeHolder: 'Get from Google Cloud Console',
                ignoreFocusOut: true,
                validateInput: text => {
                    return text.length > 0 ? null : 'Client Secret cannot be empty';
                }
            });

            if (!clientSecret) {
                return;
            }

            // Initialize Google Sheet Service
            const googleSheetService = new GoogleSheetService(sheetId, clientId, clientSecret);

            // Show progress during authentication
            const tokens = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Setting up...",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Starting authentication...' });
                
                // Get auth URL and open in browser
                const authUrl = await googleSheetService.getAuthUrl();
                await vscode.env.openExternal(vscode.Uri.parse(authUrl));
                
                // Show input box for auth code
                const authCode = await vscode.window.showInputBox({
                    prompt: 'Enter authentication code from Google',
                    placeHolder: 'Copy the code from Google authentication page',
                    ignoreFocusOut: true,
                    validateInput: text => {
                        return text.length > 0 ? null : 'Authentication code cannot be empty';
                    }
                });

                if (!authCode) {
                    throw new Error('Authentication process was cancelled.');
                }

                progress.report({ message: 'Exchanging authentication code...' });
                // Get tokens using auth code
                const tokens = await googleSheetService.getToken(authCode);
                
                progress.report({ message: 'Saving authentication information...' });
                // Save all credentials securely
                await context.secrets.store('googleSheetId', sheetId);
                await context.secrets.store('googleClientId', clientId);
                await context.secrets.store('googleClientSecret', clientSecret);
                await context.secrets.store('googleTokens', JSON.stringify(tokens));
                
                return tokens;
            });

            vscode.window.showInformationMessage('Setup complete! You can now start syncing data.');
        } catch (error) {
            vscode.window.showErrorMessage(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(disposable);

    // Register sync to JSON command
    disposable = vscode.commands.registerCommand('i18n-google-sheet.syncToJson', async () => {
        try {
            const sheetId = await context.secrets.get('googleSheetId');
            const clientId = await context.secrets.get('googleClientId');
            const clientSecret = await context.secrets.get('googleClientSecret');
            const tokensStr = await context.secrets.get('googleTokens');

            if (!sheetId || !clientId || !clientSecret || !tokensStr) {
                const setup = await vscode.window.showErrorMessage(
                    'You need to set up Google Sheet information first.',
                    'Setup Now',
                    'Close'
                );
                if (setup === 'Setup Now') {
                    vscode.commands.executeCommand('i18n-google-sheet.setup');
                }
                return;
            }

            // Get workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Workspace folder not found');
                return;
            }

            // Get or create locales directory
            const localesUri = vscode.Uri.joinPath(workspaceFolder.uri, 'locales');
            try {
                await vscode.workspace.fs.stat(localesUri);
            } catch {
                await vscode.workspace.fs.createDirectory(localesUri);
            }

            // Initialize services
            const googleSheetService = new GoogleSheetService(sheetId, clientId, clientSecret);
            await googleSheetService.setToken(JSON.parse(tokensStr));
            const fileService = new LocaleFileService(localesUri);
            const translationProcessor = new TranslationProcessor();

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing from Google Sheets to JSON...",
                cancellable: true
            }, async (progress, token) => {
                // Calculate total steps
                progress.report({ increment: 0, message: 'Connecting to Google Sheets...' });

                // Get all sheet names
                const sheetNames = await googleSheetService.getSheetNames();
                progress.report({ increment: 20, message: `Found ${sheetNames.length} sheets...` });

                // Get data from each sheet
                progress.report({ increment: 20, message: 'Processing data...' });
                const sheetsData = await Promise.all(
                    sheetNames.map(async (sheetName, index) => {
                        progress.report({ 
                            message: `Processing sheet "${sheetName}" (${index + 1}/${sheetNames.length})...` 
                        });
                        return googleSheetService.getSheetData(sheetName);
                    })
                );

                if (token.isCancellationRequested) {
                    vscode.window.showInformationMessage('Sync process was cancelled');
                    return;
                }

                // Process the data
                progress.report({ increment: 30, message: 'Converting data...' });
                const translations = translationProcessor.processSheetData(sheetsData);

                // Write files
                progress.report({ increment: 30, message: 'Writing files...' });
                await fileService.writeTranslationFiles(translations);
            });

            const result = await vscode.window.showInformationMessage(
                'Sync complete! Do you want to open the folder containing the files?',
                'Open Folder',
                'Close'
            );

            if (result === 'Open Folder') {
                const folderPath = localesUri.fsPath;
                await vscode.commands.executeCommand('revealFileInOS', localesUri);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(disposable);

    // Register sync to sheet command
    disposable = vscode.commands.registerCommand('i18n-google-sheet.syncToSheet', async () => {
        try {
            const sheetId = await context.secrets.get('googleSheetId');
            const clientId = await context.secrets.get('googleClientId');
            const clientSecret = await context.secrets.get('googleClientSecret');
            const tokensStr = await context.secrets.get('googleTokens');

            if (!sheetId || !clientId || !clientSecret || !tokensStr) {
                const setup = await vscode.window.showErrorMessage(
                    'You need to set up Google Sheet information first.',
                    'Setup Now',
                    'Close'
                );
                if (setup === 'Setup Now') {
                    vscode.commands.executeCommand('i18n-google-sheet.setup');
                }
                return;
            }

            // Get workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Workspace folder not found');
                return;
            }

            // Get locales directory
            const localesUri = vscode.Uri.joinPath(workspaceFolder.uri, 'locales');
            try {
                await vscode.workspace.fs.stat(localesUri);
            } catch {
                vscode.window.showErrorMessage('Locales folder not found in workspace');
                return;
            }

            // Initialize services
            const googleSheetService = new GoogleSheetService(sheetId, clientId, clientSecret);
            await googleSheetService.setToken(JSON.parse(tokensStr));
            const fileService = new LocaleFileService(localesUri);
            const reverseProcessor = new ReverseTranslationProcessor();

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing from JSON to Google Sheets...",
                cancellable: true
            }, async (progress, token) => {
                // Read translation files
                progress.report({ increment: 0, message: 'Reading translation files...' });
                const translations = await fileService.readTranslationFiles();

                if (token.isCancellationRequested) {
                    vscode.window.showInformationMessage('Sync process was cancelled');
                    return;
                }

                // Convert to sheet data
                progress.report({ increment: 30, message: 'Converting data...' });
                const sheetsData = reverseProcessor.convertToSheetData(translations);

                // Update sheets
                progress.report({ increment: 30, message: `Updating ${sheetsData.length} sheets...` });
                
                for (const [index, sheetData] of sheetsData.entries()) {
                    if (token.isCancellationRequested) {
                        vscode.window.showInformationMessage('Sync process was cancelled');
                        return;
                    }

                    progress.report({ 
                        message: `Updating sheet "${sheetData.sheetName}" (${index + 1}/${sheetsData.length})...` 
                    });
                    
                    const { headers, rows } = reverseProcessor.convertToSpreadsheetRows(sheetData);
                    await googleSheetService.updateSheetData(sheetData.sheetName, headers, rows);
                }

                progress.report({ increment: 40, message: 'Complete!' });
            });

            const result = await vscode.window.showInformationMessage(
                'Sync to Google Sheets complete! Do you want to open the Google Sheet?',
                'Open Google Sheet',
                'Close'
            );

            if (result === 'Open Google Sheet') {
                vscode.env.openExternal(vscode.Uri.parse(`https://docs.google.com/spreadsheets/d/${sheetId}`));
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
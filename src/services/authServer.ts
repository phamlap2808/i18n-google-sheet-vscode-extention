import express, { Request, Response } from 'express';
import * as path from 'path';
import * as http from 'http';
import * as vscode from 'vscode';

export class AuthServer {
    private server!: http.Server;
    private codePromise: Promise<string>;
    private serverReady: Promise<void>;

    constructor() {
        const app = express();
        this.codePromise = new Promise((resolve) => {
            app.get('/', async (req: Request, res: Response) => {
                const code = req.query.code as string;
                if (code) {
                    // Show success page first
                    const htmlPath = path.join(__dirname, '../assets/auth.html');
                    res.sendFile(htmlPath, async (err) => {
                        if (err) {
                            res.status(500).send('Error loading authentication page');
                            return;
                        }

                        // Show input box for the code after page is sent
                        const inputCode = await vscode.window.showInputBox({
                            prompt: 'Enter authentication code from Google',
                            placeHolder: 'Copy the code from Google authentication page',
                            value: code,
                            ignoreFocusOut: true,
                            validateInput: text => {
                                return text.length > 0 ? null : 'Authentication code cannot be empty';
                            }
                        });

                        if (inputCode) {
                            resolve(inputCode);
                        }
                    });
                } else {
                    res.status(400).send('No code provided');
                }
            });
        });

        // Start server and wait for it to be ready
        this.serverReady = new Promise((resolve) => {
            this.server = app.listen(0, () => {
                const port = this.getPort();
                vscode.window.showInformationMessage(`Auth server started on port ${port}`);
                resolve();
            });
        });
    }

    async waitForServer(): Promise<void> {
        vscode.window.showInformationMessage('Waiting for auth server to start...');
        await this.serverReady;
    }

    getPort(): number {
        const address = this.server.address();
        if (address && typeof address === 'object') {
            return address.port;
        }
        throw new Error('Server not started');
    }

    getCode(): Promise<string> {
        return this.codePromise;
    }

    close(): void {
        this.server.close();
    }
} 
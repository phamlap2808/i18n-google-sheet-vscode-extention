import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SheetData, TranslationRow } from '../types';
import { AuthServer } from './authServer';
import * as vscode from 'vscode';

export class GoogleSheetService {
  private sheets;
  private auth: OAuth2Client;
  private sheetId: string;

  constructor(sheetId: string, clientId: string, clientSecret: string) {
    this.sheetId = sheetId;
    
    this.auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost'  // Redirect URI for desktop apps
    );
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async setToken(token: Credentials): Promise<void> {
    this.auth.setCredentials(token);
  }

  async getAuthUrl(): Promise<string> {
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets'],
      prompt: 'consent'  // Force consent screen to ensure we get refresh token
    });
  }

  async getToken(code: string): Promise<Credentials> {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);
    return tokens;
  }

  async startAuthFlow(): Promise<string> {
    const authServer = new AuthServer();
    
    // Wait for server to be ready
    await authServer.waitForServer();
    const port = authServer.getPort();
    
    // Update redirect URI with the correct port
    this.auth = new google.auth.OAuth2(
      this.auth._clientId,
      this.auth._clientSecret,
      `http://localhost:${port}`
    );

    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Open browser for authentication using VS Code's built-in method
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    // Wait for the code
    const code = await authServer.getCode();
    authServer.close();
    return code;
  }

  async authorize(code: string): Promise<void> {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);
  }

  async getSheetNames(): Promise<string[]> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: this.sheetId
    });

    return response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];
  }

  async sheetExists(sheetName: string): Promise<boolean> {
    const sheetNames = await this.getSheetNames();
    return sheetNames.includes(sheetName);
  }

  async createSheet(sheetName: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      console.log(`Created new sheet: ${sheetName}`);
    } catch (error) {
      console.error(`Error creating sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async getSheetData(sheetName: string): Promise<SheetData> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: sheetName,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        throw new Error(`No data found in sheet ${sheetName}`);
      }

      // First row is headers: key, en, vi, de, etc.
      const headers = rows[0] as string[];
      const keyIndex = headers.findIndex(header => header.toLowerCase() === 'key');
      
      if (keyIndex === -1) {
        throw new Error(`No 'key' column found in sheet ${sheetName}`);
      }

      // Map the data rows to objects
      const dataRows = rows.slice(1).map(row => {
        const translationRow: TranslationRow = { key: row[keyIndex] || '' };
        
        headers.forEach((header, index) => {
          if (index !== keyIndex && header) {
            translationRow[header] = row[index] || '';
          }
        });
        
        return translationRow;
      });

      return {
        sheetName,
        rows: dataRows,
      };
    } catch (error) {
      console.error(`Error fetching data from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateSheetData(sheetName: string, headers: string[], rows: string[][]): Promise<void> {
    try {
      // Check if the sheet exists, create it if it doesn't
      const exists = await this.sheetExists(sheetName);
      if (!exists) {
        console.log(`Sheet ${sheetName} does not exist. Creating it...`);
        await this.createSheet(sheetName);
        
        // Wait a bit for the sheet to be fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Only clear existing content if the sheet already exists
        try {
          await this.sheets.spreadsheets.values.clear({
            spreadsheetId: this.sheetId,
            range: sheetName,
          });
        } catch (error) {
          console.log(`Could not clear sheet ${sheetName}, continuing with update.`);
        }
      }

      // Update with the new content
      const values = [headers, ...rows];
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.sheetId,
        range: sheetName,
        valueInputOption: 'RAW',
        requestBody: {
          values
        },
      });

      console.log(`Updated sheet: ${sheetName}`);
    } catch (error) {
      console.error(`Error updating sheet ${sheetName}:`, error);
      throw error;
    }
  }
} 
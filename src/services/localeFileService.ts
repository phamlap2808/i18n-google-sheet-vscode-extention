import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TranslationsByLanguage } from '../types';

export class LocaleFileService {
  private localesUri: vscode.Uri;

  constructor(localesUri: vscode.Uri) {
    this.localesUri = localesUri;
  }

  private async readFile(uri: vscode.Uri): Promise<any> {
    const content = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(content.toString());
  }

  private async writeFile(uri: vscode.Uri, content: any): Promise<void> {
    const data = Buffer.from(JSON.stringify(content, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(uri, data);
  }

  async cleanLocalesDirectory(): Promise<void> {
    try {
      await vscode.workspace.fs.delete(this.localesUri, { recursive: true });
      console.log(`Cleaned up ${this.localesUri.fsPath} directory`);
    } catch (error) {
      // Directory might not exist, which is fine
    }
  }

  async ensureLocalesDirectory(): Promise<void> {
    try {
      await vscode.workspace.fs.stat(this.localesUri);
    } catch {
      await vscode.workspace.fs.createDirectory(this.localesUri);
    }
  }

  async writeTranslationFiles(translations: TranslationsByLanguage): Promise<void> {
    // Clean up existing directory first
    await this.cleanLocalesDirectory();
    await this.ensureLocalesDirectory();

    const languages = Object.keys(translations);
    
    for (const language of languages) {
      // Create language directory
      const langUri = vscode.Uri.joinPath(this.localesUri, language);
      await vscode.workspace.fs.createDirectory(langUri);
      
      // Get all sheets/categories for this language
      const categories = Object.keys(translations[language]);
      
      // Write each category to a separate file
      for (const category of categories) {
        const fileUri = vscode.Uri.joinPath(langUri, `${category}.json`);
        await this.writeFile(fileUri, translations[language][category]);
        console.log(`Created ${fileUri.fsPath}`);
      }
    }
  }

  async readTranslationFiles(): Promise<TranslationsByLanguage> {
    await this.ensureLocalesDirectory();
    
    const translations: TranslationsByLanguage = {};
    
    // Read all language directories
    const dirContent = await vscode.workspace.fs.readDirectory(this.localesUri);
    const langDirs = dirContent.filter(([_, type]) => type === vscode.FileType.Directory).map(([name]) => name);
    
    for (const langDir of langDirs) {
      const langUri = vscode.Uri.joinPath(this.localesUri, langDir);
      translations[langDir] = {};
      
      // Read all JSON files in the language directory
      const files = await vscode.workspace.fs.readDirectory(langUri);
      const jsonFiles = files
        .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.json'))
        .map(([name]) => name);
      
      for (const file of jsonFiles) {
        const category = path.basename(file, '.json');
        const fileUri = vscode.Uri.joinPath(langUri, file);
        
        try {
          const content = await this.readFile(fileUri);
          
          // Validate content is an object
          if (typeof content !== 'object' || content === null || Array.isArray(content)) {
            console.warn(`Warning: ${fileUri.fsPath} does not contain a valid translation object, skipping...`);
            continue;
          }
          
          translations[langDir][category] = content;
          console.log(`Read ${fileUri.fsPath}`);
        } catch (error) {
          if (error instanceof SyntaxError) {
            console.warn(`Warning: ${fileUri.fsPath} contains invalid JSON, skipping...`);
          } else {
            console.error(`Error reading ${fileUri.fsPath}:`, error);
          }
        }
      }
    }
    
    return translations;
  }
} 
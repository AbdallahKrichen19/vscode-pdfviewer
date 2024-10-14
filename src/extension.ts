import * as vscode from 'vscode';
import { PdfCustomProvider } from './pdfProvider';
import { ActivateAssistant } from './llm-extension/main';

export function activate(context: vscode.ExtensionContext): void {
  ActivateAssistant(context);
  const extensionRoot = vscode.Uri.file(context.extensionPath);
  // Register our custom editor provider
  const provider = new PdfCustomProvider(extensionRoot);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      PdfCustomProvider.viewType,
      provider,
      {
        webviewOptions: {
          enableFindWidget: false, // default
          retainContextWhenHidden: true,
        },
      }
    )
  );
}

export function deactivate(): void {}

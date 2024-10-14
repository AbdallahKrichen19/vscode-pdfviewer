import * as vscode from 'vscode';
import axios from 'axios';
import * as FormData from 'form-data';
import { Buffer } from 'buffer';
// Function to ask a question to the Python backend
async function askQuestion(question: string): Promise<string> {
  const response = await axios.post('http://127.0.0.1:8000/ask_question/', {
    question,
  });
  return response.data.answer;
}
// Function to upload PDF to the Python server
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function uploadPdf(pdfPath: string, content: Uint8Array) {
  const formData = new FormData();
  const buffer = Buffer.from(content); // Create a Buffer from Uint8Array content

  formData.append('file', buffer, pdfPath); // Append the buffer as the 'file' field

  await axios.post('http://127.0.0.1:8000/upload_pdf/', formData, {
    headers: { ...formData.getHeaders() }, // Include the headers from form-data
  });
}

function getWebviewContent(): string {
  return `
          <!DOCTYPE html>
          <html lang="en">
          <body>
              <button id="uploadPdf">Upload PDF</button><br/>
              <textarea id="question" placeholder="Ask a question..."></textarea>
              <button id="submitQuestion">Ask</button>
              <div id="answer"></div>
  
              <script>
                  const vscode = acquireVsCodeApi();
                  document.getElementById('uploadPdf').onclick = () => {
                      vscode.postMessage({ command: 'upload' });
                  };
                  document.getElementById('submitQuestion').onclick = () => {
                      const question = document.getElementById('question').value;
                      vscode.postMessage({ command: 'ask', text: question });
                  };
                  window.addEventListener('message', event => {
                      const message = event.data;
                      if (message.type === 'answer') {
                          document.getElementById('answer').innerText = message.text;
                      }
                  });
              </script>
          </body>
          </html>
      `;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function ActivateAssistant(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pdf-chatbot.start', async () => {
      const panel = vscode.window.createWebviewPanel(
        'pdfChatbot',
        'PDF Chatbot',
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'upload') {
          const pdfUri = vscode.window.activeTextEditor?.document.uri;
          if (pdfUri) {
            const pdfPath = pdfUri.fsPath;
            const fileContent = await vscode.workspace.fs.readFile(pdfUri);
            await uploadPdf(pdfPath, fileContent);
            vscode.window.showInformationMessage('PDF uploaded successfully!');
          }
        }

        if (message.command === 'ask') {
          const answer = await askQuestion(message.text);
          panel.webview.postMessage({ type: 'answer', text: answer });
        }
      });
    })
  );
}
